use anchor_lang::prelude::*;

#[error_code]
pub enum WusdError {
    #[msg("Invalid decimals")]
    InvalidDecimals,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid nonce")]
    InvalidNonce,
    #[msg("Contract is paused")]
    ContractPaused,
    #[msg("Not minter")]
    NotMinter,
    #[msg("Not burner")]
    NotBurner,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Expired permit")]
    ExpiredPermit,
    #[msg("Access denied")]
    AccessDenied,
    #[msg("Invalid signature")]
    InvalidSignature, 
    #[msg("Unauthorized")]
    Unauthorized,
}