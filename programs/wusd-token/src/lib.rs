use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint};

mod error;
mod state;

use state::{AuthorityState, MintState, PauseState, AllowanceState, PermitState, AccessRegistryState};
use error::WusdError;

declare_id!("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

#[event]
pub struct InitializeEvent {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub decimals: u8,
}

#[event]
pub struct MintEvent {
    pub minter: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
}

#[event]
pub struct BurnEvent {
    pub burner: Pubkey,
    pub amount: u64,
}

#[event]
pub struct TransferEvent {
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum AccessLevel {
    Debit,
    Credit,
}

pub fn require_has_access(
    user: Pubkey,
    is_debit: bool,
    amount: Option<u64>,
    pause_state: &PauseState,
    access_registry: Option<&AccessRegistryState>,
) -> Result<()> {
    pause_state.validate_not_paused()?;

    if let Some(amount) = amount {
        require!(amount > 0, WusdError::InvalidAmount);
    }

    if let Some(registry) = access_registry {
        let required_level = if is_debit {
            AccessLevel::Debit
        } else {
            AccessLevel::Credit
        };
        require!(
            registry.has_access(user, required_level),
            WusdError::AccessDenied
        );
    }

    Ok(())
}

fn verify_signature(message: &[u8], signature: &[u8; 64], pubkey: &[u8; 32]) -> Result<()> {
    // 使用anchor_lang提供的solana_program进行签名验证
    use anchor_lang::solana_program::ed25519_program::ID;
    let instruction = anchor_lang::solana_program::instruction::Instruction {
        program_id: ID,
        accounts: vec![],
        data: [message, pubkey, signature].concat(),
    };

    if let Err(_) = anchor_lang::solana_program::program::invoke(&instruction, &[]) {
        return Err(error!(WusdError::InvalidSignature));
    }

    Ok(())
}

#[program]
pub mod wusd_token {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, decimals: u8) -> Result<()> {
        ctx.accounts.authority_state.set_inner(
            AuthorityState::initialize(ctx.accounts.authority.key())
        );

        ctx.accounts.mint_state.set_inner(
            MintState::initialize(
                ctx.accounts.mint.key(),
                decimals
            )?
        );

        ctx.accounts.pause_state.set_inner(
            PauseState::initialize()
        );

        emit!(InitializeEvent {
            authority: ctx.accounts.authority.key(),
            mint: ctx.accounts.mint.key(),
            decimals: decimals
        });

        Ok(())
    }

    pub fn mint(ctx: Context<MintAccounts>, amount: u64, bump: u8) -> Result<()> {
        require!(amount > 0, WusdError::InvalidAmount);
        require!(
            ctx.accounts.authority.is_signer,
            WusdError::Unauthorized
        );

        require!(
            ctx.accounts.authority_state.is_minter(ctx.accounts.authority.key()),
            WusdError::NotMinter
        );

        require_has_access(
            ctx.accounts.token_account.owner,
            false,
            None,
            &ctx.accounts.pause_state,
            Some(&ctx.accounts.access_registry) 
        )?;

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.token_account.to_account_info(),
                    authority: ctx.accounts.authority_state.to_account_info(),
                },
                &[&[b"authority", &[bump]]]
            ),
            amount,
        )?;

        emit!(MintEvent {
            minter: ctx.accounts.authority.key(),
            recipient: ctx.accounts.token_account.owner,
            amount: amount
        });

        Ok(())
    }

    pub fn burn(ctx: Context<Burn>, amount: u64) -> Result<()> {
        require!(
            ctx.accounts.authority.is_signer,
            WusdError::Unauthorized
        );

        require!(
            ctx.accounts.authority_state.is_burner(ctx.accounts.authority.key()),
            WusdError::NotBurner
        );

        require_has_access(
            ctx.accounts.token_account.owner,
            true,
            None,
            &ctx.accounts.pause_state,
            Some(&ctx.accounts.access_registry) 
        )?;

        require!(
            ctx.accounts.token_account.amount >= amount,
            WusdError::InsufficientBalance
        );

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
            amount: amount
        });

        Ok(())
    }

    pub fn transfer(ctx: Context<Transfer>, amount: u64) -> Result<()> {
        require!(amount > 0, WusdError::InvalidAmount);

        let from = ctx.accounts.from_token.clone();
        let to = ctx.accounts.to_token.clone();

        require_has_access(
            from.owner,
            true,
            Some(amount),
            &ctx.accounts.pause_state,
            Some(&ctx.accounts.access_registry) 
        )?;

        require_has_access(
            to.owner,
            false,
            None,
            &ctx.accounts.pause_state,
            Some(&ctx.accounts.access_registry) 
        )?;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: from.to_account_info(),
                    to: to.to_account_info(),
                    authority: ctx.accounts.from.to_account_info(),
                }
            ),
            amount,
        )?;

        emit!(TransferEvent {
            from: from.owner,
            to: to.owner,
            amount,
            timestamp: Clock::get()?.unix_timestamp
        });

        Ok(())
    }

    pub fn transfer_from(ctx: Context<TransferFrom>, amount: u64) -> Result<()> {
        require_has_access(
            ctx.accounts.from_token.owner,
            true,
            Some(amount),
            &ctx.accounts.pause_state,
            Some(&ctx.accounts.access_registry) 
        )?;

        require_has_access(
            ctx.accounts.to_token.owner,
            false,
            None,
            &ctx.accounts.pause_state,
            Some(&ctx.accounts.access_registry) 
        )?;

        let allowance = &mut ctx.accounts.allowance;
        allowance.validate_allowance(amount)?;
        allowance.decrease_allowance(amount)?;

        let cpi_accounts = token::Transfer {
            from: ctx.accounts.from_token.to_account_info(),
            to: ctx.accounts.to_token.to_account_info(),
            authority: ctx.accounts.from.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::transfer(cpi_ctx, amount)?;

        Ok(())
    }

    pub fn permit(ctx: Context<Permit>, amount: u64, deadline: i64, signature: [u8; 64]) -> Result<()> {
        let owner = ctx.accounts.owner.key();
        let spender = ctx.accounts.spender.key();

        let message = format!(
            "Permit WUSD transfer:\nOwner: {}\nSpender: {}\nAmount: {}\nDeadline: {}",
            owner, spender, amount, deadline
        );
        let message_bytes = message.as_bytes();
        let message_hash = &solana_program::keccak::hashv(&[message_bytes]);

        verify_signature(message_hash.as_ref(), &signature, &owner.to_bytes())?;

        require!(Clock::get()?.unix_timestamp <= deadline, WusdError::ExpiredPermit);

        let permit_state = &mut ctx.accounts.permit_state;
        permit_state.validate_nonce(permit_state.nonce)?;
        permit_state.increment_nonce();

        let allowance = &mut ctx.accounts.allowance;
        allowance.set_inner(AllowanceState::initialize(
            ctx.accounts.owner.key(),
            ctx.accounts.spender.key(),
            amount
        ));

        Ok(())
    }

    pub fn supports_interface(_ctx: Context<SupportsInterface>, interface_id: [u8; 4]) -> Result<bool> {
        let erc20_interface_id: [u8; 4] = [0x36, 0x37, 0x2b, 0x07];
        let permit_interface_id: [u8; 4] = [0x79, 0x65, 0xdb, 0x0b];

        Ok(interface_id == erc20_interface_id || interface_id == permit_interface_id)
    }

    pub fn set_paused(ctx: Context<SetPaused>, paused: bool) -> Result<()> {
        require!(
            ctx.accounts.authority_state.is_admin(ctx.accounts.authority.key()),
            WusdError::Unauthorized
        );
        ctx.accounts.pause_state.set_paused(paused);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct SupportsInterface<'info> {
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(decimals: u8)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        mint::decimals = decimals,
        mint::authority = authority_state,
        seeds = [b"wusd-mint"],
        bump
    )]
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = authority,
        seeds = [b"authority"],
        bump,
        space = 8 + 32 + 32 + 32
    )]
    pub authority_state: Account<'info, AuthorityState>,
    #[account(init, payer = authority, space = 8 + 32 + 1)]
    pub mint_state: Account<'info, MintState>,
    #[account(init, payer = authority, space = 8 + 1)]
    pub pause_state: Account<'info, PauseState>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MintAccounts<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub authority_state: Account<'info, AuthorityState>,
    pub mint_state: Account<'info, MintState>,
    pub pause_state: Account<'info, PauseState>,
    pub access_registry: Account<'info, AccessRegistryState>,
}

