// test/vaultTest.ts

import "@openzeppelin/hardhat-upgrades";
import { ethers, network } from "hardhat";
import { expect } from "chai";
import {
  PlexusVaultERC20,
  PlexusVaultFactory,
  StrategyStargateV2,
  SimpleSwapper,
  PlexusFeeConfigurator,
  PlexusZapRouter,
  PlexusTokenManager,
  PlexusVaultConcLiq,
  StrategyPassiveManagerUniswap,
  StrategyFactory,
} from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { mine } from "@nomicfoundation/hardhat-network-helpers";
import { bytesToAddress } from "../scripts/decoder.js";

describe("VaultTest", function () {
  let plexusVault: PlexusVaultConcLiq;
  let strategySushi: StrategyPassiveManagerUniswap;
  let simpleSwapper: SimpleSwapper;
  let plexusFeeConfigurator: PlexusFeeConfigurator;
  let plexusZapRouter: PlexusZapRouter;
  let strategyFactory: StrategyFactory;
  let plexusTokenManager: PlexusTokenManager;
  let mainUser: HardhatEthersSigner;
  let testPlexusVaultERC20_address: string;
  let plexusTokenManager_address: string;
  let devUser: string;
  let addrA: string;
  let addrB: string;
  let addrC: string;

  const IERC20_SOURCE = "contracts/interfaces/common/IERC20.sol:IERC20";

  const USDT_ADDRESS = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
  const USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  const WNATIVE = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
  const KEEPER = "0xb612cF824bFf640b5F3E408Eba5EAf2F46E1F09B";
  const STRATEGIST = "0x0Bb989a2593E7513B44ae408F1e3191E0183b20a";
  const ONEINCH = "0x111111125421cA6dc452d289314280a0f8842A65";
  const QUOTER = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";

  const WETH_USDC_POOL = "0xf3Eb87C1F6020982173C908E7eB31aA66c1f0296";

  before(async function () {
    const mainUserAddress = "0xb612cF824bFf640b5F3E408Eba5EAf2F46E1F09B";
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [mainUserAddress],
    });

    mainUser = await ethers.getSigner(mainUserAddress);

    console.log("mainUser", mainUser.address);

    const PlexusVault = await ethers.getContractFactory("PlexusVaultConcLiq");

    const SimpleSwapperFactory = await ethers.getContractFactory(
      "SimpleSwapper"
    );
    const PlexusFeeConfiguratorFactory = await ethers.getContractFactory(
      "PlexusFeeConfigurator"
    );

    const PlexusZapRouterFactory = await ethers.getContractFactory(
      "PlexusZapRouter"
    );

    const StrategyFactory = await ethers.getContractFactory("StrategyFactory");

    plexusVault = (await PlexusVault.deploy()) as unknown as PlexusVaultConcLiq;
    simpleSwapper = (await SimpleSwapperFactory.deploy(
      WNATIVE,
      KEEPER
    )) as unknown as SimpleSwapper;
    plexusFeeConfigurator =
      (await PlexusFeeConfiguratorFactory.deploy()) as unknown as PlexusFeeConfigurator;

    plexusZapRouter =
      (await PlexusZapRouterFactory.deploy()) as unknown as PlexusZapRouter;

    plexusTokenManager_address = await plexusZapRouter.tokenManager();

    strategyFactory = (await StrategyFactory.deploy(
      WNATIVE,
      KEEPER,
      KEEPER,
      plexusFeeConfigurator
    )) as unknown as StrategyFactory;
    console.log(await strategyFactory.getAddress(), "factory Address");
    console.log("deploy SET");
  });

  it("should initialize contracts", async function () {
    console.log("1");
    await plexusFeeConfigurator.initialize(WNATIVE, ethers.parseEther("0.05")); // 5% fee

    await plexusFeeConfigurator.setFeeCategory(
      0,
      ethers.parseEther("0.01"),
      "default",
      true
    );

    const commonAddresses = {
      vault: await plexusVault.getAddress(),
      unirouter: simpleSwapper.target,
      keeper: KEEPER,
      strategist: STRATEGIST,
      plexusFeeRecipient: STRATEGIST,
      plexusFeeConfig: plexusFeeConfigurator.target,
    };

    const StrategySushi = await ethers.getContractFactory(
      "StrategyPassiveManagerUniswap"
    );
    const strategySushi = await StrategySushi.deploy();
    console.log(await strategySushi.getAddress(), "implAddress");
    await strategyFactory.addStrategy("SushiV3", strategySushi.getAddress());

    console.log("complete");
    const tx = await strategyFactory.createStrategy("SushiV3");

    const receipt = await tx.wait();

    const event = receipt?.logs[0].topics[1];

    const proxyAddress = "0x" + event?.slice(-40);
    console.log("proxyAddress :", proxyAddress);

    await strategyFactory.addStrategy("SushiV3", strategySushi.getAddress());

    const beaconProxy = await ethers.getContractAt(
      "V3StratFeeManagerInitializable",
      proxyAddress
    );

    console.log("vault :", await beaconProxy.vault());

    // const BeaconProxy = await upgrades.deployBeaconProxy(
    //   strategyFactory,
    //   StrategySushi,
    //   [
    //     WETH_USDC_POOL,
    //     QUOTER,
    //     70,
    //     "",
    //     "0xaf88d065e77c8cc2239327c5edb3a432268e58310001f482af49447d8a07e3bd95bd0d56f35241523fbab1",
    //     commonAddresses,
    //   ],
    //   { initializer: "initialize" }
    // );
    // await BeaconProxy.deployed();
    // console.log("BeaconProxy deployed to:", BeaconProxy.address);

    // await strategySushi.initialize(
    //   WETH_USDC_POOL,
    //   QUOTER,
    //   70,
    //   "",
    //   "0xaf88d065e77c8cc2239327c5edb3a432268e58310001f482af49447d8a07e3bd95bd0d56f35241523fbab1",
    //   commonAddresses
    // );

    // await testPlexusVaultERC20.initialize(
    //   strategyStargateV2.target,
    //   "Plexus StargateV2 USDT",
    //   "PlexusStargateV2USDT",
    //   21600
    // );
    // await strategyStargateV2.setHarvestOnDeposit(true);

    // const swapInfo_oneinch_STG_WMATIC = {
    //   router: ONEINCH,
    //   data: "0x8770ba910000000000000000000000002f6f07cdcf3588944bf4c42ac74ff24bf56e75900000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000000000000008000000000000003b6d0340a34ec05da1e4287fa351c74469189345990a3f0c00800000000000003b8b87c0b78906c8a461d6a39a57285c129843e1937c3278ea822ca3",
    //   amountIndex: 36,
    // };

    // const swapInfo_oneinch_WMATIC_USDT = {
    //   router: ONEINCH,
    //   data: "0x83800a8e0000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf12700000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000000000000008800000000000003b6d0340604229c960e5cacf2aaeac8be68ac07ba9df81c3ea822ca3",
    //   amountIndex: 36,
    // };

    // await simpleSwapper.setSwapInfo(
    //   STG_ADDRESS,
    //   WNATIVE,
    //   swapInfo_oneinch_STG_WMATIC
    // );
    // await simpleSwapper.setSwapInfo(
    //   WNATIVE,
    //   USDT_ADDRESS,
    //   swapInfo_oneinch_WMATIC_USDT
    // );
  });
});
