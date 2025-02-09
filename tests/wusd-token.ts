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

const AUTHORITY_STATE_SIZE = 8 + 32 * 3; // discriminator + admin + minter + pauser
const MINT_STATE_SIZE = 8 + 32 + 1; // discriminator + mint + decimals
const PAUSE_STATE_SIZE = 8 + 1; // discriminator + paused
const ACCESS_REGISTRY_SIZE = 8 + 32 + 1 + 32 * 10 + 1; // discriminator + authority + initialized + operators + operator_count

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

      // 4. 创建 Mint 账户
      console.log("Creating mint account...");
      const mintAccount = await provider.connection.getAccountInfo(
        mintKeypair.publicKey
      );

      if (!mintAccount) {
        const lamports = await getMinimumBalanceForRentExemptMint(
          provider.connection
        );
        const createMintTx = new anchor.web3.Transaction().add(
          SystemProgram.createAccount({
            fromPubkey: provider.wallet.publicKey,
            newAccountPubkey: mintKeypair.publicKey,
            space: MINT_SIZE,
            lamports,
            programId: TOKEN_PROGRAM_ID,
          })
        );

        await provider.sendAndConfirm(createMintTx, [mintKeypair]);
        console.log("Mint account created");

        // 初始化 Mint
        const initMintTx = new anchor.web3.Transaction().add(
          createInitializeMintInstruction(
            mintKeypair.publicKey,
            6,
            provider.wallet.publicKey,
            provider.wallet.publicKey
          )
        );

        await provider.sendAndConfirm(initMintTx, []);
        console.log("Mint initialized");
      }

      // 5. 初始化合约状态
      console.log("Initializing contract state...");
      try {
        console.log("Debug: Account addresses being used:");
        console.log("Authority:", provider.wallet.publicKey.toString());
        console.log("Mint:", mintKeypair.publicKey.toString());
        console.log("Authority PDA:", authorityPda.toString());
        console.log("Mint State PDA:", mintStatePda.toString());
        console.log("Pause State PDA:", pauseStatePda.toString());
        console.log("Access Registry PDA:", accessRegistryPda.toString());

        const tx = await program.methods
          .initialize(6) // decimals parameter
          .accounts({
            authority: provider.wallet.publicKey,
            mint: mintKeypair.publicKey,
            authorityState: authorityPda,
            mintState: mintStatePda,
            pauseState: pauseStatePda,
            accessRegistry: accessRegistryPda, // 添加访问注册表账户
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([provider.wallet.payer])
          .rpc();

        await provider.connection.confirmTransaction(tx, "confirmed");
        console.log("Contract state initialized");

        // 验证初始化结果
        const authorityState = await program.account.authorityState.fetch(
          authorityPda
        );
        const mintState = await program.account.mintState.fetch(mintStatePda);
        const pauseState = await program.account.pauseState.fetch(
          pauseStatePda
        );

        console.log("Verification results:");
        console.log("Authority State:", {
          admin: authorityState.admin.toString(),
          minter: authorityState.minter.toString(),
          pauser: authorityState.pauser.toString(),
        });
        console.log("Mint State:", {
          mint: mintState.mint.toString(),
          decimals: mintState.decimals,
        });
        console.log("Pause State:", {
          paused: pauseState.paused,
        });
      } catch (error) {
        console.error("Contract initialization failed with error:", error);
        if (error.logs) {
          console.error("Transaction logs:", error.logs);
        }
        throw error;
      }
    } catch (error) {
      console.error("Setup failed with error:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Stack trace:", error.stack);
      }
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
      // 检查账户是否已存在
      const authorityStateAccount = await provider.connection.getAccountInfo(
        authorityPda
      );
      const mintStateAccount = await provider.connection.getAccountInfo(
        mintStatePda
      );
      const pauseStateAccount = await provider.connection.getAccountInfo(
        pauseStatePda
      );

      if (!authorityStateAccount || !mintStateAccount || !pauseStateAccount) {
        console.log("Creating account spaces...");
        // 使用PDA创建账户
        const [authorityPda, authorityBump] =
          await PublicKey.findProgramAddress(
            [Buffer.from("authority")],
            program.programId
          );

        const [mintStatePda] = await PublicKey.findProgramAddress(
          [Buffer.from("mint_state")],
          program.programId
        );

        const [pauseStatePda] = await PublicKey.findProgramAddress(
          [Buffer.from("pause_state")],
          program.programId
        );

        // 初始化合约状态
        console.log("Initializing contract state...");
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
        console.log("Contract state initialized");
      } else {
        console.log("Contract state already initialized, skipping...");
      }

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
