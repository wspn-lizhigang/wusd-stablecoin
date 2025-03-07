#![allow(dead_code)]
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use crate::state::{StateAccount, StakingPool, PoolStatus};
use crate::error::WUSDError;
use crate::instructions::softstake::{SoftStakeAccount, SoftStakingStatus};

#[derive(Accounts)]
pub struct InitializeStakeAccount<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        init,
        payer = user,
        space = 8 + StakeAccount::SIZE,
        seeds = [b"stake", user.key().as_ref()],
        bump
    )]
    pub stake_account: Account<'info, StakeAccount>,
    
    pub system_program: Program<'info, System>,
}


/// 执行质押操作
/// * `ctx` - 质押上下文
/// * `amount` - 质押金额
/// * `staking_pool_id` - 质押池ID
pub fn stake(ctx: Context<Stake>, amount: u64, staking_pool_id: u64) -> Result<()> {
    let stake_account = &mut ctx.accounts.stake_account;
    let now = Clock::get()?.unix_timestamp;
    
    // 从状态账户中获取质押池信息
    let state = &ctx.accounts.state;
    let pool = state.staking_pools.get(staking_pool_id as usize)
        .ok_or(WUSDError::InvalidPoolId)?;
    
    stake_account.stake_info = Box::new(StakeInfo {
        amount,
        apy: pool.apy,
        rewards_earned: 0,
        apy_tier: 0,
    });
    stake_account.time_info = Box::new(TimeInfo {
        start_time: now,
        end_time: now + pool.duration,
        claimable_timestamp: 0,
        last_update_time: now,
    });
    stake_account.status = StakingStatus::Active;
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
    let state = &mut ctx.accounts.state;

    // 验证质押状态
    require!(stake_account.stake_info.amount > 0, WUSDError::InvalidAmount);
    require!(stake_account.status == StakingStatus::Active, WUSDError::InvalidStakingStatus);

    // 计算奖励
    let current_time = Clock::get()?.unix_timestamp;
    let time_staked = current_time - stake_account.time_info.start_time;
    let rewards = (stake_account.stake_info.amount as f64 * state.staking_config.reward_rate as f64 * time_staked as f64) as u64;

    // 更新账户
    stake_account.stake_info.rewards_earned = rewards;
    stake_account.status = StakingStatus::Claimed;

    Ok(())
}

/// 标准化质押金额和 APY
pub fn normalize_staking(
    staked_amount: u64,
    apy: u64,
    start_time: i64,
    upgraded_timestamp: i64,
    is_termination: bool
) -> (u64, u64) {
    let decimal_compensation = 1_000_000_000_000; // 1e12
    
    let mut normalized_staked_amount = staked_amount;
    let mut normalized_apy = if is_termination {
        // 使用基础 APY
        apy
    } else {
        apy
    };
    
    // 如果是升级前创建的质押，需要标准化金额
    if start_time < upgraded_timestamp {
        normalized_staked_amount = normalized_staked_amount.checked_mul(decimal_compensation).unwrap_or(staked_amount);
        normalized_apy = normalized_apy.checked_mul(decimal_compensation).unwrap_or(apy);
    }
    
    (normalized_staked_amount, normalized_apy)
}

/// 计算收益
pub fn calculate_yield(staked_amount: u64, apy: u64, staking_period: u64) -> u64 {
    let seconds_per_year: u128 = 365 * 24 * 60 * 60;
    let scale: u128 = 1_000_000;
    
    ((staked_amount as u128)
        .checked_mul(apy as u128).unwrap_or(0)
        .checked_mul(staking_period as u128).unwrap_or(0)
        .checked_div(seconds_per_year.checked_mul(scale).unwrap_or(1)).unwrap_or(0)) as u64
} 

/// 提取质押的代币
/// * `ctx` - 提取上下文
/// * `amount` - 提取金额
/// * `is_emergency` - 是否紧急提取
pub fn withdraw(
    ctx: Context<Withdraw>,
    amount: u64,
    is_emergency: bool,
) -> Result<()> {
    let stake_account = &mut ctx.accounts.stake_account;
    require!(stake_account.stake_info.amount >= amount, WUSDError::InsufficientBalance);
    require!(stake_account.status == StakingStatus::Active, WUSDError::InvalidStakingStatus);

    let now = Clock::get()?.unix_timestamp;
    let rewards = if !is_emergency {
        calculate_rewards(
            amount,
            stake_account.stake_info.apy,
            now - stake_account.time_info.start_time,
        )
    } else { 0 };

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.stake_vault.to_account_info(),
                to: ctx.accounts.user_wusd.to_account_info(),
                authority: ctx.accounts.state.to_account_info(),
            },
            &[&[b"state".as_ref(), &[ctx.bumps["state"]]]],
        ),
        amount
    )?;

    stake_account.stake_info.amount = stake_account.stake_info.amount.checked_sub(amount).unwrap();
    if stake_account.stake_info.amount == 0 {
        stake_account.status = StakingStatus::Claimed;
        stake_account.claim_type = if is_emergency { ClaimType::Emergency } else { ClaimType::Claimed };
    }

    if is_emergency {
        stake_account.emergency_cooldown = now + ctx.accounts.state.staking_config.emergency_cooldown_duration;
    }

    let state = &mut ctx.accounts.state;
    state.staking_config.total_staked = state.staking_config.total_staked.checked_sub(amount).unwrap();
    state.staking_config.last_update_time = now;

    emit!(WithdrawEvent {
        user: ctx.accounts.user.key(),
        staking_pool_id: stake_account.staking_pool_id,
        amount,
        rewards,
        withdraw_time: now,
        is_emergency,
    });

    Ok(())
}

