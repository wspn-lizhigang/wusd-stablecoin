use anchor_lang::prelude::*; 
use crate::error::WusdError;   
use crate::state::{FreezeState, AuthorityState};   

pub fn initialize_freeze_state(ctx: Context<InitializeFreezeState>) -> Result<()> {
    ctx.accounts.freeze_state.is_frozen = false;
    Ok(())
}
/// 冻结账户
pub fn freeze_account(ctx: Context<FreezeAccount>) -> Result<()> {
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
    ctx.accounts.freeze_state.freeze()?;

    // 发出冻结事件
    emit!(FreezeAccountEvent {
        authority: ctx.accounts.authority.key(),
        freeze_state: ctx.accounts.freeze_state.key(),
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

#[derive(Accounts)]
pub struct InitializeFreezeState<'info> {
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = FreezeState::SIZE,
        seeds = [b"freeze", token_account.key().as_ref()],
        bump
    )]
    pub freeze_state: Account<'info, FreezeState>,
    /// CHECK: Token account being frozen/unfrozen
    pub token_account: AccountInfo<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

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

#[event]
pub struct FreezeAccountEvent {
    pub authority: Pubkey,
    pub freeze_state: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct UnfreezeAccountEvent {
    pub authority: Pubkey,
    pub freeze_state: Pubkey,
    pub timestamp: i64,
}