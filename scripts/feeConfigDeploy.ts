import { ethers } from "hardhat";

async function main() {
  const HelloWorld = await ethers.getContractFactory("PlexusFeeConfigurator");
  const helloWorld = await HelloWorld.deploy();
  await helloWorld.waitForDeployment();

  await helloWorld.initialize(
    "0xb612cF824bFf640b5F3E408Eba5EAf2F46E1F09B",
    ethers.parseEther("0.05")
  );

  await helloWorld.setFeeCategory(
    0,
    ethers.parseEther("0.01"),
    "default",
    true
  );
  console.log("PlexusFeeConfigurator deployed to:", helloWorld.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
