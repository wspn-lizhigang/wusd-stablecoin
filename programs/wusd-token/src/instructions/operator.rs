use anchor_lang::prelude::*; 
use crate::error::WusdError;  
use crate::state::{AuthorityState, AccessRegistryState};
 
/// 添加操作员
pub fn add_operator(ctx: Context<ManageOperator>, operator: Pubkey) -> Result<()> {
    let access_registry = &mut ctx.accounts.access_registry;
    require!(access_registry.initialized, WusdError::AccessRegistryNotInitialized);
    
    // 确保调用者是管理员
    require!(
        ctx.accounts.authority_state.is_admin(ctx.accounts.authority.key()),
        WusdError::Unauthorized
    ); 
    
    // 添加操作员
    access_registry.add_operator(operator) 
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