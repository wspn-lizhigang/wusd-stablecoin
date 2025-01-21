use anchor_lang::prelude::*;

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
    #[msg("Invalid lock duration")]
    InvalidLockDuration,
    #[msg("Invalid staking status")]
    InvalidStakingStatus,
    #[msg("Emergency withdraw cooldown")]
    EmergencyWithdrawCooldown,
    #[msg("Stake is locked")]
    StakeLocked,
    #[msg("Token not whitelisted")]
    TokenNotWhitelisted,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Invalid pool ID")]
    InvalidPoolId,
    #[msg("Invalid pool status")]
    InvalidPoolStatus,
    #[msg("Staking amount too low")]
    StakingAmountTooLow,
}