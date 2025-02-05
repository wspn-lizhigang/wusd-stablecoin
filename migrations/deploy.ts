// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

const anchor = require("@coral-xyz/anchor");
const { PublicKey } = require("@solana/web3.js");
const { Metaplex } = require("@metaplex-foundation/js");
const fs = require("fs");

module.exports = async function (provider) {
  // 配置客户端使用provider
  anchor.setProvider(provider);

  // 读取程序ID
  const programId = new PublicKey("3JmdookeJY96JsRnnN1C68qLiKmqrw6LuEhK9yhdKfWJ");

  // 读取程序二进制文件
  const programSo = "./target/deploy/wusd_application.so";
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

    // 初始化 Metaplex
    const metaplex = new Metaplex(provider.connection);
    metaplex.use(provider.wallet);

    // 设置代币元数据
    const mintAddress = new PublicKey("YOUR_MINT_ADDRESS"); // 替换为实际的 mint 地址
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
      mint: mintAddress,
    });

    console.log("代币元数据设置成功!");
  } catch (error) {
    console.error("部署或元数据设置失败:", error);
    throw error;
  }
};
