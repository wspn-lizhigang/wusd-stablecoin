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
  const provider = new anchor.AnchorProvider(
    new anchor.web3.Connection(config.rpcUrl),
    new anchor.Wallet(anchor.web3.Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync(config.deployKeyPath, 'utf-8')))
    )),
    { commitment: 'confirmed' }
  );
  anchor.setProvider(provider);

  const program = anchor.workspace.WusdStablecoin as Program<WusdStablecoin>;
  const authority = provider.wallet;
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

  before(async () => {
    try {
      // Get state PDA
      const [statePda] = await PublicKey.findProgramAddress(
        [Buffer.from(config.seeds.state)],
        program.programId
      );
      state = statePda;

      // Create WUSD and collateral mints
      wusdMint = await createMint(
        provider.connection,
        provider.wallet.payer,
        mintAuthority.publicKey,
        mintAuthority.publicKey,
        config.wusdDecimals
      );

      collateralMint = await createMint(
        provider.connection,
        provider.wallet.payer,
        mintAuthority.publicKey,
        mintAuthority.publicKey,
        config.collateralDecimals
      );

      // Get user token accounts
      userWusd = await getAssociatedTokenAddress(
        wusdMint,
        provider.wallet.publicKey
      );

      userCollateral = await getAssociatedTokenAddress(
        collateralMint,
        provider.wallet.publicKey
      );

      // Create user token accounts
      const createUserAccountsIx = [
        createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          userWusd,
          provider.wallet.publicKey,
          wusdMint
        ),
        createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          userCollateral,
          provider.wallet.publicKey,
          collateralMint
        )
      ];

      const setupTx = new anchor.web3.Transaction().add(...createUserAccountsIx);
      await provider.sendAndConfirm(setupTx, [], { commitment: 'confirmed' });

      // Create stake vault PDA and treasury PDA
      const [vaultPda] = await PublicKey.findProgramAddress(
        [Buffer.from(config.seeds.stakeVault)],
        program.programId
      );

      const [treasuryPda] = await PublicKey.findProgramAddress(
        [Buffer.from(config.seeds.treasury)],
        program.programId
      );
      
      // Get associated token addresses for PDAs
      stakeVault = await getAssociatedTokenAddress(
        wusdMint,
        vaultPda,
        true
      );

      treasury = await getAssociatedTokenAddress(
        collateralMint,
        treasuryPda,
        true
      );

      // Create PDA token accounts before state initialization
      const createPdaAccountsIx = [
        createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          stakeVault,
          vaultPda,
          wusdMint
        ),
        createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          treasury,
          treasuryPda,
          collateralMint
        )
      ];

      const pdaAccountsTx = new anchor.web3.Transaction().add(...createPdaAccountsIx);
      await provider.sendAndConfirm(pdaAccountsTx, [], { commitment: 'confirmed' });

      // Initialize the protocol state after creating token accounts
      let tx = await program.methods
        .initialize(config.wusdDecimals)
        .accounts({
          authority: authority.publicKey,
          state,
          wusdMint,
          collateralMint,
          treasury,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      
      await provider.connection.confirmTransaction(tx, 'confirmed');

      // Create stake account PDA
      const [stakeAccountPda] = await PublicKey.findProgramAddress(
        [Buffer.from(config.seeds.stakeAccount), provider.wallet.publicKey.toBuffer()],
        program.programId
      );
      stakeAccount = stakeAccountPda;

      // Create soft stake account PDA
      const [softStakeAccountPda] = await PublicKey.findProgramAddress(
        [Buffer.from(config.seeds.softStakeAccount), provider.wallet.publicKey.toBuffer()],
        program.programId
      );
      softStakeAccount = softStakeAccountPda;

    } catch (e) {
      console.error("Setup error:", e);
      throw e;
    }
  });

  it("Initializes the protocol", async () => {
    try {
      // Initialize the protocol state
      let tx = await program.methods
        .initialize(config.wusdDecimals)
        .accounts({
          authority: authority.publicKey,
          state,
          wusdMint,
          collateralMint,
          treasury,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      
      await provider.connection.confirmTransaction(tx, 'confirmed');

      // Initialize stake account
      tx = await program.methods
        .initializeStakeAccount()
        .accounts({
          user: authority.publicKey,
          stakeAccount,
          state,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      await provider.connection.confirmTransaction(tx, 'confirmed');

      // Initialize soft stake account
      tx = await program.methods
        .initializeSoftStakeAccount()
        .accounts({
          user: authority.publicKey,
          stakeAccount: softStakeAccount,
          state,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      await provider.connection.confirmTransaction(tx, 'confirmed');
    } catch (e) {
      console.error("Initialization error:", e);
      throw e;
    }
  });

  it("Swaps tokens with slippage protection", async () => {
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
        .rpc();
      
      await provider.connection.confirmTransaction(tx, 'confirmed');
    } catch (e) {
      console.error("Swap error:", e);
      throw e;
    }
  });

  it("Stakes WUSD tokens", async () => {
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
        .rpc();
      
      await provider.connection.confirmTransaction(tx, 'confirmed');
    } catch (e) {
      console.error("Withdraw error:", e);
      throw e;
    }
  });

  it("Pauses and unpauses the contract", async () => {
    try {
      // Pause contract
      let tx = await program.methods
        .pause()
        .accounts({
          authority: authority.publicKey,
          state,
        })
        .rpc();
      
      await provider.connection.confirmTransaction(tx, 'confirmed');

      // Unpause contract
      tx = await program.methods
        .unpause()
        .accounts({
          authority: authority.publicKey,
          state,
        })
        .rpc();
      
      await provider.connection.confirmTransaction(tx, 'confirmed');
    } catch (e) {
      console.error("Pause/Unpause error:", e);
      throw e;
    }
  });

  // Error cases
  it("Fails when unauthorized user tries to pause", async () => {
    try {
      const unauthorized = anchor.web3.Keypair.generate();
      await program.methods
        .pause()
        .accounts({
          authority: unauthorized.publicKey,
          state,
        })
        .signers([unauthorized])
        .rpc();
      assert.fail("Expected error");
    } catch (err: any) {
      assert.equal(err.error.errorCode.code, "Unauthorized");
    }
  });

  it("Fails when staking amount is too low", async () => {
    try {
      const amount = new anchor.BN(config.minStakingAmount - 1);
      const staking_pool_id = new anchor.BN(config.stakingPoolId);
      
      await program.methods
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
        .rpc();
      assert.fail("Expected error");
    } catch (err) {
      assert.equal(err.error.errorCode.code, "StakingAmountTooLow");
    }
  });
});
