use anchor_lang::prelude::*;
use crate::error::WUSDError;

/// 基础权限和状态管理特征
pub trait Base {
    /// 检查账户是否具有指定角色权限
    fn has_role(_role: &[u8], authority: &Pubkey, state_authority: &Pubkey) -> bool {
        authority == state_authority
    }

    /// 检查合约是否已暂停
    fn ensure_not_paused(paused: bool) -> Result<()> {
        require!(!paused, WUSDError::ContractPaused);
        Ok(())
    }

    /// 检查地址不为零地址
    fn ensure_non_zero_address(address: &Pubkey) -> Result<()> {
        require!(*address != Pubkey::default(), WUSDError::InvalidAddress);
        Ok(())
    }
}

/// 角色常量定义
pub mod roles {
    pub const ADMIN: &[u8] = b"ADMIN";
    pub const UPGRADER: &[u8] = b"UPGRADER";
    pub const PAUSER: &[u8] = b"PAUSER";
    pub const CONFIG_SETTER: &[u8] = b"CONFIG_SETTER";
    pub const RATE_SETTER: &[u8] = b"RATE_SETTER";
}