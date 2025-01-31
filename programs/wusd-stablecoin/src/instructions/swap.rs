use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};
use crate::state::StateAccount;
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

/// 设置代币兑换配置的账户参数
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

/// 设置代币兑换配置
/// * `ctx` - 设置配置的上下文
/// * `token_mint` - 代币铸币权地址
/// * `decimals` - 代币精度
pub fn set_config(
    ctx: Context<SetConfig>,
    token_mint: Pubkey,
    decimals: u8,
) -> Result<()> {
    require!(decimals <= MAX_DECIMALS, WUSDError::InvalidDecimals);
    
    // 更新代币白名单
    let state = &mut ctx.accounts.state;
    if let Some((mint, status)) = state.token_whitelist.iter_mut()
        .find(|(mint, _)| *mint == token_mint || *mint == Pubkey::default()) {
        *mint = token_mint;
        *status = true;
    }
    
    Ok(())
}

/// 设置代币兑换汇率
/// * `ctx` - 设置汇率的上下文
/// * `token_in_mint` - 输入代币的铸币权地址
/// * `token_out_mint` - 输出代币的铸币权地址
/// * `rate` - 兑换汇率
pub fn set_rate(
    ctx: Context<SetRate>,
    token_in_mint: Pubkey,
    token_out_mint: Pubkey,
    rate: Rate,
) -> Result<()> {
    require!(rate.input > 0 && rate.output > 0, WUSDError::InvalidExchangeRate);
    
    // 更新汇率
    let state = &mut ctx.accounts.state;
    if let Some((in_token, out_token, existing_rate)) = state.exchange_rates.iter_mut()
        .find(|(in_token, out_token, _)| 
            (*in_token == token_in_mint && *out_token == token_out_mint) ||
            (*in_token == Pubkey::default() && *out_token == Pubkey::default())
        ) {
        *in_token = token_in_mint;
        *out_token = token_out_mint;
        *existing_rate = rate;
    }
    
    Ok(())
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
    
    pub wusd_mint: Account<'info, Mint>,
    pub usdc_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,
}

/// 代币兑换事件，记录兑换的详细信息
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

/// 执行代币兑换操作
/// * `ctx` - 兑换上下文，包含所需的账户信息
/// * `amount_in` - 输入代币数量
/// * `min_amount_out` - 最小输出代币数量（滑点保护）
pub fn swap(
    ctx: Context<Swap>,
    amount_in: u64,
    min_amount_out: u64,
) -> Result<()> {
    // 基本验证
    require!(!ctx.accounts.state.paused, WUSDError::ContractPaused);
    require!(amount_in > 0, WUSDError::InvalidAmount);
    require!(min_amount_out > 0, WUSDError::InvalidAmount);
    
    // 验证代币余额
    require!(ctx.accounts.user_token_in.amount >= amount_in, WUSDError::InsufficientBalance);
    
    // 验证代币地址
    require!(ctx.accounts.user_token_in.owner == ctx.accounts.user.key(), WUSDError::InvalidOwner);
    require!(ctx.accounts.user_token_out.owner == ctx.accounts.user.key(), WUSDError::InvalidOwner);

    let user_account_in = ctx.accounts.user_token_in.to_account_info();
    let user_account_out = ctx.accounts.user_token_out.to_account_info();

    // 根据汇率和精度计算输出金额
    let amount_out = calculate_output_amount(
        amount_in,
        ctx.accounts.user_token_in.mint,
        ctx.accounts.user_token_out.mint,
        &ctx.accounts.state,
    )?;
    require!(amount_out >= min_amount_out, WUSDError::SlippageExceeded);

    // 将代币从用户转移到金库
    let transfer_in_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: user_account_in,
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
            to: user_account_out,
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

/// 计算输出代币数量的辅助函数
/// * `amount_in` - 输入代币数量
/// * `token_in_mint` - 输入代币的铸币权地址
/// * `token_out_mint` - 输出代币的铸币权地址
/// * `state` - 全局状态账户
/// * 返回根据汇率和精度计算后的输出代币数量
fn calculate_output_amount(
    amount_in: u64,
    token_in_mint: Pubkey,
    token_out_mint: Pubkey,
    state: &StateAccount,
) -> Result<u64> {
    // 验证代币精度
    let (in_decimals, out_decimals) = (
        StateAccount::get_token_decimals(token_in_mint, &state)?,
        StateAccount::get_token_decimals(token_out_mint, &state)?
    );
    require!(in_decimals <= MAX_DECIMALS && out_decimals <= MAX_DECIMALS, WUSDError::InvalidDecimals);

    // 将金额标准化为最大精度
    let in_factor = 10u64.pow((MAX_DECIMALS - in_decimals) as u32);
    let normalized_amount = amount_in.checked_mul(in_factor).ok_or(WUSDError::MathOverflow)?;

    // 获取并验证汇率
    let rate = StateAccount::get_exchange_rate(token_in_mint, token_out_mint, &state)?;
    require!(rate.input > 0 && rate.output > 0, WUSDError::InvalidExchangeRate);

    // 应用汇率并检查溢出
    let amount_with_rate = normalized_amount
        .checked_mul(rate.output).ok_or(WUSDError::MathOverflow)?
        .checked_div(rate.input).ok_or(WUSDError::MathOverflow)?;

    // 转换回输出代币精度
    let out_factor = 10u64.pow((MAX_DECIMALS - out_decimals) as u32);
    let final_amount = amount_with_rate
        .checked_div(out_factor).ok_or(WUSDError::MathOverflow)?;

    // 验证输出金额
    require!(final_amount > 0, WUSDError::InvalidOutputAmount);

    Ok(final_amount)
}