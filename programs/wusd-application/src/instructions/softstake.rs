#![allow(dead_code)]
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use crate::state::{StateAccount, PoolStatus};
use crate::error::WUSDError; 
use crate::instructions::stake::calculate_rewards;
use ed25519_dalek::{Signature, PublicKey, Verifier};

/// 软质押状态枚举
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
#[repr(u8)]
pub enum SoftStakingStatus {
    #[default]
    Active = 0,
    Claimable = 1,
    Claimed = 2,
}
/// 软质押指令的账户参数
#[derive(Accounts)]
pub struct SoftStake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub user_wusd: Account<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + SoftStakeAccount::LEN,
        seeds = [b"soft_stake_account", user.key().as_ref()],
        bump
    )]
    pub stake_account: Account<'info, SoftStakeAccount>,
    
    #[account(mut)]
    pub stake_vault: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"state"],
        bump,
        constraint = !state.paused @ WUSDError::ContractPaused
    )]
    pub state: Account<'info, StateAccount>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

/// 软质押奖励领取指令的账户参数
#[derive(Accounts)]
pub struct SoftClaim<'info> {
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"soft_stake_account", user.key().as_ref()],
        bump,
        constraint = stake_account.owner == user.key()
    )]
    pub stake_account: Account<'info, SoftStakeAccount>,
    
    #[account(mut)]
    pub user_wusd: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub wusd_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        seeds = [b"state"],
        bump,
        constraint = !state.paused @ WUSDError::ContractPaused
    )]
    pub state: Account<'info, StateAccount>,
    
    pub token_program: Program<'info, Token>,
} 

/// 软质押账户结构体，存储用户的软质押信息
#[account]
#[derive(Default)]
pub struct SoftStakeAccount {
    pub owner: Pubkey,
    pub staking_pool_id: u64,
    pub amount: u64,
    pub apy: u64,
    pub start_time: i64,
    pub end_time: i64,
    pub claimable_timestamp: i64,
    pub rewards_earned: u64,
    pub status: SoftStakingStatus,
    pub access_key: [u8; 32],
    pub last_update_time: i64,
}

/// 执行指令的账户参数
#[derive(Accounts)]
pub struct Execute<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"state"],
        bump,
        constraint = !state.paused @ WUSDError::ContractPaused
    )]
    pub state: Account<'info, StateAccount>,
}

/// 创建质押数据的账户参数
#[derive(Accounts)]
pub struct CreateClaimData<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"state"],
        bump,
        constraint = !state.paused @ WUSDError::ContractPaused
    )]
    pub state: Account<'info, StateAccount>,
}

/// 质押数据输入结构体
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ClaimDataInput {
    pub account: Pubkey,
    pub claimable_timestamp: i64,
    pub amount: u64,
    pub access_key: [u8; 32],
}

/// 质押数据创建事件
#[event]
pub struct ClaimDataCreated {
    pub account: Pubkey,
    pub claimable_timestamp: i64,
    pub amount: u64,
    pub access_key: [u8; 32],
}

/// 所有者变更事件
#[event]
pub struct OwnerChanged {
    pub old_owner: Pubkey,
    pub new_owner: Pubkey,
}

/// 交易池地址设置事件
#[event]
pub struct PoolAddressSet {
    pub old_address: Pubkey,
    pub new_address: Pubkey,
}

impl SoftStakeAccount {
    pub const LEN: usize = 32 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 1 + 32 + 8 + 32; // 增加额外的空间
}

/// 软质押事件，记录软质押操作的详细信息
#[event]
pub struct SoftStakeEvent {
    pub user: Pubkey,
    pub staking_pool_id: u64,
    pub amount: u64,
    pub apy: u64,
    pub start_time: i64,
    pub end_time: i64,
    pub access_key: [u8; 32],
}

/// 软质押奖励领取事件，记录领取操作的详细信息
#[event]
pub struct SoftClaimEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub access_key: [u8; 32],
}

/// 软质押状态更新事件
#[event]
pub struct SoftStakeStatusUpdated {
    pub user: Pubkey,
    pub staking_pool_id: u64,
    pub old_status: SoftStakingStatus,
    pub new_status: SoftStakingStatus,
    pub timestamp: i64,
}

/// 软质押奖励更新事件
#[event]
pub struct SoftStakeRewardsUpdated {
    pub user: Pubkey,
    pub old_rewards: u64,
    pub new_rewards: u64,
    pub timestamp: i64,
}

