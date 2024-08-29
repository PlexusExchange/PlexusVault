const { Hop, AMM, Chain } = require("@hop-protocol/sdk");
const { StaticJsonRpcProvider } = require("ethers").providers;

const hop = new Hop("mainnet");

hop.setChainProviders({
  optimism: new StaticJsonRpcProvider("https://mainnet.optimism.io"),
});
