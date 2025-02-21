use anchor_lang::prelude::*;
use anchor_spl::token::Token; 
use crate::error::WusdError;  
use crate::state::{MintState, PermitState, AllowanceState};

/// 处理授权许可请求，允许代币持有者授权其他账户使用其代币
/// 
/// # 参数
/// * `ctx` - 包含所有必要账户的上下文
/// * `params` - 授权许可的参数，包含签名、金额、期限等信息
/// 
/// # 返回值
/// * `Result<()>` - 操作成功返回Ok(()), 失败返回错误
pub fn permit(ctx: Context<Permit>, params: PermitParams) -> Result<()> { 
    // 验证基本参数
    require!(params.amount > 0, WusdError::InvalidAmount);
    
    // 初始化 permit_state
    ctx.accounts.permit_state.set_inner(PermitState::initialize(
        ctx.accounts.owner.key(),
        ctx.accounts.spender.key(),
        params.amount,
        params.deadline,
        *ctx.bumps.get("permit_state").unwrap()
    ));
    
    // 设置授权额度
    ctx.accounts.allowance.amount = params.amount;
    
    // 发出授权许可事件
    emit!(PermitGranted { 
        owner: ctx.accounts.owner.key(),
        spender: ctx.accounts.spender.key(),
        amount: params.amount,
        scope: PermitScope::TRANSFER
    });
    
    Ok(())
}
 
/// 许可授权范围枚举
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub struct PermitScope {
    /// 单次授权
    pub one_time: bool,
    /// 永久授权
    pub permanent: bool,
    /// 转账授权
    pub transfer: bool,
    /// 销毁授权
    pub burn: bool,
    /// 全部授权
    pub all: bool
}

#[derive(Accounts)]
#[instruction(params: PermitParams)]
pub struct Permit<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    /// CHECK: This is the spender account that will be granted permission
    pub spender: AccountInfo<'info>,

    #[account(
        init_if_needed,
        payer = owner,
        space = AllowanceState::SIZE,
        seeds = [b"allowance", owner.key().as_ref(), spender.key().as_ref()],
        bump
    )]
    pub allowance: Account<'info, AllowanceState>,

    #[account(
        init_if_needed,
        payer = owner,
        space = PermitState::SIZE,
        seeds = [
            b"permit",
            owner.key().as_ref(),
            spender.key().as_ref()
        ],
        bump,
    )]
    pub permit_state: Account<'info, PermitState>,

    #[account(mut)]
    pub mint_state: Box<Account<'info, MintState>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>
} 

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PermitParams {
    pub amount: u64,
    pub deadline: i64,
    pub nonce: Option<u64>,
    pub scope: PermitScope,
    pub signature: [u8; 64],
    pub public_key: [u8; 32],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PermitMessage {
    pub contract: Pubkey,
    pub domain_separator: [u8; 32],
    pub owner: Pubkey,
    pub spender: Pubkey,
    pub amount: u64,
    pub nonce: u64,
    pub deadline: i64,
    pub scope: PermitScope,
    pub chain_id: u64,
    pub version: [u8; 32]
} 

/// 许可授权事件，记录EIP-2612兼容的许可授权信息
#[event]
pub struct PermitGranted {
    /// 代币所有者地址
    pub owner: Pubkey,
    /// 被授权者地址
    pub spender: Pubkey,
    /// 授权金额
    pub amount: u64,
    /// 授权范围
    pub scope: PermitScope,
}    

impl PermitScope {
    pub const TRANSFER: PermitScope = PermitScope {
        one_time: false,
        permanent: true,
        transfer: true,
        burn: false,
        all: false
    };
} 