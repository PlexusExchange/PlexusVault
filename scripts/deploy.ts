import { ethers } from "hardhat";

async function main() {
  const HelloWorld = await ethers.getContractFactory("PlexusVaultERC20");
  const helloWorld = await HelloWorld.deploy();
  await helloWorld.waitForDeployment();
  console.log("HelloWorld deployed to:", helloWorld.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
