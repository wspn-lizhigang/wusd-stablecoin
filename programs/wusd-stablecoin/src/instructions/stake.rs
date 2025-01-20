use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use crate::state::StateAccount;
use crate::error::WUSDError;

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

#[account]
pub struct StakeAccount {
    pub owner: Pubkey,
    pub amount: u64,
    pub rewards_earned: u64,
    pub last_update_time: i64,
}

impl StakeAccount {
    pub const LEN: usize = 32 + 8 + 8 + 8;
}

#[event]
pub struct StakeEvent {
    pub user: Pubkey,
    pub amount: u64,
}

#[event]
pub struct ClaimEvent {
    pub user: Pubkey,
    pub amount: u64,
}

pub fn stake(
    ctx: Context<Stake>,
    amount: u64,
) -> Result<()> {
    require!(amount > 0, WUSDError::InvalidAmount);

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

    // 更新质押账户
    let stake_account = &mut ctx.accounts.stake_account;
    let now = Clock::get()?.unix_timestamp;
    
    if stake_account.amount > 0 {
        // 如果已经有质押，先计算并更新之前的奖励
        let time_passed = now - stake_account.last_update_time;
        let rewards = stake_account.amount.checked_mul(ctx.accounts.state.reward_rate).unwrap_or(0)
            .checked_mul(time_passed as u64).unwrap_or(0)
            .checked_div(1_000_000_000).unwrap_or(0);
        stake_account.rewards_earned += rewards;
    }

    stake_account.amount += amount;
    stake_account.last_update_time = now;
    
    if stake_account.owner == Pubkey::default() {
        stake_account.owner = ctx.accounts.user.key();
    }

    // 更新全局状态
    ctx.accounts.state.total_staked += amount;
    ctx.accounts.state.last_update_time = now;

    emit!(StakeEvent {
        user: ctx.accounts.user.key(),
        amount,
    });

    Ok(())
}

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