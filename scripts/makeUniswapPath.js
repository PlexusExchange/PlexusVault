const { solidityPacked } = require("ethers");
require("dotenv").config();

/**
fee
0.01% => 100
0.05% => 500
0.30% => 3000
 1%. => 10000
 */
async function makeUniswapPath(fromAddr, fee, toAddr) {
  const swapPath = solidityPacked(
    ["address", "uint24", "address"],
    [fromAddr, fee, toAddr]
  );
  //   console.log(swapPath);
  return swapPath;
}

(async () => {
  const result = await makeUniswapPath(
    "0xAf5191B0De278C7286d6C7CC6ab6BB8A73bA2Cd6",
    3000, // 3000 => 0.3%
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
  );
  console.log("result", result);
})();
exports.makeUniswapPath = makeUniswapPath;
//
