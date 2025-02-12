import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  LAMPORTS_PER_SOL,
  SystemProgram,
  PublicKey,
  Keypair,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
} from "@solana/spl-token";
import { WusdApplication } from "../../target/types/wusd_application";
import { assert } from "chai";

// 添加 sleep 函数定义
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 创建铸币账户的辅助函数
async function createMintToInstruction(
  connection: anchor.web3.Connection,
  payer: PublicKey,
  mint: PublicKey,
  authority: PublicKey,
  decimals: number
) {
  const lamports = await getMinimumBalanceForRentExemptMint(connection);
  const transaction = new anchor.web3.Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      mint,
      decimals,
      authority,
      authority
    )
  );
  return transaction;
}

describe("WUSD Application Tests", () => {
  // 设置Provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // 获取程序实例
  const program = anchor.workspace.WusdApplication as Program<WusdApplication>;

  // 定义关键账户
  let wusdMint: Keypair;
  let collateralMint: Keypair;
  let user: Keypair;
  let treasury: Keypair;

  // 定义PDA账户
  let statePda: PublicKey;
  let stakeAccountPda: PublicKey;
  let softStakeAccountPda: PublicKey; 
  let stateBump: number;

  // 定义代币账户
  let userWusdAccount: PublicKey;
  let userCollateralAccount: PublicKey;
  let treasuryAccount: PublicKey; 

  before(async () => {
    try {
      console.log("Starting initialization...");

      // 生成所需的密钥对
      wusdMint = Keypair.generate();
      collateralMint = Keypair.generate();
      user = Keypair.generate();
      treasury = Keypair.generate();

      // 计算PDA地址
      [statePda, stateBump] = PublicKey.findProgramAddressSync(
        [Buffer.from("state")],
        program.programId
      );

      [stakeAccountPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("stake_account"), user.publicKey.toBuffer()],
        program.programId
      );

      [softStakeAccountPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("soft_stake"), user.publicKey.toBuffer()],
        program.programId
      );

      // 请求空投
      const airdropSignature = await provider.connection.requestAirdrop(
        provider.wallet.publicKey,
        10 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSignature);

      // 为用户请求空投
      const userAirdropSignature = await provider.connection.requestAirdrop(
        user.publicKey,
        10 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(userAirdropSignature);

      // 创建代币账户
      userWusdAccount = await anchor.utils.token.associatedAddress({
        mint: wusdMint.publicKey,
        owner: user.publicKey,
      });

      userCollateralAccount = await anchor.utils.token.associatedAddress({
        mint: collateralMint.publicKey,
        owner: user.publicKey,
      });

      treasuryAccount = await anchor.utils.token.associatedAddress({
        mint: wusdMint.publicKey,
        owner: treasury.publicKey,
      });

      // 检查状态账户是否已存在
      const stateInfo = await provider.connection.getAccountInfo(statePda);
      if (!stateInfo) {
        // 创建代币铸币账户
        const createWusdMintIx = await createMintToInstruction(
          provider.connection,
          provider.wallet.publicKey,
          wusdMint.publicKey,
          provider.wallet.publicKey,
          6
        );

        const createCollateralMintIx = await createMintToInstruction(
          provider.connection,
          provider.wallet.publicKey,
          collateralMint.publicKey,
          provider.wallet.publicKey,
          6
        );

        const mintTx = new anchor.web3.Transaction()
          .add(createWusdMintIx)
          .add(createCollateralMintIx);
        
        await provider.sendAndConfirm(mintTx, [wusdMint, collateralMint]);

        // 创建用户的代币账户
        const createUserWusdAccountIx = createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          userWusdAccount,
          user.publicKey,
          wusdMint.publicKey,
          TOKEN_PROGRAM_ID
        );

        const createUserCollateralAccountIx = createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          userCollateralAccount,
          user.publicKey,
          collateralMint.publicKey,
          TOKEN_PROGRAM_ID
        );

        // 创建 treasury 的代币账户
        const createTreasuryAccountIx = createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          treasuryAccount,
          treasury.publicKey,
          wusdMint.publicKey,
          TOKEN_PROGRAM_ID
        );

        const accountsTx = new anchor.web3.Transaction()
          .add(createUserWusdAccountIx)
          .add(createUserCollateralAccountIx)
          .add(createTreasuryAccountIx);

        await provider.sendAndConfirm(accountsTx);
        await sleep(1000);

        // 初始化系统
        await program.methods
          .initialize(6)
          .accounts({
            authority: provider.wallet.publicKey,
            state: statePda,
            wusdMint: wusdMint.publicKey,
            collateralMint: collateralMint.publicKey,
            treasury: treasuryAccount,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .rpc();

        console.log("System initialized successfully");
      } else {
        console.log("System already initialized, skipping initialization");
      }
    } catch (error) {
      console.error("Initialization failed:", error);
      throw error;
    }
  });

  it("Initialize stake account", async () => {
    try {
      // 检查用户WUSD账户是否已初始化
      const userWusdAccountInfo = await provider.connection.getAccountInfo(userWusdAccount);
      if (!userWusdAccountInfo) {
        // 创建用户的 WUSD 代币账户
        const createUserWusdAccountIx = createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          userWusdAccount,
          user.publicKey,
          wusdMint.publicKey,
          TOKEN_PROGRAM_ID
        );
        const userWusdTx = new anchor.web3.Transaction().add(createUserWusdAccountIx);
        await provider.sendAndConfirm(userWusdTx);
        await sleep(1000);
        console.log("User WUSD account created");
      }

      // 检查用户抵押品账户是否已初始化
      const userCollateralAccountInfo = await provider.connection.getAccountInfo(userCollateralAccount);
      if (!userCollateralAccountInfo) {
        // 创建用户的抵押品代币账户
        const createUserCollateralAccountIx = createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          userCollateralAccount,
          user.publicKey,
          collateralMint.publicKey,
          TOKEN_PROGRAM_ID
        );
        const userCollateralTx = new anchor.web3.Transaction().add(createUserCollateralAccountIx);
        await provider.sendAndConfirm(userCollateralTx);
        await sleep(1000);
        console.log("User collateral account created");
      }
      try { 
        // 为 user 请求空投
        const userAirdropSignature = await provider.connection.requestAirdrop(
          user.publicKey,
          10 * LAMPORTS_PER_SOL
        );
        await provider.connection.confirmTransaction(userAirdropSignature);

        // 创建用户的 WUSD 代币账户
        const createUserWusdAccountIx = createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          userWusdAccount,
          user.publicKey,
          wusdMint.publicKey
        );

        const userWusdTx = new anchor.web3.Transaction().add(createUserWusdAccountIx);
        await provider.sendAndConfirm(userWusdTx);
        await sleep(1000);

        // 创建用户的抵押品代币账户
        const createUserCollateralAccountIx = createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          userCollateralAccount,
          user.publicKey,
          collateralMint.publicKey
        );

        const userCollateralTx = new anchor.web3.Transaction().add(createUserCollateralAccountIx);
        await provider.sendAndConfirm(userCollateralTx);
        await sleep(1000);

        // 执行质押操作
        await program.methods
          .initializeStakeAccount()
          .accounts({
            user: user.publicKey,
            stakeAccount: stakeAccountPda,
            state: statePda,
            systemProgram: SystemProgram.programId,
          })
          .signers([user])
          .rpc();

        const stakeAccount = await program.account.stakeAccount.fetch(
          stakeAccountPda
        );
        assert.equal(stakeAccount.owner.toString(), user.publicKey.toString());
        assert.equal(stakeAccount.amount.toNumber(), 0);
        console.log("Stake account initialized successfully");
      } catch (error) {
        console.error("Failed to initialize stake account:", error);
        throw error;
      }
    } catch (error) {
      console.error("Failed to create token accounts:", error);
      throw error;
    }
  });

  it("Stake WUSD tokens", async () => {
    try {
      const stakeAmount = new anchor.BN(1000000000); // 1000 WUSD
      const stakingPoolId = new anchor.BN(0);

      // 创建质押金库账户
      const [stakeVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("stake_vault"), stakeAccountPda.toBuffer()],
        program.programId
      );

      const stakeVaultAccount = await anchor.utils.token.associatedAddress({
        mint: wusdMint.publicKey,
        owner: stakeVaultPda
      });

      // 创建质押金库的代币账户
      const createStakeVaultAccountIx = createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey,
        stakeVaultAccount,
        stakeVaultPda,
        wusdMint.publicKey,
        TOKEN_PROGRAM_ID
      );

      const stakeVaultTx = new anchor.web3.Transaction().add(createStakeVaultAccountIx);
      await provider.sendAndConfirm(stakeVaultTx);
      await sleep(1000);

      // 执行质押操作
      await program.methods
        .stake(stakeAmount, stakingPoolId)
        .accounts({
          user: user.publicKey,
          stakeAccount: stakeAccountPda,
          state: statePda,
          wusdMint: wusdMint.publicKey,
          userWusd: userWusdAccount,
          stakeVault: stakeVaultAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();

      const stakeAccount = await program.account.stakeAccount.fetch(
        stakeAccountPda
      );
      assert.equal(stakeAccount.amount.toNumber(), stakeAmount.toNumber());
      console.log("Staking successful");
    } catch (error) {
      console.error("Staking failed:", error);
      throw error;
    }
  });

  it("Soft stake WUSD tokens", async () => {
    try {
      const softStakeAmount = new anchor.BN(500000000); // 500 WUSD
      const stakingPoolId = new anchor.BN(0);
      const accessKey = new Uint8Array(32); // Generate proper access key in production

      // 创建质押金库账户
      const [stakeVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("stake_vault"), softStakeAccountPda.toBuffer()],
        program.programId
      );

      const stakeVaultAccount = await anchor.utils.token.associatedAddress({
        mint: wusdMint.publicKey,
        owner: stakeVaultPda
      });

      // 创建质押金库的代币账户
      const createStakeVaultAccountIx = createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey,
        stakeVaultAccount,
        stakeVaultPda,
        wusdMint.publicKey,
        TOKEN_PROGRAM_ID
      );

      const stakeVaultTx = new anchor.web3.Transaction().add(createStakeVaultAccountIx);
      await provider.sendAndConfirm(stakeVaultTx);
      await sleep(1000);

      await program.methods
        .softStake(softStakeAmount, stakingPoolId, accessKey)
        .accounts({
          user: user.publicKey,
          softStakeAccount: softStakeAccountPda,
          state: statePda,
          wusdMint: wusdMint.publicKey,
          userWusd: userWusdAccount,
          stakeVault: stakeVaultAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();

      const softStakeAccount = await program.account.softStakeAccount.fetch(
        softStakeAccountPda
      );
      assert.equal(softStakeAccount.amount.toNumber(), softStakeAmount.toNumber());
      console.log("Soft staking successful");
    } catch (error) {
      console.error("Soft staking failed:", error);
      throw error;
    }
  });

  it("Withdraw staked tokens", async () => {
    try {
      const withdrawAmount = new anchor.BN(500000000); // 500 WUSD
      const isEmergency = false;

      // 获取质押金库账户
      const [stakeVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("stake_vault"), stakeAccountPda.toBuffer()],
        program.programId
      );

      const stakeVaultAccount = await anchor.utils.token.associatedAddress({
        mint: wusdMint.publicKey,
        owner: stakeVaultPda
      });

      await program.methods
        .withdraw(withdrawAmount, isEmergency)
        .accounts({
          user: user.publicKey,
          stakeAccount: stakeAccountPda,
          state: statePda,
          wusdMint: wusdMint.publicKey,
          userWusd: userWusdAccount,
          stakeVault: stakeVaultAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();

      const stakeAccount = await program.account.stakeAccount.fetch(
        stakeAccountPda
      );
      assert.equal(
        stakeAccount.amount.toNumber(),
        new anchor.BN(500000000).toNumber()
      );

      const tokenBalance = await provider.connection.getTokenAccountBalance(
        userWusdAccount
      );
      console.log("Withdrawal successful");
      console.log("Remaining staked amount:", stakeAccount.amount.toNumber());
      console.log("User token balance:", tokenBalance.value.uiAmount);
    } catch (error) {
      console.error("Withdrawal failed:", error);
      throw error;
    }
  });

  it("Emergency withdraw", async () => {
    try {
      const withdrawAmount = new anchor.BN(500000000); // Remaining 500 WUSD
      const isEmergency = true;

      // 获取质押金库账户
      const [stakeVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("stake_vault"), stakeAccountPda.toBuffer()],
        program.programId
      );

      const stakeVaultAccount = await anchor.utils.token.associatedAddress({
        mint: wusdMint.publicKey,
        owner: stakeVaultPda
      });

      await program.methods
        .withdraw(withdrawAmount, isEmergency)
        .accounts({
          user: user.publicKey,
          stakeAccount: stakeAccountPda,
          state: statePda,
          wusdMint: wusdMint.publicKey,
          userWusd: userWusdAccount,
          stakeVault: stakeVaultAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();

      const stakeAccount = await program.account.stakeAccount.fetch(
        stakeAccountPda
      );
      assert.equal(stakeAccount.amount.toNumber(), 0);
      console.log("Emergency withdrawal successful");
    } catch (error) {
      console.error("Emergency withdrawal failed:", error);
      throw error;
    }
  });
});