/// 设置已终止质押计划的冷却期
/// * `ctx` - 设置冷却期的上下文
/// * `user` - 用户地址
/// * `staking_plan_id` - 质押计划ID
/// * `cooldown` - 冷却期时长（秒）
pub fn set_terminated_plan_cooldown(
    ctx: Context<TerminatedPlanCooldown>,
    user: Pubkey,
    staking_plan_id: u64,
    cooldown: i64,
) -> Result<()> {
    require!(!user.eq(&Pubkey::default()), WUSDError::InvalidAddress);
    require!(cooldown > 0, WUSDError::InvalidLockDuration);
    require!(staking_plan_id > 0, WUSDError::InvalidPoolId);
    
    let state = &mut ctx.accounts.state;
    let now = Clock::get()?.unix_timestamp;
    
    if let Some(index) = state.claims.iter().position(|(_, c)| c.owner == Pubkey::default()) {
        state.claims[index] = (user, SoftStakeAccount {
            owner: ctx.accounts.authority.key(),
            staking_pool_id: staking_plan_id,
            amount: 0,
            apy: 0,
            rewards_earned: 0,
            start_time: now,
            end_time: cooldown,
            claimable_timestamp: cooldown,
            last_update_time: now,
            status: SoftStakingStatus::Active,
            access_key: [0; 32]
        });
        Ok(())
    } else {
        err!(WUSDError::NoAvailableWhitelistSlot)
    }
}

/// 获取已终止质押计划的冷却期
/// * `ctx` - 获取冷却期的上下文
/// * `user` - 用户地址
/// * `staking_plan_id` - 质押计划ID
pub fn get_terminated_plan_cooldown(
    ctx: Context<TerminatedPlanCooldown>,
    user: Pubkey,
    staking_plan_id: u64,
) -> Result<i64> {
    let state = &ctx.accounts.state;
    require!(staking_plan_id > 0, WUSDError::InvalidPoolId);
    if let Some((_, claim)) = state.claims.iter().find(|(_, c)| c.owner == user && c.staking_pool_id == staking_plan_id) {
        Ok(claim.end_time)
    } else {
        err!(WUSDError::InvalidStakingPlan)
    }
}

/// 获取所有活跃的质押池信息
pub fn get_general_staking(ctx: Context<TerminatedPlanCooldown>) -> Result<Vec<StakingPoolDetail>> {
    let state = &ctx.accounts.state;
    state.claims.iter().enumerate()
        .filter(|(_, pool)| pool.1.status == SoftStakingStatus::Active)
        .map(|(i, pool)| Ok(StakingPoolDetail {
            staking_pool_id: i as u64,
            staking_pool: StakingPool {
                id: i as u64,
                min_stake_amount: pool.1.amount,
                apy: pool.1.apy,
                duration: pool.1.end_time - pool.1.start_time,
                status: PoolStatus::Active,
            },
        }))
        .collect()
}

/// 获取指定质押池的详细信息
pub fn get_staking_pool_details(ctx: Context<TerminatedPlanCooldown>, staking_pool_id: u64) -> Result<StakingPool> {
    let state = &ctx.accounts.state;
    require!(staking_pool_id < state.staking_pools.len() as u64, WUSDError::InvalidPoolId);
    Ok(state.staking_pools[staking_pool_id as usize].clone())
}

/// 获取用户的所有质押计划
pub fn get_user_staking_plans(ctx: Context<TerminatedPlanCooldown>, user: Pubkey) -> Result<Vec<StakingPlanDetail>> {
    let state = &ctx.accounts.state;
    let mut user_plans = Vec::new();
    
    for (i, claim) in state.claims.iter().enumerate() {
        if claim.1.owner == user {
            user_plans.push(StakingPlanDetail {
                staking_plan_id: i as u64,
                staking_plan: StakingPlan {
                    min_stake_amount: claim.1.amount,
                    apy: claim.1.apy,
                    duration: claim.1.end_time - claim.1.start_time,
                    status: PoolStatus::Active,
                },
            });
        }
    }
    
    Ok(user_plans)
}

/// 更新质押池时长
pub fn update_pool_duration(
    ctx: Context<TerminatedPlanCooldown>,
    pool_id: u64,
    new_duration: i64,
) -> Result<()> {
    require!(new_duration > 0, WUSDError::InvalidLockDuration);
    
    let state = &mut ctx.accounts.state;
    if let Some(pool) = state.staking_pools.iter_mut().find(|p| p.id == pool_id) {
        pool.duration = new_duration;
        Ok(())
    } else {
        err!(WUSDError::InvalidPoolId)
    }
}

