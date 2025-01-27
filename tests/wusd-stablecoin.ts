import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { WusdStablecoin } from "../target/types/wusd_stablecoin";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, mintTo, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import * as fs from 'fs';
import * as crypto from 'crypto';
import { assert } from 'chai';
import { config } from './config';

describe("wusd-stablecoin", () => {
  let state: PublicKey;
  let wusdMint: PublicKey;
  let collateralMint: PublicKey;
  let treasury: PublicKey;
  let userWusd: PublicKey;
  let userCollateral: PublicKey;
  let stakeAccount: PublicKey;
  let softStakeAccount: PublicKey;
  let stakeVault: PublicKey;

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
        
        if (error.message && error.message.includes("State account not found")) {
          console.log("Program already initialized, checking state account...");
          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
            continue;
          }
        }
        
        if (error.error?.errorCode?.code === "Unauthorized" ||
            error.error?.errorCode?.code === "StakingAmountTooLow") {
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

  const provider = new anchor.AnchorProvider(
    new anchor.web3.Connection(config.rpcUrl, config.connectionConfig),
    new anchor.Wallet(anchor.web3.Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync(config.deployKeyPath, 'utf-8')))
    )),
    config.connectionConfig
  );
  anchor.setProvider(provider);

  let program: Program<WusdStablecoin>;
  const authority = provider.wallet;
  const mintAuthority = anchor.web3.Keypair.generate();

  program = anchor.workspace.WusdStablecoin as Program<WusdStablecoin>;
  if (!program || !program.programId) {
    throw new Error("Program not properly initialized");
  }

  before(async () => {
    try {
      await retry(async () => {
        const [statePda] = await PublicKey.findProgramAddress(
          [Buffer.from(config.seeds.state)],
          program.programId
        );
        state = statePda;

        try {
          const stateInfo = await provider.connection.getAccountInfo(state);
          if (stateInfo) {
            console.log("State account already exists, proceeding with existing account");
            const stateData = await program.account.stateAccount.fetch(state);
            wusdMint = stateData.wusdMint;
            collateralMint = stateData.collateralMint;
            treasury = stateData.treasury;
            return;
          }
        } catch (e) {
          console.log("Error checking state account:", e);
        }

        const wusdMintKeypair = anchor.web3.Keypair.generate();
        const collateralMintKeypair = anchor.web3.Keypair.generate();
        
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

        await program.methods.initialize(config.wusdDecimals)
          .accounts({
            authority: authority.publicKey,
            state,
            wusdMint: wusdMintKeypair.publicKey,
            collateralMint: collateralMintKeypair.publicKey,
            treasury: treasuryAta,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([authority.payer])
          .rpc({ commitment: 'confirmed' });

        wusdMint = wusdMintKeypair.publicKey;
        collateralMint = collateralMintKeypair.publicKey;
        treasury = treasuryAta;

        userWusd = await getAssociatedTokenAddress(
          wusdMint,
          provider.wallet.publicKey
        );

        userCollateral = await getAssociatedTokenAddress(
          collateralMint,
          provider.wallet.publicKey
        );

        const createUserWusdAccountIx = await createAssociatedTokenAccountInstruction(
          authority.publicKey,
          userWusd,
          authority.publicKey,
          wusdMint
        );

        const createUserCollateralAccountIx = await createAssociatedTokenAccountInstruction(
          authority.publicKey,
          userCollateral,
          authority.publicKey,
          collateralMint
        );

        const createAccountsTx = new anchor.web3.Transaction()
          .add(createUserWusdAccountIx)
          .add(createUserCollateralAccountIx);

        await provider.sendAndConfirm(createAccountsTx);

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
            state,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        return true;
      });
    } catch (e) {
      console.error("Setup error:", e);
      throw e;
    }
  });

  describe("Protocol Initialization", () => {
    it("Successfully initializes the protocol", async () => {
      assert.ok(true);
    });
  });

  describe("Token Operations", () => {
    it("Successfully swaps tokens with slippage protection", async () => {
      try {
        const amount = new anchor.BN(config.swapAmount);
        const minAmountOut = new anchor.BN(config.swapMinAmountOut);
        
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
        await provider.sendAndConfirm(mintTx, [mintAuthority], { commitment: 'confirmed' });
        const tx = await program.methods
          .swap(amount, minAmountOut)
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
        
        await provider.connection.confirmTransaction(tx, 'confirmed');
      } catch (e) {
        console.error("Swap error:", e);
        throw e;
      }
    });
  });

  describe("Staking Operations", () => {
    it("Successfully stakes WUSD tokens", async () => {
      try {
        const amount = new anchor.BN(config.stakeAmount);
        const staking_pool_id = new anchor.BN(config.stakingPoolId);
        
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
        await provider.sendAndConfirm(mintTx, [mintAuthority], { commitment: 'confirmed' });
        const tx = await program.methods
          .stake(amount, staking_pool_id)
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
        
        await provider.connection.confirmTransaction(tx, 'confirmed');
      } catch (e) {
        console.error("Stake error:", e);
        throw e;
      }
    });

    it("Claims staking rewards", async () => {
      try {
        const tx = await program.methods
          .claim()
          .accounts({
            user: authority.publicKey,
            stakeAccount,
            userWusd,
            wusdMint,
            state,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([authority.payer])
          .rpc();
        
        await provider.connection.confirmTransaction(tx, 'confirmed');
      } catch (e) {
        console.error("Claim error:", e);
        throw e;
      }
    });

    it("Soft stakes WUSD tokens", async () => {
      try {
        const amount = new anchor.BN(config.stakeAmount);
        const staking_pool_id = new anchor.BN(config.stakingPoolId);
        const access_key = Buffer.alloc(32);
        crypto.randomFillSync(access_key);

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
        await provider.sendAndConfirm(mintTx, [mintAuthority], { commitment: 'confirmed' });
        const tx = await program.methods
          .softStake(amount, staking_pool_id, access_key)
          .accounts({
            user: authority.publicKey,
            userWusd,
            stakeAccount: softStakeAccount,
            stakeVault,
            state,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([authority.payer])
          .rpc();
        
        await provider.connection.confirmTransaction(tx, 'confirmed');
      } catch (e) {
        console.error("Soft stake error:", e);
        throw e;
      }
    });

    it("Claims soft staking rewards", async () => {
      try {
        const tx = await program.methods
          .softClaim()
          .accounts({
            user: authority.publicKey,
            stakeAccount: softStakeAccount,
            userWusd,
            wusdMint,
            state,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([authority.payer])
          .rpc();
        
        await provider.connection.confirmTransaction(tx, 'confirmed');
      } catch (e) {
        console.error("Soft claim error:", e);
        throw e;
      }
    });

    it("Withdraws staked tokens", async () => {
      try {
        const amount = new anchor.BN(config.withdrawAmount);
        const is_emergency = false;

        const tx = await program.methods
          .withdraw(amount, is_emergency)
          .accounts({
            user: authority.publicKey,
            stakeAccount,
            userWusd,
            stakeVault,
            state,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([authority.payer]
