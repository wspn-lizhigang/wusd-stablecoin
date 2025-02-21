use anchor_lang::prelude::*;
use crate::error::WusdError;  
use crate::state::{AuthorityState, PauseState};

/// 暂停合约
/// * `ctx` - 上下文
pub fn pause(ctx: Context<Pause>) -> Result<()> {
    require!(
        ctx.accounts.authority_state.is_pauser(ctx.accounts.authority.key()),
        WusdError::NotPauser
    );
    ctx.accounts.pause_state.set_paused(true);
    Ok(())
}

/// 恢复合约
/// * `ctx` - 上下文
pub fn unpause(ctx: Context<Unpause>) -> Result<()> {
    require!(
        ctx.accounts.authority_state.is_pauser(ctx.accounts.authority.key()),
        WusdError::NotPauser
    );
    ctx.accounts.pause_state.set_paused(false);
    Ok(())
}

#[derive(Accounts)]
pub struct Pause<'info> {
    #[account(mut)]
    pub pause_state: Account<'info, PauseState>,
    pub authority: Signer<'info>,
    pub authority_state: Account<'info, AuthorityState>,
}

#[derive(Accounts)]
pub struct Unpause<'info> {
    #[account(mut)]
    pub pause_state: Account<'info, PauseState>,
    pub authority: Signer<'info>,
    pub authority_state: Account<'info, AuthorityState>,
}