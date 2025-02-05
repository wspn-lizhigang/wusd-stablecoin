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

pub fn require_has_access(
    user: Pubkey,
    _is_debit: bool,
    _amount: Option<u64>,
    pause_state: &PauseState,
    access_registry: Option<&AccessRegistryState>,
) -> Result<()> {
    // 检查合约是否暂停
    pause_state.validate_not_paused()?;
    
    // 如果提供了访问注册表，检查用户是否在白名单中
    if let Some(registry) = access_registry {
        require!(registry.has_access(user), WusdError::AccessDenied);
    }
    
    Ok(())
}

#[program]
pub mod wusd_token {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, decimals: u8) -> Result<()> {
        // 初始化权限状态
        ctx.accounts.authority_state.set_inner(
            AuthorityState::initialize(ctx.accounts.authority.key())
        );
        
        // 初始化铸币状态
        ctx.accounts.mint_state.set_inner(
            MintState::initialize(
                ctx.accounts.mint.key(),
                decimals
            )?
        );
        
        // 初始化暂停状态
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

    pub fn mint(ctx: Context<MintAccounts>, amount: u64) -> Result<()> {
        // 验证铸币权限
        require!(
            ctx.accounts.authority_state.is_minter(ctx.accounts.authority.key()),
            crate::WusdError::NotMinter
        );
        
        // 统一校验
        require_has_access(
            ctx.accounts.token_account.owner,
            false,
            None,
            &ctx.accounts.pause_state,
            None
        )?;
        
        // 执行铸币
        token::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.token_account.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            amount,
        )?;
        
        emit!(MintEvent {
            minter: ctx.accounts.authority.key(),
            recipient: ctx.accounts.token_account.key(),
            amount: amount
        });
        
        Ok(())
    } 
    pub fn burn(ctx: Context<Burn>, amount: u64) -> Result<()> {
        // 验证销毁权限
        require!(
            ctx.accounts.authority_state.is_burner(ctx.accounts.authority.key()),
            crate::WusdError::NotBurner
        );
        
        // 统一校验
        require_has_access(
            ctx.accounts.token_account.owner,
            true,
            None,
            &ctx.accounts.pause_state,
            None
        )?;
        
        // 验证余额充足
        require!(
            ctx.accounts.token_account.amount >= amount,
            crate::WusdError::InsufficientBalance
        );
        
        // 执行销毁
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
        // 统一校验发送方和接收方
        require_has_access(
            ctx.accounts.from_token.owner,
            true,
            Some(amount),
            &ctx.accounts.pause_state,
            None
        )?;
        
        require_has_access(
            ctx.accounts.to_token.owner,
            false,
            None,
            &ctx.accounts.pause_state,
            None
        )?;
        
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

    pub fn transfer_from(ctx: Context<TransferFrom>, amount: u64) -> Result<()> {
        // 统一校验发送方和接收方
        require_has_access(
            ctx.accounts.from_token.owner,
            true,
            Some(amount),
            &ctx.accounts.pause_state,
            None
        )?;
        
        require_has_access(
            ctx.accounts.to_token.owner,
            false,
            None,
            &ctx.accounts.pause_state,
            None
        )?;
        
        // 验证授权额度
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

    pub fn permit(ctx: Context<Permit>, amount: u64, deadline: i64, _signature: [u8; 64]) -> Result<()> {
        ctx.accounts.pause_state.validate_not_paused()?;
        
        require!(Clock::get()?.unix_timestamp <= deadline, crate::WusdError::ExpiredPermit);
        
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
        // ERC20 interface ID: 0x36372b07
        let erc20_interface_id: [u8; 4] = [0x36, 0x37, 0x2b, 0x07];
        // ERC20Permit interface ID: 0x7965db0b
        let permit_interface_id: [u8; 4] = [0x79, 0x65, 0xdb, 0x0b];
        
        Ok(interface_id == erc20_interface_id || interface_id == permit_interface_id)
    } 

#[derive(Accounts)]
pub struct SupportsInterface<'info> {
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(init, payer = authority, space = 8 + 32 + 32 + 32)]
    pub authority_state: Account<'info, AuthorityState>,
    #[account(init, payer = authority, space = 8 + 32 + 1)]
    pub mint_state: Account<'info, MintState>,
    #[account(init, payer = authority, space = 8 + 1)]
    pub pause_state: Account<'info, PauseState>,
    pub mint: Account<'info, Mint>,
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
    /// CHECK: 这个账户只用于标识 spender 的地址，不需要进行额外的安全检查
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
    /// CHECK: 这个账户只用于标识 spender 的地址，不需要进行额外的安全检查
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
    /// CHECK: 这个账户只用于标识接收方的地址，不需要进行额外的安全检查
    #[account(mut)]
    pub to: AccountInfo<'info>,
    #[account(mut)]
    pub from_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub to_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    #[account(mut)]
    pub pause_state: Account<'info, PauseState>,
}

#[derive(Accounts)]
pub struct TransferFrom<'info> {
    #[account(mut)]
    pub spender: Signer<'info>,
    /// CHECK: 这个账户只用于标识发送方的地址，不需要进行额外的安全检查
    #[account(mut)]
    pub from: AccountInfo<'info>,
    /// CHECK: 这个账户只用于标识接收方的地址，不需要进行额外的安全检查
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
}

#[derive(Accounts)]
pub struct Permit<'info> {
    /// CHECK: 这个账户只用于标识 owner 的地址，不需要进行额外的安全检查
pub owner: AccountInfo<'info>,
    /// CHECK: 这个账户只用于标识 spender 的地址，不需要进行额外的安全检查
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
    pub pause_state: Account<'info, PauseState>
}
}



