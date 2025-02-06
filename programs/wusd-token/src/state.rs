use anchor_lang::prelude::*;

#[account]
pub struct AllowanceState {
    pub owner: Pubkey,
    pub spender: Pubkey,
    pub amount: u64,
}

impl AllowanceState {
    pub fn initialize(owner: Pubkey, spender: Pubkey, amount: u64) -> Self {
        Self {
            owner,
            spender,
            amount,
        }
    }

    pub fn increase_allowance(&mut self, added_value: u64) -> Result<()> {
        self.amount = self.amount.checked_add(added_value)
            .ok_or(error!(crate::error::WusdError::InvalidAmount))?;
        Ok(())
    }

    pub fn decrease_allowance(&mut self, subtracted_value: u64) -> Result<()> {
        require!(self.amount >= subtracted_value, crate::error::WusdError::InvalidAmount);
        self.amount = self.amount.checked_sub(subtracted_value)
            .ok_or(error!(crate::error::WusdError::InvalidAmount))?;
        Ok(())
    }

    pub fn validate_allowance(&self, amount: u64) -> Result<()> {
        require!(self.amount >= amount, crate::error::WusdError::InvalidAmount);
        Ok(())
    }
}

#[account]
pub struct PermitState {
    pub owner: Pubkey,
    pub nonce: u64,
}

impl PermitState {
    pub fn initialize(owner: Pubkey) -> Self {
        Self {
            owner,
            nonce: 0,
        }
    }

    pub fn increment_nonce(&mut self) {
        self.nonce = self.nonce.checked_add(1).unwrap_or(0);
    }

    pub fn validate_nonce(&self, expected_nonce: u64) -> Result<()> {
        require!(self.nonce == expected_nonce, crate::error::WusdError::InvalidNonce);
        Ok(())
    }
}

#[account]
pub struct AuthorityState {
    pub admin: Pubkey,
    pub minter: Pubkey,
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

#[account]
pub struct AccessRegistryState {
    pub admin: Pubkey,
    pub access_list: Vec<Pubkey>,
}

impl AccessRegistryState {
    pub fn initialize(admin: Pubkey) -> Self {
        Self {
            admin,
            access_list: vec![],
        }
    }

    pub fn has_access(&self, user: Pubkey, _level: crate::AccessLevel) -> bool {
        self.access_list.contains(&user)
    }
}

#[account]
pub struct MintState {
    pub mint: Pubkey,
    pub decimals: u8,
}

impl MintState {
    pub fn initialize(mint: Pubkey, decimals: u8) -> Result<Self> {
        require!(decimals <= 9, crate::error::WusdError::InvalidDecimals);
        
        Ok(Self {
            mint,
            decimals,
        })
    }
    
    pub fn validate_mint(&self, mint: Pubkey) -> bool {
        self.mint == mint
    }
    
    pub fn validate_amount(&self, amount: u64) -> Result<()> {
        require!(amount > 0, crate::error::WusdError::InvalidAmount);
        Ok(())
    }
}

#[account]
pub struct PauseState {
    pub paused: bool,
}

impl PauseState {
    pub fn initialize() -> Self {
        Self {
            paused: false,
        }
    }
    
    pub fn set_paused(&mut self, paused: bool) {
        self.paused = paused;
    }
    
    pub fn is_paused(&self) -> bool {
        self.paused
    }
    
    pub fn validate_not_paused(&self) -> Result<()> {
        require!(!self.paused, crate::error::WusdError::ContractPaused);
        Ok(())
    }
}