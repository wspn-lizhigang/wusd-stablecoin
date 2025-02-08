import type {Connection} from '@solana/web3.js';
import {Keypair} from '@solana/web3.js';

import {sleep} from './sleep';

export async function newAccountWithLamports(
  connection: Connection,
  lamports: number = 1000000,
): Promise<Keypair> {
  const account = Keypair.generate();

  let retries = 30;
  while (retries > 0) {
    try {
      // 请求空投
      const airdropSig = await connection.requestAirdrop(account.publicKey, lamports);

      // 获取最新的区块哈希用于确认交易
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

      // 等待交易确认
      await connection.confirmTransaction({
        signature: airdropSig,
        blockhash,
        lastValidBlockHeight
      });

      // 等待一段时间确保资金到账
      await sleep(2000);

      // 验证余额
      const balance = await connection.getBalance(account.publicKey);
      if (balance >= lamports) {
        // 再次确认余额以确保交易完全确认
        await sleep(2000);
        const finalBalance = await connection.getBalance(account.publicKey);
        if (finalBalance >= balance) {
          console.log(`空投成功，账户余额: ${finalBalance} lamports`);
          return account;
        }
      }

      console.log(`当前余额不足，重试中... (剩余重试次数: ${retries})`);
    } catch (error) {
      console.error(`空投失败: ${error.message}`);
    }

    retries--;
    if (retries > 0) {
      await sleep(2000);
    }
  }

  throw new Error(`空投 ${lamports} lamports 失败，已达到最大重试次数`);

}
