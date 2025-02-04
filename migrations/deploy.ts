// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

const anchor = require("@coral-xyz/anchor");
const { PublicKey } = require("@solana/web3.js");
const fs = require("fs");

module.exports = async function (provider) {
  // 配置客户端使用provider
  anchor.setProvider(provider);

  // 读取程序ID
  const programId = new PublicKey("3JmdookeJY96JsRnnN1C68qLiKmqrw6LuEhK9yhdKfWJ");

  // 读取程序二进制文件
  const programSo = "./target/deploy/wusd_stablecoin.so";
  if (!fs.existsSync(programSo)) {
    throw new Error(`程序二进制文件不存在: ${programSo}`);
  }

  console.log("开始部署程序...");
  console.log("程序ID:", programId.toString());
  console.log("程序文件路径:", programSo);

  try {
    // 执行程序升级
    await provider.connection.upgradeProgram(
      programId,
      fs.readFileSync(programSo),
      provider.wallet
    );
    console.log("程序升级成功!");
  } catch (error) {
    console.error("程序升级失败:", error);
    throw error;
  }
};
