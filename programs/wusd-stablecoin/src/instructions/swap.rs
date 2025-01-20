use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use crate::state::StateAccount;
use crate::error::WUSDError;

#[derive(Accounts)]
pub struct Swap<'info> {
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub user_token_in: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_token_out: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub vault_token_in: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub vault_token_out: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    
    #[account(
        mut,
        seeds = [b"state"],
        bump,
        constraint = state.paused == false
    )]
    pub state: Account<'info, StateAccount>,
    
    pub wusd_mint: Account<'info, Mint>,
    pub usdc_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,
}

#[event]
pub struct SwapEvent {
    pub user: Pubkey,
    pub amount_in: u64,
    pub amount_out: u64,
    pub is_usdc_to_wusd: bool,
}

pub fn swap(
    ctx: Context<Swap>,
    amount_in: u64,
    min_amount_out: u64,
    is_usdc_to_wusd: bool,
) -> Result<()> {
    require!(!ctx.accounts.state.paused, WUSDError::ContractPaused);
    require!(amount_in > 0, WUSDError::InvalidAmount);

    let (user_account_in, user_account_out) = if is_usdc_to_wusd {
        (
            ctx.accounts.user_token_in.to_account_info(),
            ctx.accounts.user_token_out.to_account_info(),
        )
    } else {
        (
            ctx.accounts.user_token_in.to_account_info(),
            ctx.accounts.user_token_out.to_account_info(),
        )
    };

    // Calculate amount out based on 1:1 ratio
    let amount_out = amount_in;
    require!(amount_out >= min_amount_out, WUSDError::SlippageExceeded);

    // Transfer tokens from user
    let transfer_in_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: user_account_in,
            to: ctx.accounts.treasury.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    token::transfer(transfer_in_ctx, amount_in)?;

    // Transfer tokens to user
    let seeds = &[
        b"state".as_ref(),
        &[ctx.bumps.state],
    ];
    let signer = &[&seeds[..]];

    let transfer_out_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.treasury.to_account_info(),
            to: user_account_out,
            authority: ctx.accounts.state.to_account_info(),
        },
        signer,
    );
    token::transfer(transfer_out_ctx, amount_out)?;

    emit!(SwapEvent {
        user: ctx.accounts.user.key(),
        amount_in,
        amount_out,
        is_usdc_to_wusd,
    });

    Ok(())
}