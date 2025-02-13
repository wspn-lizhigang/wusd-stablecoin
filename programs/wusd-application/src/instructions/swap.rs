#![allow(dead_code)] 
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{StateAccount, ExchangeRate};
use crate::error::WUSDError;
use crate::base::roles::*;

/// 最大精度
pub const MAX_DECIMALS: u8 = 18;

/// 汇率结构体，定义代币兑换比率
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug)]
pub struct Rate {
    pub input: u64,
    pub output: u64,
}

/// 代币兑换事件
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

/// 汇率设置事件
#[event]
pub struct RateSetEvent {
    pub caller: Pubkey,
    pub token_in: Pubkey,
    pub token_out: Pubkey,
    pub old_rate: Rate,
    pub new_rate: Rate,
    pub timestamp: i64,
}

/// 交易池地址更新事件
#[event]
pub struct PoolAddressSetEvent {
    pub caller: Pubkey,
    pub old_pool_address: Pubkey,
    pub new_pool_address: Pubkey,
    pub timestamp: i64,
}

/// 代币白名单更新事件
#[event]
pub struct TokenWhitelistUpdatedEvent {
    pub caller: Pubkey,
    pub token: Pubkey,
    pub status: bool,
    pub timestamp: i64,
}

/// 代币配置更新事件
#[event]
pub struct ConfigSetEvent {
    pub caller: Pubkey,
    pub token_mint: Pubkey,
    pub decimals: u8,
    pub timestamp: i64,
}

/// 代币兑换指令的账户参数
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
        constraint = StateAccount::is_token_whitelisted(user_token_in.mint, &state.token_whitelist) @ WUSDError::TokenNotWhitelisted,
        constraint = StateAccount::is_token_whitelisted(user_token_out.mint, &state.token_whitelist) @ WUSDError::TokenNotWhitelisted,
        constraint = user_token_in.mint != user_token_out.mint @ WUSDError::SameTokenAddresses
    )]
    pub state: Account<'info, StateAccount>,
    
    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,
}

/// 设置代币兑换汇率的账户参数
#[derive(Accounts)]
pub struct SetRate<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"state"],
        bump,
        constraint = StateAccount::has_role(RATE_SETTER, &authority.key(), &state.authority) @ WUSDError::Unauthorized
    )]
    pub state: Account<'info, StateAccount>,
}

/// 设置交易池地址的账户参数
#[derive(Accounts)]
pub struct PoolAddress<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"state"],
        bump,
        constraint = StateAccount::has_role(CONFIG_SETTER, &authority.key(), &state.authority) @ WUSDError::Unauthorized
    )]
    pub state: Account<'info, StateAccount>,
}

/// 设置代币白名单的账户参数
#[derive(Accounts)]
pub struct SetWhitelistToken<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"state"],
        bump,
        constraint = StateAccount::has_role(CONFIG_SETTER, &authority.key(), &state.authority) @ WUSDError::Unauthorized
    )]
    pub state: Account<'info, StateAccount>,
}

/// 设置代币配置的账户参数
#[derive(Accounts)]
pub struct SetConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"state"],
        bump,
        constraint = StateAccount::has_role(CONFIG_SETTER, &authority.key(), &state.authority) @ WUSDError::Unauthorized
    )]
    pub state: Account<'info, StateAccount>,
}

