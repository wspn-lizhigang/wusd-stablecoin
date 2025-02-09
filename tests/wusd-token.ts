import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { WusdToken } from "../target/types/wusd_token";
import {
  PublicKey,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
  createInitializeMintInstruction,
} from "@solana/spl-token";

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
            mint: mintKeypair.publicKey,
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

        // 验证初始化结果
        const mintInfo = await provider.connection.getAccountInfo(
          mintKeypair.publicKey
        );
        console.log("Mint account info:", mintInfo);

        const authorityState = await program.account.authorityState.fetch(
          authorityPda
        );
        const mintState = await program.account.mintState.fetch(mintStatePda);
        const pauseState = await program.account.pauseState.fetch(
          pauseStatePda
        );

        console.log("Verification results:", {
          authorityState,
          mintState,
          pauseState,
        });
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
      const tx = await program.methods
        .initializeAccessRegistry()
        .accounts({
          authority: provider.wallet.publicKey,
          accessRegistry: accessRegistryPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([provider.wallet.payer])
        .rpc();

      await provider.connection.confirmTransaction(tx, "confirmed");

      // 验证初始化结果
      const accessRegistry = await program.account.accessRegistryState.fetch(
        accessRegistryPda
      );
      console.log("Access Registry initialized:", {
        authority: accessRegistry.authority.toString(),
        initialized: accessRegistry.initialized,
        operatorCount: accessRegistry.operatorCount,
      });
    } catch (error) {
      console.error("Access Registry initialization failed:", error);
      throw error;
    }
  });

  it("Create Recipient Token Account", async () => {
    try {
      const createTokenAccountIx = createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey,
        recipientTokenAccount,
        recipientKeypair.publicKey,
        mintKeypair.publicKey
      );

      const tx = await provider.sendAndConfirm(
        new anchor.web3.Transaction().add(createTokenAccountIx)
      );
      await provider.connection.confirmTransaction(tx, "confirmed");
      await sleep(1000);
      console.log("Recipient token account created");
    } catch (error) {
      console.error("Token account creation failed:", error);
      throw error;
    }
  });

  it("Mint WUSD tokens", async () => {
    try {
      // 首先检查访问权限
      const accessRegistry = await program.account.accessRegistryState.fetch(
        accessRegistryPda
      );
      console.log("Access Registry State:", {
        authority: accessRegistry.authority.toString(),
        initialized: accessRegistry.initialized,
        operatorCount: accessRegistry.operatorCount,
      });

      // 检查暂停状态
      const pauseState = await program.account.pauseState.fetch(pauseStatePda);
      if (pauseState.paused) {
        throw new Error("Contract is paused");
      }

      const tx = await program.methods
        .mint(new anchor.BN(1000000))
        .accounts({
          authority: provider.wallet.publicKey,
          mint: mintKeypair.publicKey,
          tokenAccount: recipientTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          authorityState: authorityPda,
          mintState: mintStatePda,
          pauseState: pauseStatePda,
          accessRegistry: accessRegistryPda,
        })
        .signers([provider.wallet.payer])
        .rpc();

      await provider.connection.confirmTransaction(tx, "confirmed");
      console.log("Successfully minted WUSD tokens");

      const tokenAccount = await provider.connection.getTokenAccountBalance(
        recipientTokenAccount
      );
      console.log("Token balance:", tokenAccount.value.uiAmount);
    } catch (error) {
      console.error("Minting failed:", error);
      throw error;
    }
  });
});
