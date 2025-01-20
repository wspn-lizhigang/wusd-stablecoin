import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { WusdStablecoin } from "../target/types/wusd_stablecoin";

describe("wusd-stablecoin", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.WusdStablecoin as Program<WusdStablecoin>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize(8).rpc();
    console.log("Your transaction signature", tx);
  });
});
