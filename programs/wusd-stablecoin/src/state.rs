use anchor_lang::prelude::*;
use crate::error::WUSDError;
use crate::instructions::swap::Rate;

/// 质押池状态枚举
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PoolStatus {
    Active,
    Paused,
    Closed
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

/// 全局状态账户，存储系统的核心配置和状态
#[account]
pub struct StateAccount {
    pub authority: Pubkey,
    pub wusd_mint: Pubkey,
    pub collateral_mint: Pubkey,
    pub treasury: Pubkey,
    pub total_supply: u64,
    pub decimals: u8,
    pub paused: bool,
    pub total_staked: u64,
    pub reward_rate: u64,
    pub last_update_time: i64,
    pub emergency_withdraw_penalty: u64,
    pub emergency_cooldown_duration: i64,
    pub collateral_decimals: u8,
    pub wusd_decimals: u8,
    pub token_whitelist: [(Pubkey, bool); 3],
    pub exchange_rates: [(Pubkey, Pubkey, Rate); 3],
    pub total_staking_plans: u64,
}

/// 代币兑换汇率结构体
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct ExchangeRate {
    pub input: u64,
    pub output: u64,
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
        8 + // min_lock_duration
        8 + // max_lock_duration
        8 + // emergency_withdraw_penalty
        8 + // emergency_cooldown_duration
        8 + // high_apy_threshold
        8 + // medium_apy_threshold
        1 + // collateral_decimals
        1 + // wusd_decimals
        8 + // padding for alignment
        4 + // token_whitelist length prefix
        (32 + 1) * 5 + // 减少数组大小以优化栈使用
        4 + // exchange_rates length prefix
        (32 + 32 + 16) * 5 + // 减少数组大小以优化栈使用
        8; // total_staking_plans

    /// 根据池ID获取质押池信息
    /// * `pool_id` - 质押池ID
    /// * 返回质押池配置信息
    pub fn get_staking_pool(pool_id: u64) -> Result<StakingPool> {
        // 这里简化实现，实际应该从存储中获取质押池信息
        Ok(StakingPool {
            id: pool_id,
            apy: 500_000_000, // 5% APY
            duration: 365 * 24 * 60 * 60, // 1年
            min_stake_amount: 100_000_000, // 最小质押金额
            status: PoolStatus::Active,
        })
    }

    /// 检查代币是否在白名单中
    /// * `mint` - 代币铸币权地址
    /// * 返回代币是否被允许使用
    pub fn is_token_whitelisted(mint: Pubkey, token_whitelist: &[(Pubkey, bool)]) -> bool {
        if let Some((_token, status)) = token_whitelist.iter().find(|(token, _)| *token == mint) {
            *status
        } else {
            false
        }
    }

    /// 获取代币精度
    /// * `mint` - 代币铸币权地址
    /// * 返回代币精度
    pub fn get_token_decimals(mint: Pubkey, state: &StateAccount) -> Result<u8> {
        if !Self::is_token_whitelisted(mint, &state.token_whitelist) {
            return err!(WUSDError::TokenNotWhitelisted);
        }

        if mint == state.wusd_mint {
            Ok(state.wusd_decimals)
        } else if mint == state.collateral_mint {
            Ok(state.collateral_decimals)
        } else {
            err!(WUSDError::TokenNotWhitelisted)
        }
    }

    /// 获取两个代币之间的兑换汇率
    /// * `token_in_mint` - 输入代币的铸币权地址
    /// * `token_out_mint` - 输出代币的铸币权地址
    /// * 返回兑换汇率
    pub fn get_exchange_rate(token_in_mint: Pubkey, token_out_mint: Pubkey, state: &StateAccount) -> Result<ExchangeRate> {
        if !Self::is_token_whitelisted(token_in_mint, &state.token_whitelist) || !Self::is_token_whitelisted(token_out_mint, &state.token_whitelist) {
            return err!(WUSDError::TokenNotWhitelisted);
        }

        if let Some((_, _, rate)) = state.exchange_rates.iter()
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