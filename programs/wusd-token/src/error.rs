use anchor_lang::prelude::*;

#[error_code]
pub enum WusdError {
    #[msg("合约已暂停")]
    ContractPaused,
    #[msg("无效金额")]
    InvalidAmount,
    #[msg("无效精度")]
    InvalidDecimals,
    #[msg("无效签名")]
    InvalidSignature,
    #[msg("无效随机数")]
    InvalidNonce,
    #[msg("无效范围")]
    InvalidScope,
    #[msg("许可已过期")]
    ExpiredPermit,
    #[msg("未授权操作")]
    Unauthorized,
    #[msg("非铸币者")]
    NotMinter,
    #[msg("非销毁者")]
    NotBurner,
    #[msg("余额不足")]
    InsufficientBalance,
    #[msg("操作员数量超过限制")]
    TooManyOperators,
    #[msg("操作员不存在")]
    OperatorNotFound,
    #[msg("访问被拒绝")]
    AccessDenied,
    #[msg("资金不足")]
    InsufficientFunds,
}