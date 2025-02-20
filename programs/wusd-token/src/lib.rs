//! WUSD Token 程序
//! 
//! 这是一个基于Solana区块链的稳定币智能合约，实现了以下主要功能：
//! - 代币的铸造与销毁
//! - 代币转账与余额管理
//! - 授权和委托转账
//! - 权限管理和访问控制
//! - 暂停/恢复机制
//! - EIP-2612兼容的签名许可
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, Mint}; 

mod instructions; 
mod error;
mod state; 
mod utils;

use state::{AuthorityState, MintState, PauseState, AccessRegistryState};

use instructions::mint::*; 
use instructions::burn::*;
use instructions::transfer::*;
use instructions::permit::*;
use instructions::operator::*;
use instructions::pause::*;
use instructions::freeze::*; 

declare_id!("Cnm3HeFNeXhtNzLGut39N138XRJAHE4hJsv7kreGjQuj");

#[derive(Accounts)]
#[instruction(decimals: u8)]
pub struct Initialize<'info> {
    /// 管理员账户
    #[account(mut)]
    pub authority: Signer<'info>,

    /// 权限管理账户
    #[account(
        init,
        payer = authority, 
        space = AuthorityState::SIZE,
        seeds = [b"authority", token_mint.key().as_ref()],
        bump
    )]
    pub authority_state: Account<'info, AuthorityState>,

    /// 代币铸币账户 
    #[account(
        init,
        payer = authority,
        mint::decimals = decimals,
        mint::authority = authority.key()
    )]
    pub token_mint: Account<'info, Mint>,

    /// 铸币状态账户
    #[account(
        init,
        payer = authority, 
        space = MintState::SIZE,
        seeds = [b"mint_state", token_mint.key().as_ref()],
        bump
    )]
    pub mint_state: Account<'info, MintState>,

    /// 暂停状态账户
    #[account(
        init,
        payer = authority, 
        space = PauseState::SIZE,
        seeds = [b"pause_state", token_mint.key().as_ref()],
        bump
    )]
    pub pause_state: Account<'info, PauseState>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}   

#[derive(Accounts)]
pub struct InitializeAccessRegistry<'info> {
    #[account(mut)]
    pub authority: Signer<'info>, 
     
    #[account(
        init,
        payer = authority, 
        space = AccessRegistryState::SIZE,
        seeds = [b"access_registry"],
        bump
    )]
    pub access_registry: Account<'info, AccessRegistryState>,

    pub system_program: Program<'info, System>,
}   

/// 访问级别枚举，用于控制账户的操作权限
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum AccessLevel {
    /// 允许扣款操作，如转出、销毁等
    Debit,
    /// 允许入账操作，如接收转账、铸币等
    Credit,
}  

/// 初始化事件，记录代币初始化的关键信息
#[event]
pub struct InitializeEvent {
    /// 管理员地址，负责合约的权限管理
    pub authority: Pubkey,
    /// 代币铸币权地址，用于控制代币的发行
    pub mint: Pubkey,
    /// 代币精度，定义代币的最小单位
    pub decimals: u8,
}  

#[program]
pub mod wusd_token {
    use super::*; 
    pub fn initialize_access_registry(ctx: Context<InitializeAccessRegistry>) -> Result<()> {
        let access_registry = &mut ctx.accounts.access_registry;
        access_registry.authority = ctx.accounts.authority.key();
        access_registry.operator_count = 0;
        access_registry.operators = [Pubkey::default(); 10];
        access_registry.initialized = true;
        Ok(())
    }

    pub fn initialize(ctx: Context<Initialize>, decimals: u8) -> Result<()> {
        msg!("Starting initialization...");
        msg!("Authority: {}", ctx.accounts.authority.key());
        msg!("Mint: {}", ctx.accounts.token_mint.key());

        // 1. 初始化状态账户
        let authority_state = &mut ctx.accounts.authority_state;
        authority_state.admin = ctx.accounts.authority.key();
        authority_state.minter = ctx.accounts.authority.key();
        authority_state.pauser = ctx.accounts.authority.key();

        let mint_state = &mut ctx.accounts.mint_state;
        mint_state.mint = ctx.accounts.token_mint.key();
        mint_state.decimals = decimals;

        let pause_state = &mut ctx.accounts.pause_state;
        pause_state.paused = false;

        // 2. 转移mint的authority给authority_state PDA
        let mint_key = ctx.accounts.token_mint.key();
        let seeds = &[b"authority", mint_key.as_ref()]; 
        let (_authority_pda, bump) = Pubkey::find_program_address(seeds, ctx.program_id);
        let _bump_bytes = &[bump];

        token::set_authority(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::SetAuthority {
                    current_authority: ctx.accounts.authority.to_account_info(),
                    account_or_mint: ctx.accounts.token_mint.to_account_info(),
                }
            ),
            token::spl_token::instruction::AuthorityType::MintTokens,
            Some(ctx.accounts.authority_state.key()),
        )?;

        // 3. 发出初始化事件
        emit!(InitializeEvent {
            authority: ctx.accounts.authority.key(),
            mint: ctx.accounts.token_mint.key(),
            decimals
        });

        msg!("Initialization completed successfully");
        Ok(())
    } 
    
    /// 铸造WUSD代币 
    pub fn mint(ctx: Context<MintAccounts>, amount: u64, bump: u8) -> Result<()> {
        instructions::mint::mint(ctx, amount, bump) 
    }
    
    /// 处理授权许可请求，允许代币持有者授权其他账户使用其代币
    pub fn permit(ctx: Context<Permit>, params: PermitParams) -> Result<()> { 
        instructions::permit::permit(ctx, params) 
    }

    /// 转账WUSD代币 
    pub fn transfer(ctx: Context<Transfer>, amount: u64) -> Result<()> {
        instructions::transfer::transfer(ctx, amount) 
    } 

    /// 使用授权额度转账WUSD代币 
    pub fn transfer_from(ctx: Context<TransferFrom>, amount: u64) -> Result<()> {
        instructions::transfer::transfer_from(ctx, amount) 
    } 

    /// 暂停合约
    pub fn pause(ctx: Context<Pause>) -> Result<()> {
        instructions::pause::pause(ctx)  
    }

     /// 恢复合约
    pub fn unpause(ctx: Context<Unpause>) -> Result<()> {
        instructions::pause::unpause(ctx)  
    }

    /// 销毁WUSD代币
    pub fn burn(ctx: Context<Burn>, amount: u64) -> Result<()> {
        instructions::burn::burn(ctx, amount)
    } 

    /// 添加操作员
    pub fn add_operator(ctx: Context<ManageOperator>, operator: Pubkey) -> Result<()> {
        instructions::operator::add_operator(ctx, operator)
    }

    /// 移除操作员
    pub fn remove_operator(ctx: Context<ManageOperator>, operator: Pubkey) -> Result<()> {
        instructions::operator::remove_operator(ctx, operator)
    }

    /// 冻结账户
    pub fn freeze_account(ctx: Context<FreezeAccount>, reason: String) -> Result<()> { 
        instructions::freeze::freeze_account(ctx, reason)
    }

    /// 解冻账户
    pub fn unfreeze_account(ctx: Context<UnfreezeAccount>) -> Result<()> {
        instructions::freeze::unfreeze_account(ctx) 
    }

}






 

