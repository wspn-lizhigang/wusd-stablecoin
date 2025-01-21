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

  it("Swaps collateral to WUSD", async () => {
    const amount = new anchor.BN(500000); // 0.5 collateral tokens
    const minAmountOut = new anchor.BN(450000); // 允许5%的滑点
    await mintTo(
      provider.connection,
      authority.publicKey,
      collateralMint,
      userCollateral,
      authority.publicKey,
      amount.toNumber()
    );

    const tx = await program.methods
      .swap(amount, minAmountOut, true) // true表示collateral到WUSD的兑换
      .accounts({
        user: authority.publicKey,
        userTokenIn: userCollateral,
        userTokenOut: userWusd,
        vaultTokenIn: treasury,
        tokenProgram: TOKEN_PROGRAM_ID,
        state,
        wusdMint,
        collateralMint,
        treasury
      })
      .rpc();
    console.log("Swap transaction:", tx);
  });

  it("Soft stakes WUSD", async () => {
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

  it("Claims soft stake rewards", async () => {
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

  it("Stakes WUSD", async () => {
    const amount = new anchor.BN(1000000); // 1 WUSD
    await mintTo(
      provider.connection,
      authority.publicKey,
      wusdMint,
      userWusd,
      authority.publicKey,
      amount.toNumber()
    );

    const tx = await program.methods
      .stake(amount)
      .accounts({
        user: authority.publicKey,
        userWusd,
        state,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    console.log("Stake transaction:", tx);
  });

  it("Claims rewards", async () => {
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

  it("Swaps collateral to WUSD again", async () => {
    const amount = new anchor.BN(500000); // 0.5 collateral tokens
    const minAmountOut = new anchor.BN(450000); // 允许5%的滑点
    await mintTo(
      provider.connection,
      authority.publicKey,
      collateralMint,
      userCollateral,
      authority.publicKey,
      amount.toNumber()
    );

    const tx = await program.methods
      .swap(amount, minAmountOut, true) // true表示collateral到WUSD的兑换
      .accounts({
        user: authority.publicKey,
        userTokenIn: userCollateral,
        userTokenOut: userWusd,
        vaultTokenIn: treasury,
        tokenProgram: TOKEN_PROGRAM_ID,
        state,
        wusdMint,
        collateralMint,
        treasury
      })
      .rpc();
    console.log("Swap transaction:", tx);
  });
});