/// 质押指令的账户参数
#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + StakeAccount::LEN,
        seeds = [b"stake_account", user.key().as_ref()],
        bump
    )]
    pub stake_account: Box<Account<'info, StakeAccount>>,

    #[account(
        mut,
        seeds = [b"state"],
        bump,
        constraint = !state.paused @ WUSDError::ContractPaused
    )]
    pub state: Box<Account<'info, StateAccount>>,

    pub system_program: Program<'info, System>,
}

/// 质押池管理指令的账户参数
#[derive(Accounts, Clone)]
pub struct StakingPoolAccounts<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"state"],
        bump,
        constraint = !state.paused @ WUSDError::ContractPaused
    )]
    pub state: Box<Account<'info, StateAccount>>,
    
    #[account(mut)]
    pub stake_vault: Box<Account<'info, TokenAccount>>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

/// 领取奖励指令的账户参数
#[derive(Accounts)]
pub struct Claim<'info> {
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"stake_account", user.key().as_ref()],
        bump,
        constraint = stake_account.owner == user.key()
    )]
    pub stake_account: Box<Account<'info, StakeAccount>>,
    
    #[account(mut)]
    pub user_wusd: Box<Account<'info, TokenAccount>>,
    
    #[account(mut)]
    pub wusd_mint: Box<Account<'info, Mint>>,
    
    #[account(
        mut,
        seeds = [b"state"],
        bump,
        constraint = !state.paused @ WUSDError::ContractPaused
    )]
    pub state: Box<Account<'info, StateAccount>>,
    
    pub token_program: Program<'info, Token>,
}

/// 提取质押代币的账户参数
#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"stake_account", user.key().as_ref()],
        bump,
        constraint = stake_account.owner == user.key()
    )]
    pub stake_account: Box<Account<'info, StakeAccount>>,
    
    #[account(mut)]
    pub user_wusd: Box<Account<'info, TokenAccount>>,
    
    #[account(mut)]
    pub stake_vault: Box<Account<'info, TokenAccount>>,
    
    #[account(
        mut,
        seeds = [b"state"],
        bump,
        constraint = !state.paused @ WUSDError::ContractPaused
    )]
    pub state: Box<Account<'info, StateAccount>>,
    
    pub token_program: Program<'info, Token>,
}

/// 提取事件，记录提取操作的详细信息
#[event]
pub struct WithdrawEvent {
    pub user: Pubkey,
    pub staking_pool_id: u64,
    pub amount: u64,
    pub rewards: u64,
    pub withdraw_time: i64,
    pub is_emergency: bool,
}
 
/// 质押状态枚举
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum StakingStatus {
    Active = 0,
    Locked = 1,
    Unlocked = 2,
    Claimed = 3,
}

/// 领取类型枚举
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum ClaimType {
    Unclaimed = 0,
    Claimed = 1,
    Emergency = 2,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StakeInfo {
    pub amount: u64,
    pub apy: u64,
    pub rewards_earned: u64,
    pub apy_tier: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TimeInfo {
    pub start_time: i64,
    pub end_time: i64,
    pub claimable_timestamp: i64,
    pub last_update_time: i64,
}

/// 质押账户结构体，存储用户的质押信息
#[account]
pub struct StakeAccount {
    pub owner: Pubkey,
    pub staking_pool_id: u64,
    pub stake_info: Box<StakeInfo>,
    pub time_info: Box<TimeInfo>,
    pub status: StakingStatus,
    pub claim_type: ClaimType,
    pub emergency_cooldown: i64,
}

impl StakeAccount {
    pub const SIZE: usize = 32 + 8 + 32 + 32 + 1 + 1 + 8;
} 

/// 设置已终止质押计划的冷却期的账户参数
#[derive(Accounts)]
pub struct TerminatedPlanCooldown<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"state"],
        bump,
        constraint = !state.paused @ WUSDError::ContractPaused,
        constraint = state.authority == authority.key() @ WUSDError::Unauthorized
    )]
    pub state: Box<Account<'info, StateAccount>>,
}

/// 质押池详情结构体
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StakingPoolDetail {
    pub staking_pool_id: u64,
    pub staking_pool: StakingPool,
}

/// 质押计划详情结构体
#[derive(AnchorSerialize, AnchorDeserialize, Clone)] 
pub struct StakingPlan {
    pub min_stake_amount: u64,
    pub apy: u64,
    pub duration: i64,
    pub status: PoolStatus,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StakingPlanDetail {
    pub staking_plan_id: u64,
    pub staking_plan: StakingPlan,
}

impl StakeAccount {
    pub const LEN: usize = 32 + // owner
        8 + // amount
        8 + // staking_pool_id
        8 + // apy
        8 + // start_time
        8 + // end_time
        8 + // claimable_timestamp
        8 + // rewards_earned
        1 + // status
        1 + // claim_type
        1 + // apy_tier
        8; // emergency_cooldown
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