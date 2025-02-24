use anchor_lang::prelude::*;
use crate::{AccessLevel, error::WusdError};

/// 授权额度状态账户，存储代币授权信息
#[account]
pub struct AllowanceState {
    /// 代币所有者地址
    pub owner: Pubkey,
    /// 被授权者地址
    pub spender: Pubkey,
    /// 授权额度
    pub amount: u64,
}

impl AllowanceState {
    /// 授权额度状态账户大小
    pub const SIZE: usize = 8 + 32 + 32 + 8;

    /// 初始化授权状态
    /// * `owner` - 代币所有者
    /// * `spender` - 被授权者
    /// * `amount` - 授权金额
    pub fn initialize(owner: Pubkey, spender: Pubkey, amount: u64) -> Self {
        Self {
            owner,
            spender,
            amount,
        }
    }

    /// 增加授权额度
    /// * `added_value` - 增加的额度
    pub fn increase_allowance(&mut self, added_value: u64) -> Result<()> {
        self.amount = self.amount.checked_add(added_value)
            .ok_or(error!(crate::error::WusdError::InvalidAmount))?;
        Ok(())
    }

    /// 减少授权额度
    /// * `subtracted_value` - 减少的额度
    pub fn decrease_allowance(&mut self, subtracted_value: u64) -> Result<()> {
        require!(self.amount >= subtracted_value, crate::error::WusdError::InvalidAmount);
        self.amount = self.amount.checked_sub(subtracted_value)
            .ok_or(error!(crate::error::WusdError::InvalidAmount))?;
        Ok(())
    }

    /// 验证授权额度是否足够
    /// * `amount` - 待验证的金额
    pub fn validate_allowance(&self, amount: u64) -> Result<()> {
        require!(self.amount >= amount, crate::error::WusdError::InvalidAmount);
        Ok(())
    }
}

/// 签名许可状态账户，用于EIP-2612兼容的签名授权
#[account]
pub struct PermitState {
    /// 所有者地址
    pub owner: Pubkey,
    /// 被授权者地址
    pub spender: Pubkey,
    /// 随机数，用于防止重放攻击
    pub nonce: u64,
    /// 授权额度
    pub amount: u64,
    /// 过期时间
    pub expiration: i64,
    /// PDA bump
    pub bump: u8,
}

impl PermitState {
    /// 许可状态账户大小
    pub const SIZE: usize = 8 + 32 + 32 + 8 + 8 + 8 + 1;

    /// 初始化签名许可状态
    /// * `owner` - 所有者地址
    pub fn initialize(owner: Pubkey, spender: Pubkey, amount: u64, expiration: i64, bump: u8) -> Self {
        Self {
            owner,
            spender,
            nonce: 0,
            amount,
            expiration,
            bump,
        }
    }

    /// 增加随机数
    pub fn increment_nonce(&mut self) {
        self.nonce = self.nonce.checked_add(1).unwrap_or(0);
    }

    /// 验证随机数
    /// * `expected_nonce` - 期望的随机数
    pub fn validate_nonce(&self, expected_nonce: u64) -> Result<()> {
        require!(self.nonce == expected_nonce, crate::error::WusdError::InvalidNonce);
        Ok(())
    }
}

/// 权限管理状态账户，存储合约的权限配置
#[account]
pub struct AuthorityState {
    /// 管理员地址
    pub admin: Pubkey,
    /// 铸币权限地址
    pub minter: Pubkey,
    /// 暂停权限地址
    pub pauser: Pubkey,
}

impl AuthorityState {
    /// 权限管理状态账户大小
    /// discriminator + admin + minter + pauser
    pub const SIZE: usize = 8 + 32 * 3;

    pub fn initialize(admin: Pubkey) -> Self {
        Self {
            admin: admin,
            minter: admin,
            pauser: admin,
        }
    }

    pub fn is_admin(&self, user: Pubkey) -> bool {
        self.admin == user
    }

    pub fn is_minter(&self, user: Pubkey) -> bool {
        self.minter == user
    }

    pub fn is_pauser(&self, user: Pubkey) -> bool {
        self.pauser == user
    } 
}

