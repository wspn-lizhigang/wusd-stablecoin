use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use crate::state::{StateAccount, PoolStatus};
use crate::error::WUSDError;

/// 软质押指令的账户参数
#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct SoftStake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub user_wusd: Account<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + SoftStakeAccount::LEN,
        seeds = [b"softstake", user.key().as_ref()],
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
        seeds = [b"softstake", user.key().as_ref()],
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

/// 软质押状态枚举
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum SoftStakingStatus {
    Active,
    Claimable,
    Claimed,
}

/// 软质押账户结构体，存储用户的软质押信息
#[account]
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

impl SoftStakeAccount {
    pub const LEN: usize = 32 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 1 + 32 + 8;
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

/// 执行软质押操作
/// * `ctx` - 软质押上下文
/// * `amount` - 质押金额
/// * `staking_pool_id` - 质押池ID
/// * `access_key` - 访问密钥
pub fn soft_stake(
    ctx: Context<SoftStake>,
    amount: u64,
    staking_pool_id: u64,
    access_key: [u8; 32],
) -> Result<()> {
    require!(amount > 0, WUSDError::InvalidAmount);
    require!(staking_pool_id > 0, WUSDError::InvalidPoolId);

    let staking_pool = ctx.accounts.state.get_staking_pool(staking_pool_id)?;
    require!(staking_pool.status == PoolStatus::Active, WUSDError::InvalidPoolStatus);
    require!(amount >= staking_pool.min_stake_amount, WUSDError::StakingAmountTooLow);
    
    let pool_apy = staking_pool.apy;
    let pool_duration = staking_pool.duration;

    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        token::Transfer {
            from: ctx.accounts.user_wusd.to_account_info(),
            to: ctx.accounts.stake_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    token::transfer(transfer_ctx, amount)?;

    let now = Clock::get()?.unix_timestamp;
    let stake_account = &mut ctx.accounts.stake_account;
    
    if stake_account.amount > 0 {
        let time_passed = now - stake_account.start_time;
        let rewards = calculate_rewards(
            stake_account.amount,
            stake_account.apy,
            time_passed,
        );
        stake_account.rewards_earned += rewards;
    }

    stake_account.staking_pool_id = staking_pool_id;
    stake_account.amount = amount;
    stake_account.apy = pool_apy;
    stake_account.start_time = now;
    stake_account.end_time = now + pool_duration;
    stake_account.status = SoftStakingStatus::Active;
    stake_account.access_key = access_key;
    
    if stake_account.owner == Pubkey::default() {
        stake_account.owner = ctx.accounts.user.key();
    }

    let state = &mut ctx.accounts.state;
    state.total_staked += amount;
    state.last_update_time = now;

    emit!(SoftStakeEvent {
        user: ctx.accounts.user.key(),
        staking_pool_id,
        amount,
        apy: pool_apy,
        start_time: now,
        end_time: now + pool_duration,
        access_key,
    });

    Ok(())
}

/// 领取软质押奖励
/// * `ctx` - 领取奖励的上下文
pub fn soft_claim(ctx: Context<SoftClaim>) -> Result<()> {
    let stake_account = &mut ctx.accounts.stake_account;
    let now = Clock::get()?.unix_timestamp;
    
    let time_passed = now - stake_account.last_update_time;
    let new_rewards = stake_account.amount.checked_mul(ctx.accounts.state.reward_rate).unwrap_or(0)
        .checked_mul(time_passed as u64).unwrap_or(0)
        .checked_div(1_000_000_000).unwrap_or(0);
    let total_rewards = stake_account.rewards_earned + new_rewards;
    
    require!(total_rewards > 0, WUSDError::NoRewardsToClaim);

    let seeds = &[
        b"state".as_ref(),
        &[ctx.bumps.state],
    ];
    let signer = &[&seeds[..]];

    let mint_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        token::MintTo {
            mint: ctx.accounts.wusd_mint.to_account_info(),
            to: ctx.accounts.user_wusd.to_account_info(),
            authority: ctx.accounts.state.to_account_info(),
        },
        signer,
    );
    token::mint_to(mint_ctx, total_rewards)?;

    stake_account.rewards_earned = 0;
    stake_account.last_update_time = now;
    stake_account.status = SoftStakingStatus::Claimed;

    emit!(SoftClaimEvent {
        user: ctx.accounts.user.key(),
        amount: total_rewards,
        access_key: stake_account.access_key,
    }); 
    Ok(())
}

/// 计算软质押奖励
/// * `amount` - 质押金额
/// * `apy` - 年化收益率
/// * `duration` - 质押时长（秒）
pub fn calculate_rewards(amount: u64, apy: u64, duration: i64) -> u64 {
    let seconds_per_year: u128 = 365 * 24 * 60 * 60;
    let scale: u128 = 1_000_000;
    amount.checked_mul(apy).unwrap_or(0)
        .checked_mul(duration as u64).unwrap_or(0)
        .checked_div((seconds_per_year * scale) as u64).unwrap_or(0)
}