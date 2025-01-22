
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::StateAccount;
use crate::error::WUSDError;
use crate::instructions::stake::StakeAccount;
use crate::StakingStatus;
use crate::ClaimType;

/// 提现指令的账户参数
#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub user_wusd: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub stake_vault: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"stake", user.key().as_ref()],
        bump,
        constraint = stake_account.owner == user.key()
    )]
    pub stake_account: Account<'info, StakeAccount>,
    
    #[account(
        mut,
        seeds = [b"state"],
        bump,
        constraint = !state.paused @ WUSDError::ContractPaused
    )]
    pub state: Account<'info, StateAccount>,
    
    pub token_program: Program<'info, Token>,
}

/// 提现事件，记录提现操作的详细信息
#[event]
pub struct WithdrawEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub penalty: u64,
    pub is_emergency: bool,
    pub timestamp: i64,
}

/// 执行提现操作
/// * `ctx` - 提现上下文
/// * `amount` - 提现金额
/// * `is_emergency` - 是否为紧急提现
pub fn withdraw(ctx: Context<Withdraw>, amount: u64, is_emergency: bool) -> Result<()> {
    let stake_account = &mut ctx.accounts.stake_account;
    require!(amount > 0 && amount <= stake_account.amount, WUSDError::InvalidAmount);
    require!(stake_account.status == StakingStatus::Active, WUSDError::InvalidStakingStatus);

    let now = Clock::get()?.unix_timestamp;
    
    // 计算质押时长和奖励
    let _time_passed = now - stake_account.last_update_time;
    let staking_period = now - stake_account.start_time;
    
    let apy = ctx.accounts.state.reward_rate;
    let mut final_amount = amount;
    let mut penalty = 0u64;
    
    if is_emergency {
        // 紧急提现检查冷却期
        require!(now >= stake_account.emergency_cooldown, WUSDError::EmergencyWithdrawCooldown);
        
        // 提前终止使用当前奖励率，并收取惩罚
        penalty = amount.checked_mul(ctx.accounts.state.emergency_withdraw_penalty)
            .ok_or(WUSDError::MathOverflow)?
            .checked_div(1_000_000_000)
            .ok_or(WUSDError::MathOverflow)?;
        final_amount = amount.checked_sub(penalty).ok_or(WUSDError::MathOverflow)?;
        stake_account.claim_type = ClaimType::Prematured;
    } else {
        // 普通提现检查锁定期
        require!(now >= stake_account.end_time, WUSDError::StakeLocked);
        stake_account.claim_type = ClaimType::Matured;
    }
    
    // 计算奖励
    let rewards = stake_account.amount
        .checked_mul(apy).unwrap_or(0)
        .checked_mul(staking_period as u64).unwrap_or(0)
        .checked_div(365 * 24 * 60 * 60 * 1_000_000_000).unwrap_or(0);
    stake_account.rewards_earned += rewards;

    // 从质押保险库转出代币
    let seeds = &[
        b"state".as_ref(),
        &[ctx.bumps.state],
    ];
    let signer = &[&seeds[..]];

    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.stake_vault.to_account_info(),
            to: ctx.accounts.user_wusd.to_account_info(),
            authority: ctx.accounts.state.to_account_info(),
        },
        signer,
    );
    token::transfer(transfer_ctx, final_amount)?;

    // 更新状态
    stake_account.amount -= amount;
    stake_account.last_update_time = now;
    if stake_account.amount == 0 {
        stake_account.status = StakingStatus::Claimed;
        // 设置紧急提现冷却期
        if is_emergency {
            stake_account.emergency_cooldown = now + ctx.accounts.state.emergency_cooldown_duration;
        }
    }
    ctx.accounts.state.total_staked -= amount;

    emit!(WithdrawEvent {
        user: ctx.accounts.user.key(),
        amount: final_amount,
        penalty,
        is_emergency,
        timestamp: now,
    });

    Ok(())
}