/// 软质押奖励计算结构体
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct SoftStakeRewards {
    pub base_rewards: u64,
    pub bonus_rewards: u64,
    pub total_rewards: u64,
    pub last_update_time: i64,
}

/// 软质押奖励计算事件
#[event]
pub struct SoftStakeRewardsCalculated {
    pub user: Pubkey,
    pub base_rewards: u64,
    pub bonus_rewards: u64,
    pub total_rewards: u64,
    pub timestamp: i64,
}

/// 计算软质押奖励
pub fn calculate_soft_stake_rewards(
    amount: u64,
    apy: u64,
    duration: i64,
    reward_rate: u64,
) -> Result<SoftStakeRewards> {
    let now = Clock::get()?.unix_timestamp;
    
    // 计算基础奖励
    let base_rewards = calculate_rewards(amount, apy, duration);
    
    // 计算额外奖励
    let bonus_rewards = amount
        .checked_mul(reward_rate)
        .ok_or(WUSDError::ArithmeticOverflow)?
        .checked_mul(duration as u64)
        .ok_or(WUSDError::ArithmeticOverflow)?
        .checked_div(1_000_000_000)
        .ok_or(WUSDError::ArithmeticOverflow)?;
    
    // 计算总奖励
    let total_rewards = base_rewards
        .checked_add(bonus_rewards)
        .ok_or(WUSDError::ArithmeticOverflow)?;
    
    Ok(SoftStakeRewards {
        base_rewards,
        bonus_rewards,
        total_rewards,
        last_update_time: now,
    })
}

pub fn soft_stake_handler(ctx: Context<SoftStake>, amount: u64, staking_pool_id: u64, access_key: [u8; 32]) -> Result<()> {
    let stake_account = &mut ctx.accounts.stake_account;
    
    // 验证签名
    let mut signature_bytes = [0u8; 64];
    signature_bytes.copy_from_slice(&access_key[..64]);
    let signature = ed25519_dalek::Signature::from_bytes(&signature_bytes)
        .map_err(|_| WUSDError::InvalidSignatureError)?;

    let mut public_key_bytes = [0u8; 32];
    public_key_bytes.copy_from_slice(&access_key[64..96]);
    let public_key = ed25519_dalek::PublicKey::from_bytes(&public_key_bytes)
        .map_err(|_| WUSDError::InvalidSignatureError)?;

    let message = format!("{}{}", amount, staking_pool_id).into_bytes();
    public_key.verify(&message, &signature)
        .map_err(|_| error!(WUSDError::InvalidSignatureError))?;

    // 更新质押账户
    stake_account.owner = ctx.accounts.user.key();
    stake_account.amount = amount;
    stake_account.staking_pool_id = staking_pool_id;
    stake_account.start_time = Clock::get()?.unix_timestamp;

    Ok(())
}

pub fn soft_claim_handler(ctx: Context<SoftClaim>) -> Result<()> {
    let stake_account = &mut ctx.accounts.stake_account;
    let state = &mut ctx.accounts.state;

    // 验证质押状态
    require!(stake_account.amount > 0, WUSDError::InvalidAmount);

    // 计算奖励
    let current_time = Clock::get()?.unix_timestamp;
    let time_staked = current_time - stake_account.start_time;
    let rewards = (stake_account.amount as f64 * state.reward_rate as f64 * time_staked as f64) as u64;

    // 更新账户
    stake_account.rewards_earned = rewards;
    stake_account.amount = 0;

    Ok(())
}

/// 更新软质押状态和奖励
pub fn update_soft_stake(
    stake_account: &mut SoftStakeAccount,
    new_status: SoftStakingStatus,
    rewards: Option<SoftStakeRewards>,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    
    // 更新状态
    let old_status = stake_account.status;
    stake_account.status = new_status;
    
    emit!(SoftStakeStatusUpdated {
        user: stake_account.owner,
        staking_pool_id: stake_account.staking_pool_id,
        old_status,
        new_status,
        timestamp: now,
    });
    
    // 更新奖励
    if let Some(rewards) = rewards {
        let old_rewards = stake_account.rewards_earned;
        stake_account.rewards_earned = rewards.total_rewards;
        stake_account.last_update_time = rewards.last_update_time;
        
        emit!(SoftStakeRewardsCalculated {
            user: stake_account.owner,
            base_rewards: rewards.base_rewards,
            bonus_rewards: rewards.bonus_rewards,
            total_rewards: rewards.total_rewards,
            timestamp: now,
        });
        
        emit!(SoftStakeRewardsUpdated {
            user: stake_account.owner,
            old_rewards,
            new_rewards: rewards.total_rewards,
            timestamp: now,
        });
    }
    
    Ok(())
}

