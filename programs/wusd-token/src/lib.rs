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
use anchor_spl::token::{self, Token, TokenAccount, Mint}; 

mod error;
mod state;

use state::{AuthorityState, MintState, PauseState, AllowanceState, PermitState, AccessRegistryState};
use error::WusdError;  

// Account sizes
const AUTHORITY_STATE_SIZE: usize = 8 + 32 * 3;   // discriminator + admin + minter + pauser
const MINT_STATE_SIZE: usize = 8 + 32 + 1;        // discriminator + mint + decimals
const PAUSE_STATE_SIZE: usize = 8 + 1;            // discriminator + paused
const PERMIT_SIZE: usize = 8 + 32 + 32 + 8 +  8 +  8 +  1;   
const ALLOWANCE_SIZE: usize = 8 + 32 + 32 + 8;    // discriminator + owner + spender + amount
const ACCESS_REGISTRY_SIZE: usize = 8 + 32 + 1 + (32 * 10) + 1;  // discriminator + authority + initialized + operators + operator_count

declare_id!("43eXSSqZGLVkn9sTkMoR7nm9oKzc1R8DhAVBkPgUbCyc");

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

/// 铸币事件，记录代币铸造的详细信息
#[event]
pub struct MintEvent {
    /// 铸币者地址，执行铸币操作的账户
    pub minter: Pubkey,
    /// 接收者地址，获得新铸造代币的账户
    pub recipient: Pubkey,
    /// 铸造数量，新创建的代币数量
    pub amount: u64,
}

/// 销毁事件，记录代币销毁的详细信息
#[event]
pub struct BurnEvent {
    /// 销毁者地址，执行销毁操作的账户
    pub burner: Pubkey,
    /// 销毁数量，被销毁的代币数量
    pub amount: u64,
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

/// 访问级别枚举，用于控制账户的操作权限
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum AccessLevel {
    /// 允许扣款操作，如转出、销毁等
    Debit,
    /// 允许入账操作，如接收转账、铸币等
    Credit,
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

/// 检查用户是否具有执行操作的权限
/// 
/// # 参数
/// * `user` - 用户地址
/// * `is_debit` - 是否为扣款操作
/// * `amount` - 操作金额（可选）
/// * `pause_state` - 暂停状态
/// * `access_registry` - 访问权限注册表（可选）
/// 
/// # 错误
/// * `WusdError::ContractPaused` - 合约已暂停
/// * `WusdError::InvalidAmount` - 金额无效
/// * `WusdError::AccessDenied` - 访问被拒绝
pub fn require_has_access(
    user: Pubkey,
    is_debit: bool,
    amount: Option<u64>,
    pause_state: &PauseState,
    access_registry: Option<&AccessRegistryState>,
) -> Result<()> {
    // 确保合约未暂停
    pause_state.validate_not_paused()?;

    // 验证金额，确保大于0且不为None
    if let Some(amount) = amount {
        require!(amount > 0, WusdError::InvalidAmount);
    }

    // 验证访问权限
    if let Some(registry) = access_registry {
        require!(registry.initialized, WusdError::AccessRegistryNotInitialized);
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

 

// 实现费用计算函数
fn calculate_transfer_fee(amount: u64) -> u64 {
    // 示例：0.1% 手续费
    amount.checked_div(1000).unwrap_or(0)
} 

#[program]
pub mod wusd_token {
    use super::*;

    /// 初始化访问注册表
    /// * `ctx` - 初始化上下文
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
        msg!("Mint: {}", ctx.accounts.mint.key());
    
        // 1. 初始化状态账户
        let authority_state = &mut ctx.accounts.authority_state;
        authority_state.admin = ctx.accounts.authority.key();
        authority_state.minter = ctx.accounts.authority.key();
        authority_state.pauser = ctx.accounts.authority.key();
    
        let mint_state = &mut ctx.accounts.mint_state;
        mint_state.mint = ctx.accounts.mint.key();
        mint_state.decimals = decimals;
    
        let pause_state = &mut ctx.accounts.pause_state;
        pause_state.paused = false;
    
        // 2. 转移mint的authority给authority_state PDA
        let mint_key = ctx.accounts.mint.key();
        let _seeds = &[b"authority", mint_key.as_ref()]; 
        let bump = ctx.bumps.authority_state;
        let _bump_bytes = &[bump];

        token::set_authority(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::SetAuthority {
                    current_authority: ctx.accounts.authority.to_account_info(),
                    account_or_mint: ctx.accounts.mint.to_account_info(),
                }
            ),
            token::spl_token::instruction::AuthorityType::MintTokens,
            Some(ctx.accounts.authority_state.key()),
        )?;
    
        // 3. 发出初始化事件
        emit!(InitializeEvent {
            authority: ctx.accounts.authority.key(),
            mint: ctx.accounts.mint.key(),
            decimals
        });
    
        msg!("Initialization completed successfully");
        Ok(())
    }

    /// 铸造WUSD代币
    /// * `ctx` - 铸币上下文
    /// * `amount` - 铸造数量
    /// * `bump` - PDA的bump值
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
    
        // 修改这里：接收账户使用 Credit 级别检查
        require_has_access(
            ctx.accounts.token_account.owner,
            false,  // is_debit = false 表示这是一个 Credit 操作
            Some(amount),
            &ctx.accounts.pause_state,
            Some(&ctx.accounts.access_registry)
        )?;
    
        let mint_key = ctx.accounts.mint.key();
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.token_account.to_account_info(),
                    authority: ctx.accounts.authority_state.to_account_info(),
                },
                &[&[
                    b"authority",
                    mint_key.as_ref(),
                    &[bump]
                ]]
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

    /// 销毁WUSD代币
    /// * `ctx` - 销毁上下文
    /// * `amount` - 销毁数量
    pub fn burn(ctx: Context<Burn>, amount: u64) -> Result<()> {
        // 验证合约未暂停
        ctx.accounts.pause_state.validate_not_paused()?;
    
        // 验证调用者权限
        require!(
            ctx.accounts.authority.is_signer,
            WusdError::Unauthorized
        );
    
        // 验证 token account 的所有者
        require!(
            ctx.accounts.token_account.owner == ctx.accounts.authority.key(),
            WusdError::InvalidOwner
        );
    
        // 验证访问权限
        require!(
            ctx.accounts.access_registry.has_access(
                ctx.accounts.authority.key(),
                AccessLevel::Debit
            ),
            WusdError::AccessDenied
        );
    
        // 验证余额充足
        require!(
            ctx.accounts.token_account.amount >= amount,
            WusdError::InsufficientBalance
        );
    
        // 执行销毁操作
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
            amount
        });
    
