/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/wusd_application.json`.
 */
export type WusdApplication = {
  "address": "9VBdBHsx836ER2ejyetGvG7MWmpNwRg5Kc9FBfixCzCf",
  "metadata": {
    "name": "wusdApplication",
    "version": "1.0.0",
    "spec": "0.1.0",
    "description": "Created with WSPN"
  },
  "docs": [
    "WUSD稳定币程序入口"
  ],
  "instructions": [
    {
      "name": "claim",
      "docs": [
        "领取质押奖励",
        "",
        "# 参数",
        "* `ctx` - 领取奖励的上下文，包含质押账户和奖励接收账户",
        "",
        "# 功能",
        "- 计算可领取的奖励金额",
        "- 验证领取条件",
        "- 转移奖励代币"
      ],
      "discriminator": [
        62,
        198,
        214,
        193,
        213,
        159,
        108,
        210
      ],
      "accounts": [
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "stakeAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "userWusd",
          "writable": true
        },
        {
          "name": "wusdMint",
          "writable": true
        },
        {
          "name": "state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "initialize",
      "docs": [
        "初始化WUSD稳定币系统",
        "",
        "# 参数",
        "* `ctx` - 初始化上下文",
        "* `decimals` - 代币精度",
        "",
        "# 功能",
        "- 设置系统管理员",
        "- 初始化代币参数",
        "- 配置质押奖励机制",
        "- 设置紧急提现规则",
        "- 初始化代币白名单"
      ],
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "wusdMint"
        },
        {
          "name": "collateralMint"
        },
        {
          "name": "treasury"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "decimals",
          "type": "u8"
        }
      ]
    },
    {
      "name": "initializeStakeAccount",
      "docs": [
        "初始化质押账户",
        "",
        "# 参数",
        "* `ctx` - 初始化上下文，包含用户账户和质押账户信息",
        "",
        "# 功能",
        "- 创建新的质押账户",
        "- 设置初始状态和参数",
        "- 记录质押开始时间"
      ],
      "discriminator": [
        184,
        7,
        155,
        82,
        149,
        217,
        185,
        196
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "stakeAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "pause",
      "docs": [
        "暂停合约"
      ],
      "discriminator": [
        211,
        22,
        221,
        251,
        74,
        121,
        193,
        47
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "setConfig",
      "docs": [
        "设置代币兑换配置",
        "* `ctx` - 设置配置的上下文",
        "* `token_mint` - 代币铸币权地址",
        "* `decimals` - 代币精度"
      ],
      "discriminator": [
        108,
        158,
        154,
        175,
        212,
        98,
        52,
        66
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "tokenMint",
          "type": "pubkey"
        },
        {
          "name": "decimals",
          "type": "u8"
        }
      ]
    },
    {
      "name": "setRate",
      "docs": [
        "设置代币兑换汇率",
        "* `ctx` - 设置汇率的上下文",
        "* `token_in_mint` - 输入代币的铸币权地址",
        "* `token_out_mint` - 输出代币的铸币权地址",
        "* `rate` - 兑换汇率"
      ],
      "discriminator": [
        99,
        58,
        170,
        238,
        160,
        120,
        74,
        11
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "tokenInMint",
          "type": "pubkey"
        },
        {
          "name": "tokenOutMint",
          "type": "pubkey"
        },
        {
          "name": "rate",
          "type": {
            "defined": {
              "name": "rate"
            }
          }
        }
      ]
    },
    {
      "name": "softClaim",
      "docs": [
        "领取软质押奖励",
        "* `ctx` - 领取奖励的上下文"
      ],
      "discriminator": [
        32,
        153,
        36,
        86,
        240,
        221,
        130,
        125
      ],
      "accounts": [
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "stakeAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  102,
                  116,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "userWusd",
          "writable": true
        },
        {
          "name": "wusdMint",
          "writable": true
        },
        {
          "name": "state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "softStake",
      "docs": [
        "软质押WUSD代币",
        "* `ctx` - 软质押上下文",
        "* `amount` - 质押金额",
        "* `staking_pool_id` - 质押池ID",
        "* `access_key` - 访问密钥"
      ],
      "discriminator": [
        182,
        175,
        208,
        41,
        24,
        31,
        208,
        32
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "userWusd",
          "writable": true
        },
        {
          "name": "stakeAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  102,
                  116,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "stakeVault",
          "writable": true
        },
        {
          "name": "state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "stakingPoolId",
          "type": "u64"
        },
        {
          "name": "accessKey",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "stake",
      "docs": [
        "质押WUSD代币",
        "",
        "# 参数",
        "* `ctx` - 质押上下文，包含用户账户和质押账户信息",
        "* `amount` - 质押金额",
        "* `staking_pool_id` - 质押池ID，用于确定APY和锁定期",
        "",
        "# 功能",
        "- 验证质押金额和用户余额",
        "- 更新质押状态和奖励计算",
        "- 锁定用户代币"
      ],
      "discriminator": [
        206,
        176,
        202,
        18,
        200,
        209,
        179,
        108
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "userWusd",
          "writable": true
        },
        {
          "name": "stakeAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "stakeVault",
          "writable": true
        },
        {
          "name": "state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "stakingPoolId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "swap",
      "docs": [
        "代币兑换功能",
        "* `ctx` - 兑换上下文",
        "* `amount_in` - 输入金额",
        "* `min_amount_out` - 最小输出金额（滑点保护）"
      ],
      "discriminator": [
        248,
        198,
        158,
        145,
        225,
        117,
        135,
        200
      ],
      "accounts": [
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "userTokenIn",
          "writable": true
        },
        {
          "name": "userTokenOut",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "wusdMint"
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "treasury",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "amountIn",
          "type": "u64"
        },
        {
          "name": "minAmountOut",
          "type": "u64"
        }
      ]
    },
    {
      "name": "unpause",
      "docs": [
        "恢复合约"
      ],
      "discriminator": [
        169,
        144,
        4,
        38,
        10,
        141,
        188,
        255
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "withdraw",
      "docs": [
        "提取质押的代币",
        "* `ctx` - 提取上下文",
        "* `amount` - 提取金额",
        "* `is_emergency` - 是否为紧急提现"
      ],
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "userWusd",
          "writable": true
        },
        {
          "name": "stakeVault",
          "writable": true
        },
        {
          "name": "stakeAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "isEmergency",
          "type": "bool"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "softStakeAccount",
      "discriminator": [
        101,
        165,
        7,
        10,
        40,
        166,
        251,
        159
      ]
    },
    {
      "name": "stakeAccount",
      "discriminator": [
        80,
        158,
        67,
        124,
        50,
        189,
        192,
        255
      ]
    }
  ],
  "events": [
    {
      "name": "claimEvent",
      "discriminator": [
        93,
        15,
        70,
        170,
        48,
        140,
        212,
        219
      ]
    },
    {
      "name": "pauseEvent",
      "discriminator": [
        32,
        51,
        61,
        169,
        156,
        104,
        130,
        43
      ]
    },
    {
      "name": "softClaimEvent",
      "discriminator": [
        56,
        91,
        118,
        177,
        67,
        193,
        100,
        18
      ]
    },
    {
      "name": "softStakeEvent",
      "discriminator": [
        248,
        55,
        34,
        87,
        214,
        222,
        106,
        7
      ]
    },
    {
      "name": "stakeEvent",
      "discriminator": [
        226,
        134,
        188,
        173,
        19,
        33,
        75,
        175
      ]
    },
    {
      "name": "swapEvent",
      "discriminator": [
        64,
        198,
        205,
        232,
        38,
        8,
        113,
        226
      ]
    },
    {
      "name": "unpauseEvent",
      "discriminator": [
        134,
        156,
        8,
        215,
        185,
        128,
        192,
        217
      ]
    },
    {
      "name": "withdrawEvent",
      "discriminator": [
        22,
        9,
        133,
        26,
        160,
        44,
        71,
        192
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "contractPaused",
      "msg": "Contract is paused"
    },
    {
      "code": 6001,
      "name": "invalidAmount",
      "msg": "Invalid amount"
    },
    {
      "code": 6002,
      "name": "insufficientSupply",
      "msg": "Insufficient supply"
    },
    {
      "code": 6003,
      "name": "unauthorized",
      "msg": "unauthorized"
    },
    {
      "code": 6004,
      "name": "slippageExceeded",
      "msg": "Slippage exceeded"
    },
    {
      "code": 6005,
      "name": "noRewardsToClaim",
      "msg": "No rewards to claim"
    },
    {
      "code": 6006,
      "name": "invalidLockDuration",
      "msg": "Invalid lock duration"
    },
    {
      "code": 6007,
      "name": "invalidStakingStatus",
      "msg": "Invalid staking status"
    },
    {
      "code": 6008,
      "name": "emergencyWithdrawCooldown",
      "msg": "Emergency withdraw cooldown"
    },
    {
      "code": 6009,
      "name": "stakeLocked",
      "msg": "Stake is locked"
    },
    {
      "code": 6010,
      "name": "tokenNotWhitelisted",
      "msg": "Token not whitelisted"
    },
    {
      "code": 6011,
      "name": "mathOverflow",
      "msg": "Math overflow"
    },
    {
      "code": 6012,
      "name": "invalidPoolId",
      "msg": "Invalid pool ID"
    },
    {
      "code": 6013,
      "name": "invalidPoolStatus",
      "msg": "Invalid pool status"
    },
    {
      "code": 6014,
      "name": "stakingAmountTooLow",
      "msg": "Staking amount too low"
    },
    {
      "code": 6015,
      "name": "sameTokenAddresses",
      "msg": "Cannot swap same token"
    },
    {
      "code": 6016,
      "name": "insufficientBalance",
      "msg": "Insufficient balance"
    },
    {
      "code": 6017,
      "name": "invalidOwner",
      "msg": "Invalid owner"
    },
    {
      "code": 6018,
      "name": "invalidDecimals",
      "msg": "Invalid decimals"
    },
    {
      "code": 6019,
      "name": "invalidExchangeRate",
      "msg": "Invalid exchange rate"
    },
    {
      "code": 6020,
      "name": "invalidOutputAmount",
      "msg": "Invalid output amount"
    },
    {
      "code": 6021,
      "name": "invalidAddress",
      "msg": "Invalid address"
    }
  ],
  "types": [
    {
      "name": "claimEvent",
      "docs": [
        "领取奖励事件，记录领取操作的详细信息"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "claimType",
      "docs": [
        "领取类型枚举"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "unclaimed"
          },
          {
            "name": "prematured"
          },
          {
            "name": "matured"
          }
        ]
      }
    },
    {
      "name": "pauseEvent",
      "docs": [
        "合约暂停事件"
      ],
      "type": {
        "kind": "struct",
        "fields": []
      }
    },
    {
      "name": "rate",
      "docs": [
        "汇率结构体，定义代币兑换比率"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "input",
            "type": "u64"
          },
          {
            "name": "output",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "softClaimEvent",
      "docs": [
        "软质押奖励领取事件，记录领取操作的详细信息"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "accessKey",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "softStakeAccount",
      "docs": [
        "软质押账户结构体，存储用户的软质押信息"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "stakingPoolId",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "apy",
            "type": "u64"
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "endTime",
            "type": "i64"
          },
          {
            "name": "claimableTimestamp",
            "type": "i64"
          },
          {
            "name": "rewardsEarned",
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "softStakingStatus"
              }
            }
          },
          {
            "name": "accessKey",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "lastUpdateTime",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "softStakeEvent",
      "docs": [
        "软质押事件，记录软质押操作的详细信息"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "stakingPoolId",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "apy",
            "type": "u64"
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "endTime",
            "type": "i64"
          },
          {
            "name": "accessKey",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "softStakingStatus",
      "docs": [
        "软质押状态枚举"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "claimable"
          },
          {
            "name": "claimed"
          }
        ]
      }
    },
    {
      "name": "stakeAccount",
      "docs": [
        "质押账户结构体，存储用户的质押信息"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "stakingPoolId",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "apy",
            "type": "u64"
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "endTime",
            "type": "i64"
          },
          {
            "name": "claimableTimestamp",
            "type": "i64"
          },
          {
            "name": "rewardsEarned",
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "stakingStatus"
              }
            }
          },
          {
            "name": "claimType",
            "type": {
              "defined": {
                "name": "claimType"
              }
            }
          },
          {
            "name": "apyTier",
            "type": "u8"
          },
          {
            "name": "emergencyCooldown",
            "type": "i64"
          },
          {
            "name": "lastUpdateTime",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "stakeEvent",
      "docs": [
        "质押事件，记录质押操作的详细信息"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "stakingPlanId",
            "type": "u64"
          },
          {
            "name": "stakingPoolId",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "apy",
            "type": "u64"
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "endTime",
            "type": "i64"
          },
          {
            "name": "stakedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "stakingStatus",
      "docs": [
        "质押状态枚举"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "claimable"
          },
          {
            "name": "claimed"
          }
        ]
      }
    },
    {
      "name": "swapEvent",
      "docs": [
        "代币兑换事件，记录兑换的详细信息"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "tokenIn",
            "type": "pubkey"
          },
          {
            "name": "tokenOut",
            "type": "pubkey"
          },
          {
            "name": "amountIn",
            "type": "u64"
          },
          {
            "name": "amountOut",
            "type": "u64"
          },
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "unpauseEvent",
      "docs": [
        "合约恢复事件"
      ],
      "type": {
        "kind": "struct",
        "fields": []
      }
    },
    {
      "name": "withdrawEvent",
      "docs": [
        "提现事件，记录提现操作的详细信息"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "penalty",
            "type": "u64"
          },
          {
            "name": "isEmergency",
            "type": "bool"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
