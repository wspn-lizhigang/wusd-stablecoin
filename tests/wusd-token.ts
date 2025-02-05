import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { WusdToken } from "../target/types/wusd_token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, mintTo, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { config } from './config';
import { newAccountWithLamports } from './util/new-account-with-lamports';

describe("WUSD Token", () => {
  // 配置程序提供者
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // 初始化程序
  const program = anchor.workspace.WusdToken as Program<WusdToken>;
  const mintAuthority = anchor.web3.Keypair.generate();

  let mint: PublicKey;
  let state: PublicKey;
  let userToken: PublicKey;

  beforeEach(async () => {
    try {
      // 创建测试账户
      const testAccount = await newAccountWithLamports(
        provider.connection,
        1000000000 // 1 SOL
      );
      console.log('测试账户创建成功:', testAccount.publicKey.toString());

      // 获取状态PDA
      const [statePda] = await PublicKey.findProgramAddress(
        [Buffer.from("token_state")],
        program.programId
      );
      state = statePda;

      // 检查状态账户
      let stateAccountInfo = await provider.connection.getAccountInfo(state);
      if (!stateAccountInfo || stateAccountInfo.data.length === 0) {
        // 创建代币铸造账户
        mint = await createMint(
          provider.connection,
          testAccount,
          mintAuthority.publicKey,
          mintAuthority.publicKey,
          config.wusdDecimals
        );

        console.log('铸币账户创建成功');

        // 创建用户代币账户
        userToken = await getAssociatedTokenAddress(mint, testAccount.publicKey);

        const createUserAccountIx = createAssociatedTokenAccountInstruction(
          testAccount.publicKey,
          userToken,
          testAccount.publicKey,
          mint
        );

        const setupTx = new anchor.web3.Transaction().add(createUserAccountIx);
        await provider.sendAndConfirm(setupTx, [testAccount]);
        console.log('用户代币账户创建成功');

        // 初始化代币状态
        let tx = await program.methods
          .initialize(config.wusdDecimals)
          .accounts({
            authority: testAccount.publicKey,
            state,
            mint,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([testAccount])
          .rpc();

        await provider.connection.confirmTransaction(tx, 'confirmed');
        console.log('代币状态初始化成功');
      } else {
        console.log('状态账户已存在，加载现有配置...');
        const stateAccount = await program.account.tokenState.fetch(state);
        mint = stateAccount.mint;
        userToken = await getAssociatedTokenAddress(mint, provider.wallet.publicKey);
      }
    } catch (e) {
      console.error('设置过程发生错误:', e);
      throw e;
    }
  });

  describe("Token Operations", () => {
    it("Successfully initializes the token", async () => {
      const stateAccount = await program.account.tokenState.fetch(state);
      expect(stateAccount.mint.equals(mint)).to.be.true;
      expect(stateAccount.decimals).to.equal(config.wusdDecimals);
    });

    it("Successfully mints tokens", async () => {
      const amount = new anchor.BN(1000000); // 1 WUSD

      const tx = await program.methods
        .mintToken(amount)
        .accounts({
          authority: mintAuthority.publicKey,
          mint,
          tokenAccount: userToken,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([mintAuthority])
        .rpc();

      await provider.connection.confirmTransaction(tx, 'confirmed');
    });

    it("Successfully burns tokens", async () => {
      const amount = new anchor.BN(500000); // 0.5 WUSD

      const tx = await program.methods
        .burnToken(amount)
        .accounts({
          authority: mintAuthority.publicKey,
          mint,
          tokenAccount: userToken,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([mintAuthority])
        .rpc();

      await provider.connection.confirmTransaction(tx, 'confirmed');
    });
  });
});