        Ok(())
    } 

    /// 转账WUSD代币
    /// * `ctx` - 转账上下文
    /// * `amount` - 转账数量
    pub fn transfer(ctx: Context<Transfer>, amount: u64) -> Result<()> {
        require!(amount > 0, WusdError::InvalidAmount);
        let fee = calculate_transfer_fee(amount); // 需要实现费用计算函数 
        require!(
            ctx.accounts.from_token.amount >= amount.saturating_add(fee),
            WusdError::InsufficientFunds
        );
        require!(
            amount.checked_sub(fee).is_some(),
            WusdError::InvalidAmount
        );

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
            fee,  // 添加缺失的fee字段
            timestamp: Clock::get()?.unix_timestamp,
            memo: None  // 添加默认memo
        });

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
                    authority: ctx.accounts.permit.to_account_info(), // 使用permit PDA作为authority
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
            ctx.bumps.permit_state
        ));
        
        // 设置授权额度
        ctx.accounts.allowance.amount = params.amount;
        
        // 发出授权许可事件
        emit!(PermitGranted { 
            owner: ctx.accounts.owner.key(),
            spender: ctx.accounts.spender.key(),
            amount: params.amount,
            scope: PermitScope::Transfer
        });
        
        Ok(())
    } 

    /// 检查合约是否支持指定接口
    /// * `_ctx` - 上下文
    /// * `interface_id` - 接口ID
    pub fn supports_interface(_ctx: Context<SupportsInterface>, interface_id: [u8; 4]) -> Result<bool> {
        let erc20_interface_id: [u8; 4] = [0x36, 0x37, 0x2b, 0x07];
        let permit_interface_id: [u8; 4] = [0x79, 0x65, 0xdb, 0x0b];

        Ok(interface_id == erc20_interface_id || interface_id == permit_interface_id)
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

    /// 暂停合约
    /// * `ctx` - 上下文
    pub fn pause(ctx: Context<Pause>) -> Result<()> {
        require!(
            ctx.accounts.authority_state.is_admin(ctx.accounts.authority.key()),
            WusdError::Unauthorized
        );
        ctx.accounts.pause_state.set_paused(true);
        Ok(())
    }

    /// 恢复合约
    /// * `ctx` - 上下文
    pub fn unpause(ctx: Context<Unpause>) -> Result<()> {
        require!(
            ctx.accounts.authority_state.is_admin(ctx.accounts.authority.key()),
            WusdError::Unauthorized
        );
        ctx.accounts.pause_state.set_paused(false);
        Ok(())
    }

}

