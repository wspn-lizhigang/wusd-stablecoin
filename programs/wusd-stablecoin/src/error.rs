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
}