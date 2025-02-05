import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { WusdStablecoin } from "../target/types/wusd_stablecoin";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, mintTo, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import * as fs from 'fs';
import { config } from './config';
import { newAccountWithLamports } from './util/new-account-with-lamports';

describe("WUSD Stablecoin", () => {
  // 最大重试次数
  const MAX_RETRIES = 3;
  // 重试延迟（毫秒）
  const RETRY_DELAY = 1000;

  // 重试函数
  async function retry<T>(fn: () => Promise<T>, retries = MAX_RETRIES, delay = RETRY_DELAY): Promise<T> {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        console.log(`重试尝试 ${i + 1}/${retries} 失败:`, error.message);
        
        // 检查是否是不可重试的错误
        if (error.error?.errorCode?.code === "Unauthorized" ||
            error.error?.errorCode?.code === "StakingAmountTooLow" ||
            error.error?.errorCode?.code === "InsufficientFunds" ||
            error.error?.errorCode?.code === "InvalidAmount" ||
            error.error?.errorCode?.code === "AccountNotInitialized") {
          console.log("遇到不可重试的错误，立即终止重试");
          throw error;
        }
        
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
    }
    throw lastError;
  }

  // 配置程序提供者
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = (provider.wallet as anchor.Wallet).payer;

  // 加载和验证程序IDL
  const loadAndValidateIdl = () => {
    try {
      const idl = JSON.parse(fs.readFileSync('./target/idl/wusd_stablecoin.json', 'utf8'));
      
      // 确保accounts数组存在
      if (!idl.accounts) {
        idl.accounts = [];
      }

      // 为每个账户设置默认的size属性
      idl.accounts = idl.accounts.map(account => ({
        ...account,
        size: 200,  // 设置一个默认的账户大小
        type: account.type || { kind: 'struct', fields: [] }
      }));

      // 定义必要的账户配置
      const accountConfigs = {
        'State': {
          discriminator: [101, 165, 7, 10, 40, 166, 251, 159],
          size: 200,
          type: { kind: 'struct', fields: [] }
        },
        'StakeAccount': {
          discriminator: [80, 158, 67, 124, 50, 189, 192, 255],
          size: 200,
          type: { kind: 'struct', fields: [] }
        },
        'SoftStakeAccount': {
          discriminator: [101, 165, 7, 10, 40, 166, 251, 159],
          size: 200,
          type: { kind: 'struct', fields: [] }
        }
      };

      // 更新或添加账户配置
      idl.accounts = idl.accounts.map(account => {
        const config = accountConfigs[account.name];
        if (config) {
          return {
            ...account,
            ...config
          };
        }
        return account;
      });

      // 添加缺失的账户
      Object.entries(accountConfigs).forEach(([name, config]) => {
        if (!idl.accounts.find(a => a.name === name)) {
          idl.accounts.push({
            name,
            ...config
          });
        }
      });
      
      // 确保accounts数组存在
      if (!idl.accounts) {
        idl.accounts = [];
      }

      // 为每个账户设置默认的size属性
      idl.accounts = idl.accounts.map(account => ({
        ...account,
        size: 200,  // 设置一个默认的账户大小
        type: account.type || { kind: 'struct', fields: [] }
      }));
      
      // 确保所有必要的账户都存在并具有正确的配置
      for (const [name, config] of Object.entries(accountConfigs)) {
        let account = idl.accounts.find(a => a.name === name);
        if (!account) {
          account = {
            name,
            discriminator: config.discriminator,
            type: { kind: 'struct', fields: [] },
            size: config.size
          };
          idl.accounts.push(account);
        } else {
          // 更新现有账户的配置
          account.discriminator = account.discriminator || config.discriminator;
          account.size = account.size || config.size;
          account.type = account.type || { kind: 'struct', fields: [] };
        }
      }
      
      return idl;
    } catch (error) {
      console.error('加载或验证IDL时出错:', error);
      throw new Error('IDL加载失败');
    }
  };

  // 初始化程序
  const initializeProgram = () => {
    try {
      // 直接从文件加载IDL
      const rawIdl = JSON.parse(fs.readFileSync('./target/idl/wusd_stablecoin.json', 'utf8'));
      
      // 确保accounts数组存在
      if (!rawIdl.accounts) {
        rawIdl.accounts = [];
      }

      // 为每个账户添加必要的属性
      rawIdl.accounts = rawIdl.accounts.map(account => ({
        ...account,
        size: 200,
        type: { kind: 'struct', fields: [] }
      }));

      const programId = new anchor.web3.PublicKey('3JmdookeJY96JsRnnN1C68qLiKmqrw6LuEhK9yhdKfWJ');
      const program = new anchor.Program(rawIdl, programId, provider) as Program<WusdStablecoin>;
      
      if (!program || !program.programId) {
        throw new Error('程序初始化失败');
      }
      
      if (!program.account || !program.account.state) {
        throw new Error('程序状态账户初始化失败');
      }
      
      return program;
    } catch (error) {
      console.error('初始化程序时出错:', error);
      throw error;
    }
  };

  const program = initializeProgram();
  const mintAuthority = anchor.web3.Keypair.generate();

  let wusdMint: PublicKey;
  let collateralMint: PublicKey;
  let treasury: PublicKey;
  let state: PublicKey;
  let userWusd: PublicKey;
  let userCollateral: PublicKey;
  let softStakeAccount: PublicKey;
  let stakeVault: PublicKey;
  let stakeAccount: PublicKey;

  beforeEach(async () => {
    try {
      // 使用newSystemAccountWithAirdrop创建测试账户并获取SOL
      const testAccount = await newAccountWithLamports(
        provider.connection,
        1000000000 // 1 SOL
      );
      console.log('测试账户创建成功:', testAccount.publicKey.toString());
  
      // 初始化stakeAccount
      const [stakeAccountPda] = await PublicKey.findProgramAddress(
        [Buffer.from("stake_account"), testAccount.publicKey.toBuffer()],
        program.programId
      );
      stakeAccount = stakeAccountPda;

      // 初始化softStakeAccount
      const [softStakeAccountPda] = await PublicKey.findProgramAddress(
        [Buffer.from("soft_stake_account"), testAccount.publicKey.toBuffer()],
        program.programId
      );
      softStakeAccount = softStakeAccountPda;

      // 获取状态PDA
      const [statePda] = await PublicKey.findProgramAddress(
        [Buffer.from(config.seeds.state)],
        program.programId
      );
      state = statePda;

      // 检查状态账户
      let stateAccountInfo = await provider.connection.getAccountInfo(state);
      if (!stateAccountInfo || stateAccountInfo.data.length === 0) {
        // 创建代币铸造账户
        wusdMint = await createMint(
          provider.connection,
          testAccount,
          mintAuthority.publicKey,
          mintAuthority.publicKey,
          config.wusdDecimals
        );

        collateralMint = await createMint(
          provider.connection,
          testAccount,
          mintAuthority.publicKey,
          mintAuthority.publicKey,
          config.collateralDecimals
        );

        console.log('铸币账户创建成功');

        // 创建用户代币账户
        [userWusd, userCollateral] = await Promise.all([
          getAssociatedTokenAddress(wusdMint, testAccount.publicKey),
          getAssociatedTokenAddress(collateralMint, testAccount.publicKey)
        ]);

        const createUserAccountsIx = [
          createAssociatedTokenAccountInstruction(
            testAccount.publicKey,
            userWusd,
            testAccount.publicKey,
            wusdMint
          ),
          createAssociatedTokenAccountInstruction(
            testAccount.publicKey,
            userCollateral,
            testAccount.publicKey,
            collateralMint
          )
        ];

        const setupTx = new anchor.web3.Transaction().add(...createUserAccountsIx);
        await provider.sendAndConfirm(setupTx, [testAccount]);
        console.log('用户代币账户创建成功');

        // 创建并初始化PDA
        const [vaultPda] = await PublicKey.findProgramAddress(
          [Buffer.from(config.seeds.stakeVault)],
          program.programId
        );

        const [treasuryPda] = await PublicKey.findProgramAddress(
          [Buffer.from(config.seeds.treasury)],
          program.programId
        );

        [stakeVault, treasury] = await Promise.all([
          getAssociatedTokenAddress(wusdMint, vaultPda, true),
          getAssociatedTokenAddress(collateralMint, treasuryPda, true)
        ]);

        const createPdaAccountsIx = [
          createAssociatedTokenAccountInstruction(
            testAccount.publicKey,
            stakeVault,
            vaultPda,
            wusdMint
          ),
          createAssociatedTokenAccountInstruction(
            testAccount.publicKey,
            treasury,
            treasuryPda,
            collateralMint
          )
        ];

        const pdaAccountsTx = new anchor.web3.Transaction().add(...createPdaAccountsIx);
        await provider.sendAndConfirm(pdaAccountsTx, [testAccount]);
        console.log('PDA代币账户创建成功');

        // 初始化协议状态
        let tx = await program.methods
          .initialize(config.wusdDecimals)
          .accounts({
            authority: testAccount.publicKey,
            state,
            wusdMint,
            collateralMint,
            treasury,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([testAccount])
          .rpc();

        await provider.connection.confirmTransaction(tx, 'confirmed');
        console.log('协议状态初始化成功');
      } else {
        console.log('状态账户已存在，加载现有配置...');
        const stateAccount = await program.account.state.fetch(state);
        wusdMint = stateAccount.wusdMint;
        collateralMint = stateAccount.collateralMint;

        // 获取用户代币账户
        [userWusd, userCollateral] = await Promise.all([
          getAssociatedTokenAddress(wusdMint, provider.wallet.publicKey),
          getAssociatedTokenAddress(collateralMint, provider.wallet.publicKey)
        ]);

        // 获取PDA账户
        const [vaultPda] = await PublicKey.findProgramAddress(
          [Buffer.from(config.seeds.stakeVault)],
          program.programId
        );

        const [treasuryPda] = await PublicKey.findProgramAddress(
          [Buffer.from(config.seeds.treasury)],
          program.programId
        );

        [stakeVault, treasury] = await Promise.all([
          getAssociatedTokenAddress(wusdMint, vaultPda, true),
          getAssociatedTokenAddress(collateralMint, treasuryPda, true)
        ]);
      }
    } catch (e) {
      console.error('设置过程发生错误:', e);
      throw e;
    }
  });

  describe("Protocol Initialization", () => {
    it("Successfully initializes the protocol", async () => {
      const stateAccount = await program.account.state.fetch(state);
      expect(stateAccount.wusdMint.equals(wusdMint)).to.be.true;
      expect(stateAccount.collateralMint.equals(collateralMint)).to.be.true;
    });
  });

  describe("Token Operations", () => {
    it("Successfully swaps tokens with slippage protection", async () => {
      try {
        await retry(async () => {
          const amount = new anchor.BN(config.swapAmount);
          const minAmountOut = new anchor.BN(config.swapMinAmountOut);
          
          // 铸造测试代币
          await mintTo(
            provider.connection,
            provider.wallet.payer,
            collateralMint,
            userCollateral,
            mintAuthority,
            config.swapAmount
          );
  
          // 执行代币兑换
          const tx = await program.methods
            .swap(amount, minAmountOut)
            .accounts({
              user: provider.wallet.publicKey,
              userCollateral,
              userWusd,
              state,
              treasury,
              wusdMint,
              tokenProgram: TOKEN_PROGRAM_ID,
            })
            .rpc();
  
          await provider.connection.confirmTransaction(tx, 'confirmed');
          return true;
        });
      } catch (e) {
        console.error('交换操作失败:', e);
        throw e;
      }
    });
  
    it("Successfully stakes tokens", async () => {
      try {
        await retry(async () => {
          const amount = new anchor.BN(config.stakeAmount);
          
          // 铸造测试代币
          await mintTo(
            provider.connection,
            provider.wallet.payer,
            wusdMint,
            userWusd,
            mintAuthority,
            config.stakeAmount
          );
  
          // 执行质押
          const tx = await program.methods
            .stake(amount)
            .accounts({
              user: provider.wallet.publicKey,
              userWusd,
              stakeAccount,
              stakeVault,
              state,
              systemProgram: SystemProgram.programId,
              tokenProgram: TOKEN_PROGRAM_ID,
            })
            .rpc();
  
          await provider.connection.confirmTransaction(tx, 'confirmed');
          return true;
        });
      } catch (e) {
        console.error('质押操作失败:', e);
        throw e;
      }
    });
  
    it("Successfully performs soft stake", async () => {
      try {
        await retry(async () => {
          const amount = new anchor.BN(config.stakeAmount);
          
          // 铸造测试代币
          await mintTo(
            provider.connection,
            provider.wallet.payer,
            wusdMint,
            userWusd,
            mintAuthority,
            config.stakeAmount
          );
  
          // 执行软质押
          const tx = await program.methods
            .softStake(amount)
            .accounts({
              user: provider.wallet.publicKey,
              userWusd,
              stakeAccount: softStakeAccount,
              stakeVault,
              state,
              systemProgram: SystemProgram.programId,
              tokenProgram: TOKEN_PROGRAM_ID,
            })
            .rpc();
  
          await provider.connection.confirmTransaction(tx, 'confirmed');
          return true;
        });
      } catch (e) {
        console.error('软质押操作失败:', e);
        throw e;
      }
    });
  
    it("Successfully withdraws tokens", async () => {
      try {
        await retry(async () => {
          const amount = new anchor.BN(config.withdrawAmount);
          
          // 执行提现
          const tx = await program.methods
            .withdraw(amount, false)
            .accounts({
              user: provider.wallet.publicKey,
              userWusd,
              stakeVault,
              stakeAccount,
              state,
              tokenProgram: TOKEN_PROGRAM_ID,
            })
            .rpc();
  
          await provider.connection.confirmTransaction(tx, 'confirmed');
          return true;
        });
      } catch (e) {
        console.error('提现操作失败:', e);
        throw e;
      }
    });
  
    it("Successfully performs emergency withdraw", async () => {
      try {
        await retry(async () => {
          const amount = new anchor.BN(config.withdrawAmount);
          
          // 执行紧急提现
          const tx = await program.methods
            .withdraw(amount, true)
            .accounts({
              user: provider.wallet.publicKey,
              userWusd,
              stakeVault,
              stakeAccount,
              state,
              tokenProgram: TOKEN_PROGRAM_ID,
            })
            .rpc();
  
          await provider.connection.confirmTransaction(tx, 'confirmed');
          return true;
        });
      } catch (e) {
        console.error('紧急提现操作失败:', e);
        throw e;
      }
    });
  });
});
