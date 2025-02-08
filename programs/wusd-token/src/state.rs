use anchor_lang::prelude::*;
use crate::AccessLevel;

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
    /// 随机数，用于防止重放攻击
    pub nonce: u64,
}

impl PermitState {
    /// 初始化签名许可状态
    /// * `owner` - 所有者地址
    pub fn initialize(owner: Pubkey) -> Self {
        Self {
            owner,
            nonce: 0,
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

    pub fn is_burner(&self, user: Pubkey) -> bool {
        self.minter == user
    }
}

/// 访问权限注册表状态
#[account]
pub struct AccessRegistryState {
    /// 管理员地址
    pub authority: Pubkey,
    /// 是否已初始化
    pub initialized: bool,
    /// 操作员列表
    pub operators: Vec<Pubkey>,
}

impl AccessRegistryState {
    /// 添加操作员
    pub fn add_operator(&mut self, operator: Pubkey) {
        if !self.operators.contains(&operator) {
            self.operators.push(operator);
        }
    }

    /// 移除操作员
    pub fn remove_operator(&mut self, operator: Pubkey) {
        if let Some(pos) = self.operators.iter().position(|x| x == &operator) {
            self.operators.remove(pos);
        }
    }

    /// 检查是否有访问权限
    pub fn has_access(&self, user: Pubkey, _level: AccessLevel) -> bool {
        self.operators.contains(&user) || user == self.authority
    }
}

#[account]
pub struct MintState {
    /// 代币铸币权地址
    pub mint: Pubkey,
    /// 代币精度
    pub decimals: u8,
}

impl MintState {
    /// 初始化铸币状态
    /// * `mint` - 代币铸币权地址
    /// * `decimals` - 代币精度
    pub fn initialize(mint: Pubkey, decimals: u8) -> Result<Self> {
        require!(decimals <= 9, crate::error::WusdError::InvalidDecimals);
        
        Ok(Self {
            mint,
            decimals,
        })
    }
    
    /// 验证铸币权地址是否匹配
    /// * `mint` - 待验证的铸币权地址
    pub fn validate_mint(&self, mint: Pubkey) -> bool {
        self.mint == mint
    }
    
    /// 验证金额是否有效
    /// * `amount` - 待验证的金额
    pub fn validate_amount(&self, amount: u64) -> Result<()> {
        require!(amount > 0, crate::error::WusdError::InvalidAmount);
        Ok(())
    }
}

#[account]
pub struct PauseState {
    /// 合约暂停状态
    pub paused: bool,
}

impl PauseState {
    /// 初始化暂停状态
    pub fn initialize() -> Self {
        Self {
            paused: false,
        }
    }
    
    /// 设置暂停状态
    /// * `paused` - 是否暂停
    pub fn set_paused(&mut self, paused: bool) {
        self.paused = paused;
    }
    
    /// 获取当前暂停状态
    pub fn is_paused(&self) -> bool {
        self.paused
    }
    
    /// 验证合约是否未暂停
    pub fn validate_not_paused(&self) -> Result<()> {
        require!(!self.paused, crate::error::WusdError::ContractPaused);
        Ok(())
    }
}