/// 访问权限注册表状态
#[account]
#[derive(Default)]
pub struct AccessRegistryState {
    /// 管理员地址
    pub authority: Pubkey,
    /// 是否已初始化
    pub initialized: bool,
    /// 操作员列表 (使用固定大小数组代替 Vec 来避免序列化问题)
    pub operators: [Pubkey; 10],  // 支持最多10个操作员
    /// 当前操作员数量
    pub operator_count: u8,
}

impl AccessRegistryState {
    pub const SIZE: usize = 8 + // discriminator
        32 + // authority
        4 + // operator_count
        (32 * 10) + // operators array
        1; // initialized

    pub fn new(authority: Pubkey) -> Self {
        Self {
            authority,
            operator_count: 0,
            operators: [Pubkey::default(); 10],
            initialized: false,
        }
    }

    /// 添加操作员
    pub fn add_operator(&mut self, operator: Pubkey) -> Result<()> {
        // 检查是否已达到最大操作员数量
        require!(
            self.operator_count < 10,
            WusdError::TooManyOperators
        );

        // 检查操作员是否已存在
        for i in 0..self.operator_count as usize {
            if self.operators[i] == operator {
                return Ok(());  // 操作员已存在，直接返回
            }
        }

        // 添加新操作员
        self.operators[self.operator_count as usize] = operator;
        self.operator_count += 1;
        Ok(())
    }

    /// 移除操作员
    pub fn remove_operator(&mut self, operator: Pubkey) -> Result<()> {
        let mut found = false;
        for i in 0..self.operator_count as usize {
            if self.operators[i] == operator {
                // 找到要移除的操作员
                found = true;
                // 将后面的操作员向前移动
                for j in i..self.operator_count as usize - 1 {
                    self.operators[j] = self.operators[j + 1];
                }
                // 清除最后一个位置
                self.operators[self.operator_count as usize - 1] = Pubkey::default();
                self.operator_count -= 1;
                break;
            }
        }

        require!(found, WusdError::OperatorNotFound);
        Ok(())
    }

    /// 检查是否有访问权限
    pub fn has_access(&self, user: Pubkey, level: AccessLevel) -> bool {
        // 如果是 Credit 操作（接收代币），直接允许
        if matches!(level, AccessLevel::Credit) {
            return true;
        }

        // 如果是管理员，允许所有操作
        if user == self.authority {
            return true;
        }

        // 检查是否是操作员
        for i in 0..self.operator_count as usize {
            if self.operators[i] == user {
                return true;
            }
        }

        false
    }
}

/// 铸币状态账户，存储代币铸造相关信息
#[account]
pub struct MintState {
    /// 代币铸币账户地址
    pub mint: Pubkey,
    /// 代币精度
    pub decimals: u8,
}

impl MintState {
    pub const SIZE: usize = 8 + // discriminator
        32 + // mint
        1;  // decimals
}

/// 暂停状态账户，用于控制合约的暂停/恢复
#[account]
pub struct PauseState {
    /// 合约是否暂停
    pub paused: bool,
}

impl PauseState {
    pub const SIZE: usize = 8 + // discriminator
        1;  // paused

    /// 设置暂停状态
    pub fn set_paused(&mut self, paused: bool) {
        self.paused = paused;
    }

    /// 验证合约未暂停
    pub fn validate_not_paused(&self) -> Result<()> {
        require!(!self.paused, WusdError::ContractPaused);
        Ok(())
    }
}

/// 账户冻结状态，用于控制账户的冻结/解冻
#[account]
pub struct FreezeState {
    /// 账户是否被冻结
    pub is_frozen: bool,
}

impl FreezeState {
    pub const SIZE: usize = 8 + // discriminator
        1;  // is_frozen

    /// 检查账户是否被冻结
    pub fn check_frozen(&self) -> Result<()> {
        require!(!self.is_frozen, WusdError::AccountFrozen);
        Ok(())
    }

    /// 冻结账户
    pub fn freeze(&mut self) -> Result<()> {
        require!(!self.is_frozen, WusdError::AccountAlreadyFrozen);
        self.is_frozen = true;
        Ok(())
    }

    /// 解冻账户
    pub fn unfreeze(&mut self) {
        self.is_frozen = false;
    }
}