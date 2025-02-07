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
    #[msg("Authority revoked")]
    AuthorityRevoked,
    #[msg("Unauthorized")]
    Unauthorized, 
    #[msg("Permission scope mismatch")]
    ScopeMismatch, 
    #[msg("Invalid chain ID")]
    InvalidChainId,
    #[msg("Nonce already used")]
    UsedNonce,  
    #[msg("Allowance account mismatch")]
    InvalidAllowanceAccount,
    #[msg("Mint authority mismatch")]
    InvalidMintAuthority,
    #[msg("Cross-chain permit attempt detected")]
    CrossChainAttack, 
    #[msg("Signature deadline expired")]
    SignatureExpired, 
    #[msg("Minting cap exceeded")]
    ExceedsMintCap,  
    #[msg("Contract version mismatch")]
    VersionMismatch, 
    #[msg("Recursive call detected")]
    RecursiveCall,
    #[msg("Invalid domain separator")]
    InvalidDomain,
    #[msg("Nonce mismatch")]
    NonceMismatch, 
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Invalid scope")]
    InvalidScope,
}