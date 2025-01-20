#![allow(clippy::result_large_err)]
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("B7EV2BY6dWzjcPYnHL5UympTZzGtMZGRJ3KyGhv5AfJ4");

#[program]
pub mod wusd_stablecoin {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        decimals: u8,
    ) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.authority = ctx.accounts.authority.key();
        state.wusd_mint = ctx.accounts.wusd_mint.key();
        state.usdc_mint = ctx.accounts.usdc_mint.key();
        state.treasury = ctx.accounts.treasury.key();
        state.total_supply = 0;
        state.decimals = decimals;
        state.paused = false;
        Ok(())
    }

    pub fn deposit(
        ctx: Context<Deposit>,
        amount: u64,
    ) -> Result<()> {
        require!(!ctx.accounts.state.paused, WUSDError::ContractPaused);
        require!(amount > 0, WUSDError::InvalidAmount);

        // Transfer USDC from user to treasury
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_usdc.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, amount)?;

        // Mint equivalent amount of WUSD to user
        let seeds = &[
            b"state".as_ref(),
            &[ctx.bumps.state],
        ];
        let signer = &[&seeds[..]];

        let mint_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                mint: ctx.accounts.wusd_mint.to_account_info(),
                to: ctx.accounts.user_wusd.to_account_info(),
                authority: ctx.accounts.state.to_account_info(),
            },
            signer,
        );
        token::mint_to(mint_ctx, amount)?;

        ctx.accounts.state.total_supply += amount;

        emit!(DepositEvent {
            user: ctx.accounts.user.key(),
            amount,
        });

        Ok(())
    }

    pub fn withdraw(
        ctx: Context<Withdraw>,
        amount: u64,
    ) -> Result<()> {
        require!(!ctx.accounts.state.paused, WUSDError::ContractPaused);
        require!(amount > 0, WUSDError::InvalidAmount);
        require!(
            amount <= ctx.accounts.state.total_supply,
            WUSDError::InsufficientSupply
        );

        // Burn WUSD from user
        let burn_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Burn {
                mint: ctx.accounts.wusd_mint.to_account_info(),
                from: ctx.accounts.user_wusd.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::burn(burn_ctx, amount)?;

        // Transfer USDC from treasury to user
        let seeds = &[
            b"state".as_ref(),
            &[ctx.bumps.state],
        ];
        let signer = &[&seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.treasury.to_account_info(),
                to: ctx.accounts.user_usdc.to_account_info(),
                authority: ctx.accounts.state.to_account_info(),
            },
            signer,
        );
        token::transfer(transfer_ctx, amount)?;

        ctx.accounts.state.total_supply -= amount;

        emit!(WithdrawEvent {
            user: ctx.accounts.user.key(),
            amount,
        });

        Ok(())
    }

    pub fn pause(ctx: Context<AdminOnly>) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.state.authority,
            WUSDError::Unauthorized
        );
        ctx.accounts.state.paused = true;
        emit!(PauseEvent {});
        Ok(())
    }

    pub fn unpause(ctx: Context<AdminOnly>) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.state.authority,
            WUSDError::Unauthorized
        );
        ctx.accounts.state.paused = false;
        emit!(UnpauseEvent {});
        Ok(())
    }

    pub fn swap(
        ctx: Context<Swap>,
        amount_in: u64,
        min_amount_out: u64,
        is_usdc_to_wusd: bool,
    ) -> Result<()> {
        require!(!ctx.accounts.state.paused, WUSDError::ContractPaused);
        require!(amount_in > 0, WUSDError::InvalidAmount);

        let (user_account_in, user_account_out) = if is_usdc_to_wusd {
            (
                ctx.accounts.user_token_in.to_account_info(),
                ctx.accounts.user_token_out.to_account_info(),
            )
        } else {
            (
                ctx.accounts.user_token_in.to_account_info(),
                ctx.accounts.user_token_out.to_account_info(),
            )
        };

        // Calculate amount out based on 1:1 ratio
        let amount_out = amount_in;
        require!(amount_out >= min_amount_out, WUSDError::SlippageExceeded);

        // Transfer tokens from user
        let transfer_in_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: user_account_in,
                to: ctx.accounts.treasury.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::transfer(transfer_in_ctx, amount_in)?;

        // Transfer tokens to user
        let seeds = &[
            b"state".as_ref(),
            &[ctx.bumps.state], // 修改: 替换为 ctx.bumps.state
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

        emit!(SwapEvent {
            user: ctx.accounts.user.key(),
            amount_in,
            amount_out,
            is_usdc_to_wusd,
        });

        Ok(())
    }

    pub fn stake(
        ctx: Context<Stake>,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, WUSDError::InvalidAmount);
    
        // 转移 WUSD 到质押保险库
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_wusd.to_account_info(),
                to: ctx.accounts.stake_vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, amount)?;
    
        // 更新质押账户
        let stake_account = &mut ctx.accounts.stake_account;
        let now = Clock::get()?.unix_timestamp;
        
        if stake_account.amount > 0 {
            // 如果已经有质押，先计算并更新之前的奖励
            let time_passed = now - stake_account.last_update_time;
            let rewards = (stake_account.amount * ctx.accounts.state.reward_rate as u64 * time_passed as u64) / 1_000_000_000;
            stake_account.rewards_earned += rewards;
        }
    
        stake_account.amount += amount;
        stake_account.last_update_time = now;
        
        if stake_account.owner == Pubkey::default() {
            stake_account.owner = ctx.accounts.user.key();
        }
    
        // 更新全局状态
        ctx.accounts.state.total_staked += amount;
        ctx.accounts.state.last_update_time = now;
    
        emit!(StakeEvent {
            user: ctx.accounts.user.key(),
            amount,
        });
    
        Ok(())
    }

    // 在 wusd_stablecoin 模块中添加 claim 函数
    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let stake_account = &mut ctx.accounts.stake_account;
        let now = Clock::get()?.unix_timestamp;
        
        // 计算新的奖励
        let time_passed = now - stake_account.last_update_time;
        let new_rewards = (stake_account.amount * ctx.accounts.state.reward_rate * time_passed as u64) / 1_000_000_000;
        let total_rewards = stake_account.rewards_earned + new_rewards;
        
        require!(total_rewards > 0, WUSDError::NoRewardsToClaim);

        // 铸造奖励代币
        let seeds = &[
            b"state".as_ref(),
            &[ctx.bumps.state],
        ];
        let signer = &[&seeds[..]];

        let mint_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                mint: ctx.accounts.wusd_mint.to_account_info(),
                to: ctx.accounts.user_wusd.to_account_info(),
                authority: ctx.accounts.state.to_account_info(),
            },
            signer,
        );
        token::mint_to(mint_ctx, total_rewards)?;

        // 更新状态
        stake_account.rewards_earned = 0;
        stake_account.last_update_time = now;

        emit!(ClaimEvent {
            user: ctx.accounts.user.key(),
            amount: total_rewards,
        }); 
        Ok(())
   }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + StateAccount::LEN,
        seeds = [b"state"],
        bump
    )]
    pub state: Account<'info, StateAccount>,
    
    pub wusd_mint: Account<'info, Mint>,
    pub usdc_mint: Account<'info, Mint>,
    pub treasury: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub user_usdc: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_wusd: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub wusd_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"state"],
        bump,
    )]
    pub state: Account<'info, StateAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub user_usdc: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_wusd: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub wusd_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"state"],
        bump,
    )]
    pub state: Account<'info, StateAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Swap<'info> {
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub user_token_in: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_token_out: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub vault_token_in: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub vault_token_out: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    
    #[account(
        mut,
        seeds = [b"state"],
        bump,
        constraint = state.paused == false
    )]
    pub state: Account<'info, StateAccount>,
    
    pub wusd_mint: Account<'info, Mint>,
    pub usdc_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct Stake<'info> {
    #[account(mut)]  // 添加 mut 标记
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub user_wusd: Account<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + StakeAccount::LEN,
        seeds = [b"stake", user.key().as_ref()],
        bump
    )]
    pub stake_account: Account<'info, StakeAccount>,
    
    #[account(mut)]
    pub stake_vault: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"state"],
        bump,
        constraint = !state.paused @ WUSDError::ContractPaused
    )]
    pub state: Account<'info, StateAccount>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

