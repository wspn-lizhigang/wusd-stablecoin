/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/wusd_token.json`.
 */
export type WusdToken = {
  "address": "2YBEVPJbsRjTik1mjhiDVeJQ2muskrCAShRyLQXXNibY",
  "metadata": {
    "name": "wusdToken",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addOperator",
      "docs": [
        "添加操作员",
        "* `ctx` - 上下文",
        "* `operator` - 操作员地址"
      ],
      "discriminator": [
        149,
        142,
        187,
        68,
        33,
        250,
        87,
        105
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "管理员账户"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "authorityState",
          "docs": [
            "权限管理状态账户"
          ]
        },
        {
          "name": "operator",
          "docs": [
            "要管理的操作员账户"
          ]
        },
        {
          "name": "accessRegistry",
          "docs": [
            "访问权限注册表"
          ],
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "burn",
      "docs": [
        "销毁WUSD代币",
        "* `ctx` - 销毁上下文",
        "* `amount` - 销毁数量"
      ],
      "discriminator": [
        116,
        110,
        29,
        56,
        107,
        219,
        42,
        93
      ],
      "accounts": [
        {
          "name": "authorityState",
          "writable": true
        },
        {
          "name": "mintAuthority",
          "signer": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "authorityState"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "mint",
          "writable": true
        },
        {
          "name": "tokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "mintState"
        },
        {
          "name": "pauseState"
        },
        {
          "name": "accessRegistry"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initialize",
      "docs": [
        "初始化WUSD代币合约",
        "* `ctx` - 初始化上下文",
        "* `decimals` - 代币精度"
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
          "docs": [
            "管理员账户"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "mint",
          "docs": [
            "代币铸币账户"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "authorityState",
          "docs": [
            "权限管理账户"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "mintState",
          "docs": [
            "铸币状态账户"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  95,
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
          "name": "pauseState",
          "docs": [
            "暂停状态账户"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  117,
                  115,
                  101,
                  95,
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
      "name": "initializeAccessRegistry",
      "docs": [
        "初始化访问注册表",
        "* `ctx` - 初始化上下文"
      ],
      "discriminator": [
        193,
        224,
        33,
        22,
        51,
        245,
        44,
        175
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "accessRegistry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  99,
                  101,
                  115,
                  115,
                  95,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
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
      "name": "mint",
      "docs": [
        "铸造WUSD代币",
        "* `ctx` - 铸币上下文",
        "* `amount` - 铸造数量",
        "* `bump` - PDA的bump值"
      ],
      "discriminator": [
        51,
        57,
        225,
        47,
        182,
        146,
        137,
        166
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "铸币权限账户"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "mint",
          "docs": [
            "代币铸币账户"
          ],
          "writable": true
        },
        {
          "name": "tokenAccount",
          "docs": [
            "接收代币的账户"
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "authorityState",
          "docs": [
            "权限管理账户"
          ]
        },
        {
          "name": "mintState",
          "docs": [
            "铸币状态账户"
          ]
        },
        {
          "name": "pauseState",
          "docs": [
            "暂停状态账户"
          ]
        },
        {
          "name": "accessRegistry",
          "docs": [
            "访问权限账户"
          ]
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "bump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "pause",
      "docs": [
        "暂停合约",
        "* `ctx` - 上下文"
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
          "name": "pauseState",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "authorityState"
        }
      ],
      "args": []
    },
    {
      "name": "permit",
      "docs": [
        "处理授权许可请求，允许代币持有者授权其他账户使用其代币",
        "",
        "# 参数",
        "* `ctx` - 包含所有必要账户的上下文",
        "* `params` - 授权许可的参数，包含签名、金额、期限等信息",
        "",
        "# 返回值",
        "* `Result<()>` - 操作成功返回Ok(()), 失败返回错误"
      ],
      "discriminator": [
        195,
        207,
        253,
        183,
        164,
        24,
        131,
        7
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "spender",
          "writable": true
        },
        {
          "name": "allowance",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  108,
                  108,
                  111,
                  119,
                  97,
                  110,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "spender"
              }
            ]
          }
        },
        {
          "name": "permitState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  114,
                  109,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "mintState",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "permitParams"
            }
          }
        }
      ]
    },
    {
      "name": "removeOperator",
      "docs": [
        "移除操作员",
        "* `ctx` - 上下文",
        "* `operator` - 操作员地址"
      ],
      "discriminator": [
        84,
        183,
        126,
        251,
        137,
        150,
        214,
        134
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "管理员账户"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "authorityState",
          "docs": [
            "权限管理状态账户"
          ]
        },
        {
          "name": "operator",
          "docs": [
            "要管理的操作员账户"
          ]
        },
        {
          "name": "accessRegistry",
          "docs": [
            "访问权限注册表"
          ],
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "supportsInterface",
      "docs": [
        "检查合约是否支持指定接口",
        "* `_ctx` - 上下文",
        "* `interface_id` - 接口ID"
      ],
      "discriminator": [
        247,
        56,
        188,
        70,
        204,
        77,
        174,
        120
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "调用者地址"
          ],
          "signer": true
        }
      ],
      "args": [
        {
          "name": "interfaceId",
          "type": {
            "array": [
              "u8",
              4
            ]
          }
        }
      ],
      "returns": "bool"
    },
    {
      "name": "transfer",
      "docs": [
        "转账WUSD代币",
        "* `ctx` - 转账上下文",
        "* `amount` - 转账数量"
      ],
      "discriminator": [
        163,
        52,
        200,
        231,
        140,
        3,
        69,
        186
      ],
      "accounts": [
        {
          "name": "from",
          "writable": true,
          "signer": true
        },
        {
          "name": "to",
          "writable": true
        },
        {
          "name": "fromToken",
          "writable": true
        },
        {
          "name": "toToken",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "owner",
          "signer": true
        },
        {
          "name": "pauseState",
          "writable": true
        },
        {
          "name": "accessRegistry"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "transferFrom",
      "docs": [
        "使用授权额度转账WUSD代币",
        "* `ctx` - 转账上下文",
        "* `amount` - 转账数量"
      ],
      "discriminator": [
        230,
        255,
        130,
        7,
        220,
        247,
        122,
        0
      ],
      "accounts": [
        {
          "name": "spender",
          "writable": true,
          "signer": true
        },
        {
          "name": "from",
          "writable": true
        },
        {
          "name": "to",
          "writable": true
        },
        {
          "name": "fromToken",
          "writable": true
        },
        {
          "name": "toToken",
          "writable": true
        },
        {
          "name": "allowance",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  108,
                  108,
                  111,
                  119,
                  97,
                  110,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "from"
              },
              {
                "kind": "account",
                "path": "spender"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "pauseState",
          "writable": true
        },
        {
          "name": "accessRegistry"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "unpause",
      "docs": [
        "恢复合约",
        "* `ctx` - 上下文"
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
          "name": "pauseState",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "authorityState"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "accessRegistryState",
      "discriminator": [
        231,
        61,
        137,
        205,
        80,
        10,
        91,
        243
      ]
    },
    {
      "name": "allowanceState",
      "discriminator": [
        167,
        26,
        207,
        203,
        216,
        255,
        221,
        92
      ]
    },
    {
      "name": "authorityState",
      "discriminator": [
        217,
        219,
        18,
        179,
        143,
        126,
        98,
        123
      ]
    },
    {
      "name": "mintState",
      "discriminator": [
        81,
        17,
        143,
        120,
        23,
        57,
        22,
        117
      ]
    },
    {
      "name": "pauseState",
      "discriminator": [
        21,
        123,
        173,
        77,
        60,
        203,
        197,
        145
      ]
    },
    {
      "name": "permitState",
      "discriminator": [
        1,
        182,
        0,
        62,
        71,
        189,
        87,
        221
      ]
    }
  ],
  "events": [
    {
      "name": "burnEvent",
      "discriminator": [
        33,
        89,
        47,
        117,
        82,
        124,
        238,
        250
      ]
    },
    {
      "name": "initializeEvent",
      "discriminator": [
        206,
        175,
        169,
        208,
        241,
        210,
        35,
        221
      ]
    },
    {
      "name": "mintEvent",
      "discriminator": [
        197,
        144,
        146,
        149,
        66,
        164,
        95,
        16
      ]
    },
    {
      "name": "permitGranted",
      "discriminator": [
        195,
        66,
        5,
        140,
        74,
        128,
        13,
        164
      ]
    },
    {
      "name": "transferEvent",
      "discriminator": [
        100,
        10,
        46,
        113,
        8,
        28,
        179,
        125
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidDecimals",
      "msg": "Invalid decimals"
    },
    {
      "code": 6001,
      "name": "invalidAmount",
      "msg": "Invalid amount"
    },
    {
      "code": 6002,
      "name": "invalidNonce",
      "msg": "Invalid nonce"
    },
    {
      "code": 6003,
      "name": "contractPaused",
      "msg": "Contract is paused"
    },
    {
      "code": 6004,
      "name": "notMinter",
      "msg": "Not minter"
    },
    {
      "code": 6005,
      "name": "notBurner",
      "msg": "Not burner"
    },
    {
      "code": 6006,
      "name": "insufficientBalance",
      "msg": "Insufficient balance"
    },
    {
      "code": 6007,
      "name": "expiredPermit",
      "msg": "Expired permit"
    },
    {
      "code": 6008,
      "name": "accessDenied",
      "msg": "Access denied"
    },
    {
      "code": 6009,
      "name": "invalidSignature",
      "msg": "Invalid signature"
    },
    {
      "code": 6010,
      "name": "authorityRevoked",
      "msg": "Authority revoked"
    },
    {
      "code": 6011,
      "name": "unauthorized",
      "msg": "unauthorized"
    },
    {
      "code": 6012,
      "name": "scopeMismatch",
      "msg": "Permission scope mismatch"
    },
    {
      "code": 6013,
      "name": "invalidChainId",
      "msg": "Invalid chain ID"
    },
    {
      "code": 6014,
      "name": "usedNonce",
      "msg": "Nonce already used"
    },
    {
      "code": 6015,
      "name": "invalidAllowanceAccount",
      "msg": "Allowance account mismatch"
    },
    {
      "code": 6016,
      "name": "invalidMintAuthority",
      "msg": "Mint authority mismatch"
    },
    {
      "code": 6017,
      "name": "crossChainAttack",
      "msg": "Cross-chain permit attempt detected"
    },
    {
      "code": 6018,
      "name": "signatureExpired",
      "msg": "Signature deadline expired"
    },
    {
      "code": 6019,
      "name": "exceedsMintCap",
      "msg": "Minting cap exceeded"
    },
    {
      "code": 6020,
      "name": "versionMismatch",
      "msg": "Contract version mismatch"
    },
    {
      "code": 6021,
      "name": "recursiveCall",
      "msg": "Recursive call detected"
    },
    {
      "code": 6022,
      "name": "invalidDomain",
      "msg": "Invalid domain separator"
    },
    {
      "code": 6023,
      "name": "nonceMismatch",
      "msg": "Nonce mismatch"
    },
    {
      "code": 6024,
      "name": "insufficientFunds",
      "msg": "Insufficient funds"
    },
    {
      "code": 6025,
      "name": "invalidScope",
      "msg": "Invalid scope"
    }
  ],
  "types": [
    {
      "name": "accessRegistryState",
      "docs": [
        "访问权限注册表状态"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "管理员地址"
            ],
            "type": "pubkey"
          },
          {
            "name": "initialized",
            "docs": [
              "是否已初始化"
            ],
            "type": "bool"
          },
          {
            "name": "operators",
            "docs": [
              "操作员列表"
            ],
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "allowanceState",
      "docs": [
        "授权额度状态账户，存储代币授权信息"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "docs": [
              "代币所有者地址"
            ],
            "type": "pubkey"
          },
          {
            "name": "spender",
            "docs": [
              "被授权者地址"
            ],
            "type": "pubkey"
          },
          {
            "name": "amount",
            "docs": [
              "授权额度"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "authorityState",
      "docs": [
        "权限管理状态账户，存储合约的权限配置"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "docs": [
              "管理员地址"
            ],
            "type": "pubkey"
          },
          {
            "name": "minter",
            "docs": [
              "铸币权限地址"
            ],
            "type": "pubkey"
          },
          {
            "name": "pauser",
            "docs": [
              "暂停权限地址"
            ],
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "burnEvent",
      "docs": [
        "销毁事件，记录代币销毁的详细信息"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "burner",
            "docs": [
              "销毁者地址，执行销毁操作的账户"
            ],
            "type": "pubkey"
          },
          {
            "name": "amount",
            "docs": [
              "销毁数量，被销毁的代币数量"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "initializeEvent",
      "docs": [
        "初始化事件，记录代币初始化的关键信息"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "管理员地址，负责合约的权限管理"
            ],
            "type": "pubkey"
          },
          {
            "name": "mint",
            "docs": [
              "代币铸币权地址，用于控制代币的发行"
            ],
            "type": "pubkey"
          },
          {
            "name": "decimals",
            "docs": [
              "代币精度，定义代币的最小单位"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "mintEvent",
      "docs": [
        "铸币事件，记录代币铸造的详细信息"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "minter",
            "docs": [
              "铸币者地址，执行铸币操作的账户"
            ],
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "docs": [
              "接收者地址，获得新铸造代币的账户"
            ],
            "type": "pubkey"
          },
          {
            "name": "amount",
            "docs": [
              "铸造数量，新创建的代币数量"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "mintState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "docs": [
              "代币铸币权地址"
            ],
            "type": "pubkey"
          },
          {
            "name": "decimals",
            "docs": [
              "代币精度"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "pauseState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "paused",
            "docs": [
              "合约暂停状态"
            ],
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "permitGranted",
      "docs": [
        "许可授权事件，记录EIP-2612兼容的许可授权信息"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "docs": [
              "代币所有者地址"
            ],
            "type": "pubkey"
          },
          {
            "name": "spender",
            "docs": [
              "被授权者地址"
            ],
            "type": "pubkey"
          },
          {
            "name": "amount",
            "docs": [
              "授权金额"
            ],
            "type": "u64"
          },
          {
            "name": "scope",
            "docs": [
              "授权范围"
            ],
            "type": {
              "defined": {
                "name": "permitScope"
              }
            }
          }
        ]
      }
    },
    {
      "name": "permitParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "deadline",
            "type": "i64"
          },
          {
            "name": "nonce",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "scope",
            "type": {
              "defined": {
                "name": "permitScope"
              }
            }
          },
          {
            "name": "signature",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "publicKey",
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
      "name": "permitScope",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "transfer"
          },
          {
            "name": "mint"
          },
          {
            "name": "burn"
          }
        ]
      }
    },
    {
      "name": "permitState",
      "docs": [
        "签名许可状态账户，用于EIP-2612兼容的签名授权"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "docs": [
              "所有者地址"
            ],
            "type": "pubkey"
          },
          {
            "name": "nonce",
            "docs": [
              "随机数，用于防止重放攻击"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "transferEvent",
      "docs": [
        "转账事件，记录代币转账的详细信息"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "from",
            "docs": [
              "转出地址"
            ],
            "type": "pubkey"
          },
          {
            "name": "to",
            "docs": [
              "转入地址"
            ],
            "type": "pubkey"
          },
          {
            "name": "amount",
            "docs": [
              "转账金额"
            ],
            "type": "u64"
          },
          {
            "name": "fee",
            "docs": [
              "手续费"
            ],
            "type": "u64"
          },
          {
            "name": "timestamp",
            "docs": [
              "交易时间戳"
            ],
            "type": "i64"
          },
          {
            "name": "memo",
            "docs": [
              "转账备注（可选）"
            ],
            "type": {
              "option": "string"
            }
          }
        ]
      }
    }
  ]
};
