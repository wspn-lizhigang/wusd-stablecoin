use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount}; 
use crate::error::WusdError;  
use crate::utils::require_has_access; 
use crate::state::{FreezeState, PermitState, MintState, AccessRegistryState, PauseState};

/// 转账WUSD代币
/// * `ctx` - 转账上下文
/// * `amount` - 转账数量
pub fn transfer(ctx: Context<Transfer>, amount: u64) -> Result<()> {
    // 验证系统未被暂停
    ctx.accounts.pause_state.validate_not_paused()?; 
    require!(amount > 0, WusdError::InvalidAmount); 
    // 检查冻结状态
    ctx.accounts.from_freeze_state.check_frozen()?;
    ctx.accounts.to_freeze_state.check_frozen()?;

    // 检查访问权限
    require_has_access(
        ctx.accounts.from.key(),
        true,
        Some(amount),
        &ctx.accounts.pause_state,
        Some(&ctx.accounts.access_registry),
    )?; 
    
    // 执行转账
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.from_token.to_account_info(),
                to: ctx.accounts.to_token.to_account_info(),
                authority: ctx.accounts.from.to_account_info(),
            },
        ),
        amount,
    )?;

    // 发送转账事件
    let clock = Clock::get()?;
    emit!(TransferEvent {
        from: ctx.accounts.from.key(),
        to: ctx.accounts.to.key(),
        amount: amount,
        fee: 0,
        timestamp: clock.unix_timestamp,
        memo: None,
    });

    Ok(())
}  

pub fn transfer_from(ctx: Context<TransferFrom>, amount: u64) -> Result<()> {
    // 1. 系统状态验证
    ctx.accounts.pause_state.validate_not_paused()?;
    require!(amount > 0, WusdError::InvalidAmount);
    // 检查冻结状态
    ctx.accounts.from_freeze_state.check_frozen()?;
    ctx.accounts.to_freeze_state.check_frozen()?;
    
    // 2. 创建堆分配的上下文数据结构
    let transfer_context = Box::new(TransferContext {
        current_time: Clock::get()?.unix_timestamp,
        owner_key: ctx.accounts.owner.key(),
        spender_key: ctx.accounts.spender.key(),
        permit_bump: ctx.accounts.permit.bump,
    });

    // 3. 权限和安全验证
    // 3.1 验证授权是否过期
    require!(
        ctx.accounts.permit.expiration > transfer_context.current_time,
        WusdError::PermitExpired
    );
    
    // 3.2 验证授权额度
    require!(
        ctx.accounts.permit.amount >= amount,
        WusdError::InsufficientAllowance
    );
    
    // 3.3 验证账户所有权
    require!(
        ctx.accounts.from_token.owner == transfer_context.owner_key,
        WusdError::InvalidOwner
    );
    
    // 3.4 验证代币地址匹配
    require!(
        ctx.accounts.from_token.mint == ctx.accounts.to_token.mint,
        WusdError::InvalidMint
    );
    
    // 3.5 验证余额充足
    require!(
        ctx.accounts.from_token.amount >= amount,
        WusdError::InsufficientBalance
    ); 

    // 5. 构建签名种子
    let seeds = &[
        b"permit",
        transfer_context.owner_key.as_ref(),
        transfer_context.spender_key.as_ref(),
        &[transfer_context.permit_bump]
    ];

    // 6. 执行代币转账 
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.from_token.to_account_info(),
                to: ctx.accounts.to_token.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
            &[seeds]
        ),
        amount
    )?; 

    // 7. 更新授权额度
    ctx.accounts.permit.amount = ctx.accounts.permit.amount
        .checked_sub(amount)
        .ok_or(WusdError::InsufficientAllowance)?;
    
    // 8. 发送转账事件
    let clock = Clock::get()?;
    emit!(TransferEvent {
        from: ctx.accounts.owner.key(),
        to: ctx.accounts.to_token.owner,
        amount: amount,
        fee: 0,
        timestamp: clock.unix_timestamp,
        memo: Some(format!("Transfer from {} to {}", 
            transfer_context.owner_key.to_string(),
            ctx.accounts.to_token.owner.to_string())),
    });

    Ok(())
} 

