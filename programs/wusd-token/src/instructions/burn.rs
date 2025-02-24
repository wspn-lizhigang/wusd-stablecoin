use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint}; 
use crate::{AccessLevel, error::WusdError};
use crate::state::{AuthorityState, MintState, AccessRegistryState, PauseState};

/// 销毁WUSD代币
/// * `ctx` - 销毁上下文
/// * `amount` - 销毁数量
pub fn burn(ctx: Context<Burn>, amount: u64) -> Result<()> {
    // 验证合约未暂停
    ctx.accounts.pause_state.validate_not_paused()?;

    // 验证调用者权限
    require!(
        ctx.accounts.authority.is_signer,
        WusdError::Unauthorized
    ); 

    // 验证 token account 的所有者
    require!(
        ctx.accounts.token_account.owner == ctx.accounts.authority.key(),
        WusdError::InvalidOwner
    );

    // 验证访问权限
    require!(
        ctx.accounts.access_registry.has_access(
            ctx.accounts.authority.key(),
            AccessLevel::Debit
        ),
        WusdError::AccessDenied
    );

    // 验证余额充足
    require!(
        ctx.accounts.token_account.amount >= amount,
        WusdError::InsufficientBalance
    );

    // 执行销毁操作
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Burn {
                mint: ctx.accounts.mint.to_account_info(),
                from: ctx.accounts.token_account.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        ),
        amount,
    )?;

    emit!(BurnEvent {
        burner: ctx.accounts.authority.key(),
        amount
    });

    Ok(())
} 

#[derive(Accounts)]
pub struct Burn<'info> {
    #[account(mut)]
    pub authority_state: Account<'info, AuthorityState>, 
    #[account(mut)]
    pub mint_authority: Signer<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>, 
    pub mint_state: Account<'info, MintState>,
    pub pause_state: Account<'info, PauseState>,
    pub access_registry: Account<'info, AccessRegistryState>, 
} 

/// 销毁事件，记录代币销毁的详细信息
#[event]
pub struct BurnEvent {
    /// 销毁者地址，执行销毁操作的账户
    pub burner: Pubkey,
    /// 销毁数量，被销毁的代币数量
    pub amount: u64,
}