use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use crate::state::{StateAccount, PoolStatus};
use crate::error::WUSDError;

/// 质押指令的账户参数
#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct Stake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub user_wusd: Account<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + StakeAccount::LEN,
        seeds = [b"stake", user.key().as_ref()],
        bump
    )]
    pub stake_account: Account<'info, StakeAccount>,
    
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

/// 领取奖励指令的账户参数
#[derive(Accounts)]
pub struct Claim<'info> {
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"stake", user.key().as_ref()],
        bump,
        constraint = stake_account.owner == user.key()
    )]
    pub stake_account: Account<'info, StakeAccount>,
    
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

/// 质押状态枚举
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum StakingStatus {
    Active,
    Claimable,
    Claimed,
}

/// 领取类型枚举
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ClaimType {
    Unclaimed,
    Prematured,
    Matured,
}

/// 质押账户结构体，存储用户的质押信息
#[account]
pub struct StakeAccount {
    pub owner: Pubkey,
    pub staking_pool_id: u64,
    pub amount: u64,
    pub apy: u64,
    pub start_time: i64,
    pub end_time: i64,
    pub claimable_timestamp: i64,
    pub rewards_earned: u64,
    pub status: StakingStatus,
    pub claim_type: ClaimType,
    pub apy_tier: u8,
    pub emergency_cooldown: i64,
    pub last_update_time: i64,
}

impl StakeAccount {
    pub const LEN: usize = 32 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 1 + 1 + 1 + 8 + 8 + 32; // 增加额外的空间
}

/// 质押事件，记录质押操作的详细信息
#[event]
pub struct StakeEvent {
    pub user: Pubkey,
    pub staking_plan_id: u64,
    pub staking_pool_id: u64,
    pub amount: u64,
    pub apy: u64,
    pub start_time: i64,
    pub end_time: i64,
    pub staked_at: i64,
}

/// 领取奖励事件，记录领取操作的详细信息
#[event]
pub struct ClaimEvent {
    pub user: Pubkey,
    pub amount: u64,
}

/// 执行质押操作
/// * `ctx` - 质押上下文
/// * `amount` - 质押金额
/// * `staking_pool_id` - 质押池ID
pub fn stake(
    ctx: Context<Stake>,
    amount: u64,
    staking_pool_id: u64,
) -> Result<()> {
    require!(amount > 0, WUSDError::InvalidAmount);
    require!(staking_pool_id > 0, WUSDError::InvalidPoolId);

    // 获取所有需要的状态值
    let staking_pool = StateAccount::get_staking_pool(staking_pool_id)?;
    require!(staking_pool.status == PoolStatus::Active, WUSDError::InvalidPoolStatus);
    require!(amount >= staking_pool.min_stake_amount, WUSDError::StakingAmountTooLow);
    
    let pool_apy = staking_pool.apy;
    let pool_duration = staking_pool.duration;
    let total_staking_plans = ctx.accounts.state.total_staking_plans;

    // 转移 WUSD 到质押保险库
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_wusd.to_account_info(),
            to: ctx.accounts.stake_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    token::transfer(transfer_ctx, amount)?;

    let now = Clock::get()?.unix_timestamp;
    let stake_account = &mut ctx.accounts.stake_account;
    
    // 如果已经有质押，先计算并更新之前的奖励
    if stake_account.amount > 0 {
        let time_passed = now - stake_account.start_time;
        let rewards = calculate_rewards(
            stake_account.amount,
            stake_account.apy,
            time_passed,
        );
        stake_account.rewards_earned += rewards;
    }

    // 更新质押账户
    stake_account.staking_pool_id = staking_pool_id;
    stake_account.amount = amount;
    stake_account.apy = pool_apy;
    stake_account.start_time = now;
    stake_account.end_time = now + pool_duration;
    stake_account.status = StakingStatus::Active;
    stake_account.claim_type = ClaimType::Unclaimed;
    
    if stake_account.owner == Pubkey::default() {
        stake_account.owner = ctx.accounts.user.key();
    }

    // 更新全局状态
    let state = &mut ctx.accounts.state;
    state.total_staked += amount;
    state.last_update_time = now;

    emit!(StakeEvent {
        user: ctx.accounts.user.key(),
        staking_plan_id: total_staking_plans + 1,
        staking_pool_id,
        amount,
        apy: pool_apy,
        start_time: now,
        end_time: now + pool_duration,
        staked_at: now,
    });

    Ok(())
}

/// 计算质押奖励
/// * `amount` - 质押金额
/// * `apy` - 年化收益率
/// * `duration` - 质押时长（秒）
pub fn calculate_rewards(amount: u64, apy: u64, duration: i64) -> u64 {
    let seconds_per_year: u128 = 365 * 24 * 60 * 60;
    let scale: u128 = 1_000_000;
    ((amount as u128) * (apy as u128) * (duration as u128) / (seconds_per_year * scale)) as u64
}

/// 领取质押奖励
/// * `ctx` - 领取奖励的上下文
pub fn claim(ctx: Context<Claim>) -> Result<()> {
    let stake_account = &mut ctx.accounts.stake_account;
    let now = Clock::get()?.unix_timestamp;
    
    // 计算新的奖励
    let time_passed = now - stake_account.last_update_time;
    let new_rewards = stake_account.amount.checked_mul(ctx.accounts.state.reward_rate).unwrap_or(0)
        .checked_mul(time_passed as u64).unwrap_or(0)
        .checked_div(1_000_000_000).unwrap_or(0);
    let total_rewards = stake_account.rewards_earned + new_rewards;
    
    require!(total_rewards > 0, WUSDError::NoRewardsToClaim);

    // 铸造奖励代币
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

    // 更新状态
    stake_account.rewards_earned = 0;
    stake_account.last_update_time = now;

    emit!(ClaimEvent {
        user: ctx.accounts.user.key(),
        amount: total_rewards,
    }); 
    Ok(())
}