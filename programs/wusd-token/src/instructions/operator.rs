use anchor_lang::prelude::*; 
use crate::error::WusdError;  
use crate::state::{AuthorityState, AccessRegistryState};
 
#[derive(Accounts)]
pub struct ManageOperator<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(constraint = authority_state.is_admin(authority.key()))]
    pub authority_state: Account<'info, AuthorityState>,

    /// CHECK: 仅用于记录地址
    pub operator: AccountInfo<'info>,

    #[account(mut)]
    pub access_registry: Account<'info, AccessRegistryState>,

    pub system_program: Program<'info, System>,
} 

/// 添加操作员
pub fn add_operator(ctx: Context<ManageOperator>, operator: Pubkey) -> Result<()> {
    let access_registry = &mut ctx.accounts.access_registry;
    require!(access_registry.initialized, WusdError::AccessRegistryNotInitialized);
    
    // 确保调用者是管理员
    require!(
        ctx.accounts.authority_state.is_admin(ctx.accounts.authority.key()),
        WusdError::Unauthorized
    );
    
    // 检查操作员是否已存在
    for i in 0..access_registry.operator_count as usize {
        if access_registry.operators[i] == operator {
            return Ok(());  // 操作员已存在，直接返回
        }
    }
    
    // 检查操作员数量限制
    require!(
        access_registry.operator_count < 10,
        WusdError::TooManyOperators
    );
    
    // 添加操作员
    let current_count = access_registry.operator_count as usize;
    access_registry.operators[current_count] = operator;
    access_registry.operator_count += 1;
    
    Ok(())
}  

/// 移除操作员
pub fn remove_operator(ctx: Context<ManageOperator>, operator: Pubkey) -> Result<()> {
    let access_registry = &mut ctx.accounts.access_registry;
    require!(access_registry.initialized, WusdError::AccessRegistryNotInitialized);
    
    // 确保调用者是管理员
    require!(
        ctx.accounts.authority_state.is_admin(ctx.accounts.authority.key()),
        WusdError::Unauthorized
    );
    
    // 移除操作员
    access_registry.remove_operator(operator)
}