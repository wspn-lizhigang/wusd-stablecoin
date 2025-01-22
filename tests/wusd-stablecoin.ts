import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { WusdStablecoin } from "../target/types/wusd_stablecoin";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo } from "@solana/spl-token";

describe("wusd-stablecoin", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.WusdStablecoin as Program<WusdStablecoin>;
  const authority = provider.wallet;
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
      provider.wallet.publicKey,
      authority.publicKey,
      null,
      8
    );

    collateralMint = await createMint(
      provider.connection,
      provider.wallet.publicKey,
      authority.publicKey,
      null,
      6
    );

    // Create user token accounts
    userWusd = await createAccount(
      provider.connection,
      provider.wallet.publicKey,
      wusdMint,
      authority.publicKey
    );

    userCollateral = await createAccount(
      provider.connection,
      provider.wallet.publicKey,
      collateralMint,
      authority.publicKey
    );

    // Create treasury account
    treasury = await createAccount(
      provider.connection,
      provider.wallet.publicKey,
      collateralMint,
      authority.publicKey
    );

    // Derive PDA for state
    [state] = await PublicKey.findProgramAddress(
      [Buffer.from("state")],
      program.programId
    );

    // Derive PDA for stake account
    [stakeAccount] = await PublicKey.findProgramAddress(
      [Buffer.from("stake"), authority.publicKey.toBuffer()],
      program.programId
    );

    // Derive PDA for soft stake account
    [softStakeAccount] = await PublicKey.findProgramAddress(
      [Buffer.from("softstake"), authority.publicKey.toBuffer()],
      program.programId
    );

    // Create stake vault
    stakeVault = await createAccount(
      provider.connection,
      provider.wallet.publicKey,
      wusdMint,
      authority.publicKey
    );
  });

  it("Initializes the protocol", async () => {
    const tx = await program.methods
      .initialize(8)
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
    const amount = new anchor.BN(500000); // 0.5 tokens
    const minAmountOut = new anchor.BN(450000); // 5% slippage tolerance
    
    await mintTo(
      provider.connection,
      authority.publicKey,
      collateralMint,
      userCollateral,
      authority.publicKey,
      amount.toNumber()
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
    const amount = new anchor.BN(1000000); // 1 WUSD
    const staking_pool_id = new anchor.BN(1);
    
    await mintTo(
      provider.connection,
      authority.publicKey,
      wusdMint,
      userWusd,
      authority.publicKey,
      amount.toNumber()
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
    const amount = new anchor.BN(1000000); // 1 WUSD
    const staking_pool_id = new anchor.BN(1);
    const access_key = Buffer.alloc(32);
    crypto.randomFillSync(access_key);

    await mintTo(
      provider.connection,
      authority.publicKey,
      wusdMint,
      userWusd,
      authority.publicKey,
      amount.toNumber()
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
    const amount = new anchor.BN(500000); // 0.5 WUSD
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
      const amount = new anchor.BN(1); // Very small amount
      const staking_pool_id = new anchor.BN(1);
      
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
