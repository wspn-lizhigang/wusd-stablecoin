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
}

impl StateAccount {
    pub const LEN: usize = 32 + 32 + 32 + 32 + 8 + 1 + 1 + 8 + 8 + 8;
}