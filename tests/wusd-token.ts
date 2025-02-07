import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { WusdToken } from "../target/types/wusd_token";
import { 
  PublicKey, 
  SystemProgram, 
  Keypair 
} from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID, 
  createMint, 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction 
} from "@solana/spl-token";
import { config } from './wusd-token-config';
import { expect } from "chai";
import { newAccountWithLamports } from './util/new-account-with-lamports';

describe("WUSD Token", () => { 
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.WusdToken as Program<WusdToken>;
  const payer = (provider.wallet as anchor.Wallet).payer;

  // PDA缓存
  let statePda: PublicKey;
  let authorityPda: PublicKey;
  let mintStatePda: PublicKey;
  let pauseStatePda: PublicKey;
  let wusdMint: PublicKey;
  let mintKeypair: Keypair;
  
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
  
  // 初始化PDA
  async function initializePdas() {
    [statePda] = PublicKey.findProgramAddressSync(
      [Buffer.from(config.seeds.state)],
      program.programId
    );
    [authorityPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("authority")],
      program.programId
    );
    [mintStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint_state")],
      program.programId
    );
    [pauseStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("pause_state")],
      program.programId
    );
  }

  beforeEach(async () => {
    await initializePdas();
    
    // 创建并初始化测试账户
    const testAccount = await newAccountWithLamports(
      provider.connection,
      10000000000 // 10 SOL
    );
    
    // 确保账户有足够的SOL
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(testAccount.publicKey, 5000000000),
      'confirmed'
    );
    
    // 清理PDA账户
    try {
      const pdaAccounts = [authorityPda, mintStatePda, pauseStatePda];
      for (const pda of pdaAccounts) {
        const accountInfo = await provider.connection.getAccountInfo(pda);
        if (accountInfo) {
          await provider.connection.sendTransaction(
            new anchor.web3.Transaction().add(
              anchor.web3.SystemProgram.assign({
                accountPubkey: pda,
                programId: SystemProgram.programId,
              })
            ),
            [testAccount]
          );
        }
      }
    } catch (e) {
      console.log('清理PDA账户时出错，继续执行:', e);
    }
    
    // 创建Mint账户
    mintKeypair = Keypair.generate();
    wusdMint = mintKeypair.publicKey;
    
    // 创建代币账户所需的最小余额
    const mintRent = await provider.connection.getMinimumBalanceForRentExemption(165);
    
    // 初始化程序状态
    await program.methods.initialize(config.wusdDecimals)
      .accounts({
        authority: provider.wallet.publicKey, // 使用provider的钱包作为权限账户
        mint: wusdMint,
        authority_state: authorityPda,
        mint_state: mintStatePda,
        pause_state: pauseStatePda,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY
      })
      .signers([mintKeypair]) // 只需要mintKeypair作为签名者
      .preInstructions([
        SystemProgram.createAccount({
          fromPubkey: provider.wallet.publicKey, // 使用provider的钱包作为支付账户
          newAccountPubkey: wusdMint,
          space: 165,
          lamports: mintRent,
          programId: TOKEN_PROGRAM_ID,
        }),
      ])
      .rpc();
  });

  describe("核心功能测试", () => {
    it("完整生命周期测试", async () => {
      // 测试账户初始化
      const testUser = await newAccountWithLamports(
        provider.connection,
        1000000000 // 1 SOL
      );
      const userAta = await getAssociatedTokenAddress(wusdMint, testUser.publicKey);
      
      // 创建用户代币账户
      const createAtaIx = createAssociatedTokenAccountInstruction(
        payer.publicKey,
        userAta,
        testUser.publicKey,
        wusdMint
      );
      
      const tx = new anchor.web3.Transaction().add(createAtaIx);
      await provider.sendAndConfirm(tx, [payer]);
      
      // 铸币测试
      const mintAmount = new BN(1000 * 10 ** config.wusdDecimals);
      await program.methods.mint(mintAmount, 254)
        .accounts({
          mint: wusdMint,
          authority: payer.publicKey,
          tokenAccount: userAta,
          authorityState: authorityPda,
          pauseState: pauseStatePda
        })
        .rpc();

      // 验证铸币结果
      let ataInfo = await provider.connection.getTokenAccountBalance(userAta);
      expect(ataInfo.value.amount).to.equal(mintAmount.toString());

      // 转账测试
      const recipient = Keypair.generate();
      const recipientAta = await getAssociatedTokenAddress(wusdMint, recipient.publicKey);
      
      // 创建接收者的关联代币账户
      const createRecipientAtaIx = createAssociatedTokenAccountInstruction(
        payer.publicKey,
        recipientAta,
        recipient.publicKey,
        wusdMint
      );
      await provider.sendAndConfirm(
        new anchor.web3.Transaction().add(createRecipientAtaIx),
        [payer]
      );
      
      const transferAmount = new BN(500 * 10 ** config.wusdDecimals);
      await program.methods.transfer(transferAmount)
        .accounts({
          from: testUser.publicKey,
          to: recipient.publicKey,
          fromToken: userAta,
          toToken: recipientAta,
          pauseState: pauseStatePda
        })
        .signers([testUser])
        .rpc();

      // 验证转账结果
      const recipientBalance = await provider.connection.getTokenAccountBalance(recipientAta);
      expect(recipientBalance.value.amount).to.equal(transferAmount.toString());

      // 销毁测试
      const burnAmount = new BN(200 * 10 ** config.wusdDecimals);
      await program.methods.burn(burnAmount)
        .accounts({
          authority: testUser.publicKey,
          mint: wusdMint,
          tokenAccount: userAta,
          authorityState: authorityPda
        })
        .rpc();

      // 验证销毁结果
      const finalBalance = await provider.connection.getTokenAccountBalance(userAta);
      expect(finalBalance.value.amount).to.equal(
        mintAmount.sub(transferAmount).sub(burnAmount).toString()
      );
    });
  });

  describe("权限控制测试", () => {
    it("拒绝非管理员暂停合约", async () => {
      const unauthorizedUser = Keypair.generate();
      
      try {
        await program.methods.pause()
          .accounts({
            authority: unauthorizedUser.publicKey,
            pauseState: pauseStatePda,
            authorityState: authorityPda
          })
          .signers([unauthorizedUser])
          .rpc();
        
        expect.fail("应抛出未授权错误");
      } catch (err) {
        expect(err.error.errorCode.code).to.equal(config.errorCodes.Unauthorized);
      }
    });

    it("验证多层级权限", async () => {
      // 添加测试操作员
      const operator = Keypair.generate();
      await program.methods.addOperator(operator.publicKey)
        .accounts({
          admin: payer.publicKey,
          authorityState: authorityPda
        })
        .rpc();

      // 验证操作员权限
      const authState = await program.account.authorityState.fetch(authorityPda);
      expect(authState.operators).to.include(operator.publicKey.toString());
    });
  });

  describe("高级功能测试", () => {
    it("处理许可授权转账", async () => {
      const owner = Keypair.generate();
      const spender = Keypair.generate();
      const amount = new BN(100 * 10 ** config.wusdDecimals);

      // 创建许可签名（模拟签名）
      const permitParams = {
        amount,
        deadline: new BN(Date.now() / 1000 + 3600),
        nonce: null,
        scope: { transfer: {} },
        signature: new Uint8Array(64).fill(1),
        publicKey: owner.publicKey.toBytes()
      };

      await program.methods.permit(permitParams)
        .accounts({
          owner: owner.publicKey,
          spender: spender.publicKey,
          allowance: PublicKey.findProgramAddressSync(
            [Buffer.from("allowance"), owner.publicKey.toBuffer(), spender.publicKey.toBuffer()],
            program.programId
          )[0],
          permitState: PublicKey.findProgramAddressSync(
            [Buffer.from("permit"), owner.publicKey.toBuffer()],
            program.programId
          )[0]
        })
        .rpc();

      // 验证授权状态
      const [allowancePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("allowance"), owner.publicKey.toBuffer(), spender.publicKey.toBuffer()],
        program.programId
      );
      const allowance = await program.account.allowanceState.fetch(allowancePda);
      expect(allowance.amount.toString()).to.equal(amount.toString());
    });

    it("验证合约暂停机制", async () => {
      // 暂停合约
      await program.methods.pause()
        .accounts({
          authority: payer.publicKey,
          pauseState: pauseStatePda
        })
        .rpc();

      // 尝试操作应失败
      try {
        await program.methods.mint(new BN(100), 254)
          .accounts({
            mint: wusdMint,
            authority: payer.publicKey,
            pauseState: pauseStatePda
          })
          .rpc();
        
        expect.fail("应抛出合约暂停错误");
      } catch (err) {
        expect(err.error.errorCode.code).to.equal(config.errorCodes.ProgramPaused);
      }

      // 恢复合约
      await program.methods.unpause()
        .accounts({
          authority: payer.publicKey,
          pauseState: pauseStatePda
        })
        .rpc();
    });
  });

  describe("边界条件测试", () => {
    it("处理零金额转账", async () => {
      try {
        await program.methods.transfer(new BN(0))
          .accounts({
            from: payer.publicKey,
            to: Keypair.generate().publicKey
          })
          .rpc();
        
        expect.fail("应抛出无效金额错误");
      } catch (err) {
        expect(err.error.errorCode.code).to.equal(config.errorCodes.InvalidAmount);
      }
    });

    it("处理余额不足转账", async () => {
      const testUser = Keypair.generate();
      const userAta = await getAssociatedTokenAddress(wusdMint, testUser.publicKey);
      
      try {
        await program.methods.transfer(new BN(100))
          .accounts({
            from: testUser.publicKey,
            fromToken: userAta
          })
          .rpc();
        
        expect.fail("应抛出余额不足错误");
      } catch (err) {
        expect(err.error.errorCode.code).to.equal(config.errorCodes.InsufficientFunds);
      }
    });           
  });
});