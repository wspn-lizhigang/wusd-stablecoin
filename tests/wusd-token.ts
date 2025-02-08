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
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
  createInitializeMintInstruction,
} from "@solana/spl-token";

describe("WUSD Token Mint Test", () => {
  // 配置 provider
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
      // 生成所需密钥对
      mintKeypair = Keypair.generate();
      recipientKeypair = Keypair.generate();

      // 确保程序已部署
      const programInfo = await provider.connection.getAccountInfo(
        program.programId
      );
      if (!programInfo) {
        throw new Error(
          `Program ${program.programId.toString()} not found! Please deploy the program first.`
        );
      }

      // 为所有需要的账户空投 SOL
      const airdropAmount = 10;
      const signature = await provider.connection.requestAirdrop(
        provider.wallet.publicKey,
        airdropAmount * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(signature, "confirmed");
      await sleep(2000);

      // 计算PDA地址
      [authorityPda, authorityBump] = PublicKey.findProgramAddressSync(
        [Buffer.from("authority")],
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

      // 计算代币账户地址
      recipientTokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        recipientKeypair.publicKey
      );

      // 确保 AuthorityState 已初始化
      const authorityStateAccount = await provider.connection.getAccountInfo(
        authorityPda
      );
      if (!authorityStateAccount) {
        console.log("Initializing AuthorityState...");
        
        // 创建并初始化mint账户
        const lamports = await getMinimumBalanceForRentExemptMint(provider.connection);
        const createMintAccountIx = SystemProgram.createAccount({
          fromPubkey: provider.wallet.publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        });
        
        const initializeMintIx = createInitializeMintInstruction(
          mintKeypair.publicKey,
          6, // decimals
          provider.wallet.publicKey,
          provider.wallet.publicKey
        );
        
        const tx = new anchor.web3.Transaction().add(createMintAccountIx, initializeMintIx);
        await provider.sendAndConfirm(tx, [mintKeypair]);
        console.log("Mint account initialized");
        
        // 初始化合约状态
        const initTx = await program.methods
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
          .signers([provider.wallet.payer, mintKeypair])
          .rpc();

        await provider.connection.confirmTransaction(initTx, "confirmed");
        await sleep(1000);
        console.log("Contract state initialized");

        // 初始化访问注册表
        const registryTx = await program.methods
          .initializeAccessRegistry()
          .accounts({
            authority: provider.wallet.publicKey,
            accessRegistry: accessRegistryPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([provider.wallet.payer])
          .rpc();

        await provider.connection.confirmTransaction(registryTx, "confirmed");
        await sleep(1000);
        console.log("Access registry initialized");
      }
      console.log("Setup completed");
      console.log("Program ID:", program.programId.toString());
      console.log("Wallet pubkey:", provider.wallet.publicKey.toString());
      console.log("Mint pubkey:", mintKeypair.publicKey.toString());
      console.log("Authority PDA:", authorityPda.toString());
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
        .rpc();

      await provider.connection.confirmTransaction(tx, "confirmed");
      await sleep(1000);
      console.log("Access Registry initialized");
    } catch (error) {
      console.error("Access Registry initialization failed:", error);
      throw error;
    }
  });

  it("Create and Initialize Mint", async () => {
    try {
      // 检查 Mint 账户是否已存在
      const mintAccount = await provider.connection.getAccountInfo(
        mintKeypair.publicKey
      );
      if (!mintAccount) {
        // 1. 创建 Mint 账户
        const lamports = await getMinimumBalanceForRentExemptMint(
          provider.connection
        );
        const createMintAccountIx = SystemProgram.createAccount({
          fromPubkey: provider.wallet.publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        });

        // 2. 初始化 Mint
        const initializeMintIx = createInitializeMintInstruction(
          mintKeypair.publicKey,
          6,
          provider.wallet.publicKey,
          provider.wallet.publicKey
        );

        // 3. 创建交易并发送
        const tx = new anchor.web3.Transaction()
          .add(createMintAccountIx)
          .add(initializeMintIx);

        await provider.sendAndConfirm(tx, [mintKeypair]);
        await sleep(1000);
      }
      console.log("Mint account created and initialized");

      // 4. 初始化代币合约
      const initTx = await program.methods
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
        .rpc();

      await provider.connection.confirmTransaction(initTx, "confirmed");
      await sleep(1000);
      console.log("WUSD Token initialized");
    } catch (error) {
      console.error("Mint initialization failed:", error);
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
      const tx = await program.methods
        .mint(new anchor.BN(1000000), authorityBump)
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
        .signers([])
        .rpc();

      await provider.connection.confirmTransaction(tx, "confirmed");
      await sleep(1000);
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
