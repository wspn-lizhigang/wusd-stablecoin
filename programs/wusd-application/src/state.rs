use anchor_lang::prelude::*;
use crate::error::WUSDError;
use crate::instructions::swap::Rate;
use crate::instructions::softstake::SoftStakeAccount;

/// 质押池状态枚举
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum PoolStatus {
    Active = 0,
    Paused = 1,
    Closed = 2
}

/// 质押池配置结构体
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct StakingPool {
    pub id: u64,
    pub apy: u64,
    pub duration: i64,
    pub min_stake_amount: u64,
    pub status: PoolStatus,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct ExchangeRate {
    pub input: u64,
    pub output: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TokenConfig {
    pub wusd_mint: Pubkey,
    pub collateral_mint: Pubkey,
    pub treasury: Pubkey,
    pub total_supply: u64,
    pub decimals: u8,
    pub collateral_decimals: u8,
    pub wusd_decimals: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StakingConfig {
    pub total_staked: u64,
    pub reward_rate: u64,
    pub last_update_time: i64,
    pub emergency_withdraw_penalty: u64,
    pub emergency_cooldown_duration: i64,
    pub total_staking_plans: u64,
}

#[account]
pub struct StateAccount {
    pub authority: Pubkey,
    pub token_config: Box<TokenConfig>,
    pub staking_config: Box<StakingConfig>,
    pub paused: bool,
    pub token_whitelist: Box<[(Pubkey, bool); 3]>,
    pub exchange_rates: Box<[(Pubkey, Pubkey, Rate); 3]>,
    pub staking_pools: Box<[StakingPool; 16]>,
    pub claims: Box<[(Pubkey, SoftStakeAccount); 16]>,
    pub claims_count: u32,
    pub owners: Box<[Pubkey; 5]>,
    pub pool_address: Pubkey
}

impl StateAccount {
    pub const LEN: usize = 32 + // authority
        32 + // wusd_mint
        32 + // collateral_mint
        32 + // treasury
        8 + // total_supply
        1 + // decimals
        1 + // paused
        8 + // total_staked
        8 + // reward_rate
        8 + // last_update_time
        8 + // emergency_withdraw_penalty
        8 + // emergency_cooldown_duration
        1 + // collateral_decimals
        1 + // wusd_decimals
        (32 + 1) * 3 + // token_whitelist
        (32 + 32 + 16) * 3 + // exchange_rates
        8 + // total_staking_plans
        32 * 5 + // owners
        32 + // pool_address
        (32 + 128) * 16 + // claims
        4 + // claims_count
        (8 + 8 + 8 + 8 + 1) * 16; // staking_pools

    pub fn has_role(_role: &[u8], authority: &Pubkey, state_authority: &Pubkey) -> bool {
        authority == state_authority
    }

    pub fn ensure_not_paused(paused: bool) -> Result<()> {
        require!(!paused, WUSDError::ContractPaused);
        Ok(())
    }

    pub fn get_staking_pool(pool_id: u64) -> Result<StakingPool> {
        Ok(StakingPool {
            id: pool_id,
            apy: 500_000_000, // 5% APY
            duration: 365 * 24 * 60 * 60, // 1年
            min_stake_amount: 100_000_000, // 最小质押金额
            status: PoolStatus::Active,
        })
    }

    pub fn is_token_whitelisted(mint: Pubkey, token_whitelist: &Box<[(Pubkey, bool); 3]>) -> bool {
        if let Some((_token, status)) = token_whitelist.iter().find(|(token, _)| *token == mint) {
            *status
        } else {
            false
        }
    }

    pub fn get_token_decimals(mint: Pubkey, state: &StateAccount) -> Result<u8> {
        if !StateAccount::is_token_whitelisted(mint, &state.token_whitelist) {
            return err!(WUSDError::TokenNotWhitelisted);
        }

        if mint == state.token_config.wusd_mint {
            Ok(state.token_config.wusd_decimals)
        } else if mint == state.token_config.collateral_mint {
            Ok(state.token_config.collateral_decimals)
        } else {
            err!(WUSDError::TokenNotWhitelisted)
        }
    }

    pub fn get_exchange_rate(token_in_mint: Pubkey, token_out_mint: Pubkey, state: &StateAccount) -> Result<ExchangeRate> {
        if !StateAccount::is_token_whitelisted(token_in_mint, &state.token_whitelist) || !StateAccount::is_token_whitelisted(token_out_mint, &state.token_whitelist) {
            return err!(WUSDError::TokenNotWhitelisted);
        }

        if let Some((_, _, rate)) = state.exchange_rates.iter()
            .find(|(in_token, out_token, _)| *in_token == token_in_mint && *out_token == token_out_mint) {
            Ok(ExchangeRate {
                input: rate.input,
                output: rate.output,
            })
        } else {
            Ok(ExchangeRate {
                input: 1_000_000_000,
                output: 1_000_000_000,
            })
        }
    }
}