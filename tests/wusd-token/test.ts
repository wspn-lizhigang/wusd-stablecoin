import * as nacl from "tweetnacl";
import {
  LAMPORTS_PER_SOL,
  SystemProgram,
  PublicKey,
  Keypair,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
} from "@solana/spl-token";
import { WusdToken } from "../../target/types/wusd_token";
import { assert } from "chai";

// 定义代币铸币账户的大小
const MINT_SIZE = 82;

describe("WUSD Token Mint Test", () => {
  // 1. 首先定义所有变量
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.WusdToken as Program<WusdToken>;

  // 定义关键账户
  let mintKeypair: Keypair;
  let recipientKeypair: Keypair;

  // 定义PDA账户
  let authorityPda: PublicKey;
  let mintStatePda: PublicKey;
  let pauseStatePda: PublicKey;
  let accessRegistryPda: PublicKey; 

  // 定义代币账户
  let recipientTokenAccount: PublicKey;

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  // 辅助函数：清理账户
  const cleanupAccount = async (account: PublicKey) => {
    try {
      const accountInfo = await provider.connection.getAccountInfo(account);
      if (accountInfo !== null) {
        const closeAccountIx = SystemProgram.transfer({
          fromPubkey: account,
          toPubkey: provider.wallet.publicKey,
          lamports: 0,
        });
        const closeAccountTx = new anchor.web3.Transaction().add(
          closeAccountIx
        );
        await provider.sendAndConfirm(closeAccountTx, [mintKeypair]);
        await sleep(1000);
      }
    } catch (error) {
      console.log("Account cleanup failed or not needed:", error);
    }
  };

  // 辅助函数：初始化合约状态
  const initializeContractState = async () => {
    let retries = 3;
    while (retries > 0) {
      try {
        // 检查账户是否已存在
        const mintAccount = await provider.connection.getAccountInfo(
          mintKeypair.publicKey
        );
        if (mintAccount !== null) {
          console.log("Mint account already exists, generating new keypair...");
          mintKeypair = Keypair.generate();
          continue;
        }

        // 重新计算所有PDA
        [authorityPda, authorityBump] = PublicKey.findProgramAddressSync(
          [Buffer.from("authority"), mintKeypair.publicKey.toBuffer()],
          program.programId
        );
        [mintStatePda] = PublicKey.findProgramAddressSync(
          [Buffer.from("mint_state"), mintKeypair.publicKey.toBuffer()],
          program.programId
        );
        [pauseStatePda] = PublicKey.findProgramAddressSync(
          [Buffer.from("pause_state"), mintKeypair.publicKey.toBuffer()],
          program.programId
        );

        // 创建新的代币铸币账户
        const lamports =
          await provider.connection.getMinimumBalanceForRentExemption(
            MINT_SIZE
          );

        // 关闭现有账户
        await cleanupAccount(mintKeypair.publicKey);

        // 等待账户关闭确认
        await sleep(2000);

        // 检查所有相关账户是否已存在
        const [mintAccountInfo, authorityInfo, mintStateInfo, pauseStateInfo] =
          await Promise.all([
            provider.connection.getAccountInfo(mintKeypair.publicKey),
            provider.connection.getAccountInfo(authorityPda),
            provider.connection.getAccountInfo(mintStatePda),
            provider.connection.getAccountInfo(pauseStatePda),
          ]);

        if (
          mintAccountInfo !== null ||
          authorityInfo !== null ||
          mintStateInfo !== null ||
          pauseStateInfo !== null
        ) {
          console.log(
            "One or more accounts still exist after cleanup, generating new keypair..."
          );
          mintKeypair = Keypair.generate();
          continue;
        }

        // 首先创建代币账户
        const createAccountIx = SystemProgram.createAccount({
          fromPubkey: provider.wallet.publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        });

        const createMintIx = createInitializeMintInstruction(
          mintKeypair.publicKey,
          6,
          provider.wallet.publicKey,
          provider.wallet.publicKey
        );

        const mintTx = new anchor.web3.Transaction()
          .add(createAccountIx)
          .add(createMintIx);

        await provider.sendAndConfirm(mintTx, [mintKeypair]);
        await sleep(2000);

        // 然后初始化系统状态
        const tx = await program.methods
          .initialize(6)
          .accounts({
            authority: provider.wallet.publicKey,
            authorityState: authorityPda,
            tokenMint: mintKeypair.publicKey,
            mintState: mintStatePda,
            pauseState: pauseStatePda,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([mintKeypair])
          .rpc();

        await provider.connection.confirmTransaction(tx, "confirmed");
        await sleep(2000);

        // 初始化访问注册表
        const initAccessRegistryTx = await program.methods
          .initializeAccessRegistry()
          .accounts({
            authority: provider.wallet.publicKey,
            accessRegistry: accessRegistryPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        await provider.connection.confirmTransaction(
          initAccessRegistryTx,
          "confirmed"
        );
        await sleep(2000);

        console.log("Contract state initialized");
        break;
      } catch (error) {
        console.error("Initialization failed, retrying...", error);
        retries--;
        if (retries === 0) throw error;
      }
    }
  };

  before(async () => {
    try {
      console.log("Starting initialization...");

      // 生成新的密钥对
      mintKeypair = Keypair.generate();
      recipientKeypair = Keypair.generate();

      // 计算 PDA 地址
      console.log("Calculating PDA addresses...");
      [authorityPda, authorityBump] = PublicKey.findProgramAddressSync(
        [Buffer.from("authority"), mintKeypair.publicKey.toBuffer()],
        program.programId
      );

      [mintStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("mint_state"), mintKeypair.publicKey.toBuffer()],
        program.programId
      );

      [pauseStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pause_state"), mintKeypair.publicKey.toBuffer()],
        program.programId
      );

      [accessRegistryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("access_registry")],
        program.programId
      );

      // 清理现有账户
      await cleanupAccount(mintKeypair.publicKey);
      await cleanupAccount(authorityPda);
      await cleanupAccount(mintStatePda);
      await cleanupAccount(pauseStatePda);

      // 请求空投
      console.log("Requesting airdrop...");
      const airdropSignature = await provider.connection.requestAirdrop(
        provider.wallet.publicKey,
        10 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(
        airdropSignature,
        "confirmed"
      );
      console.log("Airdrop completed");

      // 初始化合约状态
      await initializeContractState();
    } catch (error) {
      console.error("Initialization failed:", error);
      throw error;
    }
  });

  it("Test transfer functionality", async () => {
    try {
      console.log("Starting transfer test...");

      // 1. 获取转账前的余额
      const balanceBefore = await provider.connection.getTokenAccountBalance(
        recipientTokenAccount
      );
      console.log("Balance before transfer:", balanceBefore.value.uiAmount);

      // 2. 执行转账操作，转账100个WUSD代币
      const transferAmount = new anchor.BN(100000000);

      const tx = await program.methods
        .transfer(transferAmount)
        .accounts({
          from: provider.wallet.publicKey,
          to: recipientTokenAccount,
          authority: provider.wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      // 3. 等待交易确认
      await provider.connection.confirmTransaction(tx, "confirmed");
      console.log("Transaction confirmed:", tx);

      // 4. 验证转账结果
      const balanceAfter = await provider.connection.getTokenAccountBalance(
        recipientTokenAccount
      );
      console.log("Balance after transfer:", balanceAfter.value.uiAmount);

      // 5. 验证余额变化
      const expectedBalance =
        balanceBefore.value.uiAmount + transferAmount.toNumber() / 1000000;
      assert.approximately(
        balanceAfter.value.uiAmount,
        expectedBalance,
        0.000001,
        "Transfer amount not correctly added to receiver"
      );

      console.log("Transfer operation successful");
    } catch (error) {
      console.error("Transfer operation failed:", error);
      throw error;
    }
  });

  it("Test transfer_from functionality", async () => {
    try {
      console.log("Starting transfer_from test...");

      // 1. 创建新的接收账户
      const spender = Keypair.generate();

      // 2. 为 recipientKeypair 请求空投
      const airdropSignature = await provider.connection.requestAirdrop(
        recipientKeypair.publicKey,
        10 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(
        airdropSignature,
        "confirmed"
      );
      console.log("Airdropped SOL to recipient");

      // 3. 创建接收账户的代币账户
      const spenderTokenAccount = await anchor.utils.token.associatedAddress({
        mint: mintKeypair.publicKey,
        owner: spender.publicKey,
      });

      const createTokenAccountIx = createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey,
        spenderTokenAccount,
        spender.publicKey,
        mintKeypair.publicKey
      );

      const tx = new anchor.web3.Transaction().add(createTokenAccountIx);
      const trs_signature = await provider.sendAndConfirm(tx);
      await provider.connection.confirmTransaction(trs_signature, "confirmed");
      await sleep(1000);

      // 4. 为 spender 添加操作员权限
      const addOperatorTx = await program.methods
        .addOperator(spender.publicKey)
        .accounts({
          authority: provider.wallet.publicKey,
          authorityState: authorityPda,
          accessRegistry: accessRegistryPda,
          operator: spender.publicKey,
        })
        .rpc();

      await provider.connection.confirmTransaction(addOperatorTx);
      console.log("Added spender as operator");
      await sleep(1000);

      // 5. 执行 transfer_from 操作
      const transferFromTx = await program.methods
        .transferFrom(new anchor.BN(10000000))
        .accounts({
          owner: recipientKeypair.publicKey,
          spender: spender.publicKey,
          fromToken: recipientTokenAccount,
          toToken: spenderTokenAccount,
          permit: permitPda,
          mintState: mintStatePda,
          pauseState: pauseStatePda,
          accessRegistry: accessRegistryPda,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([spender, recipientKeypair])
        .rpc();

      // 6. 验证转账结果
      const balanceAfter = await provider.connection.getTokenAccountBalance(
        recipientTokenAccount
      );
      console.log("Balance after transfer_from:", balanceAfter.value.uiAmount);

      console.log("Transfer_from operation successful");
    } catch (error) {
      console.error("Transfer_from operation failed:", error);
      throw error;
    }
  });

  it("Set burn access", async () => {
    try {
      // 添加销毁权限
      const tx = await program.methods
        .addOperator(recipientKeypair.publicKey)
        .accounts({
          authority: provider.wallet.publicKey,
          authorityState: authorityPda,
          accessRegistry: accessRegistryPda,
          operator: recipientKeypair.publicKey,
        })
        .rpc();

      await provider.connection.confirmTransaction(tx);
      console.log("Burn access granted");
    } catch (error) {
      console.error("Failed to set burn access:", error);
      throw error;
    }
  });

  it("Burn WUSD tokens", async () => {
    try {
      console.log("Starting burn test...");

      // 1. 获取销毁前的余额
      const balanceBefore = await provider.connection.getTokenAccountBalance(
        recipientTokenAccount
      );
      console.log("Balance before burn:", balanceBefore.value.uiAmount);

      // 2. 执行销毁操作，销毁50个WUSD代币
      const burnAmount = new anchor.BN(50000000);

      const tx = await program.methods
        .burn(burnAmount)
        .accounts({
          authorityState: authorityPda,
          authority: recipientKeypair.publicKey,
          mint: mintKeypair.publicKey,
          tokenAccount: recipientTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          mintState: mintStatePda,
          pauseState: pauseStatePda,
          accessRegistry: accessRegistryPda,
          mintAuthority: recipientKeypair.publicKey,
        })
        .signers([recipientKeypair])
        .rpc();

      // 3. 等待交易确认
      await provider.connection.confirmTransaction(tx, "confirmed");
      console.log("Transaction confirmed:", tx);

      // 4. 验证销毁结果
      const balanceAfter = await provider.connection.getTokenAccountBalance(
        recipientTokenAccount
      );
      console.log("Balance after burn:", balanceAfter.value.uiAmount);

      // 5. 验证余额变化
      const expectedBalance =
        balanceBefore.value.uiAmount - burnAmount.toNumber() / 1000000;
      assert.approximately(
        balanceAfter.value.uiAmount,
        expectedBalance,
        0.000001,
        "Burn amount not correctly deducted"
      );

      console.log("Burn operation successful");
    } catch (error) {
      console.error("Burn operation failed:", error);
      throw error;
    }
  });
});
