// test/vaultTest.ts

import { ethers, waffle } from "hardhat";
import { expect } from "chai";
import {
  PlexusVaultERC20,
  PlexusVaultFactory,
  StrategyStargateV2,
  SimpleSwapper,
  PlexusFeeConfigurator,
} from "../typechain";

describe("VaultTest", function () {
  let plexusVaultFactory: PlexusVaultFactory;
  let testPlexusVaultERC20: PlexusVaultERC20;
  let plexusVault: PlexusVaultERC20;
  let strategyStargateV2: StrategyStargateV2;
  let simpleSwapper: SimpleSwapper;
  let plexusFeeConfigurator: PlexusFeeConfigurator;
  let mainUser: string;
  let devUser: string;
  let addrA: string;
  let addrB: string;
  let addrC: string;

  const USDT_ADDRESS = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
  const STG_ADDRESS = "0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590";
  const WNATIVE = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
  const KEEPER = "0xb612cF824bFf640b5F3E408Eba5EAf2F46E1F09B";
  const STRATEGIST = "0x0Bb989a2593E7513B44ae408F1e3191E0183b20a";
  const USDT_WHALE = "0xF977814e90dA44bFA03b6295A0616a897441aceC";
  const ONEINCH = "0x111111125421cA6dc452d289314280a0f8842A65";

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    mainUser = await signers[0].getAddress();
    devUser = await signers[1].getAddress();
    addrA = await signers[2].getAddress();
    addrB = await signers[3].getAddress();
    addrC = await signers[4].getAddress();

    const PlexusVaultERC20Factory = await ethers.getContractFactory(
      "PlexusVaultERC20"
    );
    const PlexusVaultFactoryFactory = await ethers.getContractFactory(
      "PlexusVaultFactory"
    );
    const StrategyStargateV2Factory = await ethers.getContractFactory(
      "StrategyStargateV2"
    );
    const SimpleSwapperFactory = await ethers.getContractFactory(
      "SimpleSwapper"
    );
    const PlexusFeeConfiguratorFactory = await ethers.getContractFactory(
      "PlexusFeeConfigurator"
    );

    plexusVault = (await PlexusVaultERC20Factory.deploy()) as PlexusVaultERC20;
    plexusVaultFactory = (await PlexusVaultFactoryFactory.deploy(
      plexusVault.address
    )) as PlexusVaultFactory;
    strategyStargateV2 =
      (await StrategyStargateV2Factory.deploy()) as StrategyStargateV2;
    simpleSwapper = (await SimpleSwapperFactory.deploy(
      WNATIVE,
      KEEPER
    )) as SimpleSwapper;
    plexusFeeConfigurator =
      (await PlexusFeeConfiguratorFactory.deploy()) as PlexusFeeConfigurator;

    testPlexusVaultERC20 =
      (await plexusVaultFactory.cloneVault()) as PlexusVaultERC20;
  });

  it("should initialize contracts", async function () {
    await plexusFeeConfigurator.initialize(
      WNATIVE,
      ethers.utils.parseEther("0.01")
    ); // 1% fee
    await plexusFeeConfigurator.setFeeCategory(
      0,
      ethers.utils.parseEther("0.01"),
      "default",
      true
    );

    const chef = V2_USDT_FARM;
    const stargateRouter = V2_USDT_POOL;
    const rewards = [STG_ADDRESS];

    const commonAddresses = {
      vault: testPlexusVaultERC20.address,
      unirouter: simpleSwapper.address,
      keeper: KEEPER,
      strategist: STRATEGIST,
      plexusFeeRecipient: STRATEGIST,
      plexusFeeConfig: plexusFeeConfigurator.address,
    };

    await strategyStargateV2.initialize(
      chef,
      stargateRouter,
      WNATIVE,
      rewards,
      commonAddresses
    );
    await testPlexusVaultERC20.initialize(
      strategyStargateV2.address,
      "Plexus StargateV2 USDT",
      "PlexusStargateV2USDT",
      21600
    );
    await strategyStargateV2.setHarvestOnDeposit(true);

    const swapInfo_oneinch_STG_WMATIC = {
      router: ONEINCH,
      data: "0x8770ba910000000000000000000000002f6f07cdcf3588944bf4c42ac74ff24bf56e75900000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000000000000008000000000000003b6d0340a34ec05da1e4287fa351c74469189345990a3f0c00800000000000003b8b87c0b78906c8a461d6a39a57285c129843e1937c3278ea822ca3",
      amountIndex: 36,
    };

    const swapInfo_oneinch_WMATIC_USDT = {
      router: ONEINCH,
      data: "0x83800a8e0000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf12700000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000000000000008800000000000003b6d0340604229c960e5cacf2aaeac8be68ac07ba9df81c3ea822ca3",
      amountIndex: 36,
    };

    await simpleSwapper.setSwapInfo(
      STG_ADDRESS,
      WNATIVE,
      swapInfo_oneinch_STG_WMATIC
    );
    await simpleSwapper.setSwapInfo(
      WNATIVE,
      USDT_ADDRESS,
      swapInfo_oneinch_WMATIC_USDT
    );
  });

  it("should deposit to vault", async function () {
    const usdt = await ethers.getContractAt("IERC20", USDT_ADDRESS);
    const depositAmount = ethers.utils.parseUnits("2000", 6);

    await usdt
      .connect(mainUser)
      .approve(testPlexusVaultERC20.address, depositAmount);
    await testPlexusVaultERC20.connect(mainUser).deposit(depositAmount);

    const balance = await testPlexusVaultERC20.balanceOf(mainUser);
    expect(balance).to.be.equal(depositAmount);
  });

  it("should advance block", async function () {
    const currentBlock = await ethers.provider.getBlockNumber();
    await ethers.provider.send("evm_mine", [currentBlock + 50000]);
    const newBlock = await ethers.provider.getBlockNumber();
    expect(newBlock).to.be.equal(currentBlock + 50000);
  });
});
