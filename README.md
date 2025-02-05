# 简介

这是一个基于 Anchor 框架实现的 Solana 稳定币系统，由 WUSD Token 和 WUSD Application 两个主要程序组成。

## 开发环境要求

- Rust 1.70.0 或更高版本
- Solana 工具链 1.16.0
- Node.js 16+ 和 Yarn
- Anchor 0.30.1

## 开始使用

1. 安装依赖:
```bash
yarn install
```

2. 构建程序:
```bash
anchor build
or
anchor build --program-name wusd_token
or
anchor build --program-name wusd_application
```

3. 部署程序:
```bash
anchor deploy
or
anchor deploy --program-name wusd_token
or
anchor deploy --program-name wusd_application
```

4. 使用部署后的程序 ID 更新 lib.rs 中的程序 ID。

## WUSD Token 程序

### 功能特性

- 代币铸造与销毁
- 代币转账与余额管理
- 代币权限控制
- 8 位小数精度

### 指令说明

1. **Initialize**: 创建 WUSD 代币铸造
   - 所需账户: authority, wusdMint

2. **Transfer**: 代币转账
   - 所需账户: sender, receiver, wusdMint

3. **Burn**: 代币销毁
   - 所需账户: owner, wusdMint

### 测试用例

- 代币铸造测试
- 代币转账测试
- 权限控制测试

## WUSD Application 程序

### 功能特性

- **抵押品管理**: 支持多种代币作为抵押品
- **代币互换**: 支持白名单代币间的互换，包含滑点保护
- **质押奖励**: 质押 WUSD 获取奖励
- **软质押功能**: 灵活的质押期限和 APY

### 软质押特性

- 灵活的质押期限，可定制 APY
- 基于访问密钥的安全验证机制
- 即时的奖励计算和分发
- 支持多个质押池
- 实时奖励率调整

### 安全特性

- 关键操作支持多重签名
- 质押领取的访问密钥验证
- 安全的奖励计算和分发机制
- 可暂停的合约功能
- 防范常见攻击向量

### 指令说明

1. **Initialize**: 初始化协议状态
   - 所需账户: authority, state, collateralMint, treasury

2. **Deposit**: 存入抵押代币并获得 WUSD
   - 所需账户: user, userCollateral, userWusd, treasury, state

3. **Swap**: 白名单代币互换
   - 所需账户: user, userTokenIn, userTokenOut, vaultTokenIn, state
   - 支持自定义汇率和滑点保护

4. **Stake**: 质押 WUSD 代币
   - 所需账户: user, userWusd, state, stakeAccount

5. **Claim**: 领取质押奖励
   - 所需账户: user, stakeAccount, userWusd, wusdMint, state

### 测试用例

- 协议初始化测试
- 抵押品管理测试
- 代币互换功能测试
- 质押和奖励机制测试
- 软质押功能测试

## 测试

### 前置条件

1. 启动本地测试验证器:
```bash
solana-test-validator
```

### 运行测试

执行测试套件:
```bash
anchor test
```

### 测试账户结构

测试套件设置以下账户：

- `wusdMint`: WUSD 代币铸造 (8 位小数)
- `collateralMint`: 抵押代币铸造
- `treasury`: 持有抵押品的协议资金库
- `userWusd`: 用户的 WUSD 代币账户
- `userCollateral`: 用户的抵押代币账户
- `softStakeAccount`: 软质押的 PDA
- `stakeVault`: 质押代币的保管库
- `state`: 协议状态 PDA