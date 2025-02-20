use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount}; 
use crate::error::WusdError;  
use crate::utils::require_has_access; 
use crate::state::{FreezeState, PermitState, MintState, AccessRegistryState, PauseState};

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
    pub pause_state: Account<'info, PauseState>,
    pub access_registry: Account<'info, AccessRegistryState>,
    /// CHECK: 这个账户的安全性由FreezeState结构和程序逻辑保证
    #[account(
        init_if_needed,
        payer = from,
        space = FreezeState::SIZE,
        seeds = [b"freeze", from_token.key().as_ref()],
        bump
    )]
    pub from_freeze_state: Account<'info, FreezeState>,
    /// CHECK: 这个账户的安全性由FreezeState结构和程序逻辑保证
    #[account(
        init_if_needed,
        payer = from,
        space = FreezeState::SIZE,
        seeds = [b"freeze", to_token.key().as_ref()],
        bump
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
    #[account(mut, signer)]  
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

/// 转账WUSD代币
/// * `ctx` - 转账上下文
/// * `amount` - 转账数量
pub fn transfer(ctx: Context<Transfer>, amount: u64) -> Result<()> {
    require!(amount > 0, WusdError::InvalidAmount);
    let fee = calculate_transfer_fee(amount);  
    require!(
        ctx.accounts.from_token.amount >= amount.saturating_add(fee),
        WusdError::InsufficientFunds
    );
    require!(
        amount.checked_sub(fee).is_some(),
        WusdError::InvalidAmount
    );

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

    Ok(())
} 

/// 使用授权额度转账WUSD代币
/// * `ctx` - 转账上下文
/// * `amount` - 转账数量
pub fn transfer_from(ctx: Context<TransferFrom>, amount: u64) -> Result<()> {
    // 验证合约未暂停
    ctx.accounts.pause_state.validate_not_paused()?;
    
    // 验证授权有效性
    let current_time = Clock::get()?.unix_timestamp;
    require!(
        ctx.accounts.permit.expiration > current_time,
        WusdError::ExpiredPermit
    );
    require!(
        ctx.accounts.permit.amount >= amount,
        WusdError::InsufficientAllowance
    );

    // 验证 token account 所有权
    require!(
        ctx.accounts.from_token.owner == ctx.accounts.owner.key(),
        WusdError::InvalidOwner
    );

    // 检查冻结状态
    ctx.accounts.from_freeze_state.check_frozen()?;
    ctx.accounts.to_freeze_state.check_frozen()?;

    // 生成 PDA 签名
    let owner_key = ctx.accounts.owner.key();
    let spender_key = ctx.accounts.spender.key();
    let seeds = &[
        b"permit",
        owner_key.as_ref(),
        spender_key.as_ref(),
        &[ctx.accounts.permit.bump],
    ];
    
    // 执行代币转账
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.from_token.to_account_info(),
                to: ctx.accounts.to_token.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(), 
            },
            &[&seeds[..]]
        ),
        amount
    )?;

    // 更新授权额度
    ctx.accounts.permit.amount = ctx.accounts.permit.amount
        .checked_sub(amount)
        .ok_or(WusdError::InsufficientAllowance)?;
    
    Ok(())
}

// 实现费用计算函数
fn calculate_transfer_fee(amount: u64) -> u64 {
    // 示例：0.1% 手续费
    amount.checked_div(1000).unwrap_or(0)
}