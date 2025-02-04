import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { WusdStablecoin } from "../types/wusd_stablecoin";
import { PublicKey, SystemProgram, Connection } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, mintTo, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import * as fs from 'fs';
import { assert } from 'chai';
import { config } from './config';

function assertNotNull<T>(value: T | null | undefined, message: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

describe("wusd-stablecoin", () => {
  // 状态变量
  let state: PublicKey;
  let wusdMint: PublicKey;
  let collateralMint: PublicKey;
  let treasury: PublicKey;
  let userWusd: PublicKey;
  let userCollateral: PublicKey;
  let stakeAccount: PublicKey;
  let softStakeAccount: PublicKey;
  let stakeVault: PublicKey;
  let program: Program<WusdStablecoin>;
  let provider: AnchorProvider;
  let authority: any;
  let mintAuthority: anchor.web3.Keypair;

  // 重试配置
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  // 工具函数：重试机制
  async function retry<T>(fn: () => Promise<T>, retries = MAX_RETRIES, delay = RETRY_DELAY): Promise<T> {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        console.log(`重试尝试 ${i + 1}/${retries} 失败:`, error.message);
        
        if (error.message?.includes("State account not found")) {
          console.log("检查状态账户...");
          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
            continue;
          }
        }
        
        if (error.error?.errorCode?.code === "Unauthorized" ||
            error.error?.errorCode?.code === "StakingAmountTooLow") {
          console.log("遇到不可重试的错误，终止重试");
          throw error;
        }
        
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
    }
    throw lastError;
  }

  // 工具函数：创建代币账户
  async function createTokenAccount(
    mint: PublicKey,
    owner: PublicKey,
    name: string
  ): Promise<PublicKey> {
    console.log(`创建${name}账户`);
    const account = await getAssociatedTokenAddress(mint, owner);
    const ix = await createAssociatedTokenAccountInstruction(
      authority.publicKey,
      account,
      owner,
      mint
    );
    await provider.sendAndConfirm(new anchor.web3.Transaction().add(ix));
    return account;
  }

  before(async () => {
    // 初始化连接和程序
    const connection = new Connection(config.rpcUrl, config.connectionConfig);
    const wallet = new anchor.Wallet(
      anchor.web3.Keypair.fromSecretKey(
        Buffer.from(JSON.parse(fs.readFileSync(config.deployKeyPath, 'utf-8')))
      )
    );
    provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    anchor.setProvider(provider);

    const programId = new anchor.web3.PublicKey('3JmdookeJY96JsRnnN1C68qLiKmqrw6LuEhK9yhdKfWJ');
    // 定义账户和类型
const stateAccountType = {
    name: 'StateAccount',
    docs: ['WUSD稳定币系统状态账户'],
    type: {
        kind: 'struct',
        fields: [
            { name: 'authority', type: 'publicKey' },
            { name: 'wusdMint', type: 'publicKey' },
            { name: 'collateralMint', type: 'publicKey' },
            { name: 'treasury', type: 'publicKey' },
            { name: 'totalSupply', type: 'u64' },
            { name: 'decimals', type: 'u8' },
            { name: 'paused', type: 'bool' },
            { name: 'totalStaked', type: 'u64' },
            { name: 'rewardRate', type: 'u64' },
            { name: 'lastUpdateTime', type: 'i64' },
            { name: 'tokenWhitelist', type: { vec: { defined: 'TokenConfig' } } },
            { name: 'exchangeRates', type: { vec: { defined: 'ExchangeRate' } } }
        ]
    }
};

const tokenConfigType = {
    name: 'TokenConfig',
    type: {
        kind: 'struct',
        fields: [
            { name: 'mint', type: 'publicKey' },
            { name: 'enabled', type: 'bool' }
        ]
    }
};

const rateType = {
    name: 'Rate',
    type: {
        kind: 'struct',
        fields: [
            { name: 'input', type: 'u64' },
            { name: 'output', type: 'u64' }
        ]
    }
};

const exchangeRateType = {
    name: 'ExchangeRate',
    type: {
        kind: 'struct',
        fields: [
            { name: 'tokenIn', type: 'publicKey' },
            { name: 'tokenOut', type: 'publicKey' },
            { name: 'rate', type: { defined: 'Rate' } }
        ]
    }
};

// 加载和修改IDL
const rawIdl = fs.readFileSync('./target/idl/wusd_stablecoin.json', 'utf-8');
const idl = JSON.parse(rawIdl);

// 确保 IDL 包含所有必要的字段
if (!idl.accounts) idl.accounts = [];
if (!idl.types) idl.types = [];
if (!idl.events) idl.events = [];
if (!idl.errors) idl.errors = [];

// 添加类型定义到IDL
if (!idl.types.find(t => t.name === 'TokenConfig')) idl.types.push(tokenConfigType);
if (!idl.types.find(t => t.name === 'Rate')) idl.types.push(rateType);
if (!idl.types.find(t => t.name === 'ExchangeRate')) idl.types.push(exchangeRateType);
if (!idl.accounts.find(a => a.name === 'StateAccount')) idl.accounts.push(stateAccountType);

// 如果账户定义不存在，则添加
if (!idl.accounts.find(a => a.name === 'StateAccount')) {
    idl.accounts.push(stateAccountType);
}

try {
    program = new anchor.Program(idl, programId, provider);
    authority = provider.wallet;
} catch (e) {
    console.error('Error loading IDL:', e);
    throw e;
}
    program = new anchor.Program(idl, programId, provider) as Program<WusdStablecoin>;
    authority = provider.wallet;
    mintAuthority = anchor.web3.Keypair.generate();

    assertNotNull(program, "程序未正确初始化");
    assertNotNull(program.programId, "程序ID未正确初始化");

    try {
      await retry(async () => {
        // 初始化状态账户
        const [statePda] = await PublicKey.findProgramAddress(
          [Buffer.from(config.seeds.state)],
          program.programId
        );
        state = statePda;

        // 检查状态账户是否存在
        const stateInfo = await provider.connection.getAccountInfo(state);
        if (stateInfo) {
          console.log("使用现有状态账户");
          const stateData = await program.account.stateAccount.fetch(state);
          assertNotNull(stateData, "状态账户数据为空");

          // 设置现有账户信息
          wusdMint = stateData.wusdMint;
          collateralMint = stateData.collateralMint;
          treasury = stateData.treasury;
          
          // 初始化用户账户
          userWusd = await getAssociatedTokenAddress(wusdMint, provider.wallet.publicKey);
          userCollateral = await getAssociatedTokenAddress(collateralMint, provider.wallet.publicKey);
          
          // 初始化质押相关账户
          [stakeAccount] = await PublicKey.findProgramAddress(
            [Buffer.from("stake_account"), authority.publicKey.toBuffer()],
            program.programId
          );
          
          [softStakeAccount] = await PublicKey.findProgramAddress(
            [Buffer.from("soft_stake_account"), authority.publicKey.toBuffer()],
            program.programId
          );
          
          [stakeVault] = await PublicKey.findProgramAddress(
            [Buffer.from("stake_vault")],
            program.programId
          );
          
          return;
        }

        // 创建新的状态账户和初始化协议
        console.log("创建新状态账户并初始化协议...");
        const wusdMintKeypair = anchor.web3.Keypair.generate();
        const collateralMintKeypair = anchor.web3.Keypair.generate();
        
        // 创建代币铸造账户
        await createMint(
          provider.connection,
          authority.payer,
          authority.publicKey,
          authority.publicKey,
          config.wusdDecimals,
          wusdMintKeypair
        );

        await createMint(
          provider.connection,
          authority.payer,
          authority.publicKey,
          authority.publicKey,
          config.collateralDecimals,
          collateralMintKeypair
        );

        // 创建资金库账户
        const treasuryAta = await getAssociatedTokenAddress(
          collateralMintKeypair.publicKey,
          authority.publicKey
        );

        const createTreasuryIx = await createAssociatedTokenAccountInstruction(
          authority.publicKey,
          treasuryAta,
          authority.publicKey,
          collateralMintKeypair.publicKey
        );

        await provider.sendAndConfirm(new anchor.web3.Transaction().add(createTreasuryIx));

        // 计算状态账户空间
        const space = 8 + // discriminator
                      32 + // authority
                      32 + // wusd_mint
                      32 + // collateral_mint
                      32 + // treasury
                      8 + // total_supply
                      1 + // decimals
                      1 + // paused
                      8 + // total_staked
                      8 + // reward_rate
                      8 + // last_update_time
                      8 + // emergency_withdraw_penalty
                      8 + // emergency_cooldown_duration
                      1 + // collateral_decimals
                      1 + // wusd_decimals
                      (32 + 1) * 3 + // token_whitelist
                      (32 + 32 + 16) * 3 + // exchange_rates
                      8; // total_staking_plans

        const lamports = await provider.connection.getMinimumBalanceForRentExemption(space);
        const stateKeypair = anchor.web3.Keypair.generate();
        const createStateAccountIx = SystemProgram.createAccount({
          fromPubkey: authority.publicKey,
          newAccountPubkey: stateKeypair.publicKey,
          lamports,
          space,
          programId: program.programId,
        });

        // 初始化协议
        await program.methods.initialize(config.wusdDecimals)
          .accounts({
            authority: authority.publicKey,
            stateAccount: stateKeypair.publicKey,
            wusdMint: wusdMintKeypair.publicKey,
            collateralMint: collateralMintKeypair.publicKey,
            treasury: treasuryAta,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .preInstructions([createStateAccountIx])
          .signers([authority.payer, stateKeypair])
          .rpc({ commitment: 'confirmed' });

        // 更新状态变量
        state = stateKeypair.publicKey;
        wusdMint = wusdMintKeypair.publicKey;
        collateralMint = collateralMintKeypair.publicKey;
        treasury = treasuryAta;

        // 创建用户代币账户
        userWusd = await createTokenAccount(wusdMint, provider.wallet.publicKey, "用户WUSD");
        userCollateral = await createTokenAccount(collateralMint, provider.wallet.publicKey, "用户抵押品");

        // 初始化质押账户
        [stakeAccount] = await PublicKey.findProgramAddress(
          [Buffer.from("stake_account"), authority.publicKey.toBuffer()],
          program.programId
        );

        [softStakeAccount] = await PublicKey.findProgramAddress(
          [Buffer.from("soft_stake_account"), authority.publicKey.toBuffer()],
          program.programId
        );

        [stakeVault] = await PublicKey.findProgramAddress(
          [Buffer.from("stake_vault")],
          program.programId
        );

        await program.methods.initializeStakeAccount()
          .accounts({
            user: authority.publicKey,
            stakeAccount,
            stateAccount: state,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        return true;
      });
    } catch (e) {
      console.error("设置错误:", e);
      throw e;
    }
  });

  describe("协议初始化", () => {
    it("成功初始化协议", async () => {
      const stateInfo = await provider.connection.getAccountInfo(state);
      assert(stateInfo !== null, "状态账户未创建");
      
      const stateData = await program.account.stateAccount.fetch(state);
      assert(stateData.wusdMint.equals(wusdMint), "WUSD铸造账户不匹配");
      assert(stateData.collateralMint.equals(collateralMint), "抵押品铸造账户不匹配");
      assert(stateData.treasury.equals(treasury), "资金库账户不匹配");
    });
  });

  describe("代币操作", () => {
    it("成功执行代币互换（带滑点保护）", async () => {
      const amount = new anchor.BN(config.swapAmount);
      const minAmountOut = new anchor.BN(config.swapMinAmountOut);
      
      // 铸造抵押代币用于测试
      const mintTx = new anchor.web3.Transaction().add(
        await mintTo(
          provider.connection,
          provider.wallet.payer,
          collateralMint,
          userCollateral,
          mintAuthority.publicKey,
          amount.toNumber()
        )
      );
      await provider.sendAndConfirm(mintTx, [mintAuthority]);

      // 执行代币互换
      const beforeBalance = await provider.connection.getTokenAccountBalance(userWusd);
      
      await program.methods.swap(amount, minAmountOut)
        .accounts({
          user: authority.publicKey,
          userTokenIn: userCollateral,
          userTokenOut: userWusd,
          tokenProgram: TOKEN_PROGRAM_ID,
          state,
          wusdMint,
          usdcMint: collateralMint,
          treasury
        })
        .signers([authority.payer])
        .rpc();

      // 验证余额变化
      const afterBalance = await provider.connection.getTokenAccountBalance(userWusd);
      assert(afterBalance.value.uiAmount! > beforeBalance.value.uiAmount!, "互换后余额未增加");
    });
  });

  describe("质押操作", () => {
    it("成功质押WUSD代币", async () => {
      const amount = new anchor.BN(config.stakeAmount);
      const stakingPoolId = new anchor.BN(config.stakingPoolId);
      
      // 铸造WUSD代币用于测试
      const mintTx = new anchor.web3.Transaction().add(
        await mintTo(
          provider.connection,
          provider.wallet.payer,
          wusdMint,
          userWusd,
          mintAuthority.publicKey,
          amount.toNumber()
        )
      );
      await provider.sendAndConfirm(mintTx, [mintAuthority]);

      // 执行质押操作
      const beforeStakeBalance = await provider.connection.getTokenAccountBalance(userWusd);
      
      await program.methods.stake(amount, stakingPoolId)
        .accounts({
          user: authority.publicKey,
          userWusd,
          stakeAccount,
          stakeVault,
          state,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([authority.payer])
        .rpc();

      // 验证余额变化
      const afterStakeBalance = await provider.connection.getTokenAccountBalance(userWusd);
      assert(afterStakeBalance.value.uiAmount! < beforeStakeBalance.value.uiAmount!, "质押后余额未减少");

      // 验证质押账户状态
      const stakeAccountData = await program.account.stakeAccount.fetch(stakeAccount);
      assert(stakeAccountData.totalStaked.toNumber() > 0, "质押金额未更新");
    });

    it("成功领取质押奖励", async () => {
      // 等待一段时间以累积奖励
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 记录领取前的余额
      const beforeClaimBalance = await provider.connection.getTokenAccountBalance(userWusd);
      
      await program.methods.claim()
        .accounts({
          user: authority.publicKey,
          stakeAccount,
          userWusd,
          state,
          wusdMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([authority.payer])
        .rpc();

      // 验证余额变化
      const afterClaimBalance = await provider.connection.getTokenAccountBalance(userWusd);
      assert(afterClaimBalance.value.uiAmount! > beforeClaimBalance.value.uiAmount!, "领取奖励后余额未增加");
    });

    it("成功执行紧急提现", async () => {
      try {
        const withdrawAmount = new anchor.BN(config.withdrawAmount);
        
        // 记录提现前的余额
        const beforeWithdrawBalance = await provider.connection.getTokenAccountBalance(userWusd);
        
        await program.methods.emergencyWithdraw(withdrawAmount)
          .accounts({
            user: authority.publicKey,
            stakeAccount,
            userWusd,
            stakeVault,
            stateAccount: state,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([authority.payer])
          .rpc();

        // 验证余额变化
        const afterWithdrawBalance = await provider.connection.getTokenAccountBalance(userWusd);
        assert(afterWithdrawBalance.value.uiAmount! > beforeWithdrawBalance.value.uiAmount!, "紧急提现后余额未增加");

        // 验证质押账户状态更新
        const stakeAccountData = await program.account.stakeAccount.fetch(stakeAccount);
        assert(stakeAccountData.totalStaked.toNumber() < beforeWithdrawBalance.value.amount, "质押金额未正确更新");
      } catch (e) {
        console.error("紧急提现错误:", e);
        throw e;
      }
    });
  });
});