/// 执行代币兑换操作
pub fn swap(
    ctx: Context<Swap>,
    amount_in: u64,
    min_amount_out: u64,
) -> Result<()> {
    // 基本验证
    require!(amount_in > 0, WUSDError::InvalidAmount);
    require!(min_amount_out > 0, WUSDError::InvalidAmount);
    
    // 验证代币余额和所有权
    require!(ctx.accounts.user_token_in.amount >= amount_in, WUSDError::InsufficientBalance);
    require!(ctx.accounts.user_token_in.owner == ctx.accounts.user.key(), WUSDError::InvalidOwner);
    require!(ctx.accounts.user_token_out.owner == ctx.accounts.user.key(), WUSDError::InvalidOwner);
    
    // 计算输出金额
    let amount_out = calculate_output_amount(
        amount_in,
        ctx.accounts.user_token_in.mint,
        ctx.accounts.user_token_out.mint,
        &ctx.accounts.state,
    )?;
    require!(amount_out >= min_amount_out, WUSDError::SlippageExceeded);

    // 验证金库余额
    require!(ctx.accounts.treasury.amount >= amount_out, WUSDError::InsufficientTreasuryBalance);

    // 将代币从用户转移到金库
    let transfer_in_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_token_in.to_account_info(),
            to: ctx.accounts.treasury.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    token::transfer(transfer_in_ctx, amount_in)?;

    // 将代币从金库转移到用户
    let seeds = &[
        b"state".as_ref(),
        &[ctx.bumps.state],
    ];
    let signer = &[&seeds[..]];

    let transfer_out_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.treasury.to_account_info(),
            to: ctx.accounts.user_token_out.to_account_info(),
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

/// 设置代币兑换汇率
pub fn set_rate(
    ctx: Context<SetRate>,
    token_in_mint: Pubkey,
    token_out_mint: Pubkey,
    rate: Rate,
) -> Result<()> {
    require!(rate.input > 0 && rate.output > 0, WUSDError::InvalidExchangeRate);
    require!(token_in_mint != token_out_mint, WUSDError::SameTokenAddresses);
    
    // 验证代币是否在白名单中
    require!(
        StateAccount::is_token_whitelisted(token_in_mint, &ctx.accounts.state.token_whitelist) &&
        StateAccount::is_token_whitelisted(token_out_mint, &ctx.accounts.state.token_whitelist),
        WUSDError::TokenNotWhitelisted
    );

    // 获取旧汇率
    let exchange_rate = StateAccount::get_exchange_rate(token_in_mint, token_out_mint, &ctx.accounts.state)
        .unwrap_or_else(|_| ExchangeRate { input: 0, output: 0 });
    let old_rate = Rate { input: exchange_rate.input, output: exchange_rate.output };

    // 更新汇率
    if let Some((in_token, out_token, existing_rate)) = ctx.accounts.state.exchange_rates.iter_mut()
        .find(|(in_token, out_token, _)| 
            (*in_token == token_in_mint && *out_token == token_out_mint) ||
            (*in_token == Pubkey::default() && *out_token == Pubkey::default())
        ) {
        *in_token = token_in_mint;
        *out_token = token_out_mint;
        *existing_rate = rate;

        let clock = Clock::get()?;
        emit!(RateSetEvent {
            caller: ctx.accounts.authority.key(),
            token_in: token_in_mint,
            token_out: token_out_mint,
            old_rate,
            new_rate: rate,
            timestamp: clock.unix_timestamp,
        });
    }
    
    Ok(())
}

/// 设置交易池地址
pub fn set_pool_address(
    ctx: Context<PoolAddress>,
    new_pool_address: Pubkey,
) -> Result<()> {
    require!(new_pool_address != Pubkey::default(), WUSDError::InvalidAddress);
    
    let state = &mut ctx.accounts.state;
    let old_pool_address = state.treasury;
    state.treasury = new_pool_address;
    
    let clock = Clock::get()?;
    emit!(PoolAddressSetEvent {
        caller: ctx.accounts.authority.key(),
        old_pool_address,
        new_pool_address,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

/// 获取交易池地址
pub fn get_pool_address(state: &StateAccount) -> Pubkey {
    state.treasury
}

/// 更新单个代币的白名单状态的内部函数
pub(crate) fn update_whitelist_token(
    token_mint: Pubkey,
    status: bool,
    state: &mut Account<StateAccount>,
    authority: Pubkey,
) -> Result<()> {
    require!(token_mint != Pubkey::default(), WUSDError::InvalidAddress);
    
    // 验证代币精度
    let decimals = StateAccount::get_token_decimals(token_mint, state)?;
    require!(decimals <= MAX_DECIMALS, WUSDError::InvalidDecimals);

    if let Some((mint, whitelist_status)) = state.token_whitelist.iter_mut()
        .find(|(mint, _)| *mint == token_mint || *mint == Pubkey::default()) {
        *mint = token_mint;
        *whitelist_status = status;
        
        let clock = Clock::get()?;
        emit!(TokenWhitelistUpdatedEvent {
            caller: authority,
            token: token_mint,
            status,
            timestamp: clock.unix_timestamp,
        });
        Ok(())
    } else {
        err!(WUSDError::NoAvailableWhitelistSlot)
    }
}

/// 设置单个代币的白名单状态
pub fn set_whitelist_token(
    ctx: Context<SetWhitelistToken>,
    token_mint: Pubkey,
    status: bool,
) -> Result<()> {
    update_whitelist_token(
        token_mint,
        status,
        &mut ctx.accounts.state,
        ctx.accounts.authority.key(),
    )
}

/// 批量设置代币白名单状态
pub fn set_whitelist_tokens(
    ctx: Context<SetWhitelistToken>,
    token_mints: Vec<Pubkey>,
    status: bool,
) -> Result<()> {
    require!(!token_mints.is_empty(), WUSDError::InvalidInput);
    require!(token_mints.len() <= 3, WUSDError::TooManyTokens);
    
    let mut updated_count = 0;
    for token_mint in token_mints {
        if let Ok(()) = update_whitelist_token(
            token_mint,
            status,
            &mut ctx.accounts.state,
            ctx.accounts.authority.key(),
        ) {
            updated_count += 1;
        }
    }

    require!(updated_count > 0, WUSDError::NoTokensUpdated);
    Ok(())
}

/// 计算输出代币数量的辅助函数
pub(crate) fn calculate_output_amount(
    amount_in: u64,
    token_in_mint: Pubkey,
    token_out_mint: Pubkey,
    state: &StateAccount,
) -> Result<u64> {
    // 验证输入金额
    require!(amount_in > 0, WUSDError::InvalidAmount);

    // 验证代币精度
    let (in_decimals, out_decimals) = (
        StateAccount::get_token_decimals(token_in_mint, &state)?,
        StateAccount::get_token_decimals(token_out_mint, &state)?
    );
    require!(in_decimals <= MAX_DECIMALS && out_decimals <= MAX_DECIMALS, WUSDError::InvalidDecimals);

    // 获取并验证汇率
    let rate = StateAccount::get_exchange_rate(token_in_mint, token_out_mint, &state)?;
    require!(rate.input > 0 && rate.output > 0, WUSDError::InvalidExchangeRate);

    // 将输入金额标准化为最大精度
    let in_factor = 10u128.pow((MAX_DECIMALS - in_decimals) as u32);
    let normalized_amount = (amount_in as u128)
        .checked_mul(in_factor)
        .ok_or(WUSDError::MathOverflow)?;

    // 验证标准化后的金额不超过限制
    require!(normalized_amount <= u128::MAX / (rate.output as u128), WUSDError::MathOverflow);

    // 计算标准化的输出金额
    let normalized_output = normalized_amount
        .checked_mul(rate.output as u128)
        .ok_or(WUSDError::MathOverflow)?;

    // 验证除法不会溢出
    require!(rate.input > 0, WUSDError::InvalidExchangeRate);
    let normalized_output = normalized_output
        .checked_div(rate.input as u128)
        .ok_or(WUSDError::MathOverflow)?;

    // 将输出金额转换回原始精度
    let out_factor = 10u128.pow((MAX_DECIMALS - out_decimals) as u32);
    require!(normalized_output >= out_factor, WUSDError::AmountTooSmall);

    let amount_out = normalized_output
        .checked_div(out_factor)
        .ok_or(WUSDError::MathOverflow)?;

    // 确保输出金额不超过u64范围
    require!(amount_out <= u64::MAX as u128, WUSDError::MathOverflow);

    Ok(amount_out as u64)
} 


/// 检查代币是否在白名单中
pub(crate) fn is_token_whitelisted(token_mint: Pubkey, state: &StateAccount) -> bool {
    StateAccount::is_token_whitelisted(token_mint, &state.token_whitelist)
}

/// 验证代币地址
pub(crate) fn validate_token_addresses(token_in: Pubkey, token_out: Pubkey) -> Result<()> {
    require!(token_in != Pubkey::default(), WUSDError::InvalidAddress);
    require!(token_out != Pubkey::default(), WUSDError::InvalidAddress);
    require!(token_in != token_out, WUSDError::SameTokenAddresses);
    Ok(())
}

/// 验证交换输入参数
pub(crate) fn validate_swap_inputs(
    token_in: Pubkey,
    token_out: Pubkey,
    amount: u64,
    min_output_amount: u64,
) -> Result<()> {
    validate_token_addresses(token_in, token_out)?;
    require!(amount > 0, WUSDError::InvalidAmount);
    require!(min_output_amount > 0, WUSDError::InvalidAmount);
    Ok(())
}

/// 验证代币白名单状态
pub(crate) fn assert_whitelist_tokens(
    token_in: Pubkey,
    token_out: Pubkey,
    state: &StateAccount,
) -> Result<()> {
    require!(
        is_token_whitelisted(token_in, state),
        WUSDError::TokenNotWhitelisted
    );
    require!(
        is_token_whitelisted(token_out, state),
        WUSDError::TokenNotWhitelisted
    );
    Ok(())
}

/// 验证汇率设置
pub(crate) fn assert_exchange_rate_setting(
    token_in: Pubkey,
    token_out: Pubkey,
    state: &StateAccount,
) -> Result<()> {
    let rate = StateAccount::get_exchange_rate(token_in, token_out, state)?;
    require!(rate.input > 0 && rate.output > 0, WUSDError::InvalidExchangeRate);
    Ok(())
}
/// 设置代币配置
pub fn set_config(
    ctx: Context<SetConfig>,
    token_mint: Pubkey,
    decimals: u8,
) -> Result<()> {
    require!(token_mint != Pubkey::default(), WUSDError::InvalidAddress);
    require!(decimals <= MAX_DECIMALS, WUSDError::InvalidDecimals);
    
    let clock = Clock::get()?;
    emit!(ConfigSetEvent {
        caller: ctx.accounts.authority.key(),
        token_mint,
        decimals,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

/// 获取两个代币之间的兑换比率
pub fn get_rate(
    token_in_mint: Pubkey,
    token_out_mint: Pubkey,
    state: &StateAccount,
) -> Result<Rate> {
    // 验证代币地址
    validate_token_addresses(token_in_mint, token_out_mint)?;
    
    // 验证代币是否在白名单中
    assert_whitelist_tokens(token_in_mint, token_out_mint, state)?;
    
    // 获取汇率
    let exchange_rate = StateAccount::get_exchange_rate(token_in_mint, token_out_mint, state)?;
    Ok(Rate {
        input: exchange_rate.input,
        output: exchange_rate.output
    })
}