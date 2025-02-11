use anchor_lang::prelude::*;

#[error_code]
pub enum WusdError {
    #[msg("Contract is paused")]
    ContractPaused,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid decimals")]
    InvalidDecimals,
    #[msg("Invalid signature")]
    InvalidSignature,
    #[msg("Invalid nonce")]
    InvalidNonce,
    #[msg("Invalid scope")]
    InvalidScope,
    #[msg("Permit expired")]
    ExpiredPermit,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Not a minter")]
    NotMinter,
    #[msg("Not a burner")]
    NotBurner,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Too many operators")]
    TooManyOperators,
    #[msg("Operator not found")]
    OperatorNotFound,
    #[msg("Access denied")]
    AccessDenied,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Access registry not initialized")]
    AccessRegistryNotInitialized,
    #[msg("Invalid owner")]
    InvalidOwner,
    #[msg("Insufficient allowance")]
    InsufficientAllowance,
}