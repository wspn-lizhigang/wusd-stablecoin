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
}