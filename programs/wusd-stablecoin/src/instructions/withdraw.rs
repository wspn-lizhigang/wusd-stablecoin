
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::StateAccount;
use crate::error::WUSDError;
use crate::instructions::stake::StakeAccount;

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

#[event]
pub struct WithdrawEvent {
    pub user: Pubkey,
    pub amount: u64,
}

pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let stake_account = &mut ctx.accounts.stake_account;
    require!(amount > 0 && amount <= stake_account.amount, WUSDError::InvalidAmount);

    // 计算并更新奖励
    let now = Clock::get()?.unix_timestamp;
    let time_passed = now - stake_account.last_update_time;
    let rewards = stake_account.amount.checked_mul(ctx.accounts.state.reward_rate).unwrap_or(0)
        .checked_mul(time_passed as u64).unwrap_or(0)
        .checked_div(1_000_000_000).unwrap_or(0);
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
    token::transfer(transfer_ctx, amount)?;

    // 更新状态
    stake_account.amount -= amount;
    stake_account.last_update_time = now;
    ctx.accounts.state.total_staked -= amount;

    emit!(WithdrawEvent {
        user: ctx.accounts.user.key(),
        amount,
    });

    Ok(())
}