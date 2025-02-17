export type WusdApplication = {
  "version": "0.1.0",
  "name": "wusd_application",
  "instructions": [
    {
      "name": "initializeStakeAccount",
      "docs": [
        "初始化质押账户"
      ],
      "accounts": [
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "stakeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "initialize",
      "docs": [
        "初始化WUSD稳定币系统"
      ],
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "wusdMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "collateralMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "treasury",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
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
      "name": "stake",
      "docs": [
        "质押WUSD代币"
      ],
      "accounts": [
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "stakeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
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
      "name": "claim",
      "docs": [
        "领取质押奖励"
      ],
      "accounts": [
        {
          "name": "user",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "stakeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userWusd",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "wusdMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "setPoolAddress",
      "docs": [
        "设置交易池地址"
      ],
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "newPoolAddress",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "swap",
      "docs": [
        "代币兑换功能"
      ],
      "accounts": [
        {
          "name": "user",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "userTokenIn",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userTokenOut",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "treasury",
          "isMut": true,
          "isSigner": false
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
      "name": "pause",
      "docs": [
        "暂停合约"
      ],
      "accounts": [
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "unpause",
      "docs": [
        "恢复合约"
      ],
      "accounts": [
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "setConfig",
      "docs": [
        "设置代币兑换配置"
      ],
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "tokenMint",
          "type": "publicKey"
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
        "设置代币兑换汇率"
      ],
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "tokenInMint",
          "type": "publicKey"
        },
        {
          "name": "tokenOutMint",
          "type": "publicKey"
        },
        {
          "name": "rate",
          "type": {
            "defined": "Rate"
          }
        }
      ]
    },
    {
      "name": "softStake",
      "docs": [
        "软质押WUSD代币"
      ],
      "accounts": [
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "userWusd",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakeVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
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
      "name": "softClaim",
      "accounts": [
        {
          "name": "user",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "stakeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userWusd",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "wusdMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "setWhitelistToken",
      "docs": [
        "设置代币白名单状态"
      ],
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "tokenMint",
          "type": "publicKey"
        },
        {
          "name": "status",
          "type": "bool"
        }
      ]
    },
    {
      "name": "setWhitelistTokens",
      "docs": [
        "批量设置代币白名单状态"
      ],
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "tokenMints",
          "type": {
            "vec": "publicKey"
          }
        },
        {
          "name": "status",
          "type": "bool"
        }
      ]
    },
    {
      "name": "getPoolAddress",
      "docs": [
        "获取交易池地址"
      ],
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [],
      "returns": "publicKey"
    }
  ],
  "accounts": [
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
            "type": "publicKey"
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
              "defined": "SoftStakingStatus"
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
      "name": "stakeAccount",
      "docs": [
        "质押账户结构体，存储用户的质押信息"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "stakingPoolId",
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
              "defined": "StakingStatus"
            }
          },
          {
            "name": "claimType",
            "type": {
              "defined": "ClaimType"
            }
          },
          {
            "name": "apyTier",
            "type": "u8"
          },
          {
            "name": "emergencyCooldown",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "stateAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "wusdMint",
            "type": "publicKey"
          },
          {
            "name": "collateralMint",
            "type": "publicKey"
          },
          {
            "name": "treasury",
            "type": "publicKey"
          },
          {
            "name": "totalSupply",
            "type": "u64"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "paused",
            "type": "bool"
          },
          {
            "name": "totalStaked",
            "type": "u64"
          },
          {
            "name": "rewardRate",
            "type": "u64"
          },
          {
            "name": "lastUpdateTime",
            "type": "i64"
          },
          {
            "name": "emergencyWithdrawPenalty",
            "type": "u64"
          },
          {
            "name": "emergencyCooldownDuration",
            "type": "i64"
          },
          {
            "name": "collateralDecimals",
            "type": "u8"
          },
          {
            "name": "wusdDecimals",
            "type": "u8"
          },
          {
            "name": "tokenWhitelist",
            "type": {
              "array": [
                {
                  "defined": "(Pubkey,bool)"
                },
                3
              ]
            }
          },
          {
            "name": "exchangeRates",
            "type": {
              "array": [
                {
                  "defined": "(Pubkey,Pubkey,Rate)"
                },
                3
              ]
            }
          },
          {
            "name": "totalStakingPlans",
            "type": "u64"
          },
          {
            "name": "owners",
            "type": {
              "array": [
                "publicKey",
                10
              ]
            }
          },
          {
            "name": "poolAddress",
            "type": "publicKey"
          },
          {
            "name": "claims",
            "type": {
              "array": [
                {
                  "defined": "(Pubkey,SoftStakeAccount)"
                },
                32
              ]
            }
          },
          {
            "name": "claimsCount",
            "type": "u32"
          },
          {
            "name": "stakingPools",
            "type": {
              "array": [
                {
                  "defined": "StakingPool"
                },
                32
              ]
            }
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "ClaimDataInput",
      "docs": [
        "质押数据输入结构体"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "account",
            "type": "publicKey"
          },
          {
            "name": "claimableTimestamp",
            "type": "i64"
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
      "name": "SoftStakeRewards",
      "docs": [
        "软质押奖励计算结构体"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "baseRewards",
            "type": "u64"
          },
          {
            "name": "bonusRewards",
            "type": "u64"
          },
          {
            "name": "totalRewards",
            "type": "u64"
          },
          {
            "name": "lastUpdateTime",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "StakingPoolDetail",
      "docs": [
        "质押池详情结构体"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "stakingPoolId",
            "type": "u64"
          },
          {
            "name": "stakingPool",
            "type": {
              "defined": "StakingPool"
            }
          }
        ]
      }
    },
    {
      "name": "StakingPlan",
      "docs": [
        "质押计划详情结构体"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "minStakeAmount",
            "type": "u64"
          },
          {
            "name": "apy",
            "type": "u64"
          },
          {
            "name": "duration",
            "type": "i64"
          },
          {
            "name": "status",
            "type": {
              "defined": "PoolStatus"
            }
          }
        ]
      }
    },
    {
      "name": "StakingPlanDetail",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "stakingPlanId",
            "type": "u64"
          },
          {
            "name": "stakingPlan",
            "type": {
              "defined": "StakingPlan"
            }
          }
        ]
      }
    },
    {
      "name": "Rate",
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
      "name": "StakingPool",
      "docs": [
        "质押池配置结构体"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "apy",
            "type": "u64"
          },
          {
            "name": "duration",
            "type": "i64"
          },
          {
            "name": "minStakeAmount",
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": "PoolStatus"
            }
          }
        ]
      }
    },
    {
      "name": "ExchangeRate",
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
      "name": "SoftStakingStatus",
      "docs": [
        "软质押状态枚举"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Active"
          },
          {
            "name": "Claimable"
          },
          {
            "name": "Claimed"
          }
        ]
      }
    },
    {
      "name": "StakingStatus",
      "docs": [
        "质押状态枚举"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Active"
          },
          {
            "name": "Locked"
          },
          {
            "name": "Unlocked"
          },
          {
            "name": "Claimed"
          }
        ]
      }
    },
    {
      "name": "ClaimType",
      "docs": [
        "领取类型枚举"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Unclaimed"
          },
          {
            "name": "Claimed"
          },
          {
            "name": "Emergency"
          }
        ]
      }
    },
    {
      "name": "PoolStatus",
      "docs": [
        "质押池状态枚举"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Active"
          },
          {
            "name": "Paused"
          },
          {
            "name": "Closed"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "ClaimDataCreated",
      "fields": [
        {
          "name": "account",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "claimableTimestamp",
          "type": "i64",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        },
        {
          "name": "accessKey",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": false
        }
      ]
    },
    {
      "name": "OwnerChanged",
      "fields": [
        {
          "name": "oldOwner",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "newOwner",
          "type": "publicKey",
          "index": false
        }
      ]
    },
    {
      "name": "PoolAddressSet",
      "fields": [
        {
          "name": "oldAddress",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "newAddress",
          "type": "publicKey",
          "index": false
        }
      ]
    },
    {
      "name": "SoftStakeEvent",
      "fields": [
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "stakingPoolId",
          "type": "u64",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        },
        {
          "name": "apy",
          "type": "u64",
          "index": false
        },
        {
          "name": "startTime",
          "type": "i64",
          "index": false
        },
        {
          "name": "endTime",
          "type": "i64",
          "index": false
        },
        {
          "name": "accessKey",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": false
        }
      ]
    },
    {
      "name": "SoftClaimEvent",
      "fields": [
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        },
        {
          "name": "accessKey",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": false
        }
      ]
    },
    {
      "name": "SoftStakeStatusUpdated",
      "fields": [
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "stakingPoolId",
          "type": "u64",
          "index": false
        },
        {
          "name": "oldStatus",
          "type": {
            "defined": "SoftStakingStatus"
          },
          "index": false
        },
        {
          "name": "newStatus",
          "type": {
            "defined": "SoftStakingStatus"
          },
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "SoftStakeRewardsUpdated",
      "fields": [
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "oldRewards",
          "type": "u64",
          "index": false
        },
        {
          "name": "newRewards",
          "type": "u64",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "SoftStakeRewardsCalculated",
      "fields": [
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "baseRewards",
          "type": "u64",
          "index": false
        },
        {
          "name": "bonusRewards",
          "type": "u64",
          "index": false
        },
        {
          "name": "totalRewards",
          "type": "u64",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "WithdrawEvent",
      "fields": [
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "stakingPoolId",
          "type": "u64",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        },
        {
          "name": "rewards",
          "type": "u64",
          "index": false
        },
        {
          "name": "withdrawTime",
          "type": "i64",
          "index": false
        },
        {
          "name": "isEmergency",
          "type": "bool",
          "index": false
        }
      ]
    },
    {
      "name": "StakeEvent",
      "fields": [
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "stakingPlanId",
          "type": "u64",
          "index": false
        },
        {
          "name": "stakingPoolId",
          "type": "u64",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        },
        {
          "name": "apy",
          "type": "u64",
          "index": false
        },
        {
          "name": "startTime",
          "type": "i64",
          "index": false
        },
        {
          "name": "endTime",
          "type": "i64",
          "index": false
        },
        {
          "name": "stakedAt",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "ClaimEvent",
      "fields": [
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        }
      ]
    },
    {
      "name": "SwapEvent",
      "fields": [
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenIn",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenOut",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "amountIn",
          "type": "u64",
          "index": false
        },
        {
          "name": "amountOut",
          "type": "u64",
          "index": false
        },
        {
          "name": "treasury",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "RateSetEvent",
      "fields": [
        {
          "name": "caller",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenIn",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenOut",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "oldRate",
          "type": {
            "defined": "Rate"
          },
          "index": false
        },
        {
          "name": "newRate",
          "type": {
            "defined": "Rate"
          },
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "PoolAddressSetEvent",
      "fields": [
        {
          "name": "caller",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "oldPoolAddress",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "newPoolAddress",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "TokenWhitelistUpdatedEvent",
      "fields": [
        {
          "name": "caller",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "token",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "status",
          "type": "bool",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "ConfigSetEvent",
      "fields": [
        {
          "name": "caller",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenMint",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "decimals",
          "type": "u8",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "PauseEvent",
      "fields": []
    },
    {
      "name": "UnpauseEvent",
      "fields": []
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "ContractPaused",
      "msg": "Contract is paused"
    },
    {
      "code": 6001,
      "name": "InvalidAmount",
      "msg": "Invalid amount"
    },
    {
      "code": 6002,
      "name": "InvalidSignatureError",
      "msg": "Invalid signature"
    },
    {
      "code": 6003,
      "name": "InvalidAccessKey",
      "msg": "Invalid access key"
    },
    {
      "code": 6004,
      "name": "InsufficientSupply",
      "msg": "Insufficient supply"
    },
    {
      "code": 6005,
      "name": "Unauthorized",
      "msg": "Unauthorized"
    },
    {
      "code": 6006,
      "name": "SlippageExceeded",
      "msg": "Slippage exceeded"
    },
    {
      "code": 6007,
      "name": "NoRewardsToClaim",
      "msg": "No rewards to claim"
    },
    {
      "code": 6008,
      "name": "InvalidLockDuration",
      "msg": "Invalid lock duration"
    },
    {
      "code": 6009,
      "name": "InvalidStakingStatus",
      "msg": "Invalid staking status"
    },
    {
      "code": 6010,
      "name": "EmergencyWithdrawCooldown",
      "msg": "Emergency withdraw cooldown"
    },
    {
      "code": 6011,
      "name": "StakeLocked",
      "msg": "Stake is locked"
    },
    {
      "code": 6012,
      "name": "TokenNotWhitelisted",
      "msg": "Token not whitelisted"
    },
    {
      "code": 6013,
      "name": "MathOverflow",
      "msg": "Math overflow"
    },
    {
      "code": 6014,
      "name": "InvalidPoolId",
      "msg": "Invalid pool ID"
    },
    {
      "code": 6015,
      "name": "InvalidPoolStatus",
      "msg": "Invalid pool status"
    },
    {
      "code": 6016,
      "name": "StakingAmountTooLow",
      "msg": "Staking amount too low"
    },
    {
      "code": 6017,
      "name": "SameTokenAddresses",
      "msg": "Cannot swap same token"
    },
    {
      "code": 6018,
      "name": "InsufficientBalance",
      "msg": "Insufficient balance"
    },
    {
      "code": 6019,
      "name": "InvalidOwner",
      "msg": "Invalid owner"
    },
    {
      "code": 6020,
      "name": "InvalidDecimals",
      "msg": "Invalid decimals"
    },
    {
      "code": 6021,
      "name": "InvalidExchangeRate",
      "msg": "Invalid exchange rate"
    },
    {
      "code": 6022,
      "name": "InvalidOutputAmount",
      "msg": "Invalid output amount"
    },
    {
      "code": 6023,
      "name": "InvalidAddress",
      "msg": "Invalid address"
    },
    {
      "code": 6024,
      "name": "InsufficientTreasuryBalance",
      "msg": "Insufficient treasury balance"
    },
    {
      "code": 6025,
      "name": "NoAvailableWhitelistSlot",
      "msg": "No available whitelist slot"
    },
    {
      "code": 6026,
      "name": "InvalidInput",
      "msg": "Invalid input"
    },
    {
      "code": 6027,
      "name": "TooManyTokens",
      "msg": "Too many tokens"
    },
    {
      "code": 6028,
      "name": "NoTokensUpdated",
      "msg": "No tokens updated"
    },
    {
      "code": 6029,
      "name": "AmountTooSmall",
      "msg": "Amount too small"
    },
    {
      "code": 6030,
      "name": "ArithmeticOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6031,
      "name": "ClaimAlreadyClaimed",
      "msg": "Claim already claimed"
    },
    {
      "code": 6032,
      "name": "ClaimableTimestampNotReached",
      "msg": "Claimable timestamp not reached"
    },
    {
      "code": 6033,
      "name": "EmptySignatures",
      "msg": "Empty signatures"
    },
    {
      "code": 6034,
      "name": "InvalidNumberOfSigners",
      "msg": "Invalid number of signers"
    },
    {
      "code": 6035,
      "name": "UnauthorizedSigner",
      "msg": "Unauthorized signer"
    },
    {
      "code": 6036,
      "name": "InvalidSelector",
      "msg": "Invalid selector"
    },
    {
      "code": 6037,
      "name": "ClaimNotFound",
      "msg": "Claim not found"
    },
    {
      "code": 6038,
      "name": "InvalidStakingPlan",
      "msg": "Invalid staking plan"
    },
    {
      "code": 6039,
      "name": "NotAnOwner",
      "msg": "Not an owner"
    }
  ]
};

export const IDL: WusdApplication = {
  "version": "0.1.0",
  "name": "wusd_application",
  "instructions": [
    {
      "name": "initializeStakeAccount",
      "docs": [
        "初始化质押账户"
      ],
      "accounts": [
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "stakeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "initialize",
      "docs": [
        "初始化WUSD稳定币系统"
      ],
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "wusdMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "collateralMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "treasury",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
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
      "name": "stake",
      "docs": [
        "质押WUSD代币"
      ],
      "accounts": [
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "stakeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
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
      "name": "claim",
      "docs": [
        "领取质押奖励"
      ],
      "accounts": [
        {
          "name": "user",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "stakeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userWusd",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "wusdMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "setPoolAddress",
      "docs": [
        "设置交易池地址"
      ],
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "newPoolAddress",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "swap",
      "docs": [
        "代币兑换功能"
      ],
      "accounts": [
        {
          "name": "user",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "userTokenIn",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userTokenOut",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "treasury",
          "isMut": true,
          "isSigner": false
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
      "name": "pause",
      "docs": [
        "暂停合约"
      ],
      "accounts": [
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "unpause",
      "docs": [
        "恢复合约"
      ],
      "accounts": [
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "setConfig",
      "docs": [
        "设置代币兑换配置"
      ],
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "tokenMint",
          "type": "publicKey"
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
        "设置代币兑换汇率"
      ],
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "tokenInMint",
          "type": "publicKey"
        },
        {
          "name": "tokenOutMint",
          "type": "publicKey"
        },
        {
          "name": "rate",
          "type": {
            "defined": "Rate"
          }
        }
      ]
    },
    {
      "name": "softStake",
      "docs": [
        "软质押WUSD代币"
      ],
      "accounts": [
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "userWusd",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakeVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
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
      "name": "softClaim",
      "accounts": [
        {
          "name": "user",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "stakeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userWusd",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "wusdMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "setWhitelistToken",
      "docs": [
        "设置代币白名单状态"
      ],
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "tokenMint",
          "type": "publicKey"
        },
        {
          "name": "status",
          "type": "bool"
        }
      ]
    },
    {
      "name": "setWhitelistTokens",
      "docs": [
        "批量设置代币白名单状态"
      ],
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "tokenMints",
          "type": {
            "vec": "publicKey"
          }
        },
        {
          "name": "status",
          "type": "bool"
        }
      ]
    },
    {
      "name": "getPoolAddress",
      "docs": [
        "获取交易池地址"
      ],
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [],
      "returns": "publicKey"
    }
  ],
  "accounts": [
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
            "type": "publicKey"
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
              "defined": "SoftStakingStatus"
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
      "name": "stakeAccount",
      "docs": [
        "质押账户结构体，存储用户的质押信息"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "stakingPoolId",
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
              "defined": "StakingStatus"
            }
          },
          {
            "name": "claimType",
            "type": {
              "defined": "ClaimType"
            }
          },
          {
            "name": "apyTier",
            "type": "u8"
          },
          {
            "name": "emergencyCooldown",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "stateAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "wusdMint",
            "type": "publicKey"
          },
          {
            "name": "collateralMint",
            "type": "publicKey"
          },
          {
            "name": "treasury",
            "type": "publicKey"
          },
          {
            "name": "totalSupply",
            "type": "u64"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "paused",
            "type": "bool"
          },
          {
            "name": "totalStaked",
            "type": "u64"
          },
          {
            "name": "rewardRate",
            "type": "u64"
          },
          {
            "name": "lastUpdateTime",
            "type": "i64"
          },
          {
            "name": "emergencyWithdrawPenalty",
            "type": "u64"
          },
          {
            "name": "emergencyCooldownDuration",
            "type": "i64"
          },
          {
            "name": "collateralDecimals",
            "type": "u8"
          },
          {
            "name": "wusdDecimals",
            "type": "u8"
          },
          {
            "name": "tokenWhitelist",
            "type": {
              "array": [
                {
                  "defined": "(Pubkey,bool)"
                },
                3
              ]
            }
          },
          {
            "name": "exchangeRates",
            "type": {
              "array": [
                {
                  "defined": "(Pubkey,Pubkey,Rate)"
                },
                3
              ]
            }
          },
          {
            "name": "totalStakingPlans",
            "type": "u64"
          },
          {
            "name": "owners",
            "type": {
              "array": [
                "publicKey",
                10
              ]
            }
          },
          {
            "name": "poolAddress",
            "type": "publicKey"
          },
          {
            "name": "claims",
            "type": {
              "array": [
                {
                  "defined": "(Pubkey,SoftStakeAccount)"
                },
                32
              ]
            }
          },
          {
            "name": "claimsCount",
            "type": "u32"
          },
          {
            "name": "stakingPools",
            "type": {
              "array": [
                {
                  "defined": "StakingPool"
                },
                32
              ]
            }
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "ClaimDataInput",
      "docs": [
        "质押数据输入结构体"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "account",
            "type": "publicKey"
          },
          {
            "name": "claimableTimestamp",
            "type": "i64"
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
      "name": "SoftStakeRewards",
      "docs": [
        "软质押奖励计算结构体"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "baseRewards",
            "type": "u64"
          },
          {
            "name": "bonusRewards",
            "type": "u64"
          },
          {
            "name": "totalRewards",
            "type": "u64"
          },
          {
            "name": "lastUpdateTime",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "StakingPoolDetail",
      "docs": [
        "质押池详情结构体"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "stakingPoolId",
            "type": "u64"
          },
          {
            "name": "stakingPool",
            "type": {
              "defined": "StakingPool"
            }
          }
        ]
      }
    },
    {
      "name": "StakingPlan",
      "docs": [
        "质押计划详情结构体"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "minStakeAmount",
            "type": "u64"
          },
          {
            "name": "apy",
            "type": "u64"
          },
          {
            "name": "duration",
            "type": "i64"
          },
          {
            "name": "status",
            "type": {
              "defined": "PoolStatus"
            }
          }
        ]
      }
    },
    {
      "name": "StakingPlanDetail",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "stakingPlanId",
            "type": "u64"
          },
          {
            "name": "stakingPlan",
            "type": {
              "defined": "StakingPlan"
            }
          }
        ]
      }
    },
    {
      "name": "Rate",
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
      "name": "StakingPool",
      "docs": [
        "质押池配置结构体"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "apy",
            "type": "u64"
          },
          {
            "name": "duration",
            "type": "i64"
          },
          {
            "name": "minStakeAmount",
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": "PoolStatus"
            }
          }
        ]
      }
    },
    {
      "name": "ExchangeRate",
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
      "name": "SoftStakingStatus",
      "docs": [
        "软质押状态枚举"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Active"
          },
          {
            "name": "Claimable"
          },
          {
            "name": "Claimed"
          }
        ]
      }
    },
    {
      "name": "StakingStatus",
      "docs": [
        "质押状态枚举"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Active"
          },
          {
            "name": "Locked"
          },
          {
            "name": "Unlocked"
          },
          {
            "name": "Claimed"
          }
        ]
      }
    },
    {
      "name": "ClaimType",
      "docs": [
        "领取类型枚举"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Unclaimed"
          },
          {
            "name": "Claimed"
          },
          {
            "name": "Emergency"
          }
        ]
      }
    },
    {
      "name": "PoolStatus",
      "docs": [
        "质押池状态枚举"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Active"
          },
          {
            "name": "Paused"
          },
          {
            "name": "Closed"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "ClaimDataCreated",
      "fields": [
        {
          "name": "account",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "claimableTimestamp",
          "type": "i64",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        },
        {
          "name": "accessKey",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": false
        }
      ]
    },
    {
      "name": "OwnerChanged",
      "fields": [
        {
          "name": "oldOwner",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "newOwner",
          "type": "publicKey",
          "index": false
        }
      ]
    },
    {
      "name": "PoolAddressSet",
      "fields": [
        {
          "name": "oldAddress",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "newAddress",
          "type": "publicKey",
          "index": false
        }
      ]
    },
    {
      "name": "SoftStakeEvent",
      "fields": [
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "stakingPoolId",
          "type": "u64",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        },
        {
          "name": "apy",
          "type": "u64",
          "index": false
        },
        {
          "name": "startTime",
          "type": "i64",
          "index": false
        },
        {
          "name": "endTime",
          "type": "i64",
          "index": false
        },
        {
          "name": "accessKey",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": false
        }
      ]
    },
    {
      "name": "SoftClaimEvent",
      "fields": [
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        },
        {
          "name": "accessKey",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": false
        }
      ]
    },
    {
      "name": "SoftStakeStatusUpdated",
      "fields": [
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "stakingPoolId",
          "type": "u64",
          "index": false
        },
        {
          "name": "oldStatus",
          "type": {
            "defined": "SoftStakingStatus"
          },
          "index": false
        },
        {
          "name": "newStatus",
          "type": {
            "defined": "SoftStakingStatus"
          },
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "SoftStakeRewardsUpdated",
      "fields": [
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "oldRewards",
          "type": "u64",
          "index": false
        },
        {
          "name": "newRewards",
          "type": "u64",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "SoftStakeRewardsCalculated",
      "fields": [
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "baseRewards",
          "type": "u64",
          "index": false
        },
        {
          "name": "bonusRewards",
          "type": "u64",
          "index": false
        },
        {
          "name": "totalRewards",
          "type": "u64",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "WithdrawEvent",
      "fields": [
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "stakingPoolId",
          "type": "u64",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        },
        {
          "name": "rewards",
          "type": "u64",
          "index": false
        },
        {
          "name": "withdrawTime",
          "type": "i64",
          "index": false
        },
        {
          "name": "isEmergency",
          "type": "bool",
          "index": false
        }
      ]
    },
    {
      "name": "StakeEvent",
      "fields": [
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "stakingPlanId",
          "type": "u64",
          "index": false
        },
        {
          "name": "stakingPoolId",
          "type": "u64",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        },
        {
          "name": "apy",
          "type": "u64",
          "index": false
        },
        {
          "name": "startTime",
          "type": "i64",
          "index": false
        },
        {
          "name": "endTime",
          "type": "i64",
          "index": false
        },
        {
          "name": "stakedAt",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "ClaimEvent",
      "fields": [
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        }
      ]
    },
    {
      "name": "SwapEvent",
      "fields": [
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenIn",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenOut",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "amountIn",
          "type": "u64",
          "index": false
        },
        {
          "name": "amountOut",
          "type": "u64",
          "index": false
        },
        {
          "name": "treasury",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "RateSetEvent",
      "fields": [
        {
          "name": "caller",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenIn",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenOut",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "oldRate",
          "type": {
            "defined": "Rate"
          },
          "index": false
        },
        {
          "name": "newRate",
          "type": {
            "defined": "Rate"
          },
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "PoolAddressSetEvent",
      "fields": [
        {
          "name": "caller",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "oldPoolAddress",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "newPoolAddress",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "TokenWhitelistUpdatedEvent",
      "fields": [
        {
          "name": "caller",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "token",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "status",
          "type": "bool",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "ConfigSetEvent",
      "fields": [
        {
          "name": "caller",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenMint",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "decimals",
          "type": "u8",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "PauseEvent",
      "fields": []
    },
    {
      "name": "UnpauseEvent",
      "fields": []
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "ContractPaused",
      "msg": "Contract is paused"
    },
    {
      "code": 6001,
      "name": "InvalidAmount",
      "msg": "Invalid amount"
    },
    {
      "code": 6002,
      "name": "InvalidSignatureError",
      "msg": "Invalid signature"
    },
    {
      "code": 6003,
      "name": "InvalidAccessKey",
      "msg": "Invalid access key"
    },
    {
      "code": 6004,
      "name": "InsufficientSupply",
      "msg": "Insufficient supply"
    },
    {
      "code": 6005,
      "name": "Unauthorized",
      "msg": "Unauthorized"
    },
    {
      "code": 6006,
      "name": "SlippageExceeded",
      "msg": "Slippage exceeded"
    },
    {
      "code": 6007,
      "name": "NoRewardsToClaim",
      "msg": "No rewards to claim"
    },
    {
      "code": 6008,
      "name": "InvalidLockDuration",
      "msg": "Invalid lock duration"
    },
    {
      "code": 6009,
      "name": "InvalidStakingStatus",
      "msg": "Invalid staking status"
    },
    {
      "code": 6010,
      "name": "EmergencyWithdrawCooldown",
      "msg": "Emergency withdraw cooldown"
    },
    {
      "code": 6011,
      "name": "StakeLocked",
      "msg": "Stake is locked"
    },
    {
      "code": 6012,
      "name": "TokenNotWhitelisted",
      "msg": "Token not whitelisted"
    },
    {
      "code": 6013,
      "name": "MathOverflow",
      "msg": "Math overflow"
    },
    {
      "code": 6014,
      "name": "InvalidPoolId",
      "msg": "Invalid pool ID"
    },
    {
      "code": 6015,
      "name": "InvalidPoolStatus",
      "msg": "Invalid pool status"
    },
    {
      "code": 6016,
      "name": "StakingAmountTooLow",
      "msg": "Staking amount too low"
    },
    {
      "code": 6017,
      "name": "SameTokenAddresses",
      "msg": "Cannot swap same token"
    },
    {
      "code": 6018,
      "name": "InsufficientBalance",
      "msg": "Insufficient balance"
    },
    {
      "code": 6019,
      "name": "InvalidOwner",
      "msg": "Invalid owner"
    },
    {
      "code": 6020,
      "name": "InvalidDecimals",
      "msg": "Invalid decimals"
    },
    {
      "code": 6021,
      "name": "InvalidExchangeRate",
      "msg": "Invalid exchange rate"
    },
    {
      "code": 6022,
      "name": "InvalidOutputAmount",
      "msg": "Invalid output amount"
    },
    {
      "code": 6023,
      "name": "InvalidAddress",
      "msg": "Invalid address"
    },
    {
      "code": 6024,
      "name": "InsufficientTreasuryBalance",
      "msg": "Insufficient treasury balance"
    },
    {
      "code": 6025,
      "name": "NoAvailableWhitelistSlot",
      "msg": "No available whitelist slot"
    },
    {
      "code": 6026,
      "name": "InvalidInput",
      "msg": "Invalid input"
    },
    {
      "code": 6027,
      "name": "TooManyTokens",
      "msg": "Too many tokens"
    },
    {
      "code": 6028,
      "name": "NoTokensUpdated",
      "msg": "No tokens updated"
    },
    {
      "code": 6029,
      "name": "AmountTooSmall",
      "msg": "Amount too small"
    },
    {
      "code": 6030,
      "name": "ArithmeticOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6031,
      "name": "ClaimAlreadyClaimed",
      "msg": "Claim already claimed"
    },
    {
      "code": 6032,
      "name": "ClaimableTimestampNotReached",
      "msg": "Claimable timestamp not reached"
    },
    {
      "code": 6033,
      "name": "EmptySignatures",
      "msg": "Empty signatures"
    },
    {
      "code": 6034,
      "name": "InvalidNumberOfSigners",
      "msg": "Invalid number of signers"
    },
    {
      "code": 6035,
      "name": "UnauthorizedSigner",
      "msg": "Unauthorized signer"
    },
    {
      "code": 6036,
      "name": "InvalidSelector",
      "msg": "Invalid selector"
    },
    {
      "code": 6037,
      "name": "ClaimNotFound",
      "msg": "Claim not found"
    },
    {
      "code": 6038,
      "name": "InvalidStakingPlan",
      "msg": "Invalid staking plan"
    },
    {
      "code": 6039,
      "name": "NotAnOwner",
      "msg": "Not an owner"
    }
  ]
};
