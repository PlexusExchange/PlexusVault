import { ethers } from "hardhat";

async function main() {
  const HelloWorld = await ethers.getContractFactory(
    "StrategyPassiveManagerUniswap"
  );
  const helloWorld = await HelloWorld.deploy();
  await helloWorld.waitForDeployment();
  console.log("StrategyPassiveManagerUniswap deployed to:", helloWorld.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
