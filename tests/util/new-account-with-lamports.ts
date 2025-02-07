import type {Connection} from '@solana/web3.js';
import {Keypair} from '@solana/web3.js';

import {sleep} from './sleep';

export async function newAccountWithLamports(
  connection: Connection,
  lamports: number = 1000000,
): Promise<Keypair> {
  const account = Keypair.generate();

  let retries = 50; // 增加重试次数
  await connection.requestAirdrop(account.publicKey, lamports);
  for (;;) {
    await sleep(1000); // 增加等待时间
    const balance = await connection.getBalance(account.publicKey);
    if (lamports == balance) {
      return account;
    }
    if (--retries <= 0) {
      break;
    }
    // 如果余额不足，尝试再次请求空投
    if (balance < lamports) {
      await connection.requestAirdrop(account.publicKey, lamports - balance);
    }
  }
  throw new Error(`Airdrop of ${lamports} failed`);
}
