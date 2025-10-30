use anchor_lang::prelude::*;

#[error_code]
pub enum WusdError {
    #[msg("Contract is paused")]
    ContractPaused,
    #[msg("Invalid amount")]
    InvalidAmount,   
    #[msg("Permit expired")]
    PermitExpired,
    #[msg("Invalid nonce")]
    InvalidNonce,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Not a minter")]
    NotMinter,
    #[msg("Not a pauser")]
    NotPauser,
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
    #[msg("Account is frozen")]
    AccountFrozen,
    #[msg("Account is already frozen")]
    AccountAlreadyFrozen,
    #[msg("Account is not frozen")]
    AccountNotFrozen,
    #[msg("Invalid transfer from operation")]
    InvalidTransferFrom,
    #[msg("Invalid mint address")]
    InvalidMint, 
}