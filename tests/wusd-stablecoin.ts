import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { WusdStablecoin } from "../target/types/wusd_stablecoin";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo, getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
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
    {}
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

    // Create user token accounts if they don't exist
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

    // Send transaction to create user token accounts
    const setupTx = new anchor.web3.Transaction().add(...createUserAccountsIx);
    await provider.sendAndConfirm(setupTx);

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

    // Create PDA token accounts
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
    await provider.sendAndConfirm(pdaAccountsTx);

    // Initialize state PDA
    const [statePda] = await PublicKey.findProgramAddress(
      [Buffer.from(config.seeds.state)],
      program.programId
    );
    state = statePda;

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
  });

  it("Initializes the protocol", async () => {
    const tx = await program.methods
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
    console.log("Initialize transaction:", tx);
  });

  it("Swaps tokens with slippage protection", async () => {
    const amount = new anchor.BN(config.swapAmount);
    const minAmountOut = new anchor.BN(config.swapMinAmountOut);
    
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      collateralMint,
      userCollateral,
      mintAuthority.publicKey,
      amount.toNumber(),
      [mintAuthority]
    );

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
    console.log("Swap transaction:", tx);
  });

  it("Stakes WUSD tokens", async () => {
    const amount = new anchor.BN(config.stakeAmount);
    const staking_pool_id = new anchor.BN(config.stakingPoolId);
    
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      wusdMint,
      userWusd,
      mintAuthority.publicKey,
      amount.toNumber(),
      [mintAuthority]
    );

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
    console.log("Stake transaction:", tx);
  });

  it("Claims staking rewards", async () => {
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
    console.log("Claim transaction:", tx);
  });

  it("Soft stakes WUSD tokens", async () => {
    const amount = new anchor.BN(config.stakeAmount);
    const staking_pool_id = new anchor.BN(config.stakingPoolId);
    const access_key = Buffer.alloc(32);
    crypto.randomFillSync(access_key);

    await mintTo(
      provider.connection,
      provider.wallet.payer,
      wusdMint,
      userWusd,
      mintAuthority.publicKey,
      amount.toNumber(),
      [mintAuthority]
    );

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
    console.log("Soft stake transaction:", tx);
  });

  it("Claims soft staking rewards", async () => {
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
    console.log("Soft claim transaction:", tx);
  });

  it("Withdraws staked tokens", async () => {
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
    console.log("Withdraw transaction:", tx);
  });

  it("Pauses and unpauses the contract", async () => {
    // Pause contract
    let tx = await program.methods
      .pause()
      .accounts({
        authority: authority.publicKey,
        state,
      })
      .rpc();
    console.log("Pause transaction:", tx);

    // Unpause contract
    tx = await program.methods
      .unpause()
      .accounts({
        authority: authority.publicKey,
        state,
      })
      .rpc();
    console.log("Unpause transaction:", tx);
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
    } catch (err) {
      assert.equal(err.error.errorCode.code, "Unauthorized");
    }
  });

  it("Fails when staking amount is too low", async () => {
    try {
      const amount = new anchor.BN(config.minStakingAmount - 1); // 使用比最小质押金额更小的值
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
