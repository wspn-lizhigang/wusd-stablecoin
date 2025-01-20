use anchor_lang::prelude::*;

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
    pub min_lock_duration: i64,  // 最小锁定期限
    pub max_lock_duration: i64,  // 最大锁定期限
    pub emergency_withdraw_penalty: u64,  // 紧急提现惩罚比例
    pub emergency_cooldown_duration: i64,  // 紧急提现冷却期
    pub high_apy_threshold: i64,  // 高APY阈值
    pub medium_apy_threshold: i64,  // 中等APY阈值
    pub usdc_decimals: u8,  // USDC代币精度
    pub wusd_decimals: u8,  // WUSD代币精度
}

impl StateAccount {
    pub const LEN: usize = 32 + 32 + 32 + 32 + 8 + 1 + 1 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 1 + 1;

    pub fn is_token_whitelisted(&self, mint: Pubkey) -> bool {
        mint == self.wusd_mint || mint == self.usdc_mint
    }

    pub fn get_exchange_rate(&self, token_in_mint: Pubkey, token_out_mint: Pubkey) -> u64 {
        if token_in_mint == self.usdc_mint && token_out_mint == self.wusd_mint {
            1_000_000_000 // 1:1 exchange rate
        } else if token_in_mint == self.wusd_mint && token_out_mint == self.usdc_mint {
            1_000_000_000 // 1:1 exchange rate
        } else {
            0
        }
    }
}