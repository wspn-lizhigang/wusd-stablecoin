#![allow(clippy::result_large_err)]
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

mod state;
mod error;
mod base;
mod instructions; 

use state::*;
use error::WUSDError; 
use instructions::swap::*; 
use instructions::stake::*; 
use instructions::softstake::*; 

declare_id!("CtvwimRuMvuURzzRbEiXCB6KhXfvkR97R5XqwvwAmH4v");

#[program]
pub mod wusd_application {
    use super::*; 
    pub fn initialize_stake_account(ctx: Context<InitializeStakeAccount>) -> Result<()> {
        let stake_account = &mut ctx.accounts.stake_account;
        stake_account.owner = ctx.accounts.user.key();
        stake_account.staking_pool_id = 0;
        stake_account.stake_info = Box::new(StakeInfo {
            amount: 0,
            apy: 0,
            rewards_earned: 0,
            apy_tier: 0,
        });
        stake_account.time_info = Box::new(TimeInfo {
            start_time: Clock::get()?.unix_timestamp,
            end_time: 0,
            claimable_timestamp: 0,
            last_update_time: Clock::get()?.unix_timestamp,
        });
        stake_account.status = StakingStatus::Active;
        stake_account.claim_type = ClaimType::Unclaimed;
        Ok(())
    }

    pub fn initialize(ctx: Context<Initialize>, decimals: u8) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.authority = ctx.accounts.authority.key();
        state.token_config = Box::new(TokenConfig {
            wusd_mint: ctx.accounts.wusd_mint.key(),
            collateral_mint: ctx.accounts.collateral_mint.key(),
            treasury: ctx.accounts.treasury.key(),
            total_supply: 0,
            decimals,
            collateral_decimals: 6,
            wusd_decimals: decimals,
        });
        state.staking_config = Box::new(StakingConfig {
            total_staked: 0,
            reward_rate: 100_000,
            last_update_time: Clock::get()?.unix_timestamp,
            emergency_withdraw_penalty: 500_000,
            emergency_cooldown_duration: 24 * 60 * 60,
            total_staking_plans: 0,
        });
        state.paused = false;
        
        state.token_whitelist[0] = (ctx.accounts.wusd_mint.key(), true);
        state.token_whitelist[1] = (ctx.accounts.collateral_mint.key(), true);
        state.token_whitelist[2] = (Pubkey::default(), false);

        state.exchange_rates[0] = (ctx.accounts.wusd_mint.key(), ctx.accounts.collateral_mint.key(), Rate { input: 1_000_000, output: 1_000_000 });
        Ok(())
    }

    pub fn stake(ctx: Context<Stake>, amount: u64, staking_pool_id: u64) -> Result<()> {
        instructions::stake::stake(ctx, amount, staking_pool_id)
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        instructions::stake::claim(ctx)
    }

    pub fn set_pool_address(ctx: Context<PoolAddress>, new_pool_address: Pubkey) -> Result<()> {
        instructions::swap::set_pool_address(ctx, new_pool_address)
    }

    pub fn swap(ctx: Context<Swap>, amount_in: u64, min_amount_out: u64) -> Result<()> {
        instructions::swap::swap(ctx, amount_in, min_amount_out)
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

    pub fn set_config(ctx: Context<SetConfig>, token_mint: Pubkey, decimals: u8) -> Result<()> {
        instructions::swap::set_config(ctx, token_mint, decimals)
    }

    pub fn set_rate(ctx: Context<SetRate>, token_in_mint: Pubkey, token_out_mint: Pubkey, rate: Rate) -> Result<()> {
        instructions::swap::set_rate(ctx, token_in_mint, token_out_mint, rate)
    }

    pub fn soft_stake(ctx: Context<SoftStake>, amount: u64, staking_pool_id: u64, access_key: [u8; 32]) -> Result<()> {
        instructions::softstake::soft_stake_handler(ctx, amount, staking_pool_id, access_key)
    }

    pub fn soft_claim(ctx: Context<SoftClaim>) -> Result<()> {
        instructions::softstake::soft_claim_handler(ctx)
    }

    pub fn set_whitelist_token(ctx: Context<SetWhitelistToken>, token_mint: Pubkey, status: bool) -> Result<()> {
        instructions::swap::set_whitelist_token(ctx, token_mint, status)
    }

    pub fn set_whitelist_tokens(ctx: Context<SetWhitelistToken>, token_mints: Vec<Pubkey>, status: bool) -> Result<()> {
        instructions::swap::set_whitelist_tokens(ctx, token_mints, status)
    }

    pub fn get_pool_address(ctx: Context<PoolAddress>) -> Result<Pubkey> {
        Ok(instructions::swap::get_pool_address(&ctx.accounts.state))
    }
}

/// 初始化指令的账户参数
#[derive(Accounts)]
#[instruction(decimals: u8)]
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
    pub state: Box<Account<'info, StateAccount>>,
    
    pub wusd_mint: Box<Account<'info, Mint>>,
    pub collateral_mint: Box<Account<'info, Mint>>,
    pub treasury: Box<Account<'info, TokenAccount>>,
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
    pub state: Box<Account<'info, StateAccount>>,
}

/// 合约暂停事件
#[event]
pub struct PauseEvent {}

/// 合约恢复事件
#[event]
pub struct UnpauseEvent {}