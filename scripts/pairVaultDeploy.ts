import { ethers } from "hardhat";

async function main() {
  const HelloWorld = await ethers.getContractFactory("PlexusPairVault");
  const helloWorld = await HelloWorld.deploy(
    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    "0xb612cF824bFf640b5F3E408Eba5EAf2F46E1F09B"
  );
  await helloWorld.waitForDeployment();
  console.log("PlexusPairVault deployed to:", helloWorld.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
