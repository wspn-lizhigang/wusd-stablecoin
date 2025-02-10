/*
 * @Author: 李志刚
 * @Date: 2025-01-23 01:07:58
 * @LastEditors: 李志刚
 * @LastEditTime: 2025-02-10 15:51:24
 * @Description: 
 */
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
    collateralDecimals: 6,
    
    // 质押池配置
    stakingPoolId: 1,
    minStakingAmount: 10000000, // 10 WUSD
    
    // 测试金额配置
    swapAmount: 5000000, // 5 tokens
    swapMinAmountOut: 4500000, // 5% slippage tolerance
    stakeAmount: 20000000, // 20 WUSD
    withdrawAmount: 10000000, // 10 WUSD
    
    // 系统参数
    rewardRate: 100000, // 0.0001 WUSD per second
    emergencyWithdrawPenalty: 500000, // 0.5%
    emergencyCooldownDuration: 24 * 60 * 60, // 24 hours
    
    // PDA种子
    seeds: {
        stakeVault: "stake_vault",
        treasury: "treasury",
        state: "state",
        stakeAccount: "stake_account",
        softStakeAccount: "soft_stake_account"
    }
};