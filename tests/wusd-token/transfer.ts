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
} from "@solana/spl-token";
import { WusdToken } from "../../target/types/wusd_token";
import { assert } from "chai";

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
  let authorityBump: number;

  // 定义代币账户
  let recipientTokenAccount: PublicKey;

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  before(async () => {
    try {
      console.log("Starting initialization...");

      // 1. 生成密钥对
      mintKeypair = Keypair.generate();
      recipientKeypair = Keypair.generate();

      // 2. 计算 PDA 地址
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

      // 3. 请求空投
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

      // 4. 初始化合约状态
      console.log("Initializing contract state...");
      try {
        console.log("Debug: Account addresses being used:");
        console.log("Authority:", provider.wallet.publicKey.toString());
        console.log("Mint:", mintKeypair.publicKey.toString());
        console.log("Authority PDA:", authorityPda.toString());
        console.log("Mint State PDA:", mintStatePda.toString());
        console.log("Pause State PDA:", pauseStatePda.toString());
        console.log("Access Registry PDA:", accessRegistryPda.toString());

        // 创建交易指令
        const tx = await program.methods
          .initialize(6)
          .accounts({
            authority: provider.wallet.publicKey,
            tokenMint: mintKeypair.publicKey,
            authorityState: authorityPda,
            mintState: mintStatePda,
            pauseState: pauseStatePda,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .transaction(); // 使用 .transaction() 而不是 .rpc()

        // 获取最新的区块哈希
        const latestBlockhash = await provider.connection.getLatestBlockhash();
        tx.recentBlockhash = latestBlockhash.blockhash;
        tx.feePayer = provider.wallet.publicKey;

        // 添加签名者
        const txSigned = await provider.wallet.signTransaction(tx);
        txSigned.partialSign(mintKeypair);

        // 发送交易
        const signature = await provider.connection.sendRawTransaction(
          txSigned.serialize(),
          {
            skipPreflight: false,
            preflightCommitment: "confirmed",
          }
        );
        await provider.connection.confirmTransaction(signature, "confirmed");

        console.log("Contract state initialized");
      } catch (error) {
        console.error("Contract initialization failed:", error);
        throw error;
      }
    } catch (error) {
      console.error("Setup failed:", error);
      throw error;
    }
  });

  it("Initialize Access Registry", async () => {
    try {
      // 首先检查账户是否存在
      const accountInfo = await provider.connection.getAccountInfo(
        accessRegistryPda
      );

      if (accountInfo !== null) {
        // 如果账户已存在，验证其状态
        const accessRegistry = await program.account.accessRegistryState.fetch(
          accessRegistryPda
        );
        if (accessRegistry.initialized) {
          console.log("Access Registry already initialized");
          return;
        }
      }

      // 初始化访问注册表
      const tx = await program.methods
        .initializeAccessRegistry()
        .accounts({
          authority: provider.wallet.publicKey,
          accessRegistry: accessRegistryPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await provider.connection.confirmTransaction(tx);

      // 验证初始化结果
      const accessRegistry = await program.account.accessRegistryState.fetch(
        accessRegistryPda
      );
      console.log("Access Registry State after initialization:", {
        authority: accessRegistry.authority.toString(),
        initialized: accessRegistry.initialized,
        operatorCount: accessRegistry.operatorCount,
      });

      // 确保初始化成功
      if (!accessRegistry.initialized) {
        throw new Error("Access Registry initialization failed");
      }

      console.log("Access Registry initialized successfully");
    } catch (error) {
      console.error("Access Registry initialization failed:", error);
      throw error;
    }
  });

  it("Set minter access", async () => {
    try {
      // 添加重试机制
      let retries = 3;
      let accessRegistry;

      while (retries > 0) {
        accessRegistry = await program.account.accessRegistryState.fetch(
          accessRegistryPda
        );

        if (accessRegistry.initialized) {
          break;
        }

        console.log(
          `Waiting for access registry initialization... (${retries} retries left)`
        );
        await sleep(1000); // 等待1秒
        retries--;
      }

      if (!accessRegistry.initialized) {
        throw new Error("Access Registry not initialized after retries");
      }

      // 添加铸币权限
      const tx = await program.methods
        .addOperator(provider.wallet.publicKey)
        .accounts({
          authority: provider.wallet.publicKey,
          authorityState: authorityPda,
          accessRegistry: accessRegistryPda,
          operator: provider.wallet.publicKey,
        })
        .rpc();

      await provider.connection.confirmTransaction(tx);
      console.log("Minter access granted");
    } catch (error) {
      console.error("Failed to set minter access:", error);
      throw error;
    }
  });

  it("Create Recipient Token Account", async () => {
    try {
      // 获取关联代币账户地址
      recipientTokenAccount = await anchor.utils.token.associatedAddress({
        mint: mintKeypair.publicKey,
        owner: recipientKeypair.publicKey,
      });

      const createTokenAccountIx = createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey,
        recipientTokenAccount,
        recipientKeypair.publicKey,
        mintKeypair.publicKey
      );

      const tx = new anchor.web3.Transaction().add(createTokenAccountIx);
      const signature = await provider.sendAndConfirm(tx);
      await provider.connection.confirmTransaction(signature, "confirmed");
      await sleep(1000);
      console.log(
        "Recipient token account created:",
        recipientTokenAccount.toString()
      );
    } catch (error) {
      console.error("Token account creation failed:", error);
      throw error;
    }
  });

  it("Mint WUSD tokens", async () => {
    try {
      console.log("Debug mint operation:");
      console.log(
        "Token Account Owner:",
        recipientKeypair.publicKey.toString()
      );
      console.log("Current Authority:", provider.wallet.publicKey.toString());

      // 检查访问注册表状态
      const accessRegistry = await program.account.accessRegistryState.fetch(
        accessRegistryPda
      );

      // 执行铸币操作
      const tx = await program.methods
        .mint(new anchor.BN(100000000), authorityBump)
        .accounts({
          authority: provider.wallet.publicKey,
          tokenMint: mintKeypair.publicKey,
          tokenAccount: recipientTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          authorityState: authorityPda,
          mintState: mintStatePda,
          pauseState: pauseStatePda,
          accessRegistry: accessRegistryPda,
        })
        .signers([provider.wallet.payer])
        .rpc();

      await provider.connection.confirmTransaction(tx);
      console.log("Successfully minted WUSD tokens");

      // 验证铸币结果
      const tokenAccount = await provider.connection.getTokenAccountBalance(
        recipientTokenAccount
      );
      console.log("Token balance:", tokenAccount.value.uiAmount);
    } catch (error) {
      console.error("Minting failed:", error);
      throw error;
    }
  }); 

  it("Transfer WUSD tokens", async () => {
    try {
      // 为 recipientKeypair 请求空投
      const airdropSignature = await provider.connection.requestAirdrop(
        recipientKeypair.publicKey,
        10 * LAMPORTS_PER_SOL // 空投 10 SOL
      );
      await provider.connection.confirmTransaction(
        airdropSignature,
        "confirmed"
      );
      console.log("Airdropped SOL to recipient");
      await sleep(1000); // 等待空投确认

      // 检查当前操作员列表
      const accessRegistry = await program.account.accessRegistryState.fetch(
        accessRegistryPda
      );

      // 如果操作员列表已满，移除第一个操作员
      if (accessRegistry.operatorCount >= 10) {
        const removeOperatorTx = await program.methods
          .removeOperator(accessRegistry.operators[0])
          .accounts({
            authority: provider.wallet.publicKey,
            authorityState: authorityPda,
            accessRegistry: accessRegistryPda,
            operator: accessRegistry.operators[0],
          })
          .rpc();

        await provider.connection.confirmTransaction(removeOperatorTx);
        console.log(
          "Removed operator:",
          accessRegistry.operators[0].toString()
        );
        await sleep(1000);
      }

      // 为发送方账户添加转账权限
      const addOperatorTx = await program.methods
        .addOperator(recipientKeypair.publicKey)
        .accounts({
          authority: provider.wallet.publicKey,
          authorityState: authorityPda,
          accessRegistry: accessRegistryPda,
          operator: recipientKeypair.publicKey,
        })
        .rpc();

      await provider.connection.confirmTransaction(addOperatorTx);
      console.log("Transfer access granted to sender");

      // 创建新的接收账户
      const newRecipient = Keypair.generate();
      const newRecipientTokenAccount =
        await anchor.utils.token.associatedAddress({
          mint: mintKeypair.publicKey,
          owner: newRecipient.publicKey,
        });

      // 创建接收账户的代币账户
      const createTokenAccountIx = createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey,
        newRecipientTokenAccount,
        newRecipient.publicKey,
        mintKeypair.publicKey
      );

      const tx = new anchor.web3.Transaction().add(createTokenAccountIx);
      const signature = await provider.sendAndConfirm(tx);
      await provider.connection.confirmTransaction(signature, "confirmed");

      // 获取转账前的余额
      const balanceBefore = await provider.connection.getTokenAccountBalance(
        recipientTokenAccount
      );
      console.log(
        "Sender balance before transfer:",
        balanceBefore.value.uiAmount
      );

      // 正确派生freeze state PDA
      const [fromFreezeState] = PublicKey.findProgramAddressSync(
        [Buffer.from("freeze"), recipientTokenAccount.toBuffer()],
        program.programId
      );

      const [toFreezeState] = PublicKey.findProgramAddressSync(
        [Buffer.from("freeze"), newRecipientTokenAccount.toBuffer()],
        program.programId
      );

      // 执行转账操作
      const transferAmount = new anchor.BN(20000000); // 20 WUSD
      const transferTx = await program.methods
        .transfer(transferAmount)
        .accounts({
          from: recipientKeypair.publicKey,
          to: newRecipient.publicKey,
          fromToken: recipientTokenAccount,
          toToken: newRecipientTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          pauseState: pauseStatePda,
          accessRegistry: accessRegistryPda,
          fromFreezeState: fromFreezeState,
          toFreezeState: toFreezeState,
          systemProgram: SystemProgram.programId,
        })
        .signers([recipientKeypair])
        .rpc();

      await provider.connection.confirmTransaction(transferTx, "confirmed");

      // 验证转账结果
      const senderBalanceAfter =
        await provider.connection.getTokenAccountBalance(recipientTokenAccount);
      const receiverBalance = await provider.connection.getTokenAccountBalance(
        newRecipientTokenAccount
      );

      console.log(
        "Sender balance after transfer:",
        senderBalanceAfter.value.uiAmount
      );
      console.log("Receiver balance:", receiverBalance.value.uiAmount);

      // 验证余额变化
      const expectedSenderBalance =
        balanceBefore.value.uiAmount - transferAmount.toNumber() / 1000000;
      assert.approximately(
        senderBalanceAfter.value.uiAmount,
        expectedSenderBalance,
        0.000001,
        "Transfer amount not correctly deducted from sender"
      );

      assert.approximately(
        receiverBalance.value.uiAmount,
        transferAmount.toNumber() / 1000000,
        0.000001,
        "Transfer amount not correctly added to receiver"
      );

      console.log("Transfer operation successful");
    } catch (error) {
      console.error("Transfer operation failed:", error);
      throw error;
    }
  });
});
