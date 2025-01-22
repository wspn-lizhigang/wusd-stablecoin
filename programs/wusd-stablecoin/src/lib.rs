#![allow(clippy::result_large_err)]
/// 引入必要的依赖
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

/// 模块导入
mod instructions;
mod state;
mod error;

/// 使用内部模块
use crate::instructions::*;
use state::*;
use error::*;
use crate::instructions::stake::{StakingStatus, ClaimType};

declare_id!("B7EV2BY6dWzjcPYnHL5UympTZzGtMZGRJ3KyGhv5AfJ4");

/// WUSD稳定币程序入口
#[program]
pub mod wusd_stablecoin {
    use super::*;

    /// 初始化WUSD稳定币系统
    /// * `ctx` - 初始化上下文
    /// * `decimals` - 代币精度
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
        Ok(())
    }

    /// 提取质押的代币
    /// * `ctx` - 提取上下文
    /// * `amount` - 提取金额
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        instructions::withdraw::withdraw(ctx, amount, false)
    }

    /// 代币兑换功能
    /// * `ctx` - 兑换上下文
    /// * `amount_in` - 输入金额
    /// * `min_amount_out` - 最小输出金额（滑点保护）
    pub fn swap(
        ctx: Context<Swap>,
        amount_in: u64,
        min_amount_out: u64,
    ) -> Result<()> {
        instructions::swap::swap(ctx, amount_in, min_amount_out)
    }

    /// 质押WUSD代币
    /// * `ctx` - 质押上下文
    /// * `amount` - 质押金额
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

/// 初始化指令的账户参数
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
    pub collateral_mint: Account<'info, Mint>,
    pub treasury: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
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
    pub state: Account<'info, StateAccount>,
}

/// 合约暂停事件
#[event]
pub struct PauseEvent {}

/// 合约恢复事件
#[event]
pub struct UnpauseEvent {}
