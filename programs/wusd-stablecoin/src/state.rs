use anchor_lang::prelude::*;
use crate::error::WUSDError;
use crate::instructions::swap::Rate;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PoolStatus {
    Active,
    Paused,
    Closed
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct StakingPool {
    pub id: u64,
    pub apy: u64,
    pub duration: i64,
    pub min_stake_amount: u64,
    pub status: PoolStatus,
}

#[account]
pub struct StateAccount {
    pub authority: Pubkey,
    pub wusd_mint: Pubkey,
    pub collateral_mint: Pubkey,  // 改为通用的抵押代币
    pub treasury: Pubkey,
    pub total_supply: u64,
    pub decimals: u8,
    pub paused: bool, 
    pub total_staked: u64,
    pub reward_rate: u64,
    pub last_update_time: i64,
    pub min_lock_duration: i64,
    pub max_lock_duration: i64,
    pub emergency_withdraw_penalty: u64,
    pub emergency_cooldown_duration: i64,
    pub high_apy_threshold: i64,
    pub medium_apy_threshold: i64,
    pub collateral_decimals: u8,  // 改为通用的抵押代币精度
    pub wusd_decimals: u8,
    pub token_whitelist: Vec<(Pubkey, bool)>,
    pub exchange_rates: Vec<(Pubkey, Pubkey, Rate)>,
    pub total_staking_plans: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct ExchangeRate {
    pub input: u64,
    pub output: u64,
}

impl StateAccount {
    pub const LEN: usize = 32 + 32 + 32 + 32 + 8 + 1 + 1 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 1 + 1 + 256 + 512 + 8; // 增加质押池计数器

    pub fn get_staking_pool(&self, pool_id: u64) -> Result<StakingPool> {
        // 这里简化实现，实际应该从存储中获取质押池信息
        Ok(StakingPool {
            id: pool_id,
            apy: 500_000_000, // 5% APY
            duration: 365 * 24 * 60 * 60, // 1年
            min_stake_amount: 100_000_000, // 最小质押金额
            status: PoolStatus::Active,
        })
    }

    pub fn is_token_whitelisted(&self, mint: Pubkey) -> bool {
        if let Some((_token, status)) = self.token_whitelist.iter().find(|(token, _)| *token == mint) {
            *status
        } else {
            false
        }
    }

    pub fn get_token_decimals(&self, mint: Pubkey) -> Result<u8> {
        if !self.is_token_whitelisted(mint) {
            return err!(WUSDError::TokenNotWhitelisted);
        }

        if mint == self.wusd_mint {
            Ok(self.wusd_decimals)
        } else if mint == self.collateral_mint {
            Ok(self.collateral_decimals)
        } else {
            err!(WUSDError::TokenNotWhitelisted)
        }
    }

    pub fn get_exchange_rate(&self, token_in_mint: Pubkey, token_out_mint: Pubkey) -> Result<ExchangeRate> {
        if !self.is_token_whitelisted(token_in_mint) || !self.is_token_whitelisted(token_out_mint) {
            return err!(WUSDError::TokenNotWhitelisted);
        }

        if let Some((_, _, rate)) = self.exchange_rates.iter()
            .find(|(in_token, out_token, _)| *in_token == token_in_mint && *out_token == token_out_mint) {
            Ok(ExchangeRate {
                input: rate.input,
                output: rate.output,
            })
        } else {
            // 默认1:1汇率
            Ok(ExchangeRate {
                input: 1_000_000_000,
                output: 1_000_000_000,
            })
        }
    }
}