/// 执行合约调用
pub fn execute(
    ctx: Context<Execute>,
    selector: [u8; 4],
    input_data: Vec<u8>,
    signatures: Vec<Vec<u8>>,
) -> Result<()> {
    let state = &mut ctx.accounts.state;
    require!(signatures.len() > 0, WUSDError::EmptySignatures);
    
    // 验证签名者数量
    require!(signatures.len() == state.owners.len(), WUSDError::InvalidNumberOfSigners);
    
    // 验证签名
    for (i, signature) in signatures.iter().enumerate() {
        let signer = verify_signature(&state.owners[i], &selector, &input_data, signature)?;
        require!(state.owners.contains(&signer), WUSDError::UnauthorizedSigner);
    }
    
    // 执行调用
    match selector {
        // 根据选择器执行相应的函数
        _ => return Err(WUSDError::InvalidSelector.into()),
    }
}

/// 创建质押数据
pub fn create_claim_data(
    ctx: Context<CreateClaimData>,
    account: Pubkey,
    claimable_timestamp: i64,
    amount: u64,
    access_key: [u8; 32],
) -> Result<()> {
    require!(account != Pubkey::default(), WUSDError::InvalidAddress);
    require!(amount > 0, WUSDError::InvalidAmount);
    
    let state = &mut ctx.accounts.state;
    let claim = SoftStakeAccount {
        owner: account,
        staking_pool_id: 0,
        amount,
        apy: 0,
        start_time: Clock::get()?.unix_timestamp,
        end_time: claimable_timestamp,
        claimable_timestamp,
        rewards_earned: 0,
        status: SoftStakingStatus::Active,
        access_key,
        last_update_time: Clock::get()?.unix_timestamp,
    };
    
    // 存储质押数据
    if let Some(index) = state.claims.iter().position(|(_, c)| c.owner == Pubkey::default()) {
        state.claims[index] = (ctx.accounts.authority.key(), claim);
    } else {
        return err!(WUSDError::NoAvailableWhitelistSlot);
    }
    
    emit!(ClaimDataCreated {
        account,
        claimable_timestamp,
        amount,
        access_key,
    });
    
    Ok(())
}

/// 批量创建质押数据
pub fn create_claim_data_multiple(
    ctx: Context<CreateClaimData>,
    claim_data_list: Vec<ClaimDataInput>,
) -> Result<()> {
    for claim_data in claim_data_list {
        let claim = SoftStakeAccount {
            owner: claim_data.account,
            staking_pool_id: 0,
            amount: claim_data.amount,
            apy: 0,
            start_time: Clock::get()?.unix_timestamp,
            end_time: claim_data.claimable_timestamp,
            claimable_timestamp: claim_data.claimable_timestamp,
            rewards_earned: 0,
            status: SoftStakingStatus::Active,
            access_key: claim_data.access_key,
            last_update_time: Clock::get()?.unix_timestamp,
        };
        
        // 存储质押账户信息
        if let Some(index) = ctx.accounts.state.claims.iter().position(|(_, c)| c.owner == Pubkey::default()) {
            ctx.accounts.state.claims[index] = (claim_data.account, claim);
        } else {
            return err!(WUSDError::NoAvailableWhitelistSlot);
        }
    }
    Ok(())
}

