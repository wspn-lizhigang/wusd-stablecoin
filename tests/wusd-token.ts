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
import { newAccountWithLamports } from "./util/new-account-with-lamports";

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
    console.log("程序ID验证:", program.programId.toString());
  });

  // 初始化PDA（添加mint和pause状态）
  let statePda: PublicKey;
  let authorityPda: PublicKey;
  let mintStatePda: PublicKey;
  let pauseStatePda: PublicKey;
  let wusdMint: PublicKey;
  let mintKeypair: Keypair;
  let treasury: PublicKey;

  // 余额检查函数
  async function checkBalance(account: PublicKey, label: string) {
    const balance = await provider.connection.getBalance(account);
    console.log(`[${label}] 余额检查: ${balance} lamports`);
    return balance;
  }

  beforeEach(async function () {
    this.timeout(60000); // 60秒超时
    console.log("当前程序ID:", program.programId.toString());
    
    // 初始化funded account
    fundedAccount = await newAccountWithLamports(
      provider.connection,
      1000000000 // 1 SOL
    );
    
    // 初始化PDA
    initializePdas();
    console.log("当前RPC节点:", provider.connection.rpcEndpoint); 

    console.log("环境变量验证:");
    console.log("ANCHOR_PROVIDER_URL:", process.env.ANCHOR_PROVIDER_URL);
    console.log("ANCHOR_WALLET:", process.env.ANCHOR_WALLET);

    // 初始化Mint密钥对
    mintKeypair = Keypair.generate();
    wusdMint = mintKeypair.publicKey;
    console.log("新Mint地址:", wusdMint.toString());
    const mintRent =
      await provider.connection.getMinimumBalanceForRentExemption(
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
    await sendAndConfirmWithRetry(provider, initMintTx, [fundedAccount], "初始化Mint");

    // 记录Mint账户创建的成本
    const initialBalance = await checkBalance(fundedAccount.publicKey, "创建Mint前");
    const finalBalance = await provider.connection.getBalance(fundedAccount.publicKey);
    console.log("Mint账户创建消耗:\n  实际费用:", initialBalance - finalBalance, "lamports\n  理论费用:", mintRent, "lamports");

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
    await sendAndConfirmWithRetry(provider, initCollateralMintTx, [fundedAccount], "初始化抵押代币Mint");

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

    const wallet = new anchor.Wallet(fundedAccount);
    console.log("操作钱包地址:", wallet.publicKey.toString());

    provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    anchor.setProvider(provider);

    // 程序初始化（关键修复）
    program = anchor.workspace.WusdToken as Program<WusdToken>;
    console.log("程序ID验证:", program.programId.toString());
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

    // 验证PDA有效性
    validatePda(authorityPda, "Authority PDA");
    validatePda(statePda, "State PDA");

    console.log("=== PDA初始化 ===");
    console.log("Authority PDA:", authorityPda.toString());
    console.log("State PDA:", statePda.toString());
    console.log("Mint State PDA:", mintStatePda.toString());
    console.log("Pause State PDA:", pauseStatePda.toString());
  } 

  describe("核心功能测试", () => {
    it("完整生命周期测试", async () => {
      // 测试账户初始化
      const testUser = await newAccountWithLamports(
        provider.connection,
        10000000000 // 10 SOL
      );
      const userAta = await getAssociatedTokenAddress(
        wusdMint,
        testUser.publicKey
      );

      // 创建用户代币账户
      const createAtaIx = createAssociatedTokenAccountInstruction(
        payer.publicKey,
        userAta,
        testUser.publicKey,
        wusdMint
      );

      const tx = new anchor.web3.Transaction().add(createAtaIx);
      await provider.sendAndConfirm(tx, [payer]);

      // 铸币测试
      const mintAmount = new BN(1000 * 10 ** config.wusdDecimals);
      await program.methods
        .mint(mintAmount, 254)
        .accounts({
          mint: wusdMint,
          authority: payer.publicKey,
          tokenAccount: userAta,
          authorityState: authorityPda,
          pauseState: pauseStatePda,
        })
        .rpc();

      // 验证铸币结果
      let ataInfo = await provider.connection.getTokenAccountBalance(userAta);
      expect(ataInfo.value.amount).to.equal(mintAmount.toString());

      // 转账测试
      const recipient = Keypair.generate();
      const recipientAta = await getAssociatedTokenAddress(
        wusdMint,
        recipient.publicKey
      );

      // 创建接收者的关联代币账户
      const createRecipientAtaIx = createAssociatedTokenAccountInstruction(
        payer.publicKey,
        recipientAta,
        recipient.publicKey,
        wusdMint
      );
      await provider.sendAndConfirm(
        new anchor.web3.Transaction().add(createRecipientAtaIx),
        [payer]
      );

      const transferAmount = new BN(500 * 10 ** config.wusdDecimals);
      await program.methods
        .transfer(transferAmount)
        .accounts({
          from: testUser.publicKey,
          to: recipient.publicKey,
          fromToken: userAta,
          toToken: recipientAta,
          pauseState: pauseStatePda,
        })
        .signers([testUser])
        .rpc();

      // 验证转账结果
      const recipientBalance = await provider.connection.getTokenAccountBalance(
        recipientAta
      );
      expect(recipientBalance.value.amount).to.equal(transferAmount.toString());

      // 销毁测试
      const burnAmount = new BN(200 * 10 ** config.wusdDecimals);
      await program.methods
        .burn(burnAmount)
        .accounts({
          authority: testUser.publicKey,
          mint: wusdMint,
          tokenAccount: userAta,
          authorityState: authorityPda,
        })
        .rpc();

      // 验证销毁结果
      const finalBalance = await provider.connection.getTokenAccountBalance(
        userAta
      );
      expect(finalBalance.value.amount).to.equal(
        mintAmount.sub(transferAmount).sub(burnAmount).toString()
      );
    });
  });

  describe("权限控制测试", () => {
    it("拒绝非管理员暂停合约", async () => {
      const unauthorizedUser = Keypair.generate();

      try {
        await program.methods
          .pause()
          .accounts({
            authority: unauthorizedUser.publicKey,
            pauseState: pauseStatePda,
            authorityState: authorityPda,
          })
          .signers([unauthorizedUser])
          .rpc();

        expect.fail("应抛出未授权错误");
      } catch (err) {
        expect(err.error.errorCode.code).to.equal(
          config.errorCodes.Unauthorized
        );
      }
    });

    it("验证多层级权限", async () => {
      // 添加测试操作员
      const operator = Keypair.generate();
      await program.methods
        .addOperator(operator.publicKey)
        .accounts({
          admin: payer.publicKey,
          authorityState: authorityPda,
        })
        .rpc();

      // 验证操作员权限
      const authState = await program.account.authorityState.fetch(
        authorityPda
      );
      expect(authState.operators).to.include(operator.publicKey.toString());
    });
  });

  describe("高级功能测试", () => {
    it("处理许可授权转账", async () => {
      const owner = Keypair.generate();
      const spender = Keypair.generate();
      const amount = new BN(100 * 10 ** config.wusdDecimals);

      // 创建许可签名（模拟签名）
      const permitParams = {
        amount,
        deadline: new BN(Date.now() / 1000 + 3600),
        nonce: null,
        scope: { transfer: {} },
        signature: new Uint8Array(64).fill(1),
        publicKey: owner.publicKey.toBytes(),
      };

      await program.methods
        .permit(permitParams)
        .accounts({
          owner: owner.publicKey,
          spender: spender.publicKey,
          allowance: PublicKey.findProgramAddressSync(
            [
              Buffer.from("allowance"),
              owner.publicKey.toBuffer(),
              spender.publicKey.toBuffer(),
            ],
            program.programId
          )[0],
          permitState: PublicKey.findProgramAddressSync(
            [Buffer.from("permit"), owner.publicKey.toBuffer()],
            program.programId
          )[0],
        })
        .rpc();

      // 验证授权状态
      const [allowancePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("allowance"),
          owner.publicKey.toBuffer(),
          spender.publicKey.toBuffer(),
        ],
        program.programId
      );
      const allowance = await program.account.allowanceState.fetch(
        allowancePda
      );
      expect(allowance.amount.toString()).to.equal(amount.toString());
    });

    it("验证合约暂停机制", async () => {
      // 暂停合约
      await program.methods
        .pause()
        .accounts({
          authority: payer.publicKey,
          pauseState: pauseStatePda,
        })
        .rpc();

      // 尝试操作应失败
      try {
        await program.methods
          .mint(new BN(100), 254)
          .accounts({
            mint: wusdMint,
            authority: payer.publicKey,
            pauseState: pauseStatePda,
          })
          .rpc();

        expect.fail("应抛出合约暂停错误");
      } catch (err) {
        expect(err.error.errorCode.code).to.equal(
          config.errorCodes.ProgramPaused
        );
      }

      // 恢复合约
      await program.methods
        .unpause()
        .accounts({
          authority: payer.publicKey,
          pauseState: pauseStatePda,
        })
        .rpc();
    });
  });

  describe("边界条件测试", () => {
    it("处理零金额转账", async () => {
      try {
        await program.methods
          .transfer(new BN(0))
          .accounts({
            from: payer.publicKey,
            to: Keypair.generate().publicKey,
          })
          .rpc();

        expect.fail("应抛出无效金额错误");
      } catch (err) {
        expect(err.error.errorCode.code).to.equal(
          config.errorCodes.InvalidAmount
        );
      }
    });

    it("处理余额不足转账", async () => {
      const testUser = Keypair.generate();
      const userAta = await getAssociatedTokenAddress(
        wusdMint,
        testUser.publicKey
      );

      try {
        await program.methods
          .transfer(new BN(100))
          .accounts({
            from: testUser.publicKey,
            fromToken: userAta,
          })
          .rpc();

        expect.fail("应抛出余额不足错误");
      } catch (err) {
        expect(err.error.errorCode.code).to.equal(
          config.errorCodes.InsufficientFunds
        );
      }
    });
  });
});
