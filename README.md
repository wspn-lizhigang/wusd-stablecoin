# WUSD Stablecoin Program

这是一个基于Anchor框架实现的Solana稳定币(WUSD)程序。该程序提供以下功能：

1. 初始化WUSD代币铸造
2. 存入抵押代币并铸造WUSD
3. 抵押代币和WUSD以及其他白名单代币之间的互换
4. WUSD代币质押获取奖励
5. 灵活期限的WUSD软质押
6. 质押奖励领取

## 功能特性

- **初始化**: 创建8位小数的WUSD代币铸造
- **存入**: 允许用户存入抵押代币作为抵押并获得WUSD
- **互换**: 支持任意白名单代币之间的互换，包含滑点保护和汇率设置
- **质押**: 允许用户质押WUSD代币以赚取奖励
- **软质押**: 提供基于访问密钥验证的灵活质押选项
- **领取**: 使质押者能够领取已赚取的奖励

## 软质押特性

- 灵活的质押期限，可定制APY
- 基于访问密钥的安全验证机制
- 即时的奖励计算和分发
- 支持多个质押池
- 实时奖励率调整

## 安全特性

- 关键操作支持多重签名
- 质押领取的访问密钥验证
- 安全的奖励计算和分发机制
- 可暂停的合约功能
- 防范常见攻击向量

## 开始使用

1. 构建程序:
```bash
anchor build
```

2. 部署程序:
```bash
anchor deploy
```

3. 使用部署后的程序ID更新lib.rs中的程序ID。

## 使用说明

程序提供五个主要指令：

1. Initialize: 创建WUSD代币铸造并初始化协议状态
   - 所需账户: authority, state, wusdMint, collateralMint, treasury

2. Deposit: 存入抵押代币并获得WUSD
   - 所需账户: user, userCollateral, userWusd, treasury, state

3. Swap: 任意白名单代币之间的互换
   - 所需账户: user, userTokenIn, userTokenOut, vaultTokenIn, state
   - 支持自定义汇率和滑点保护

4. Stake: 质押WUSD代币以获取奖励
   - 所需账户: user, userWusd, state, stakeAccount

5. Claim: 领取质押奖励
   - 所需账户: user, stakeAccount, userWusd, wusdMint, state

每个指令都需要提供特定的账户结构，测试文件中提供了如何正确构造这些交易的示例。

## 测试

### 前置条件

1. 安装依赖:
```bash
yarn install
```

2. 配置Solana测试验证器:
```bash
solana-test-validator
```

### 运行测试

执行测试套件:
```bash
anchor test
```

### 测试用例

测试套件包含以下测试用例：

1. 协议初始化
   - 创建WUSD和抵押代币铸造
   - 初始化协议状态和资金库

2. 软质押
   - 测试带访问密钥的WUSD软质押
   - 验证质押池分配
   - 测试软质押代币的奖励领取

3. 常规质押
   - 测试基本的WUSD质押功能
   - 验证奖励分发
   - 测试奖励领取流程

4. 代币互换
   - 测试任意白名单代币之间的互换
   - 验证汇率设置和滑点保护
   - 测试代币转账和资金库管理

### 测试账户结构

测试套件设置以下账户：

- `wusdMint`: WUSD代币铸造 (8位小数)
- `collateralMint`: 抵押代币铸造
- `treasury`: 持有抵押品的协议资金库
- `userWusd`: 用户的WUSD代币账户
- `userCollateral`: 用户的抵押代币账户
- `softStakeAccount`: 软质押的PDA
- `stakeVault`: 质押代币的保管库
- `state`: 协议状态PDA

详细的实现示例请参考测试文件 `tests/wusd-stablecoin.ts`。