pub fn claims(
    ctx: Context<SoftClaim>,
    access_keys: Vec<[u8; 32]>,
) -> Result<()> {
    let mut total_amount = 0u64;
    
    for access_key in access_keys {
        let claim = SoftStakeAccount {
            owner: ctx.accounts.user.key(),
            staking_pool_id: 0,
            amount: 0,
            apy: 0,
            start_time: Clock::get()?.unix_timestamp,
            end_time: Clock::get()?.unix_timestamp,
            claimable_timestamp: Clock::get()?.unix_timestamp,
            rewards_earned: 0,
            status: SoftStakingStatus::Active,
            access_key,
            last_update_time: Clock::get()?.unix_timestamp,
        };
        
        require!(claim.claimable_timestamp <= Clock::get()?.unix_timestamp, WUSDError::ClaimableTimestampNotReached);
        require!(claim.status != SoftStakingStatus::Claimed, WUSDError::ClaimAlreadyClaimed);
        
        total_amount = total_amount.checked_add(claim.amount)
            .ok_or(WUSDError::ArithmeticOverflow)?;
    }
    
    // 转账奖励
    let seeds = &[
        b"state".as_ref(),
        &[ctx.bumps["state"]],
    ];
    let signer = &[&seeds[..]];
    
    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        token::Transfer {
            from: ctx.accounts.user_wusd.to_account_info(),
            to: ctx.accounts.wusd_mint.to_account_info(),
            authority: ctx.accounts.state.to_account_info(),
        },
        signer,
    );
    token::transfer(transfer_ctx, total_amount)?;
    
    Ok(())
}

/// 验证签名
pub fn verify_signature(
    signer: &Pubkey,
    selector: &[u8; 4],
    input_data: &[u8],
    signature: &[u8],
) -> Result<Pubkey> {
    let mut signature_bytes = [0u8; 64];
    signature_bytes.copy_from_slice(signature);
    let signature = ed25519_dalek::Signature::from_bytes(&signature_bytes)
        .map_err(|_| WUSDError::InvalidSignatureError)?;

    let mut message = Vec::new();
    message.extend_from_slice(selector);
    message.extend_from_slice(input_data);

    let public_key = ed25519_dalek::PublicKey::from_bytes(signer.as_ref())
        .map_err(|_| WUSDError::InvalidSignatureError)?;

    public_key.verify(&message, &signature)
        .map_err(|_| error!(WUSDError::InvalidSignatureError))?;

    Ok(*signer)
}

/// 验证软质押状态
pub fn validate_soft_stake(
    stake_account: &SoftStakeAccount,
    state: &StateAccount,
) -> Result<()> {
    // 验证质押状态
    require!(stake_account.status == SoftStakingStatus::Active, WUSDError::InvalidStakingStatus);
    
    // 验证质押池状态
    let staking_pool = StateAccount::get_staking_pool(stake_account.staking_pool_id)?;
    require!(staking_pool.status == PoolStatus::Active, WUSDError::InvalidPoolStatus);
    
    // 验证合约状态
    require!(!state.paused, WUSDError::ContractPaused);
    
    Ok(())
}

/// 验证签名
fn validate_stake_status(stake_account: &SoftStakeAccount) -> Result<()> {
    require!(stake_account.status == SoftStakingStatus::Active, WUSDError::InvalidStakingStatus);
    Ok(())    
}

/// 验证质押金额
fn validate_stake_amount(amount: u64, min_amount: u64) -> Result<()> {
    require!(amount > 0, WUSDError::InvalidAmount);
    require!(amount >= min_amount, WUSDError::StakingAmountTooLow);
    Ok(())
}

/// 验证质押池状态
fn validate_pool_status(pool_status: PoolStatus) -> Result<()> {
    require!(pool_status == PoolStatus::Active, WUSDError::InvalidPoolStatus);
    Ok(())
}

/// 验证访问密钥
fn validate_access_key(access_key: [u8; 32]) -> Result<()> {
    require!(access_key != [0; 32], WUSDError::InvalidAccessKey);
    Ok(())
}

/// 更新软质押状态
pub fn update_soft_stake_status(
    stake_account: &mut SoftStakeAccount,
    new_status: SoftStakingStatus,
) -> Result<()> {
    let old_status = stake_account.status;
    stake_account.status = new_status;
    
    let clock = Clock::get()?;
    emit!(SoftStakeStatusUpdated {
        user: stake_account.owner,
        staking_pool_id: stake_account.staking_pool_id,
        old_status,
        new_status,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

/// 更新软质押奖励
pub fn update_soft_stake_rewards(
    stake_account: &mut SoftStakeAccount,
    new_rewards: u64,
) -> Result<()> {
    let old_rewards = stake_account.rewards_earned;
    stake_account.rewards_earned = new_rewards;
    
    let clock = Clock::get()?;
    emit!(SoftStakeRewardsUpdated {
        user: stake_account.owner,
        old_rewards,
        new_rewards,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}