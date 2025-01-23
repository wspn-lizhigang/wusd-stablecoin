export const config = {
    // 连接配置
    rpcUrl: "http://localhost:8899",
    deployKeyPath: "/Users/lizhigang/Downloads/wusd-stablecoin/deploy-keypair.json",

    // 代币配置
    wusdDecimals: 8,
    collateralDecimals: 6,
    
    // 质押池配置
    stakingPoolId: 1,
    minStakingAmount: 1000000, // 1 WUSD
    
    // 测试金额配置
    swapAmount: 5000000, // 5 tokens
    swapMinAmountOut: 4500000, // 5% slippage tolerance
    stakeAmount: 2000000, // 2 WUSD
    withdrawAmount: 1000000, // 1 WUSD
    
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