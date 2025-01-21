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
  let usdcMint: PublicKey;
  let treasury: PublicKey;
  let state: PublicKey;
  let userWusd: PublicKey;
  let userUsdc: PublicKey;
  let stakeAccount: PublicKey;

  before(async () => {
    // Create WUSD and USDC mints
    wusdMint = await createMint(
      provider.connection,
      provider.wallet.publicKey,
      authority.publicKey,
      null,
      8
    );

    usdcMint = await createMint(
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

    userUsdc = await createAccount(
      provider.connection,
      provider.wallet.publicKey,
      usdcMint,
      authority.publicKey
    );

    // Create treasury account
    treasury = await createAccount(
      provider.connection,
      provider.wallet.publicKey,
      usdcMint,
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
  });

  it("Initializes the protocol", async () => {
    const tx = await program.methods
      .initialize(8)
      .accounts({
        authority: authority.publicKey,
        state,
        wusdMint,
        usdcMint,
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

  it("Swaps USDC to WUSD", async () => {
    const amount = new anchor.BN(500000); // 0.5 USDC
    const minAmountOut = new anchor.BN(450000); // 允许5%的滑点
    await mintTo(
      provider.connection,
      authority.publicKey,
      usdcMint,
      userUsdc,
      authority.publicKey,
      amount.toNumber()
    );

    const tx = await program.methods
      .swap(amount, minAmountOut, true) // true表示USDC到WUSD的兑换
      .accounts({
        user: authority.publicKey,
        userTokenIn: userUsdc,
        userTokenOut: userWusd,
        vaultTokenIn: treasury,
        tokenProgram: TOKEN_PROGRAM_ID,
        state,
        wusdMint,
        usdcMint,
        treasury
      })
      .rpc();
    console.log("Swap transaction:", tx);
  });
});
