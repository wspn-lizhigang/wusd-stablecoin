import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import idl from "../target/idl/wusd_token.json";
import { WusdToken } from "../target/types/wusd_token";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
} from "@solana/spl-token";
import { config } from "./wusd-token-config";
import { expect } from "chai";
import { newAccountWithLamports } from "./util/new-account-with-lamports";

describe("WUSD Token", () => {
  let provider: anchor.AnchorProvider;
  let program: Program<WusdToken>;
  let payer: anchor.web3.Keypair;

  before("全局初始化", async function () {
    this.timeout(30000);
    // 确保环境变量正确
    console.log("环境变量检查:");
    console.log("ANCHOR_PROVIDER_URL:", process.env.ANCHOR_PROVIDER_URL);
    console.log("ANCHOR_WALLET:", process.env.ANCHOR_WALLET);

    // 分步初始化 Provider
    const connection = new anchor.web3.Connection(
      process.env.ANCHOR_PROVIDER_URL || "http://localhost:8899",
      "confirmed"
    );

    const wallet = anchor.Wallet.local(); // 显式初始化钱包
    provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });

    // 强制设置全局 provider
    anchor.setProvider(provider);

    // 验证 Provider 功能
    console.log(
      "Provider 可用方法:",
      Object.keys(provider).filter((k) => typeof provider[k] === "function")
    );

    // 初始化 program 实例
    const programId = new PublicKey(idl.metadata.address);
    program = new anchor.Program(
      idl as anchor.Idl,
      programId,
      provider
    ) as unknown as Program<WusdToken>;

    console.log("程序 ID:", program.programId.toString());
    console.log(
      "IDL 方法列表:",
      idl.instructions.map((i) => i.name)
    );
  });

  before("启动前检查", async function () {
    this.timeout(20000);

    // 添加空值检查
    if (!provider || !provider.connection) {
      throw new Error("Provider 未正确初始化");
    }

    // 使用新的连接检查方式
    const connection = provider.connection;
    const version = await connection.getVersion();
    console.log("RPC 版本:", version["solana-core"]);

    // 使用 connection 替代 provider.connection
    const { stdout } = await execAsync("lsof -i :8900");
    if (!stdout.includes("LISTEN")) {
      throw new Error("WebSocket 端口 8900 未监听");
    }
  });

  // PDA缓存
  let statePda: PublicKey;
  let authorityPda: PublicKey;
  let mintStatePda: PublicKey;
  let pauseStatePda: PublicKey;
  let wusdMint: PublicKey;
  let mintKeypair: Keypair;

  // 增强版交易发送函数
  async function sendAndConfirmWithRetry(
    provider: anchor.AnchorProvider,
    tx: anchor.web3.Transaction,
    signers: anchor.web3.Signer[],
    label: string
  ) {
    console.log(`[${label}] 发送交易...`);

    // 获取最新区块哈希
    const { blockhash, lastValidBlockHeight } =
      await provider.connection.getLatestBlockhash("confirmed");

    // 主动确认交易
    const txId = await provider.sendAndConfirm(tx, signers, {
      skipPreflight: false,
      commitment: "confirmed",
    });
    console.log(`[${label}] 交易已确认: ${txId}`);
    return txId;
  }

  // 初始化PDA（添加mint和pause状态）
  function initializePdas() {
    [authorityPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("authority")],
      program.programId // 始终使用外层program实例
    );

    [authorityPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("authority")],
      program.programId
    );

    [statePda] = PublicKey.findProgramAddressSync(
      [Buffer.from(config.seeds.state)],
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

    console.log("=== PDA初始化 ===");
    console.log("Authority PDA:", authorityPda.toString());
    console.log("State PDA:", statePda.toString());
    console.log("Mint State PDA:", mintStatePda.toString());
    console.log("Pause State PDA:", pauseStatePda.toString());
  }

  beforeEach(async () => {
    console.log("当前程序ID:", program.programId.toString());
    // 初始化PDA
    initializePdas();
    console.log("当前RPC节点:", provider.connection.rpcEndpoint);
    console.log(
      "Provider 可用方法:",
      Object.keys(provider).filter((k) => typeof provider[k] === "function")
    );

    console.log("环境变量验证:");
    console.log("ANCHOR_PROVIDER_URL:", process.env.ANCHOR_PROVIDER_URL);
    console.log("ANCHOR_WALLET:", process.env.ANCHOR_WALLET);

    // 生成Mint账户
    mintKeypair = Keypair.generate();
    wusdMint = mintKeypair.publicKey;
    console.log("新Mint账户:", wusdMint.toString());

    // 创建系统账户
    const systemAccount = Keypair.generate();
    console.log("系统账户:", systemAccount.publicKey.toString());

    // 增强空投逻辑
    await (async () => {
      const airdropAmount = anchor.web3.LAMPORTS_PER_SOL * 100;
      console.log(`空投 ${airdropAmount} lamports 到系统账户...`);
      const airdropSig = await provider.connection.requestAirdrop(
        systemAccount.publicKey,
        airdropAmount
      );
      await provider.connection.confirmTransaction(airdropSig);
    })();

    // 创建Mint账户
    const mintRent =
      await provider.connection.getMinimumBalanceForRentExemption(165);
    console.log("Mint账户租金:", mintRent);

    // 分步执行交易
    // 步骤1: 创建账户
    const createAccountTx = new anchor.web3.Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: systemAccount.publicKey,
        newAccountPubkey: wusdMint,
        space: 165,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,
      })
    );
    await sendAndConfirmWithRetry(
      provider,
      createAccountTx,
      [systemAccount, mintKeypair],
      "创建Mint账户"
    );

    // 步骤2: 初始化Mint
    const initMintTx = new anchor.web3.Transaction().add(
      createInitializeMintInstruction(
        wusdMint,
        config.wusdDecimals,
        authorityPda,
        authorityPda
      )
    );
    await sendAndConfirmWithRetry(provider, initMintTx, [], "初始化Mint");

    // 初始化程序状态
    console.log("=== 初始化程序状态 ===");
    const initTx = await program.methods
      .initialize(config.wusdDecimals)
      .accounts({
        authority: systemAccount.publicKey,
        mint: wusdMint,
        authority_state: authorityPda,
        mint_state: mintStatePda,
        pause_state: pauseStatePda,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([systemAccount])
      .rpc({
        skipPreflight: false,
        commitment: "confirmed",
      });

    // 验证初始化结果
    const txStatus = await provider.connection.getSignatureStatus(initTx);
    console.log("初始化交易状态:", txStatus.value?.confirmationStatus);
  });

  describe("核心功能测试", () => {
    it("完整生命周期测试", async () => {
      // 测试账户初始化
      const testUser = await newAccountWithLamports(
        provider.connection,
        1000000000 // 1 SOL
      );
      const userAta = await getAssociatedTokenAddress(
        wusdMint,
        testUser.publicKey
      );

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
      await program.methods
        .mint(mintAmount, 254)
        .accounts({
          mint: wusdMint,
          authority: payer.publicKey,
          tokenAccount: userAta,
          authorityState: authorityPda,
          pauseState: pauseStatePda,
        })
        .rpc();

      // 验证铸币结果
      let ataInfo = await provider.connection.getTokenAccountBalance(userAta);
      expect(ataInfo.value.amount).to.equal(mintAmount.toString());

      // 转账测试
      const recipient = Keypair.generate();
      const recipientAta = await getAssociatedTokenAddress(
        wusdMint,
        recipient.publicKey
      );

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
      await program.methods
        .transfer(transferAmount)
        .accounts({
          from: testUser.publicKey,
          to: recipient.publicKey,
          fromToken: userAta,
          toToken: recipientAta,
          pauseState: pauseStatePda,
        })
        .signers([testUser])
        .rpc();

      // 验证转账结果
      const recipientBalance = await provider.connection.getTokenAccountBalance(
        recipientAta
      );
      expect(recipientBalance.value.amount).to.equal(transferAmount.toString());

      // 销毁测试
      const burnAmount = new BN(200 * 10 ** config.wusdDecimals);
      await program.methods
        .burn(burnAmount)
        .accounts({
          authority: testUser.publicKey,
          mint: wusdMint,
          tokenAccount: userAta,
          authorityState: authorityPda,
        })
        .rpc();

      // 验证销毁结果
      const finalBalance = await provider.connection.getTokenAccountBalance(
        userAta
      );
      expect(finalBalance.value.amount).to.equal(
        mintAmount.sub(transferAmount).sub(burnAmount).toString()
      );
    });
  });

  describe("权限控制测试", () => {
    it("拒绝非管理员暂停合约", async () => {
      const unauthorizedUser = Keypair.generate();

      try {
        await program.methods
          .pause()
          .accounts({
            authority: unauthorizedUser.publicKey,
            pauseState: pauseStatePda,
            authorityState: authorityPda,
          })
          .signers([unauthorizedUser])
          .rpc();

        expect.fail("应抛出未授权错误");
      } catch (err) {
        expect(err.error.errorCode.code).to.equal(
          config.errorCodes.Unauthorized
        );
      }
    });

    it("验证多层级权限", async () => {
      // 添加测试操作员
      const operator = Keypair.generate();
      await program.methods
        .addOperator(operator.publicKey)
        .accounts({
          admin: payer.publicKey,
          authorityState: authorityPda,
        })
        .rpc();

      // 验证操作员权限
      const authState = await program.account.authorityState.fetch(
        authorityPda
      );
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
        publicKey: owner.publicKey.toBytes(),
      };

      await program.methods
        .permit(permitParams)
        .accounts({
          owner: owner.publicKey,
          spender: spender.publicKey,
          allowance: PublicKey.findProgramAddressSync(
            [
              Buffer.from("allowance"),
              owner.publicKey.toBuffer(),
              spender.publicKey.toBuffer(),
            ],
            program.programId
          )[0],
          permitState: PublicKey.findProgramAddressSync(
            [Buffer.from("permit"), owner.publicKey.toBuffer()],
            program.programId
          )[0],
        })
        .rpc();

      // 验证授权状态
      const [allowancePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("allowance"),
          owner.publicKey.toBuffer(),
          spender.publicKey.toBuffer(),
        ],
        program.programId
      );
      const allowance = await program.account.allowanceState.fetch(
        allowancePda
      );
      expect(allowance.amount.toString()).to.equal(amount.toString());
    });

    it("验证合约暂停机制", async () => {
      // 暂停合约
      await program.methods
        .pause()
        .accounts({
          authority: payer.publicKey,
          pauseState: pauseStatePda,
        })
        .rpc();

      // 尝试操作应失败
      try {
        await program.methods
          .mint(new BN(100), 254)
          .accounts({
            mint: wusdMint,
            authority: payer.publicKey,
            pauseState: pauseStatePda,
          })
          .rpc();

        expect.fail("应抛出合约暂停错误");
      } catch (err) {
        expect(err.error.errorCode.code).to.equal(
          config.errorCodes.ProgramPaused
        );
      }

      // 恢复合约
      await program.methods
        .unpause()
        .accounts({
          authority: payer.publicKey,
          pauseState: pauseStatePda,
        })
        .rpc();
    });
  });

  describe("边界条件测试", () => {
    it("处理零金额转账", async () => {
      try {
        await program.methods
          .transfer(new BN(0))
          .accounts({
            from: payer.publicKey,
            to: Keypair.generate().publicKey,
          })
          .rpc();

        expect.fail("应抛出无效金额错误");
      } catch (err) {
        expect(err.error.errorCode.code).to.equal(
          config.errorCodes.InvalidAmount
        );
      }
    });

    it("处理余额不足转账", async () => {
      const testUser = Keypair.generate();
      const userAta = await getAssociatedTokenAddress(
        wusdMint,
        testUser.publicKey
      );

      try {
        await program.methods
          .transfer(new BN(100))
          .accounts({
            from: testUser.publicKey,
            fromToken: userAta,
          })
          .rpc();

        expect.fail("应抛出余额不足错误");
      } catch (err) {
        expect(err.error.errorCode.code).to.equal(
          config.errorCodes.InsufficientFunds
        );
      }
    });
  });
});
