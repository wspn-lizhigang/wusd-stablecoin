use anchor_lang::prelude::*;

/// WUSD稳定币系统错误枚举
#[error_code]
pub enum WUSDError {
    /// 合约已暂停
    #[msg("Contract is paused")]
    ContractPaused,
    /// 无效的金额输入
    #[msg("Invalid amount")]
    InvalidAmount,
    /// 无效的签名
    #[msg("Invalid signature")]
    InvalidSignatureError,
    /// 无效的访问密钥
    #[msg("Invalid access key")]
    InvalidAccessKey,
    /// 供应量不足
    #[msg("Insufficient supply")]
    InsufficientSupply,
    /// 未授权的操作
    #[msg("Unauthorized")]
    Unauthorized,
    /// 滑点超出允许范围
    #[msg("Slippage exceeded")]
    SlippageExceeded,
    /// 没有可领取的奖励
    #[msg("No rewards to claim")]
    NoRewardsToClaim,
    /// 无效的锁定期限
    #[msg("Invalid lock duration")]
    InvalidLockDuration,
    /// 无效的质押状态
    #[msg("Invalid staking status")]
    InvalidStakingStatus,
    /// 紧急提现冷却期
    #[msg("Emergency withdraw cooldown")]
    EmergencyWithdrawCooldown,
    /// 质押处于锁定状态
    #[msg("Stake is locked")]
    StakeLocked,
    /// 代币未在白名单中
    #[msg("Token not whitelisted")]
    TokenNotWhitelisted,
    /// 数学计算溢出
    #[msg("Math overflow")]
    MathOverflow,
    /// 无效的质押池ID
    #[msg("Invalid pool ID")]
    InvalidPoolId,
    /// 无效的质押池状态
    #[msg("Invalid pool status")]
    InvalidPoolStatus,
    /// 质押金额低于最小要求
    #[msg("Staking amount too low")]
    StakingAmountTooLow,
    /// 相同代币地址错误
    #[msg("Cannot swap same token")]
    SameTokenAddresses,
    /// 余额不足
    #[msg("Insufficient balance")]
    InsufficientBalance,
    /// 无效的所有者
    #[msg("Invalid owner")]
    InvalidOwner,
    /// 无效的代币精度
    #[msg("Invalid decimals")]
    InvalidDecimals,
    /// 无效的兑换汇率
    #[msg("Invalid exchange rate")]
    InvalidExchangeRate,
    /// 无效的输出金额
    #[msg("Invalid output amount")]
    InvalidOutputAmount,
    /// 无效的地址
    #[msg("Invalid address")]
    InvalidAddress,
    /// 金库余额不足
    #[msg("Insufficient treasury balance")]
    InsufficientTreasuryBalance,
    /// 无可用的白名单槽位
    #[msg("No available whitelist slot")]
    NoAvailableWhitelistSlot,
    /// 无效的输入
    #[msg("Invalid input")]
    InvalidInput,
    /// 代币数量过多
    #[msg("Too many tokens")]
    TooManyTokens,
    /// 没有代币被更新
    #[msg("No tokens updated")]
    NoTokensUpdated,
    /// 金额太小
    #[msg("Amount too small")]
    AmountTooSmall,
    /// 算术溢出
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    /// 质押已被领取
    #[msg("Claim already claimed")]
    ClaimAlreadyClaimed,
    /// 未到可领取时间
    #[msg("Claimable timestamp not reached")]
    ClaimableTimestampNotReached,
    /// 空签名
    #[msg("Empty signatures")]
    EmptySignatures,
    /// 无效的签名者数量
    #[msg("Invalid number of signers")]
    InvalidNumberOfSigners,
    /// 未授权的签名者
    #[msg("Unauthorized signer")]
    UnauthorizedSigner,
    /// 无效的选择器
    #[msg("Invalid selector")]
    InvalidSelector,
    /// 未找到质押
    #[msg("Claim not found")]
    ClaimNotFound,
    /// 无效的质押计划
    #[msg("Invalid staking plan")]
    InvalidStakingPlan,
    /// 非所有者
    #[msg("Not an owner")]
    NotAnOwner,
}