#[derive(Accounts)]
pub struct Burn<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub authority_state: Account<'info, AuthorityState>,
    pub mint_state: Account<'info, MintState>,
    pub pause_state: Account<'info, PauseState>,
    pub access_registry: Account<'info, AccessRegistryState>,
}

#[derive(Accounts)]
pub struct SetPaused<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub pause_state: Account<'info, PauseState>,
    pub authority_state: Account<'info, AuthorityState>,
}

#[derive(Accounts)]
pub struct RecoverTokens<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub from_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub to_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub authority_state: Account<'info, AuthorityState>,
}

#[derive(Accounts)]
pub struct Approve<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    /// CHECK: This account is not read or written to
    #[account(mut)]
    pub spender: AccountInfo<'info>,
    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + 32 + 32 + 8,
        seeds = [b"allowance", owner.key().as_ref(), spender.key().as_ref()],
        bump
    )]
    pub allowance: Account<'info, AllowanceState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct IncreaseAllowance<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    /// CHECK: This account is not read or written to
    #[account(mut)]
    pub spender: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [b"allowance", owner.key().as_ref(), spender.key().as_ref()],
        bump
    )]
    pub allowance: Account<'info, AllowanceState>,
}

#[derive(Accounts)]
pub struct Transfer<'info> {
    #[account(mut)]
    pub from: Signer<'info>,
    /// CHECK: This account is not read or written to
    #[account(mut)]
    pub to: AccountInfo<'info>,
    #[account(mut)]
    pub from_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub to_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    /// CHECK: This account is not read or written to
    #[account(signer)]
    /// CHECK: This account is not read or written to
    pub owner: AccountInfo<'info>,
    #[account(mut)]
    pub pause_state: Account<'info, PauseState>,
    pub access_registry: Account<'info, AccessRegistryState>,
}