/// 检查接口支持的账户参数
#[derive(Accounts)]
pub struct SupportsInterface<'info> {
    /// 调用者地址
    pub authority: Signer<'info>,
}

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
        space = AUTHORITY_STATE_SIZE,
        seeds = [b"authority", mint.key().as_ref()],
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
    pub mint: Account<'info, Mint>,

    /// 铸币状态账户
    #[account(
        init,
        payer = authority, 
        space = MINT_STATE_SIZE,
        seeds = [b"mint_state", mint.key().as_ref()],
        bump
    )]
    pub mint_state: Account<'info, MintState>,

    /// 暂停状态账户
    #[account(
        init,
        payer = authority, 
        space = PAUSE_STATE_SIZE,
        seeds = [b"pause_state", mint.key().as_ref()],
        bump
    )]
    pub pause_state: Account<'info, PauseState>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
} 

/// 铸币指令的账户参数
#[derive(Accounts)]
pub struct MintAccounts<'info> {
    /// 铸币权限账户
    #[account(mut)]
    pub authority: Signer<'info>,
    /// 代币铸币账户
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    /// 接收代币的账户
    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    /// 权限管理账户
    #[account(
        seeds = [b"authority", mint.key().as_ref()],
        bump,
    )]
    pub authority_state: Account<'info, AuthorityState>,
    /// 铸币状态账户
    pub mint_state: Account<'info, MintState>,
    /// 暂停状态账户
    pub pause_state: Account<'info, PauseState>,
    /// 访问权限账户
    pub access_registry: Account<'info, AccessRegistryState>,
}

#[derive(Accounts)]
pub struct Burn<'info> {
    #[account(mut)]
    pub authority_state: Account<'info, AuthorityState>, 
    #[account(mut)]
    pub mint_authority: Signer<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>, 
    pub mint_state: Account<'info, MintState>,
    pub pause_state: Account<'info, PauseState>,
    pub access_registry: Account<'info, AccessRegistryState>, 
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
        space = ALLOWANCE_SIZE,
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
pub struct Pause<'info> {
    #[account(mut)]
    pub pause_state: Account<'info, PauseState>,
    pub authority: Signer<'info>,
    pub authority_state: Account<'info, AuthorityState>,
}

#[derive(Accounts)]
pub struct Unpause<'info> {
    #[account(mut)]
    pub pause_state: Account<'info, PauseState>,
    pub authority: Signer<'info>,
    pub authority_state: Account<'info, AuthorityState>,
}

#[derive(Accounts)]
pub struct InitializeAccessRegistry<'info> {
    #[account(mut)]
    pub authority: Signer<'info>, 
     
    #[account(
        init,
        payer = authority, 
        space = ACCESS_REGISTRY_SIZE,
        seeds = [b"access_registry"],
        bump
    )]
    pub access_registry: Account<'info, AccessRegistryState>,

    pub system_program: Program<'info, System>,
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
    pub token_program: Program<'info, Token>,
}


#[derive(Accounts)]
#[instruction(params: PermitParams)]
pub struct Permit<'info> {
    #[account(mut, signer)]
    pub owner: Signer<'info>, 

    /// CHECK: This is the spender account that will be granted permission
    #[account(mut)]
    pub spender: AccountInfo<'info>,

    #[account(
        init_if_needed,
        payer = owner,
        space = ALLOWANCE_SIZE,  
        seeds = [b"allowance", owner.key().as_ref(), spender.key().as_ref()],
        bump
    )]
    pub allowance: Box<Account<'info, AllowanceState>>,

    #[account(
        init_if_needed,
        payer = owner,
        space = PERMIT_SIZE,
        seeds = [
            b"permit",
            owner.key().as_ref(),
            spender.key().as_ref()
        ],
        bump,
    )]
    pub permit_state: Box<Account<'info, PermitState>>,

    #[account(mut)]
    pub mint_state: Box<Account<'info, MintState>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>, 
    pub clock: Sysvar<'info, Clock>, 
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

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum PermitScope {
    Transfer,
    Burn,
    All
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


/// 操作员管理账户结构体
#[derive(Accounts)]
pub struct ManageOperator<'info> {
    /// 管理员账户
    #[account(mut)]
    pub authority: Signer<'info>,

    /// 权限管理状态账户
    pub authority_state: Account<'info, AuthorityState>,

    /// 要管理的操作员账户
    /// CHECK: 仅用于记录地址
    pub operator: AccountInfo<'info>,

    /// 访问权限注册表
    #[account(mut)]
    pub access_registry: Account<'info, AccessRegistryState>,
}


