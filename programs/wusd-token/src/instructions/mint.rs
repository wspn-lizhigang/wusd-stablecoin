use anchor_lang::prelude::*;
use crate::error::WusdError;   
use anchor_spl::token::{self, Token, TokenAccount};
use crate::utils::require_has_access;
use crate::state::{AuthorityState, MintState, PauseState, AccessRegistryState};

pub fn mint(ctx: Context<MintAccounts>, amount: u64, bump: u8) -> Result<()> {
    // 验证Minter权限 
    require!(
        ctx.accounts.authority_state.is_minter(ctx.accounts.authority.key()), 
        WusdError::NotMinter
    );
    // 验证访问权限
    require_has_access(
        ctx.accounts.authority.key(),
        false,
        Some(amount),
        &ctx.accounts.pause_state,
        Some(&ctx.accounts.access_registry),
    )?;

    // 执行铸币
    let mint_key = ctx.accounts.token_mint.key();
    let seeds = &[b"authority", mint_key.as_ref(), &[bump]];
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                mint: ctx.accounts.token_mint.to_account_info(),
                to: ctx.accounts.token_account.to_account_info(),
                authority: ctx.accounts.authority_state.to_account_info(),
            },
            &[&seeds[..]],
        ),
        amount,
    )?;

    Ok(())
}

#[derive(Accounts)]
#[instruction(amount: u64, bump: u8)]
pub struct MintAccounts<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub token_mint: Account<'info, token::Mint>,
    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    #[account(mut)]
    pub authority_state: Account<'info, AuthorityState>,
    #[account(mut)]
    pub mint_state: Account<'info, MintState>,
    #[account(mut)]
    pub pause_state: Account<'info, PauseState>,
    pub access_registry: Account<'info, AccessRegistryState>,
}