// 添加 Claim 指令的账户验证结构
#[derive(Accounts)]
pub struct Claim<'info> {
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"stake", user.key().as_ref()],
        bump,
        constraint = stake_account.owner == user.key()
    )]
    pub stake_account: Account<'info, StakeAccount>,
    
    #[account(mut)]
    pub user_wusd: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub wusd_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        seeds = [b"state"],
        bump,
        constraint = !state.paused @ WUSDError::ContractPaused
    )]
    pub state: Account<'info, StateAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AdminOnly<'info> {
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"state"],
        bump,
    )]
    pub state: Account<'info, StateAccount>,
}

#[account]
pub struct StateAccount {
    pub authority: Pubkey,
    pub wusd_mint: Pubkey,
    pub usdc_mint: Pubkey,
    pub treasury: Pubkey,
    pub total_supply: u64,
    pub decimals: u8,
    pub paused: bool, 
    pub total_staked: u64,
    pub reward_rate: u64,  // 每秒每个质押代币可以获得的奖励数量（以最小单位计）
    pub last_update_time: i64,
}

impl StateAccount {
    pub const LEN: usize = 32 + 32 + 32 + 32 + 8 + 1 + 1 + 8 + 8 + 8;
}

#[account]
pub struct StakeAccount {
    pub owner: Pubkey,
    pub amount: u64,
    pub rewards_earned: u64,
    pub last_update_time: i64,
}

impl StakeAccount {
    pub const LEN: usize = 32 + 8 + 8 + 8;
}

#[event]
pub struct DepositEvent {
    pub user: Pubkey,
    pub amount: u64,
}

#[event]
pub struct WithdrawEvent {
    pub user: Pubkey,
    pub amount: u64,
}

#[event]
pub struct SwapEvent {
    pub user: Pubkey,
    pub amount_in: u64,
    pub amount_out: u64,
    pub is_usdc_to_wusd: bool,
}

#[event]
pub struct StakeEvent {
    pub user: Pubkey,
    pub amount: u64,
}

#[event]
pub struct PauseEvent {}

#[event]
pub struct UnpauseEvent {}

// 添加 Claim 事件
#[event]
pub struct ClaimEvent {
    pub user: Pubkey,
    pub amount: u64,
}

#[error_code]
pub enum WUSDError {
    #[msg("Contract is paused")]
    ContractPaused,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Insufficient supply")]
    InsufficientSupply,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Slippage exceeded")]
    SlippageExceeded,
    #[msg("No rewards to claim")]
    NoRewardsToClaim,
}
