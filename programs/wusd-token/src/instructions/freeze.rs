use anchor_lang::prelude::*; 
use crate::error::WusdError;   
use crate::state::{FreezeState, AuthorityState}; 

/// 操作员管理账户结构体
#[derive(Accounts)]
pub struct FreezeAccount<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init_if_needed,
        payer = authority,
        space = FreezeState::SIZE,
        seeds = [b"freeze", account.key().as_ref()],
        bump
    )]
    pub freeze_state: Account<'info, FreezeState>,

    /// 要冻结的账户
    /// CHECK: 这个账户仅用于生成PDA种子
    pub account: AccountInfo<'info>,

    pub authority_state: Account<'info, AuthorityState>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UnfreezeAccount<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"freeze", account.key().as_ref()],
        bump,
        constraint = freeze_state.is_frozen @ WusdError::AccountNotFrozen
    )]
    /// CHECK: 这个账户的安全性由FreezeState结构和程序逻辑保证
    pub freeze_state: Account<'info, FreezeState>,

    /// 要解冻的账户
    /// CHECK: 这个账户仅用于生成PDA种子
    pub account: AccountInfo<'info>,

    pub authority_state: Account<'info, AuthorityState>,
}

/// 账户冻结事件
#[event]
pub struct AccountFrozen {
    /// 被冻结的账户地址
    pub account: Pubkey,
    /// 冻结操作执行者
    pub frozen_by: Pubkey,
    /// 冻结原因
    pub reason: String,
    /// 冻结时间
    pub frozen_time: i64,
}

/// 账户解冻事件
#[event]
pub struct AccountUnfrozen {
    /// 被解冻的账户地址
    pub account: Pubkey,
    /// 解冻操作执行者
    pub unfrozen_by: Pubkey,
    /// 解冻时间
    pub unfrozen_time: i64,
}  
 
/// 冻结账户
pub fn freeze_account(ctx: Context<FreezeAccount>, reason: String) -> Result<()> {
    // 验证管理员权限
    require!(
        ctx.accounts.authority_state.is_admin(ctx.accounts.authority.key()),
        WusdError::Unauthorized
    );

    // 验证账户未被冻结
    require!(
        !ctx.accounts.freeze_state.is_frozen,
        WusdError::AccountAlreadyFrozen
    );

    // 冻结账户
    ctx.accounts.freeze_state.freeze(reason)?;

    // 发出冻结事件
    emit!(FreezeAccountEvent {
        authority: ctx.accounts.authority.key(),
        freeze_state: ctx.accounts.freeze_state.key(),
        reason: ctx.accounts.freeze_state.reason.clone(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

/// 解冻账户
pub fn unfreeze_account(ctx: Context<UnfreezeAccount>) -> Result<()> {
    // 验证管理员权限
    require!(
        ctx.accounts.authority_state.is_admin(ctx.accounts.authority.key()),
        WusdError::Unauthorized
    );

    // 验证账户已被冻结
    require!(
        ctx.accounts.freeze_state.is_frozen,
        WusdError::AccountNotFrozen
    );

    // 解冻账户
    ctx.accounts.freeze_state.unfreeze();

    // 发出解冻事件
    emit!(UnfreezeAccountEvent {
        authority: ctx.accounts.authority.key(),
        freeze_state: ctx.accounts.freeze_state.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[event]
pub struct FreezeAccountEvent {
    pub authority: Pubkey,
    pub freeze_state: Pubkey,
    pub reason: String,
    pub timestamp: i64,
}

#[event]
pub struct UnfreezeAccountEvent {
    pub authority: Pubkey,
    pub freeze_state: Pubkey,
    pub timestamp: i64,
}