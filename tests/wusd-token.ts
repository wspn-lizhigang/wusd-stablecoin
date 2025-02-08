import * as anchor from "@coral-xyz/anchor"; 
import { Program, BN } from "@coral-xyz/anchor";
import { WusdToken } from "../target/types/wusd_token";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  MintLayout,
} from "@solana/spl-token";
import { config } from "./wusd-token-config";
import { expect } from "chai";

describe("WUSD Token", () => {
  let provider: anchor.AnchorProvider;
  let program: Program<WusdToken>;
  let payer: anchor.web3.Keypair;
  let fundedAccount: Keypair;
  let connection: anchor.web3.Connection;
  let collateralMint: PublicKey;

  before("全局初始化", async function () {
    this.timeout(30000);

    // 增强版环境检查
    const requiredEnvVars = ["ANCHOR_PROVIDER_URL", "ANCHOR_WALLET"];
    requiredEnvVars.forEach((env) => {
      if (!process.env[env]) throw new Error(`缺少环境变量 ${env}`);
    });

    // 分步初始化
    connection = new anchor.web3.Connection(
      process.env.ANCHOR_PROVIDER_URL!,
      "confirmed"
    );

    // 显式加载钱包
    payer = Keypair.generate();
    const wallet = new anchor.Wallet(payer);
    provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    anchor.setProvider(provider);

    // 程序初始化
    program = anchor.workspace.WusdToken as Program<WusdToken>;
  });

  // 初始化PDA（添加mint和pause状态）
  let statePda: PublicKey;
  let authorityPda: PublicKey;
  let mintStatePda: PublicKey;
  let pauseStatePda: PublicKey;
  let accessRegistryPda: PublicKey;
  let wusdMint: PublicKey;
  let mintKeypair: Keypair;

  // 余额检查函数
  async function checkBalance(account: PublicKey, label: string) {
    const balance = await provider.connection.getBalance(account);
    console.log(`[${label}] 余额检查: ${balance} lamports`);
    return balance;
  }

  beforeEach(async function () {
    this.timeout(60000); // 60秒超时
    console.log("当前程序ID:", program.programId.toString());

    // 生成资金账户
    fundedAccount = await (async () => {
      const account = Keypair.generate();
      // 空投操作（增加重试机制）
      let retries = 3;
      while (retries-- > 0) {
        try {
          // 请求空投
          const airdropSig = await provider.connection.requestAirdrop(
            account.publicKey,
            anchor.web3.LAMPORTS_PER_SOL * 100
          );

          // 等待确认并重试
          let confirmRetries = 5;
          while (confirmRetries > 0) {
            try {
              const { blockhash, lastValidBlockHeight } =
                await provider.connection.getLatestBlockhash("confirmed");
              await provider.connection.confirmTransaction(
                {
                  signature: airdropSig,
                  blockhash,
                  lastValidBlockHeight,
                },
                "confirmed"
              );

              // 等待更长时间确保资金到账
              await new Promise((resolve) => setTimeout(resolve, 10000));

              // 验证余额
              const currentBalance = await provider.connection.getBalance(
                account.publicKey
              );
              if (currentBalance >= anchor.web3.LAMPORTS_PER_SOL * 100) {
                // 再次等待确保交易完全确认
                await new Promise((resolve) => setTimeout(resolve, 5000));
                const finalBalance = await provider.connection.getBalance(
                  account.publicKey
                );
                if (finalBalance >= currentBalance) {
                  console.log(`空投成功，最终余额: ${finalBalance} lamports`);
                  return account;
                }
              }
              throw new Error("空投资金未完全到账");
            } catch (error) {
              console.log(`确认空投失败，剩余重试次数: ${confirmRetries}`);
              confirmRetries--;
              if (confirmRetries === 0) throw error;
              await new Promise((resolve) => setTimeout(resolve, 5000));
            }
          }
        } catch (error) {
          console.error(`空投失败，剩余重试次数: ${retries}`, error);
          if (retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        }
      }
      throw new Error("空投操作失败");
    })();

    console.log("操作钱包地址:", fundedAccount.publicKey.toString());

    // 更新provider和program
    provider = new anchor.AnchorProvider(
      provider.connection,
      new anchor.Wallet(fundedAccount),
      { commitment: "confirmed" }
    );
    anchor.setProvider(provider);
    program = anchor.workspace.WusdToken as Program<WusdToken>;

    // 初始化PDA
    initializePdas();
    console.log("当前RPC节点:", provider.connection.rpcEndpoint);

    // 更新provider和program
    provider = new anchor.AnchorProvider(
      provider.connection,
      new anchor.Wallet(fundedAccount),
      { commitment: "confirmed" }
    );
    anchor.setProvider(provider);
    program = anchor.workspace.WusdToken as Program<WusdToken>;

    // 初始化PDA
    initializePdas();
    console.log("当前RPC节点:", provider.connection.rpcEndpoint);
    // 初始化Mint密钥对
    mintKeypair = Keypair.generate();
    wusdMint = mintKeypair.publicKey;
    console.log("新Mint地址:", wusdMint.toString());
    const mintRent = await connection.getMinimumBalanceForRentExemption(
      MintLayout.span
    );
    console.log("Mint账户参数:", {
      decimals: config.wusdDecimals,
      mintAuthority: authorityPda.toString(),
      rent: mintRent,
    });

    // 创建WUSD Mint账户
    const createMintAccountTx = new anchor.web3.Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: fundedAccount.publicKey,
        newAccountPubkey: wusdMint,
        space: MintLayout.span,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,
      })
    );

    await sendAndConfirmWithRetry(
      provider,
      createMintAccountTx,
      [fundedAccount, mintKeypair],
      "创建Mint账户"
    );

    // 初始化WUSD Mint
    const initMintTx = new anchor.web3.Transaction().add(
      createInitializeMintInstruction(
        wusdMint,
        config.wusdDecimals,
        authorityPda,
        authorityPda
      )
    );
    await sendAndConfirmWithRetry(
      provider,
      initMintTx,
      [fundedAccount],
      "初始化Mint"
    );

    // 记录Mint账户创建的成本
    const initialBalance = await checkBalance(
      fundedAccount.publicKey,
      "创建Mint前"
    );
    const finalBalance = await provider.connection.getBalance(
      fundedAccount.publicKey
    );

    // 初始化抵押代币Mint
    const collateralMintKeypair = Keypair.generate();
    collateralMint = collateralMintKeypair.publicKey;
    console.log("抵押代币Mint地址:", collateralMint.toString());

    // 创建抵押代币Mint账户
    const createCollateralAccountTx = new anchor.web3.Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: fundedAccount.publicKey,
        newAccountPubkey: collateralMint,
        space: MintLayout.span,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,
      })
    );

    await sendAndConfirmWithRetry(
      provider,
      createCollateralAccountTx,
      [fundedAccount, collateralMintKeypair],
      "创建抵押代币Mint账户"
    );

    // 初始化抵押代币Mint
    const initCollateralMintTx = new anchor.web3.Transaction().add(
      createInitializeMintInstruction(
        collateralMint,
        config.wusdDecimals,
        authorityPda,
        authorityPda
      )
    );
    await sendAndConfirmWithRetry(
      provider,
      initCollateralMintTx,
      [fundedAccount],
      "初始化抵押代币Mint"
    );

    // 生成资金账户
    fundedAccount = await (async () => {
      const account = Keypair.generate();
      // 空投操作（增加重试机制）
      let retries = 3;
      while (retries-- > 0) {
        try {
          // 请求空投
          const airdropSig = await provider.connection.requestAirdrop(
            account.publicKey,
            anchor.web3.LAMPORTS_PER_SOL * 100
          );

          // 等待确认并重试
          let confirmRetries = 5;
          while (confirmRetries > 0) {
            try {
              const { blockhash, lastValidBlockHeight } =
                await provider.connection.getLatestBlockhash("confirmed");
              await provider.connection.confirmTransaction(
                {
                  signature: airdropSig,
                  blockhash,
                  lastValidBlockHeight,
                },
                "confirmed"
              );

              // 等待更长时间确保资金到账
              await new Promise((resolve) => setTimeout(resolve, 10000));

              // 验证余额
              const currentBalance = await provider.connection.getBalance(
                account.publicKey
              );
              if (currentBalance >= anchor.web3.LAMPORTS_PER_SOL * 100) {
                // 再次等待确保交易完全确认
                await new Promise((resolve) => setTimeout(resolve, 5000));
                const finalBalance = await provider.connection.getBalance(
                  account.publicKey
                );
                if (finalBalance >= currentBalance) {
                  console.log(`空投成功，最终余额: ${finalBalance} lamports`);
                  return account;
                }
              }
              throw new Error("空投资金未完全到账");
            } catch (error) {
              console.log(`确认空投失败，剩余重试次数: ${confirmRetries}`);
              confirmRetries--;
              if (confirmRetries === 0) throw error;
              await new Promise((resolve) => setTimeout(resolve, 5000));
            }
          }
        } catch (error) {
          console.error(`空投失败，剩余重试次数: ${retries}`, error);
          if (retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        }
      }
      throw new Error("空投操作失败");
    })();

    console.log("操作钱包地址:", fundedAccount.publicKey.toString());

    // 更新provider和program
    provider = new anchor.AnchorProvider(
      provider.connection,
      new anchor.Wallet(fundedAccount),
      { commitment: "confirmed" }
    );
    anchor.setProvider(provider);
    program = anchor.workspace.WusdToken as Program<WusdToken>;
  });

  // 增强版交易发送函数
  async function sendAndConfirmWithRetry(
    provider: anchor.AnchorProvider,
    tx: anchor.web3.Transaction,
    signers: anchor.web3.Signer[],
    label: string
  ) {
    let retry = 3;
    while (retry-- > 0) {
      try {
        console.log(`[${label}] 发送交易...`);

        // 获取最新区块哈希
        const { blockhash, lastValidBlockHeight } =
          await provider.connection.getLatestBlockhash("confirmed");
        console.log(
          `blockhash: ${blockhash},最新区块高度: ${lastValidBlockHeight}`
        );

        // 设置交易参数
        tx.recentBlockhash = blockhash;
        tx.lastValidBlockHeight = lastValidBlockHeight;
        tx.feePayer = fundedAccount.publicKey;

        // 所有签名者签名
        tx.sign(...signers);

        // 发送交易
        const txId = await provider.connection.sendTransaction(tx, signers, {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        });

        // 等待确认
        await provider.connection.confirmTransaction(
          {
            signature: txId,
            blockhash,
            lastValidBlockHeight,
          },
          "confirmed"
        );

        console.log(`[${label}] 交易已确认: ${txId}`);
        console.log("完整交易详情:", tx.serializeMessage().toString("hex"));

        // 等待交易确认
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const postBalance = await provider.connection.getBalance(
          fundedAccount.publicKey
        );
        console.log(`交易后余额: ${postBalance} lamports`);
        return txId;
      } catch (error) {
        console.error(`[${label}] 交易失败，剩余重试次数 ${retry}`, error);

        // 自动补充手续费
        if (error.message.includes("insufficient funds")) {
          await provider.connection.requestAirdrop(
            fundedAccount.publicKey,
            anchor.web3.LAMPORTS_PER_SOL * 0.1
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    throw new Error(`交易失败: ${label}`);
  }
  // 验证PDA地址的有效性
  function validatePda(pda: PublicKey, name: string) {
    if (pda.toBase58() === SystemProgram.programId.toBase58()) {
      throw new Error(`无效的PDA地址 ${name}`);
    }
  }

  // 初始化PDA（添加mint和pause状态）
  function initializePdas() {
    [authorityPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("authority")],
      program.programId
    );

    [statePda] = PublicKey.findProgramAddressSync(
      [Buffer.from(config.seeds.state)],
      program.programId
    );

    [mintStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint_state")],
      program.programId
    );

    [pauseStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("pause_state")],
      program.programId
    );

    [accessRegistryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("access_registry")],
      program.programId
    );

    // 验证PDA有效性
    validatePda(authorityPda, "Authority PDA");
    validatePda(statePda, "State PDA");
    validatePda(accessRegistryPda, "Access Registry PDA");
  }

  describe("核心功能测试", () => {
    let accessRegistry: PublicKey;

    beforeEach(async () => {
      // 初始化访问注册表
      [accessRegistry] = PublicKey.findProgramAddressSync(
        [Buffer.from("access_registry")],
        program.programId
      );
    });

    it("完整生命周期测试", async () => {
      try {
        // 创建访问注册表账户
        const createRegistryTx = await program.methods
          .initializeAccessRegistry()
          .accounts({
            authority: provider.wallet.publicKey,
            accessRegistry,
            systemProgram: SystemProgram.programId,
          })
          .signers([provider.wallet.payer])
          .rpc();

        await provider.connection.confirmTransaction(
          createRegistryTx,
          "confirmed"
        );
        console.log("访问注册表初始化成功");

        // 验证访问注册表状态
        const registryAccount = await program.account.accessRegistry.fetch(
          accessRegistry
        );
        expect(registryAccount.authority.equals(provider.wallet.publicKey)).to
          .be.true;
      } catch (error) {
        console.error("初始化访问注册表失败:", error);
        throw error;
      }
    });

    it("成功铸造WUSD代币", async () => {
      const amount = new BN(100000000); // 100 WUSD (考虑精度)
      const recipient = await getAssociatedTokenAddress(
        wusdMint,
        fundedAccount.publicKey
      );

      // 创建接收者的代币账户
      const createRecipientAccountIx = createAssociatedTokenAccountInstruction(
        fundedAccount.publicKey,
        recipient,
        fundedAccount.publicKey,
        wusdMint
      );

      await provider.sendAndConfirm(
        new anchor.web3.Transaction().add(createRecipientAccountIx),
        [fundedAccount]
      );

      // 执行铸币操作
      await program.methods
        .mint(amount, config.authorityBump)
        .accounts({
          authority: fundedAccount.publicKey,
          authorityState: authorityPda,
          mint: wusdMint,
          mintState: mintStatePda,
          pauseState: pauseStatePda,
          accessRegistry: accessRegistryPda,
          tokenAccount: recipient,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([fundedAccount])
        .rpc();

      // 验证铸币结果
      const recipientAccount = await getAccount(provider.connection, recipient);
      expect(recipientAccount.amount.toString()).to.equal(amount.toString());
    });

    it("无权限铸币失败", async () => {
      const amount = new BN(1000000);
      const unauthorizedUser = Keypair.generate();
      const recipient = await getAssociatedTokenAddress(
        wusdMint,
        unauthorizedUser.publicKey
      );

      try {
        await program.methods
          .mint(amount, config.authorityBump)
          .accounts({
            authority: unauthorizedUser.publicKey,
            authorityState: authorityPda,
            mint: wusdMint,
            mintState: mintStatePda,
            pauseState: pauseStatePda,
            accessRegistry: accessRegistryPda,
            tokenAccount: recipient,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([unauthorizedUser])
          .rpc();
        expect.fail("应该抛出权限错误");
      } catch (error) {
        expect(error.message).to.include("NotMinter");
      }
    });

    it("成功销毁WUSD代币", async () => {
      // 先铸造一些代币
      const mintAmount = new BN(1000000);
      const burnAmount = new BN(500000);
      const userAccount = await getAssociatedTokenAddress(
        wusdMint,
        fundedAccount.publicKey
      );

      // 创建用户代币账户
      const createUserAccountIx = createAssociatedTokenAccountInstruction(
        fundedAccount.publicKey,
        userAccount,
        fundedAccount.publicKey,
        wusdMint
      );

      await provider.sendAndConfirm(
        new anchor.web3.Transaction().add(createUserAccountIx),
        [fundedAccount]
      );

      // 铸币
      await program.methods
        .mint(mintAmount, config.authorityBump)
        .accounts({
          authority: fundedAccount.publicKey,
          authorityState: authorityPda,
          mint: wusdMint,
          mintState: mintStatePda,
          pauseState: pauseStatePda,
          accessRegistry: accessRegistryPda,
          tokenAccount: userAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([fundedAccount])
        .rpc();

      // 执行销毁操作
      await program.methods
        .burn(burnAmount)
        .accounts({
          authority: fundedAccount.publicKey,
          authorityState: authorityPda,
          mint: wusdMint,
          mintState: mintStatePda,
          pauseState: pauseStatePda,
          accessRegistry: accessRegistryPda,
          tokenAccount: userAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([fundedAccount])
        .rpc();

      // 验证销毁结果
      const accountAfterBurn = await getAccount(
        provider.connection,
        userAccount
      );
      expect(accountAfterBurn.amount.toString()).to.equal(
        mintAmount.sub(burnAmount).toString()
      );
    });

    it("销毁金额超过余额失败", async () => {
      const mintAmount = new BN(1000000);
      const burnAmount = new BN(2000000); // 大于铸造金额
      const userAccount = await getAssociatedTokenAddress(
        wusdMint,
        fundedAccount.publicKey
      );

      // 先铸造代币
      await program.methods
        .mint(mintAmount, config.authorityBump)
        .accounts({
          authority: fundedAccount.publicKey,
          authorityState: authorityPda,
          mint: wusdMint,
          mintState: mintStatePda,
          pauseState: pauseStatePda,
          accessRegistry: accessRegistryPda,
          tokenAccount: userAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([fundedAccount])
        .rpc();

      try {
        await program.methods
          .burn(burnAmount)
          .accounts({
            authority: fundedAccount.publicKey,
            authorityState: authorityPda,
            mint: wusdMint,
            mintState: mintStatePda,
            pauseState: pauseStatePda,
            accessRegistry: accessRegistryPda,
            tokenAccount: userAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([fundedAccount])
          .rpc();
        expect.fail("应该抛出余额不足错误");
      } catch (error) {
        expect(error.message).to.include("InsufficientBalance");
      }
    });
  });
});
