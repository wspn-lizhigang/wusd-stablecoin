#![allow(clippy::result_large_err)]
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

mod instructions;
mod state;
mod error;

use crate::instructions::*;
use state::*;
use error::*;
use crate::instructions::stake::{StakingStatus, ClaimType};

declare_id!("B7EV2BY6dWzjcPYnHL5UympTZzGtMZGRJ3KyGhv5AfJ4");

#[program]
pub mod wusd_stablecoin {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        decimals: u8,
    ) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.authority = ctx.accounts.authority.key();
        state.wusd_mint = ctx.accounts.wusd_mint.key();
        state.usdc_mint = ctx.accounts.usdc_mint.key();
        state.treasury = ctx.accounts.treasury.key();
        state.total_supply = 0;
        state.decimals = decimals;
        state.paused = false;
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        instructions::withdraw::withdraw(ctx, amount, false)
    }

    pub fn swap(
        ctx: Context<Swap>,
        amount_in: u64,
        min_amount_out: u64,
        is_usdc_to_wusd: bool,
    ) -> Result<()> {
        instructions::swap::swap(ctx, amount_in, min_amount_out, is_usdc_to_wusd)
    }

    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        instructions::stake::stake(ctx, amount, 0) // 默认锁定期为0
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        instructions::stake::claim(ctx)
    }

    pub fn pause(ctx: Context<AdminOnly>) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.state.authority,
            WUSDError::Unauthorized
        );
        ctx.accounts.state.paused = true;
        emit!(PauseEvent {});
        Ok(())
    }

    pub fn unpause(ctx: Context<AdminOnly>) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.state.authority,
            WUSDError::Unauthorized
        );
        ctx.accounts.state.paused = false;
        emit!(UnpauseEvent {});
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + StateAccount::LEN,
        seeds = [b"state"],
        bump
    )]
    pub state: Account<'info, StateAccount>,
    
    pub wusd_mint: Account<'info, Mint>,
    pub usdc_mint: Account<'info, Mint>,
    pub treasury: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct AdminOnly<'info> {
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"state"],
        bump,
    )]
    pub state: Account<'info, StateAccount>,
}

#[event]
pub struct PauseEvent {}

#[event]
pub struct UnpauseEvent {}
