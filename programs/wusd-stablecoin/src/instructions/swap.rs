use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};
use crate::state::StateAccount;
use crate::error::WUSDError;

// 角色定义
pub const CONFIG_SETTER: &[u8] = b"CONFIG_SETTER";
pub const RATE_SETTER: &[u8] = b"RATE_SETTER";

// 最大精度
pub const MAX_DECIMALS: u8 = 18;

// 汇率结构体
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug)]
pub struct Rate {
    pub input: u64,
    pub output: u64,
}

#[derive(Accounts)]
pub struct Swap<'info> {
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub user_token_in: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_token_out: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    
    #[account(
        mut,
        seeds = [b"state"],
        bump,
        constraint = !state.paused @ WUSDError::ContractPaused,
        constraint = state.is_token_whitelisted(user_token_in.mint) @ WUSDError::TokenNotWhitelisted,
        constraint = state.is_token_whitelisted(user_token_out.mint) @ WUSDError::TokenNotWhitelisted
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
    pub token_in: Pubkey,
    pub token_out: Pubkey,
    pub amount_in: u64,
    pub amount_out: u64,
    pub treasury: Pubkey,
    pub timestamp: i64,
}

pub fn swap(
    ctx: Context<Swap>,
    amount_in: u64,
    min_amount_out: u64,
) -> Result<()> {
    require!(!ctx.accounts.state.paused, WUSDError::ContractPaused);
    require!(amount_in > 0, WUSDError::InvalidAmount);
    require!(min_amount_out > 0, WUSDError::InvalidAmount);

    let user_account_in = ctx.accounts.user_token_in.to_account_info();
    let user_account_out = ctx.accounts.user_token_out.to_account_info();

    // Calculate amount out based on exchange rate and decimals
    let amount_out = calculate_output_amount(
        amount_in,
        ctx.accounts.user_token_in.mint,
        ctx.accounts.user_token_out.mint,
        &ctx.accounts.state,
    )?;
    require!(amount_out >= min_amount_out, WUSDError::SlippageExceeded);

    // Transfer tokens from user to treasury
    let transfer_in_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: user_account_in,
            to: ctx.accounts.treasury.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    token::transfer(transfer_in_ctx, amount_in)?;

    // Transfer tokens from treasury to user
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

    let clock = Clock::get()?;
    emit!(SwapEvent {
        user: ctx.accounts.user.key(),
        token_in: ctx.accounts.user_token_in.mint,
        token_out: ctx.accounts.user_token_out.mint,
        amount_in,
        amount_out,
        treasury: ctx.accounts.treasury.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// Helper function to calculate output amount considering exchange rate and decimals
fn calculate_output_amount(
    amount_in: u64,
    token_in_mint: Pubkey,
    token_out_mint: Pubkey,
    state: &StateAccount,
) -> Result<u64> {
    let (in_decimals, out_decimals) = (
        state.get_token_decimals(token_in_mint)?,
        state.get_token_decimals(token_out_mint)?
    );

    // Normalize amount to MAX_DECIMALS precision
    let in_factor = 10u64.pow((MAX_DECIMALS - in_decimals) as u32);
    let normalized_amount = amount_in.checked_mul(in_factor).ok_or(WUSDError::MathOverflow)?;

    // Apply exchange rate
    let rate = state.get_exchange_rate(token_in_mint, token_out_mint)?;
    let amount_with_rate = normalized_amount
        .checked_mul(rate.output).ok_or(WUSDError::MathOverflow)?
        .checked_div(rate.input).ok_or(WUSDError::MathOverflow)?;

    // Convert back to output token decimals
    let out_factor = 10u64.pow((MAX_DECIMALS - out_decimals) as u32);
    let final_amount = amount_with_rate
        .checked_div(out_factor).ok_or(WUSDError::MathOverflow)?;

    Ok(final_amount)
}