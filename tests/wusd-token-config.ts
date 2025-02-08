export const config = {
    // 连接配置
    rpcUrl: "http://127.0.0.1:8899",
    deployKeyPath: "/Users/lizhigang/Downloads/wusd-stablecoin/deploy-keypair.json",
    connectionConfig: {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 180000,
        preflightCommitment: 'confirmed',
        disableRetryOnRateLimit: true,
        httpHeaders: {
            'Cache-Control': 'no-cache',
        },
        useOnlyHttpEndpoint: true
    },

    // 代币配置
    wusdDecimals: 8,
    
    // 测试金额配置
    mintAmount: 1000000000, // 10 WUSD
    transferAmount: 500000000, // 5 WUSD
    burnAmount: 200000000, // 2 WUSD
    
    // 系统参数
    maxSupply: 1000000000000000, // 最大供应量
    
    // PDA种子
    seeds: {
        mint: "wusd_mint",
        authority: "authority",
        state: "state"
    },

    // PDA配置
    authorityBump: 255, // 默认bump值

    // 重试配置
    maxRetries: 3,
    retryDelay: 1000, // 毫秒
    
    // 错误代码
    errorCodes: {
        Unauthorized: "Unauthorized",
        InsufficientFunds: "InsufficientFunds",
        InvalidAmount: "InvalidAmount",
        AccountNotInitialized: "AccountNotInitialized",
        ProgramPaused: "ProgramPaused"
    }
};