#[derive(Accounts)]
pub struct TransferFrom<'info> {
    #[account(mut)]
    pub spender: Signer<'info>,
    /// CHECK: This account is not read or written to
    #[account(mut)]
    pub from: AccountInfo<'info>,
    /// CHECK: This account is not read or written to
    #[account(mut)]
    pub to: AccountInfo<'info>,
    #[account(mut)]
    pub from_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub to_token: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"allowance", from.key().as_ref(), spender.key().as_ref()],
        bump
    )]
    pub allowance: Account<'info, AllowanceState>,
    pub token_program: Program<'info, Token>,
    #[account(mut)]
    pub pause_state: Account<'info, PauseState>,
    pub access_registry: Account<'info, AccessRegistryState>,
}

#[derive(Accounts)]
pub struct Permit<'info> {
    /// CHECK: This account is not read or written to
    pub owner: AccountInfo<'info>,
    /// CHECK: This account is not read or written to
    #[account(mut)]
    pub spender: AccountInfo<'info>,
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + 32 + 8,
        seeds = [b"permit", owner.key().as_ref()],
        bump
    )]
    pub permit_state: Account<'info, PermitState>,
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + 32 + 32 + 8,
        seeds = [b"allowance", owner.key().as_ref(), spender.key().as_ref()],
        bump
    )]
    pub allowance: Account<'info, AllowanceState>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    #[account(mut)]
    pub pause_state: Account<'info, PauseState>,
}