// 转账上下文数据结构
#[derive(Clone)]
struct TransferContext {
    current_time: i64,
    owner_key: Pubkey,
    spender_key: Pubkey,
    permit_bump: u8,
}

#[derive(Accounts)]
pub struct Transfer<'info> {
    #[account(mut)]
    pub from: Signer<'info>,
    /// CHECK: This account is not read or written to
    #[account(mut)]
    pub to: AccountInfo<'info>,
    #[account(
        mut,
        constraint = from_token.owner == from.key() @ WusdError::InvalidOwner,
        constraint = from_token.mint == to_token.mint @ WusdError::InvalidMint
    )]
    pub from_token: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = to_token.owner == to.key() @ WusdError::InvalidOwner
    )]
    pub to_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    #[account(
        seeds = [b"pause_state", from_token.mint.as_ref()],
        bump,
        constraint = !pause_state.paused @ WusdError::ContractPaused
    )]
    pub pause_state: Account<'info, PauseState>,
    #[account(
        seeds = [b"access_registry"],
        bump
    )]
    pub access_registry: Account<'info, AccessRegistryState>,
    #[account(
        seeds = [b"freeze", from_token.key().as_ref()],
        bump,
        constraint = !from_freeze_state.is_frozen @ WusdError::AccountFrozen
    )]
    pub from_freeze_state: Account<'info, FreezeState>, 
    #[account(
        seeds = [b"freeze", to_token.key().as_ref()],
        bump,
        constraint = !to_freeze_state.is_frozen @ WusdError::AccountFrozen
    )]
    pub to_freeze_state: Account<'info, FreezeState>,
    pub system_program: Program<'info, System>,
}

/// 转账事件，记录代币转账的详细信息
#[event]
pub struct TransferEvent {
    #[index] // 添加索引以便快速查询
    /// 转出地址
    pub from: Pubkey,
    #[index]
    /// 转入地址
    pub to: Pubkey,
    /// 转账金额
    pub amount: u64,
    /// 手续费
    pub fee: u64,
    /// 交易时间戳
    pub timestamp: i64,
    /// 转账备注（可选）
    pub memo: Option<String>,
}

#[derive(Accounts)]
pub struct TransferFrom<'info> {
    #[account(mut)]
    pub spender: Signer<'info>,  
    /// CHECK: 这是一个已验证的所有者地址 
    pub owner: AccountInfo<'info>, 
    #[account(
        mut,
        constraint = from_token.owner == owner.key()
    )]
    pub from_token: Account<'info, TokenAccount>, 
    #[account(mut)]
    pub to_token: Account<'info, TokenAccount>, 
    #[account(
        seeds = [
            b"permit",
            owner.key().as_ref(),
            spender.key().as_ref()
        ],
        bump = permit.bump,
        has_one = owner,
        has_one = spender,
    )]
    pub permit: Account<'info, PermitState>, 
    #[account(mut)]
    pub mint_state: Box<Account<'info, MintState>>, 
    pub pause_state: Account<'info, PauseState>, 
    pub access_registry: Account<'info, AccessRegistryState>, 
    /// CHECK: 这个账户的安全性由FreezeState结构和程序逻辑保证
    #[account(
        init_if_needed,
        payer = spender,
        space = FreezeState::SIZE,
        seeds = [b"freeze", from_token.key().as_ref()],
        bump
    )]
    pub from_freeze_state: Account<'info, FreezeState>,
    /// CHECK: 这个账户的安全性由FreezeState结构和程序逻辑保证
    #[account(
        init_if_needed,
        payer = spender,
        space = FreezeState::SIZE,
        seeds = [b"freeze", to_token.key().as_ref()],
        bump
    )]
    pub to_freeze_state: Account<'info, FreezeState>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}