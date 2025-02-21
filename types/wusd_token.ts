export type WusdToken = {
  version: "0.1.0";
  name: "wusd_token";
  metadata: {
    address: "8UosdUBUKv7p73zu9pobFp19Zzdnb8iZKecfiQsWv8ri";
  };
  instructions: [
    {
      name: "initializeAccessRegistry";
      accounts: [
        {
          name: "authority";
          isMut: true;
          isSigner: true;
        },
        {
          name: "accessRegistry";
          isMut: true;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    },
    {
      name: "initialize";
      accounts: [
        {
          name: "authority";
          isMut: true;
          isSigner: true;
          docs: ["管理员账户"];
        },
        {
          name: "authorityState";
          isMut: true;
          isSigner: false;
          docs: ["权限管理账户"];
        },
        {
          name: "tokenMint";
          isMut: true;
          isSigner: true;
          docs: ["代币铸币账户"];
        },
        {
          name: "mintState";
          isMut: true;
          isSigner: false;
          docs: ["铸币状态账户"];
        },
        {
          name: "pauseState";
          isMut: true;
          isSigner: false;
          docs: ["暂停状态账户"];
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "rent";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "decimals";
          type: "u8";
        }
      ];
    },
    {
      name: "mint";
      docs: ["铸造WUSD代币"];
      accounts: [
        {
          name: "authority";
          isMut: true;
          isSigner: true;
        },
        {
          name: "tokenMint";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "authorityState";
          isMut: true;
          isSigner: false;
        },
        {
          name: "mintState";
          isMut: true;
          isSigner: false;
        },
        {
          name: "pauseState";
          isMut: true;
          isSigner: false;
        },
        {
          name: "accessRegistry";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "amount";
          type: "u64";
        },
        {
          name: "bump";
          type: "u8";
        }
      ];
    },
    {
      name: "permit";
      docs: ["处理授权许可请求，允许代币持有者授权其他账户使用其代币"];
      accounts: [
        {
          name: "owner";
          isMut: true;
          isSigner: true;
        },
        {
          name: "spender";
          isMut: false;
          isSigner: false;
        },
        {
          name: "allowance";
          isMut: true;
          isSigner: false;
        },
        {
          name: "permitState";
          isMut: true;
          isSigner: false;
        },
        {
          name: "mintState";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "clock";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "PermitParams";
          };
        }
      ];
    },
    {
      name: "transfer";
      docs: ["转账WUSD代币"];
      accounts: [
        {
          name: "from";
          isMut: true;
          isSigner: true;
        },
        {
          name: "to";
          isMut: true;
          isSigner: false;
        },
        {
          name: "fromToken";
          isMut: true;
          isSigner: false;
        },
        {
          name: "toToken";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "pauseState";
          isMut: false;
          isSigner: false;
        },
        {
          name: "accessRegistry";
          isMut: false;
          isSigner: false;
        },
        {
          name: "fromFreezeState";
          isMut: true;
          isSigner: false;
        },
        {
          name: "toFreezeState";
          isMut: true;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "amount";
          type: "u64";
        }
      ];
    },
    {
      name: "transferFrom";
      docs: ["使用授权额度转账WUSD代币"];
      accounts: [
        {
          name: "spender";
          isMut: true;
          isSigner: true;
        },
        {
          name: "owner";
          isMut: true;
          isSigner: true;
        },
        {
          name: "fromToken";
          isMut: true;
          isSigner: false;
        },
        {
          name: "toToken";
          isMut: true;
          isSigner: false;
        },
        {
          name: "permit";
          isMut: false;
          isSigner: false;
        },
        {
          name: "mintState";
          isMut: true;
          isSigner: false;
        },
        {
          name: "pauseState";
          isMut: false;
          isSigner: false;
        },
        {
          name: "accessRegistry";
          isMut: false;
          isSigner: false;
        },
        {
          name: "fromFreezeState";
          isMut: true;
          isSigner: false;
        },
        {
          name: "toFreezeState";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "amount";
          type: "u64";
        }
      ];
    },
    {
      name: "pause";
      docs: ["暂停合约"];
      accounts: [
        {
          name: "pauseState";
          isMut: true;
          isSigner: false;
        },
        {
          name: "authority";
          isMut: false;
          isSigner: true;
        },
        {
          name: "authorityState";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    },
    {
      name: "unpause";
      docs: ["恢复合约"];
      accounts: [
        {
          name: "pauseState";
          isMut: true;
          isSigner: false;
        },
        {
          name: "authority";
          isMut: false;
          isSigner: true;
        },
        {
          name: "authorityState";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    },
    {
      name: "burn";
      docs: ["销毁WUSD代币"];
      accounts: [
        {
          name: "authorityState";
          isMut: true;
          isSigner: false;
        },
        {
          name: "mintAuthority";
          isMut: true;
          isSigner: true;
        },
        {
          name: "authority";
          isMut: true;
          isSigner: true;
        },
        {
          name: "mint";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "mintState";
          isMut: false;
          isSigner: false;
        },
        {
          name: "pauseState";
          isMut: false;
          isSigner: false;
        },
        {
          name: "accessRegistry";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "amount";
          type: "u64";
        }
      ];
    },
    {
      name: "addOperator";
      docs: ["添加操作员"];
      accounts: [
        {
          name: "authority";
          isMut: true;
          isSigner: true;
        },
        {
          name: "authorityState";
          isMut: false;
          isSigner: false;
        },
        {
          name: "operator";
          isMut: false;
          isSigner: false;
        },
        {
          name: "accessRegistry";
          isMut: true;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "operator";
          type: "publicKey";
        }
      ];
    },
    {
      name: "removeOperator";
      docs: ["移除操作员"];
      accounts: [
        {
          name: "authority";
          isMut: true;
          isSigner: true;
        },
        {
          name: "authorityState";
          isMut: false;
          isSigner: false;
        },
        {
          name: "operator";
          isMut: false;
          isSigner: false;
        },
        {
          name: "accessRegistry";
          isMut: true;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "operator";
          type: "publicKey";
        }
      ];
    },
    {
      name: "freezeAccount";
      docs: ["冻结账户"];
      accounts: [
        {
          name: "authority";
          isMut: true;
          isSigner: true;
        },
        {
          name: "freezeState";
          isMut: true;
          isSigner: false;
        },
        {
          name: "account";
          isMut: false;
          isSigner: false;
          docs: ["要冻结的账户"];
        },
        {
          name: "authorityState";
          isMut: false;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "reason";
          type: "string";
        }
      ];
    },
    {
      name: "unfreezeAccount";
      docs: ["解冻账户"];
      accounts: [
        {
          name: "authority";
          isMut: true;
          isSigner: true;
        },
        {
          name: "freezeState";
          isMut: true;
          isSigner: false;
        },
        {
          name: "account";
          isMut: false;
          isSigner: false;
          docs: ["要解冻的账户"];
        },
        {
          name: "authorityState";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    }
  ];
  accounts: [
    {
      name: "allowanceState";
      docs: ["授权额度状态账户，存储代币授权信息"];
      type: {
        kind: "struct";
        fields: [
          {
            name: "owner";
            docs: ["代币所有者地址"];
            type: "publicKey";
          },
          {
            name: "spender";
            docs: ["被授权者地址"];
            type: "publicKey";
          },
          {
            name: "amount";
            docs: ["授权额度"];
            type: "u64";
          }
        ];
      };
    },
    {
      name: "permitState";
      docs: ["签名许可状态账户，用于EIP-2612兼容的签名授权"];
      type: {
        kind: "struct";
        fields: [
          {
            name: "owner";
            docs: ["所有者地址"];
            type: "publicKey";
          },
          {
            name: "spender";
            docs: ["被授权者地址"];
            type: "publicKey";
          },
          {
            name: "nonce";
            docs: ["随机数，用于防止重放攻击"];
            type: "u64";
          },
          {
            name: "amount";
            docs: ["授权额度"];
            type: "u64";
          },
          {
            name: "expiration";
            docs: ["过期时间"];
            type: "i64";
          },
          {
            name: "bump";
            docs: ["PDA bump"];
            type: "u8";
          }
        ];
      };
    },
    {
      name: "authorityState";
      docs: ["权限管理状态账户，存储合约的权限配置"];
      type: {
        kind: "struct";
        fields: [
          {
            name: "admin";
            docs: ["管理员地址"];
            type: "publicKey";
          },
          {
            name: "minter";
            docs: ["铸币权限地址"];
            type: "publicKey";
          },
          {
            name: "pauser";
            docs: ["暂停权限地址"];
            type: "publicKey";
          }
        ];
      };
    },
    {
      name: "accessRegistryState";
      docs: ["访问权限注册表状态"];
      type: {
        kind: "struct";
        fields: [
          {
            name: "authority";
            docs: ["管理员地址"];
            type: "publicKey";
          },
          {
            name: "initialized";
            docs: ["是否已初始化"];
            type: "bool";
          },
          {
            name: "operators";
            docs: ["操作员列表 (使用固定大小数组代替 Vec 来避免序列化问题)"];
            type: {
              array: ["publicKey", 10];
            };
          },
          {
            name: "operatorCount";
            docs: ["当前操作员数量"];
            type: "u8";
          }
        ];
      };
    },
    {
      name: "mintState";
      docs: ["铸币状态账户，存储代币铸造相关信息"];
      type: {
        kind: "struct";
        fields: [
          {
            name: "mint";
            docs: ["代币铸币账户地址"];
            type: "publicKey";
          },
          {
            name: "decimals";
            docs: ["代币精度"];
            type: "u8";
          }
        ];
      };
    },
    {
      name: "pauseState";
      docs: ["暂停状态账户，用于控制合约的暂停/恢复"];
      type: {
        kind: "struct";
        fields: [
          {
            name: "paused";
            docs: ["合约是否暂停"];
            type: "bool";
          }
        ];
      };
    },
    {
      name: "freezeState";
      docs: ["账户冻结状态，用于控制账户的冻结/解冻"];
      type: {
        kind: "struct";
        fields: [
          {
            name: "isFrozen";
            docs: ["账户是否被冻结"];
            type: "bool";
          },
          {
            name: "reason";
            docs: ["冻结原因"];
            type: "string";
          },
          {
            name: "freezeTime";
            docs: ["冻结时间"];
            type: "i64";
          }
        ];
      };
    }
  ];
  types: [
    {
      name: "PermitScope";
      docs: ["许可授权范围枚举"];
      type: {
        kind: "struct";
        fields: [
          {
            name: "oneTime";
            docs: ["单次授权"];
            type: "bool";
          },
          {
            name: "permanent";
            docs: ["永久授权"];
            type: "bool";
          },
          {
            name: "transfer";
            docs: ["转账授权"];
            type: "bool";
          },
          {
            name: "burn";
            docs: ["销毁授权"];
            type: "bool";
          },
          {
            name: "all";
            docs: ["全部授权"];
            type: "bool";
          }
        ];
      };
    },
    {
      name: "PermitParams";
      type: {
        kind: "struct";
        fields: [
          {
            name: "amount";
            type: "u64";
          },
          {
            name: "deadline";
            type: "i64";
          },
          {
            name: "nonce";
            type: {
              option: "u64";
            };
          },
          {
            name: "scope";
            type: {
              defined: "PermitScope";
            };
          },
          {
            name: "signature";
            type: {
              array: ["u8", 64];
            };
          },
          {
            name: "publicKey";
            type: {
              array: ["u8", 32];
            };
          }
        ];
      };
    },
    {
      name: "PermitMessage";
      type: {
        kind: "struct";
        fields: [
          {
            name: "contract";
            type: "publicKey";
          },
          {
            name: "domainSeparator";
            type: {
              array: ["u8", 32];
            };
          },
          {
            name: "owner";
            type: "publicKey";
          },
          {
            name: "spender";
            type: "publicKey";
          },
          {
            name: "amount";
            type: "u64";
          },
          {
            name: "nonce";
            type: "u64";
          },
          {
            name: "deadline";
            type: "i64";
          },
          {
            name: "scope";
            type: {
              defined: "PermitScope";
            };
          },
          {
            name: "chainId";
            type: "u64";
          },
          {
            name: "version";
            type: {
              array: ["u8", 32];
            };
          }
        ];
      };
    },
    {
      name: "AccessLevel";
      docs: ["访问级别枚举，用于控制账户的操作权限"];
      type: {
        kind: "enum";
        variants: [
          {
            name: "Debit";
          },
          {
            name: "Credit";
          }
        ];
      };
    }
  ];
  events: [
    {
      name: "BurnEvent";
      fields: [
        {
          name: "burner";
          type: "publicKey";
          index: false;
        },
        {
          name: "amount";
          type: "u64";
          index: false;
        }
      ];
    },
    {
      name: "AccountFrozen";
      fields: [
        {
          name: "account";
          type: "publicKey";
          index: false;
        },
        {
          name: "frozenBy";
          type: "publicKey";
          index: false;
        },
        {
          name: "reason";
          type: "string";
          index: false;
        },
        {
          name: "frozenTime";
          type: "i64";
          index: false;
        }
      ];
    },
    {
      name: "AccountUnfrozen";
      fields: [
        {
          name: "account";
          type: "publicKey";
          index: false;
        },
        {
          name: "unfrozenBy";
          type: "publicKey";
          index: false;
        },
        {
          name: "unfrozenTime";
          type: "i64";
          index: false;
        }
      ];
    },
    {
      name: "FreezeAccountEvent";
      fields: [
        {
          name: "authority";
          type: "publicKey";
          index: false;
        },
        {
          name: "freezeState";
          type: "publicKey";
          index: false;
        },
        {
          name: "reason";
          type: "string";
          index: false;
        },
        {
          name: "timestamp";
          type: "i64";
          index: false;
        }
      ];
    },
    {
      name: "UnfreezeAccountEvent";
      fields: [
        {
          name: "authority";
          type: "publicKey";
          index: false;
        },
        {
          name: "freezeState";
          type: "publicKey";
          index: false;
        },
        {
          name: "timestamp";
          type: "i64";
          index: false;
        }
      ];
    },
    {
      name: "PermitGranted";
      fields: [
        {
          name: "owner";
          type: "publicKey";
          index: false;
        },
        {
          name: "spender";
          type: "publicKey";
          index: false;
        },
        {
          name: "amount";
          type: "u64";
          index: false;
        },
        {
          name: "scope";
          type: {
            defined: "PermitScope";
          };
          index: false;
        }
      ];
    },
    {
      name: "TransferEvent";
      fields: [
        {
          name: "from";
          type: "publicKey";
          index: true;
        },
        {
          name: "to";
          type: "publicKey";
          index: true;
        },
        {
          name: "amount";
          type: "u64";
          index: false;
        },
        {
          name: "fee";
          type: "u64";
          index: false;
        },
        {
          name: "timestamp";
          type: "i64";
          index: false;
        },
        {
          name: "memo";
          type: {
            option: "string";
          };
          index: false;
        }
      ];
    },
    {
      name: "InitializeEvent";
      fields: [
        {
          name: "authority";
          type: "publicKey";
          index: false;
        },
        {
          name: "mint";
          type: "publicKey";
          index: false;
        },
        {
          name: "decimals";
          type: "u8";
          index: false;
        }
      ];
    }
  ];
  errors: [
    {
      code: 6000;
      name: "ContractPaused";
      msg: "Contract is paused";
    },
    {
      code: 6001;
      name: "InvalidAmount";
      msg: "Invalid amount";
    },
    {
      code: 6002;
      name: "ExpiredPermit";
      msg: "Permit expired";
    },
    {
      code: 6003;
      name: "InvalidNonce";
      msg: "Invalid nonce";
    },
    {
      code: 6004;
      name: "Unauthorized";
      msg: "Unauthorized";
    },
    {
      code: 6005;
      name: "NotMinter";
      msg: "Not a minter";
    },
    {
      code: 6006;
      name: "NotBurner";
      msg: "Not a burner";
    },
    {
      code: 6007;
      name: "NotPauser";
      msg: "Not a pauser";
    },
    {
      code: 6008;
      name: "InsufficientBalance";
      msg: "Insufficient balance";
    },
    {
      code: 6009;
      name: "TooManyOperators";
      msg: "Too many operators";
    },
    {
      code: 6010;
      name: "OperatorNotFound";
      msg: "Operator not found";
    },
    {
      code: 6011;
      name: "AccessDenied";
      msg: "Access denied";
    },
    {
      code: 6012;
      name: "InsufficientFunds";
      msg: "Insufficient funds";
    },
    {
      code: 6013;
      name: "AccessRegistryNotInitialized";
      msg: "Access registry not initialized";
    },
    {
      code: 6014;
      name: "InvalidOwner";
      msg: "Invalid owner";
    },
    {
      code: 6015;
      name: "InsufficientAllowance";
      msg: "Insufficient allowance";
    },
    {
      code: 6016;
      name: "AccountFrozen";
      msg: "Account is frozen";
    },
    {
      code: 6017;
      name: "AccountAlreadyFrozen";
      msg: "Account is already frozen";
    },
    {
      code: 6018;
      name: "AccountNotFrozen";
      msg: "Account is not frozen";
    }
  ];
};

export const IDL: WusdToken = {
  version: "0.1.0",
  name: "wusd_token",
  instructions: [
    {
      name: "initializeAccessRegistry",
      accounts: [
        {
          name: "authority",
          isMut: true,
          isSigner: true,
        },
        {
          name: "accessRegistry",
          isMut: true,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "initialize",
      accounts: [
        {
          name: "authority",
          isMut: true,
          isSigner: true,
          docs: ["管理员账户"],
        },
        {
          name: "authorityState",
          isMut: true,
          isSigner: false,
          docs: ["权限管理账户"],
        },
        {
          name: "tokenMint",
          isMut: true,
          isSigner: true,
          docs: ["代币铸币账户"],
        },
        {
          name: "mintState",
          isMut: true,
          isSigner: false,
          docs: ["铸币状态账户"],
        },
        {
          name: "pauseState",
          isMut: true,
          isSigner: false,
          docs: ["暂停状态账户"],
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "rent",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "decimals",
          type: "u8",
        },
      ],
    },
    {
      name: "mint",
      docs: ["铸造WUSD代币"],
      accounts: [
        {
          name: "authority",
          isMut: true,
          isSigner: true,
        },
        {
          name: "tokenMint",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "authorityState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "mintState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "pauseState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "accessRegistry",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "amount",
          type: "u64",
        },
        {
          name: "bump",
          type: "u8",
        },
      ],
    },
    {
      name: "permit",
      docs: ["处理授权许可请求，允许代币持有者授权其他账户使用其代币"],
      accounts: [
        {
          name: "owner",
          isMut: true,
          isSigner: true,
        },
        {
          name: "spender",
          isMut: false,
          isSigner: false,
        },
        {
          name: "allowance",
          isMut: true,
          isSigner: false,
        },
        {
          name: "permitState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "mintState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "clock",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "params",
          type: {
            defined: "PermitParams",
          },
        },
      ],
    },
    {
      name: "transfer",
      docs: ["转账WUSD代币"],
      accounts: [
        {
          name: "from",
          isMut: true,
          isSigner: true,
        },
        {
          name: "to",
          isMut: true,
          isSigner: false,
        },
        {
          name: "fromToken",
          isMut: true,
          isSigner: false,
        },
        {
          name: "toToken",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "pauseState",
          isMut: false,
          isSigner: false,
        },
        {
          name: "accessRegistry",
          isMut: false,
          isSigner: false,
        },
        {
          name: "fromFreezeState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "toFreezeState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "amount",
          type: "u64",
        },
      ],
    },
    {
      name: "transferFrom",
      docs: ["使用授权额度转账WUSD代币"],
      accounts: [
        {
          name: "spender",
          isMut: true,
          isSigner: true,
        },
        {
          name: "owner",
          isMut: true,
          isSigner: true,
        },
        {
          name: "fromToken",
          isMut: true,
          isSigner: false,
        },
        {
          name: "toToken",
          isMut: true,
          isSigner: false,
        },
        {
          name: "permit",
          isMut: false,
          isSigner: false,
        },
        {
          name: "mintState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "pauseState",
          isMut: false,
          isSigner: false,
        },
        {
          name: "accessRegistry",
          isMut: false,
          isSigner: false,
        },
        {
          name: "fromFreezeState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "toFreezeState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "amount",
          type: "u64",
        },
      ],
    },
    {
      name: "pause",
      docs: ["暂停合约"],
      accounts: [
        {
          name: "pauseState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "authority",
          isMut: false,
          isSigner: true,
        },
        {
          name: "authorityState",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "unpause",
      docs: ["恢复合约"],
      accounts: [
        {
          name: "pauseState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "authority",
          isMut: false,
          isSigner: true,
        },
        {
          name: "authorityState",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "burn",
      docs: ["销毁WUSD代币"],
      accounts: [
        {
          name: "authorityState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "mintAuthority",
          isMut: true,
          isSigner: true,
        },
        {
          name: "authority",
          isMut: true,
          isSigner: true,
        },
        {
          name: "mint",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "mintState",
          isMut: false,
          isSigner: false,
        },
        {
          name: "pauseState",
          isMut: false,
          isSigner: false,
        },
        {
          name: "accessRegistry",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "amount",
          type: "u64",
        },
      ],
    },
    {
      name: "addOperator",
      docs: ["添加操作员"],
      accounts: [
        {
          name: "authority",
          isMut: true,
          isSigner: true,
        },
        {
          name: "authorityState",
          isMut: false,
          isSigner: false,
        },
        {
          name: "operator",
          isMut: false,
          isSigner: false,
        },
        {
          name: "accessRegistry",
          isMut: true,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "operator",
          type: "publicKey",
        },
      ],
    },
    {
      name: "removeOperator",
      docs: ["移除操作员"],
      accounts: [
        {
          name: "authority",
          isMut: true,
          isSigner: true,
        },
        {
          name: "authorityState",
          isMut: false,
          isSigner: false,
        },
        {
          name: "operator",
          isMut: false,
          isSigner: false,
        },
        {
          name: "accessRegistry",
          isMut: true,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "operator",
          type: "publicKey",
        },
      ],
    },
    {
      name: "freezeAccount",
      docs: ["冻结账户"],
      accounts: [
        {
          name: "authority",
          isMut: true,
          isSigner: true,
        },
        {
          name: "freezeState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "account",
          isMut: false,
          isSigner: false,
          docs: ["要冻结的账户"],
        },
        {
          name: "authorityState",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "reason",
          type: "string",
        },
      ],
    },
    {
      name: "unfreezeAccount",
      docs: ["解冻账户"],
      accounts: [
        {
          name: "authority",
          isMut: true,
          isSigner: true,
        },
        {
          name: "freezeState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "account",
          isMut: false,
          isSigner: false,
          docs: ["要解冻的账户"],
        },
        {
          name: "authorityState",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "allowanceState",
      docs: ["授权额度状态账户，存储代币授权信息"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "owner",
            docs: ["代币所有者地址"],
            type: "publicKey",
          },
          {
            name: "spender",
            docs: ["被授权者地址"],
            type: "publicKey",
          },
          {
            name: "amount",
            docs: ["授权额度"],
            type: "u64",
          },
        ],
      },
    },
    {
      name: "permitState",
      docs: ["签名许可状态账户，用于EIP-2612兼容的签名授权"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "owner",
            docs: ["所有者地址"],
            type: "publicKey",
          },
          {
            name: "spender",
            docs: ["被授权者地址"],
            type: "publicKey",
          },
          {
            name: "nonce",
            docs: ["随机数，用于防止重放攻击"],
            type: "u64",
          },
          {
            name: "amount",
            docs: ["授权额度"],
            type: "u64",
          },
          {
            name: "expiration",
            docs: ["过期时间"],
            type: "i64",
          },
          {
            name: "bump",
            docs: ["PDA bump"],
            type: "u8",
          },
        ],
      },
    },
    {
      name: "authorityState",
      docs: ["权限管理状态账户，存储合约的权限配置"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "admin",
            docs: ["管理员地址"],
            type: "publicKey",
          },
          {
            name: "minter",
            docs: ["铸币权限地址"],
            type: "publicKey",
          },
          {
            name: "pauser",
            docs: ["暂停权限地址"],
            type: "publicKey",
          },
        ],
      },
    },
    {
      name: "accessRegistryState",
      docs: ["访问权限注册表状态"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "authority",
            docs: ["管理员地址"],
            type: "publicKey",
          },
          {
            name: "initialized",
            docs: ["是否已初始化"],
            type: "bool",
          },
          {
            name: "operators",
            docs: ["操作员列表 (使用固定大小数组代替 Vec 来避免序列化问题)"],
            type: {
              array: ["publicKey", 10],
            },
          },
          {
            name: "operatorCount",
            docs: ["当前操作员数量"],
            type: "u8",
          },
        ],
      },
    },
    {
      name: "mintState",
      docs: ["铸币状态账户，存储代币铸造相关信息"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "mint",
            docs: ["代币铸币账户地址"],
            type: "publicKey",
          },
          {
            name: "decimals",
            docs: ["代币精度"],
            type: "u8",
          },
        ],
      },
    },
    {
      name: "pauseState",
      docs: ["暂停状态账户，用于控制合约的暂停/恢复"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "paused",
            docs: ["合约是否暂停"],
            type: "bool",
          },
        ],
      },
    },
    {
      name: "freezeState",
      docs: ["账户冻结状态，用于控制账户的冻结/解冻"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "isFrozen",
            docs: ["账户是否被冻结"],
            type: "bool",
          },
          {
            name: "reason",
            docs: ["冻结原因"],
            type: "string",
          },
          {
            name: "freezeTime",
            docs: ["冻结时间"],
            type: "i64",
          },
        ],
      },
    },
  ],
  types: [
    {
      name: "PermitScope",
      docs: ["许可授权范围枚举"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "oneTime",
            docs: ["单次授权"],
            type: "bool",
          },
          {
            name: "permanent",
            docs: ["永久授权"],
            type: "bool",
          },
          {
            name: "transfer",
            docs: ["转账授权"],
            type: "bool",
          },
          {
            name: "burn",
            docs: ["销毁授权"],
            type: "bool",
          },
          {
            name: "all",
            docs: ["全部授权"],
            type: "bool",
          },
        ],
      },
    },
    {
      name: "PermitParams",
      type: {
        kind: "struct",
        fields: [
          {
            name: "amount",
            type: "u64",
          },
          {
            name: "deadline",
            type: "i64",
          },
          {
            name: "nonce",
            type: {
              option: "u64",
            },
          },
          {
            name: "scope",
            type: {
              defined: "PermitScope",
            },
          },
          {
            name: "signature",
            type: {
              array: ["u8", 64],
            },
          },
          {
            name: "publicKey",
            type: {
              array: ["u8", 32],
            },
          },
        ],
      },
    },
    {
      name: "PermitMessage",
      type: {
        kind: "struct",
        fields: [
          {
            name: "contract",
            type: "publicKey",
          },
          {
            name: "domainSeparator",
            type: {
              array: ["u8", 32],
            },
          },
          {
            name: "owner",
            type: "publicKey",
          },
          {
            name: "spender",
            type: "publicKey",
          },
          {
            name: "amount",
            type: "u64",
          },
          {
            name: "nonce",
            type: "u64",
          },
          {
            name: "deadline",
            type: "i64",
          },
          {
            name: "scope",
            type: {
              defined: "PermitScope",
            },
          },
          {
            name: "chainId",
            type: "u64",
          },
          {
            name: "version",
            type: {
              array: ["u8", 32],
            },
          },
        ],
      },
    },
    {
      name: "AccessLevel",
      docs: ["访问级别枚举，用于控制账户的操作权限"],
      type: {
        kind: "enum",
        variants: [
          {
            name: "Debit",
          },
          {
            name: "Credit",
          },
        ],
      },
    },
  ],
  events: [
    {
      name: "BurnEvent",
      fields: [
        {
          name: "burner",
          type: "publicKey",
          index: false,
        },
        {
          name: "amount",
          type: "u64",
          index: false,
        },
      ],
    },
    {
      name: "AccountFrozen",
      fields: [
        {
          name: "account",
          type: "publicKey",
          index: false,
        },
        {
          name: "frozenBy",
          type: "publicKey",
          index: false,
        },
        {
          name: "reason",
          type: "string",
          index: false,
        },
        {
          name: "frozenTime",
          type: "i64",
          index: false,
        },
      ],
    },
    {
      name: "AccountUnfrozen",
      fields: [
        {
          name: "account",
          type: "publicKey",
          index: false,
        },
        {
          name: "unfrozenBy",
          type: "publicKey",
          index: false,
        },
        {
          name: "unfrozenTime",
          type: "i64",
          index: false,
        },
      ],
    },
    {
      name: "FreezeAccountEvent",
      fields: [
        {
          name: "authority",
          type: "publicKey",
          index: false,
        },
        {
          name: "freezeState",
          type: "publicKey",
          index: false,
        },
        {
          name: "reason",
          type: "string",
          index: false,
        },
        {
          name: "timestamp",
          type: "i64",
          index: false,
        },
      ],
    },
    {
      name: "UnfreezeAccountEvent",
      fields: [
        {
          name: "authority",
          type: "publicKey",
          index: false,
        },
        {
          name: "freezeState",
          type: "publicKey",
          index: false,
        },
        {
          name: "timestamp",
          type: "i64",
          index: false,
        },
      ],
    },
    {
      name: "PermitGranted",
      fields: [
        {
          name: "owner",
          type: "publicKey",
          index: false,
        },
        {
          name: "spender",
          type: "publicKey",
          index: false,
        },
        {
          name: "amount",
          type: "u64",
          index: false,
        },
        {
          name: "scope",
          type: {
            defined: "PermitScope",
          },
          index: false,
        },
      ],
    },
    {
      name: "TransferEvent",
      fields: [
        {
          name: "from",
          type: "publicKey",
          index: true,
        },
        {
          name: "to",
          type: "publicKey",
          index: true,
        },
        {
          name: "amount",
          type: "u64",
          index: false,
        },
        {
          name: "fee",
          type: "u64",
          index: false,
        },
        {
          name: "timestamp",
          type: "i64",
          index: false,
        },
        {
          name: "memo",
          type: {
            option: "string",
          },
          index: false,
        },
      ],
    },
    {
      name: "InitializeEvent",
      fields: [
        {
          name: "authority",
          type: "publicKey",
          index: false,
        },
        {
          name: "mint",
          type: "publicKey",
          index: false,
        },
        {
          name: "decimals",
          type: "u8",
          index: false,
        },
      ],
    },
  ],
  errors: [
    {
      code: 6000,
      name: "ContractPaused",
      msg: "Contract is paused",
    },
    {
      code: 6001,
      name: "InvalidAmount",
      msg: "Invalid amount",
    },
    {
      code: 6002,
      name: "ExpiredPermit",
      msg: "Permit expired",
    },
    {
      code: 6003,
      name: "InvalidNonce",
      msg: "Invalid nonce",
    },
    {
      code: 6004,
      name: "Unauthorized",
      msg: "Unauthorized",
    },
    {
      code: 6005,
      name: "NotMinter",
      msg: "Not a minter",
    },
    {
      code: 6006,
      name: "NotBurner",
      msg: "Not a burner",
    },
    {
      code: 6007,
      name: "NotPauser",
      msg: "Not a pauser",
    },
    {
      code: 6008,
      name: "InsufficientBalance",
      msg: "Insufficient balance",
    },
    {
      code: 6009,
      name: "TooManyOperators",
      msg: "Too many operators",
    },
    {
      code: 6010,
      name: "OperatorNotFound",
      msg: "Operator not found",
    },
    {
      code: 6011,
      name: "AccessDenied",
      msg: "Access denied",
    },
    {
      code: 6012,
      name: "InsufficientFunds",
      msg: "Insufficient funds",
    },
    {
      code: 6013,
      name: "AccessRegistryNotInitialized",
      msg: "Access registry not initialized",
    },
    {
      code: 6014,
      name: "InvalidOwner",
      msg: "Invalid owner",
    },
    {
      code: 6015,
      name: "InsufficientAllowance",
      msg: "Insufficient allowance",
    },
    {
      code: 6016,
      name: "AccountFrozen",
      msg: "Account is frozen",
    },
    {
      code: 6017,
      name: "AccountAlreadyFrozen",
      msg: "Account is already frozen",
    },
    {
      code: 6018,
      name: "AccountNotFrozen",
      msg: "Account is not frozen",
    },
  ],
};
