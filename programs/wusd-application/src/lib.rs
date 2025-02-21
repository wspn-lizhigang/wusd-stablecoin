//! WUSD Application 程序
//! 
//! 这是一个基于Solana区块链的稳定币应用程序，实现了以下主要功能：
//! - 代币质押与奖励分发
//! - 代币互换与流动性管理
//! - 抵押品管理与清算
//! - 软质押机制
//! - 紧急提现机制
//! - 多级质押池配置

#![allow(clippy::result_large_err)] 
/// 引入必要的依赖
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::error::WUSDError;

mod instructions;
mod state;
mod error;
mod base; 
pub use base::{Base, roles};

use state::*;
use instructions::stake::*; 
use instructions::swap::*;
use instructions::softstake::*;

declare_id!("5SvHeeNmA128wY4pA8GoDeRqnkartjWcHVfAjt8E2MhT");

#[program]
pub mod wusd_application {
    use super::*;

    /// 初始化质押账户
    pub fn initialize_stake_account(ctx: Context<InitializeStakeAccount>) -> Result<()> {
        let stake_account = &mut ctx.accounts.stake_account;
        stake_account.owner = ctx.accounts.user.key();
        stake_account.amount = 0;
        stake_account.staking_pool_id = 0;
        stake_account.apy = 0;
        stake_account.start_time = Clock::get()?.unix_timestamp;
        stake_account.end_time = 0;
        stake_account.claimable_timestamp = 0;
        stake_account.rewards_earned = 0;
        stake_account.status = StakingStatus::Active;
        stake_account.claim_type = ClaimType::Unclaimed;
        stake_account.apy_tier = 0;
        Ok(())
    }

    /// 初始化WUSD稳定币系统
    pub fn initialize(
        ctx: Context<Initialize>,
        decimals: u8,
    ) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.authority = ctx.accounts.authority.key();
        state.wusd_mint = ctx.accounts.wusd_mint.key();
        state.collateral_mint = ctx.accounts.collateral_mint.key();
        state.treasury = ctx.accounts.treasury.key();
        state.total_supply = 0;
        state.decimals = decimals;
        state.paused = false;
        state.total_staked = 0;
        state.reward_rate = 100_000; // 0.0001 WUSD per second
        state.last_update_time = Clock::get()?.unix_timestamp;
        state.emergency_withdraw_penalty = 500_000; // 0.5%
        state.emergency_cooldown_duration = 24 * 60 * 60; // 24 hours
        state.collateral_decimals = 6; // USDC decimals
        state.wusd_decimals = decimals;
        state.total_staking_plans = 0;
        
        // 将WUSD和抵押品代币添加到白名单
        state.token_whitelist[0] = (ctx.accounts.wusd_mint.key(), true);
        state.token_whitelist[1] = (ctx.accounts.collateral_mint.key(), true);
        state.token_whitelist[2] = (Pubkey::default(), false);

        // 初始化汇率
        state.exchange_rates[0] = (ctx.accounts.wusd_mint.key(), ctx.accounts.collateral_mint.key(), Rate { input: 1_000_000, output: 1_000_000 });
        Ok(())
    }

    /// 质押WUSD代币
    pub fn stake(
        ctx: Context<Stake>,
        amount: u64,
        staking_pool_id: u64,
    ) -> Result<()> {
        instructions::stake::stake(ctx, amount, staking_pool_id)
    }

    /// 领取质押奖励
    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        instructions::stake::claim(ctx)
    } 

    /// 设置交易池地址
    pub fn set_pool_address(
        ctx: Context<PoolAddress>,
        new_pool_address: Pubkey,
    ) -> Result<()> {
        instructions::swap::set_pool_address(ctx, new_pool_address)
    }

    /// 代币兑换功能
    pub fn swap(
        ctx: Context<Swap>,
        amount_in: u64,
        min_amount_out: u64,
    ) -> Result<()> {
        instructions::swap::swap(ctx, amount_in, min_amount_out)
    }

    /// 暂停合约
    pub fn pause(ctx: Context<AdminOnly>) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.state.authority,
            WUSDError::Unauthorized
        );
        ctx.accounts.state.paused = true;
        emit!(PauseEvent {});
        Ok(())
    }

    /// 恢复合约
    pub fn unpause(ctx: Context<AdminOnly>) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.state.authority,
            WUSDError::Unauthorized
        );
        ctx.accounts.state.paused = false;
        emit!(UnpauseEvent {});
        Ok(())
    }

    /// 设置代币兑换配置
    pub fn set_config(
        ctx: Context<SetConfig>,
        token_mint: Pubkey,
        decimals: u8,
    ) -> Result<()> {
        instructions::swap::set_config(ctx, token_mint, decimals)
    }

    /// 设置代币兑换汇率
    pub fn set_rate(
        ctx: Context<SetRate>,
        token_in_mint: Pubkey,
        token_out_mint: Pubkey,
        rate: Rate,
    ) -> Result<()> {
        instructions::swap::set_rate(ctx, token_in_mint, token_out_mint, rate)
    }

    /// 软质押WUSD代币
    pub fn soft_stake(ctx: Context<SoftStake>, amount: u64, staking_pool_id: u64, access_key: [u8; 32]) -> Result<()> {
        instructions::softstake::soft_stake_handler(ctx, amount, staking_pool_id, access_key)
    }

    pub fn soft_claim(ctx: Context<SoftClaim>) -> Result<()> {
        instructions::softstake::soft_claim_handler(ctx)
    }

    /// 设置代币白名单状态
    pub fn set_whitelist_token(
        ctx: Context<SetWhitelistToken>,
        token_mint: Pubkey,
        status: bool,
    ) -> Result<()> {
        instructions::swap::set_whitelist_token(ctx, token_mint, status)
    }

    /// 批量设置代币白名单状态
    pub fn set_whitelist_tokens(
        ctx: Context<SetWhitelistToken>,
        token_mints: Vec<Pubkey>,
        status: bool,
    ) -> Result<()> {
        instructions::swap::set_whitelist_tokens(ctx, token_mints, status)
    }

    /// 获取交易池地址
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

/// 初始化质押账户的账户参数
#[derive(Accounts)]
pub struct InitializeStakeAccount<'info> {
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

/// 仅管理员可执行的指令账户参数
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
