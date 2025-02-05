import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { WusdToken } from "../target/types/wusd_token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, mintTo, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { config } from './config';
import { newAccountWithLamports } from './util/new-account-with-lamports';
import { Metaplex } from "@metaplex-foundation/js";

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

      // 初始化 Metaplex
      const metaplex = new Metaplex(provider.connection);
      metaplex.use(provider.wallet);

      // 设置代币元数据
      await metaplex.nfts().create({
        uri: "", // 可选：添加元数据 URI
        name: "WUSD Stablecoin",
        symbol: "WUSD",
        sellerFeeBasisPoints: 0,
        decimals: 8,
        creators: null,
        isMutable: true,
        maxSupply: null,
        uses: null,
        collection: null,
        mint: mint,
      });

      console.log('代币元数据设置成功');
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

    it("Successfully transfers tokens", async () => {
      const amount = new anchor.BN(1000000); // 1 WUSD
      const recipient = anchor.web3.Keypair.generate();
      const recipientToken = await getAssociatedTokenAddress(mint, recipient.publicKey);

      // 创建接收者代币账户
      const createRecipientAccountIx = createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey,
        recipientToken,
        recipient.publicKey,
        mint
      );

      // 铸造代币给发送者
      await mintTo(
        provider.connection,
        provider.wallet.payer,
        mint,
        userToken,
        mintAuthority,
        amount.toNumber()
      );

      // 创建接收者账户并转账
      const setupAndTransferTx = new anchor.web3.Transaction()
        .add(createRecipientAccountIx);

      await provider.sendAndConfirm(setupAndTransferTx);

      const tx = await program.methods
        .transfer(amount)
        .accounts({
          from: userToken,
          to: recipientToken,
          authority: provider.wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      await provider.connection.confirmTransaction(tx, 'confirmed');
    });

    it("Successfully approves and transfers tokens", async () => {
      const amount = new anchor.BN(1000000); // 1 WUSD
      const delegate = anchor.web3.Keypair.generate();
      const recipient = anchor.web3.Keypair.generate();
      const recipientToken = await getAssociatedTokenAddress(mint, recipient.publicKey);

      // 创建接收者代币账户
      const createRecipientAccountIx = createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey,
        recipientToken,
        recipient.publicKey,
        mint
      );

      // 铸造代币给发送者
      await mintTo(
        provider.connection,
        provider.wallet.payer,
        mint,
        userToken,
        mintAuthority,
        amount.toNumber()
      );

      // 创建接收者账户
      await provider.sendAndConfirm(
        new anchor.web3.Transaction().add(createRecipientAccountIx)
      );

      // 授权委托
      const approveTx = await program.methods
        .approve(amount)
        .accounts({
          source: userToken,
          delegate: delegate.publicKey,
          authority: provider.wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      await provider.connection.confirmTransaction(approveTx, 'confirmed');

      // 委托转账
      const transferTx = await program.methods
        .transferFrom(amount)
        .accounts({
          from: userToken,
          to: recipientToken,
          authority: delegate.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([delegate])
        .rpc();

      await provider.connection.confirmTransaction(transferTx, 'confirmed');
    });

    it("Fails when unauthorized user tries to mint tokens", async () => {
      const amount = new anchor.BN(1000000); // 1 WUSD
      const unauthorizedUser = anchor.web3.Keypair.generate();

      try {
        await program.methods
          .mintToken(amount)
          .accounts({
            authority: unauthorizedUser.publicKey,
            mint,
            tokenAccount: userToken,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([unauthorizedUser])
          .rpc();
        assert.fail("Expected error but transaction succeeded");
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
      }
    });

    it("Fails when unauthorized user tries to burn tokens", async () => {
      const amount = new anchor.BN(500000); // 0.5 WUSD
      const unauthorizedUser = anchor.web3.Keypair.generate();

      try {
        await program.methods
          .burnToken(amount)
          .accounts({
            authority: unauthorizedUser.publicKey,
            mint,
            tokenAccount: userToken,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([unauthorizedUser])
          .rpc();
        assert.fail("Expected error but transaction succeeded");
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
      }
    });
  });
});