use anchor_lang::prelude::*;
use crate::{AccessLevel, error::WusdError};
use crate::state::{PauseState, AccessRegistryState}; 

/// 检查用户是否具有执行操作的权限
/// 
/// # 参数
/// * `user` - 用户地址
/// * `is_debit` - 是否为扣款操作
/// * `amount` - 操作金额（可选）
/// * `pause_state` - 暂停状态
/// * `access_registry` - 访问权限注册表（可选）
/// 
/// # 错误
/// * `WusdError::ContractPaused` - 合约已暂停
/// * `WusdError::InvalidAmount` - 金额无效
/// * `WusdError::AccessDenied` - 访问被拒绝
pub fn require_has_access(
    user: Pubkey,
    is_debit: bool,
    amount: Option<u64>,
    pause_state: &PauseState,
    access_registry: Option<&AccessRegistryState>,
) -> Result<()> {
    // 确保合约未暂停
    pause_state.validate_not_paused()?;

    // 验证金额，确保大于0且不为None
    if let Some(amount) = amount {
        require!(amount > 0, WusdError::InvalidAmount);
    }

    // 验证访问权限
    if let Some(registry) = access_registry {
        require!(registry.initialized, WusdError::AccessRegistryNotInitialized);
        let required_level = if is_debit {
            AccessLevel::Debit
        } else {
            AccessLevel::Credit
        };
        require!(
            registry.has_access(user, required_level),
            WusdError::AccessDenied
        );
    }

    Ok(())
}