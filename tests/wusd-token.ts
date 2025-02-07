import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { WusdToken } from "../target/types/wusd_token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, mintTo, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { config } from './wusd-token-config';
import { newAccountWithLamports } from './util/new-account-with-lamports';

describe("WUSD Token", () => {
  // 重试函数
  async function retry<T>(fn: () => Promise<T>, retries = config.maxRetries, delay = config.retryDelay): Promise<T> {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        console.log(`重试尝试 ${i + 1}/${retries} 失败:`, error.message);
        
        // 检查是否是不可重试的错误
        if (error.error?.errorCode?.code === config.errorCodes.Unauthorized ||
            error.error?.errorCode?.code === config.errorCodes.InsufficientFunds ||
            error.error?.errorCode?.code === config.errorCodes.InvalidAmount ||
            error.error?.errorCode?.code === config.errorCodes.AccountNotInitialized ||
            error.error?.errorCode?.code === config.errorCodes.ProgramPaused) {
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

  // 配置程序提供者
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = (provider.wallet as anchor.Wallet).payer;

  // 初始化程序
  const program = anchor.workspace.WusdToken as Program<WusdToken>;
  const mintAuthority = anchor.web3.Keypair.generate();

  let wusdMint: PublicKey;
  let userWusd: PublicKey;
  let state: PublicKey;

  beforeEach(async () => {
    try {
      // 为payer账户空投SOL
      const airdropSignature = await provider.connection.requestAirdrop(payer.publicKey, 10000000000); // 10 SOL
      await provider.connection.confirmTransaction(airdropSignature, 'confirmed');

      // 创建测试账户并获取SOL
      const testAccount = await newAccountWithLamports(
        provider.connection,
        10000000000 // 10 SOL
      );
      console.log('测试账户创建成功:', testAccount.publicKey.toString());

      // 获取状态PDA
      const [statePda] = await PublicKey.findProgramAddress(
        [Buffer.from(config.seeds.state)],
        program.programId
      );
      state = statePda;

      // 检查状态账户
      let stateAccountInfo = await provider.connection.getAccountInfo(state);
      if (!stateAccountInfo || stateAccountInfo.data.length === 0) {
        // 创建代币铸造账户
        wusdMint = await createMint(
          provider.connection,
          provider.wallet.payer,
          provider.wallet.publicKey,
          provider.wallet.publicKey,
          config.wusdDecimals
        );

        console.log('铸币账户创建成功');

        // 创建用户代币账户
        userWusd = await getAssociatedTokenAddress(wusdMint, testAccount.publicKey);

        const createUserAccountIx = createAssociatedTokenAccountInstruction(
          payer.publicKey,
          userWusd,
          testAccount.publicKey,
          wusdMint
        );

        const setupTx = new anchor.web3.Transaction().add(createUserAccountIx);
        await provider.sendAndConfirm(setupTx);
        console.log('用户代币账户创建成功');

        // 初始化代币程序状态
        // 获取所有需要的PDA
        const [authorityPda] = await PublicKey.findProgramAddress([Buffer.from("authority")], program.programId);
        const [mintStatePda] = await PublicKey.findProgramAddress([Buffer.from("mint_state")], program.programId);
        const [pauseStatePda] = await PublicKey.findProgramAddress([Buffer.from("pause_state")], program.programId);

        let tx = await program.methods
          .initialize(config.wusdDecimals)
          .accounts({
            authority: provider.wallet.publicKey,
            mint: wusdMint,
            authority_state: authorityPda,
            mint_state: mintStatePda,
            pause_state: pauseStatePda,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY
          })
          .signers([provider.wallet.payer])
          .preInstructions([
            anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 1000000 })
          ])
          .rpc({ skipPreflight: true });

        await provider.connection.confirmTransaction(tx, 'confirmed');
        console.log('代币程序状态初始化成功');
      } else {
        console.log('状态账户已存在，加载现有配置...');
        const stateAccount = await program.account.state.fetch(state);
        wusdMint = stateAccount.wusdMint;

        // 获取用户代币账户
        userWusd = await getAssociatedTokenAddress(wusdMint, provider.wallet.publicKey);
      }
    } catch (e) {
      console.error('设置过程发生错误:', e);
      throw e;
    }
  });

  describe("Token Initialization", () => {
    it("Successfully initializes the token program", async () => {
      const stateAccount = await program.account.state.fetch(state);
      expect(stateAccount.wusdMint.equals(wusdMint)).to.be.true;
      expect(stateAccount.decimals).to.equal(config.wusdDecimals);
    });
  });

  describe("Token Operations", () => {
    it("Successfully mints tokens", async () => {
      try {
        await retry(async () => {
          const amount = new anchor.BN(config.mintAmount);
          
          // 执行铸币
          const tx = await program.methods
            .mint(amount)
            .accounts({
              authority: provider.wallet.publicKey,
              recipient: userWusd,
              state,
              wusdMint,
              tokenProgram: TOKEN_PROGRAM_ID,
            })
            .rpc();

          await provider.connection.confirmTransaction(tx, 'confirmed');
          return true;
        });
      } catch (e) {
        console.error('铸币操作失败:', e);
        throw e;
      }
    });

    it("Successfully transfers tokens", async () => {
      try {
        await retry(async () => {
          const amount = new anchor.BN(config.transferAmount);
          const recipient = anchor.web3.Keypair.generate();
          const recipientAta = await getAssociatedTokenAddress(wusdMint, recipient.publicKey);

          // 创建接收方代币账户
          const createRecipientAtaIx = createAssociatedTokenAccountInstruction(
            provider.wallet.publicKey,
            recipientAta,
            recipient.publicKey,
            wusdMint
          );

          // 执行转账
          const tx = await program.methods
            .transfer(amount)
            .accounts({
              sender: provider.wallet.publicKey,
              senderToken: userWusd,
              recipientToken: recipientAta,
              state,
              tokenProgram: TOKEN_PROGRAM_ID,
            })
            .preInstructions([createRecipientAtaIx])
            .rpc();

          await provider.connection.confirmTransaction(tx, 'confirmed');
          return true;
        });
      } catch (e) {
        console.error('转账操作失败:', e);
        throw e;
      }
    });

    it("Successfully burns tokens", async () => {
      try {
        await retry(async () => {
          const amount = new anchor.BN(config.burnAmount);
          
          // 执行销毁
          const tx = await program.methods
            .burn(amount)
            .accounts({
              owner: provider.wallet.publicKey,
              ownerToken: userWusd,
              state,
              wusdMint,
              tokenProgram: TOKEN_PROGRAM_ID,
            })
            .rpc();

          await provider.connection.confirmTransaction(tx, 'confirmed');
          return true;
        });
      } catch (e) {
        console.error('销毁操作失败:', e);
        throw e;
      }
    });
  });

  describe("Program Administration", () => {
    it("Successfully pauses and unpauses the program", async () => {
      try {
        await retry(async () => {
          // 暂停程序
          const pauseTx = await program.methods
            .pause()
            .accounts({
              authority: provider.wallet.publicKey,
              state,
            })
            .rpc();

          await provider.connection.confirmTransaction(pauseTx, 'confirmed');
          
          // 验证程序已暂停
          let stateAccount = await program.account.state.fetch(state);
          expect(stateAccount.paused).to.be.true;

          // 恢复程序
          const unpauseTx = await program.methods
            .unpause()
            .accounts({
              authority: provider.wallet.publicKey,
              state,
            })
            .rpc();

          await provider.connection.confirmTransaction(unpauseTx, 'confirmed');
          
          // 验证程序已恢复
          stateAccount = await program.account.state.fetch(state);
          expect(stateAccount.paused).to.be.false;
          
          return true;
        });
      } catch (e) {
        console.error('程序暂停/恢复操作失败:', e);
        throw e;
      }
    });

    it("Fails when unauthorized user tries to pause the program", async () => {
      const unauthorizedUser = anchor.web3.Keypair.generate();
      try {
        await program.methods
          .pause()
          .accounts({
            authority: unauthorizedUser.publicKey,
            state,
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