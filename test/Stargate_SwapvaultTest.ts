// test/vaultTest.ts

import { ethers, waffle, network } from "hardhat";
import { expect } from "chai";
import {
  PlexusVaultERC20,
  PlexusVaultFactory,
  StrategyStargateV2,
  SimpleSwapper,
  PlexusFeeConfigurator,
  PlexusZapRouter,
  PlexusTokenManager,
} from "../typechain-types/index.js";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { mine } from "@nomicfoundation/hardhat-network-helpers";

import { fetchOneInchData } from "../scripts/oneinchData.js";

describe("VaultTest", function () {
  let plexusVaultFactory: PlexusVaultFactory;
  let testPlexusVaultERC20: PlexusVaultERC20;
  let plexusVault: PlexusVaultERC20;
  let strategyStargateV2: StrategyStargateV2;
  let simpleSwapper: SimpleSwapper;
  let plexusFeeConfigurator: PlexusFeeConfigurator;
  let plexusZapRouter: PlexusZapRouter;
  let plexusTokenManager: PlexusTokenManager;
  let mainUser: HardhatEthersSigner;
  let testPlexusVaultERC20_address: string;
  let plexusTokenManager_address: string;
  let devUser: string;
  let addrA: string;
  let addrB: string;
  let addrC: string;

  const IERC20_SOURCE = "contracts/interfaces/common/IERC20.sol:IERC20";

  const USDT_ADDRESS = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
  const USDC_ADDRESS = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
  const STG_ADDRESS = "0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590";
  const WNATIVE = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
  const KEEPER = "0xb612cF824bFf640b5F3E408Eba5EAf2F46E1F09B";
  const STRATEGIST = "0x0Bb989a2593E7513B44ae408F1e3191E0183b20a";
  const USDT_WHALE = "0xF977814e90dA44bFA03b6295A0616a897441aceC";
  const ONEINCH = "0x111111125421cA6dc452d289314280a0f8842A65";

  const V2_USDT_FARM = "0x4694900bdba99edf07a2e46c4093f88f9106a90d";
  const V2_USDT_POOL = "0xd47b03ee6d86Cf251ee7860FB2ACf9f91B9fD4d7";

  before(async function () {
    const mainUserAddress = "0xb612cF824bFf640b5F3E408Eba5EAf2F46E1F09B";
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [mainUserAddress],
    });

    mainUser = await ethers.getSigner(mainUserAddress);

    console.log("mainUser", mainUser.address);

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

    const PlexusZapRouterFactory = await ethers.getContractFactory(
      "PlexusZapRouter"
    );

    plexusVault =
      (await PlexusVaultERC20Factory.deploy()) as unknown as PlexusVaultERC20;
    plexusVaultFactory = (await PlexusVaultFactoryFactory.deploy(
      plexusVault.target
    )) as unknown as PlexusVaultFactory;
    strategyStargateV2 =
      (await StrategyStargateV2Factory.deploy()) as unknown as StrategyStargateV2;
    simpleSwapper = (await SimpleSwapperFactory.deploy(
      WNATIVE,
      KEEPER
    )) as unknown as SimpleSwapper;
    plexusFeeConfigurator =
      (await PlexusFeeConfiguratorFactory.deploy()) as unknown as PlexusFeeConfigurator;

    const clonevault_Tx = await plexusVaultFactory.cloneVault();
    const receipt = await clonevault_Tx.wait();

    testPlexusVaultERC20_address = receipt?.logs[0].args[0];

    testPlexusVaultERC20 = await ethers.getContractAt(
      "PlexusVaultERC20",
      testPlexusVaultERC20_address
    );

    plexusZapRouter =
      (await PlexusZapRouterFactory.deploy()) as unknown as PlexusZapRouter;

    plexusTokenManager_address = await plexusZapRouter.tokenManager();

    plexusTokenManager = await ethers.getContractAt(
      "PlexusTokenManager",
      plexusTokenManager_address
    );

    console.log("deploy SET");
  });

  it("should initialize contracts", async function () {
    await plexusFeeConfigurator.initialize(WNATIVE, ethers.parseEther("0.05")); // 5% fee

    await plexusFeeConfigurator.setFeeCategory(
      0,
      ethers.parseEther("0.01"),
      "default",
      true
    );

    const chef = V2_USDT_FARM;
    const stargateRouter = V2_USDT_POOL;
    const rewards = [STG_ADDRESS];

    const commonAddresses = {
      vault: testPlexusVaultERC20_address,
      swapper: simpleSwapper.target,
      keeper: KEEPER,
      strategist: STRATEGIST,
      plexusFeeRecipient: STRATEGIST,
      plexusFeeConfig: plexusFeeConfigurator.target,
    };

    await strategyStargateV2.initialize(
      chef,
      stargateRouter,
      WNATIVE,
      rewards,
      commonAddresses
    );

    await testPlexusVaultERC20.initialize(
      strategyStargateV2.target,
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

  //USDT pool
  it("should deposit to vault", async function () {
    const usdt = await ethers.getContractAt(IERC20_SOURCE, USDT_ADDRESS);

    const depositAmount = ethers.parseUnits("3", 6);
    console.log("CHECK CONSOLE", depositAmount);

    await usdt
      .connect(mainUser)
      .approve(testPlexusVaultERC20_address, depositAmount);
    console.log("CHECK CONSOLE");

    console.log(
      "usdt ALLOWANCe",
      await usdt.allowance(mainUser, testPlexusVaultERC20_address)
    );

    await testPlexusVaultERC20.connect(mainUser).deposit(depositAmount);
    console.log("CHECK CONSOLE");
  });

  //USDC -> swap -> USDT pool
  //note : https://polygonscan.com/tx/0x2d5654cc371668a9abd6fc446811c379c9cade8b5f36613399b5ed140d196a2c
  it("should swap-deposit to zapRouter", async function () {
    console.log((await ethers.provider.getBlock("latest"))?.number);
    // instantly mine 1000 blocks
    await mine(1000);
    console.log((await ethers.provider.getBlock("latest"))?.number);
    const oneInchCallData = await fetchOneInchData(
      //1inch swap하고 받는곳 zapRouter로 설정.
      await plexusZapRouter.getAddress(),
      USDC_ADDRESS,
      USDT_ADDRESS,
      137,
      5000000
    );

    console.log(
      "oneinch",
      oneInchCallData.dstAmount,
      oneInchCallData.tx.to,
      oneInchCallData.tx.data
    );

    const usdc = await ethers.getContractAt(IERC20_SOURCE, USDC_ADDRESS);

    const depositAmount = ethers.parseUnits("5", 6);
    console.log("CHECK CONSOLE", depositAmount);

    await usdc
      .connect(mainUser)
      .approve(plexusTokenManager_address, depositAmount);
    console.log("CHECK CONSOLE");

    console.log(
      await plexusZapRouter.tokenManager(),
      plexusTokenManager_address
    );

    console.log(
      "usdc ALLOWANCE",
      await usdc.allowance(mainUser, plexusTokenManager_address)
    );

    console.log("testPlexusVaultERC20_address", testPlexusVaultERC20_address);
    const order = {
      inputs: [
        {
          token: USDC_ADDRESS,
          amount: "5000000",
        },
      ],
      outputs: [
        { token: testPlexusVaultERC20_address, minOutputAmount: "4000000" },
        { token: USDT_ADDRESS, minOutputAmount: "0" },
        { token: USDC_ADDRESS, minOutputAmount: "0" },
      ],
      relay: {
        target: "0x0000000000000000000000000000000000000000",
        value: "0",
        data: "0x",
      },
      user: mainUser,
      recipient: mainUser,
    };

    const route = [
      {
        target: oneInchCallData.tx.to,
        value: "0",
        data: oneInchCallData.tx.data,
        tokens: [{ token: USDC_ADDRESS, index: -1 }],
      },
      {
        target: testPlexusVaultERC20_address,
        value: "0",
        data: "0xde5f6268",
        tokens: [{ token: USDT_ADDRESS, index: -1 }],
      },
    ];

    await plexusZapRouter.connect(mainUser).executeOrder(order, route);

    console.log("zapRouter deposit clear");
  });

  it("should depost to zapRouter (Non swap)", async function () {
    const usdt = await ethers.getContractAt(IERC20_SOURCE, USDT_ADDRESS);

    const depositAmount = ethers.parseUnits("5", 6);
    // console.log("CHECK CONSOLE", depositAmount);

    await usdt
      .connect(mainUser)
      .approve(plexusTokenManager_address, depositAmount);
    // console.log("CHECK CONSOLE");

    // console.log(
    //   await plexusZapRouter.tokenManager(),
    //   plexusTokenManager_address
    // );

    // console.log(
    //   "usdt ALLOWANCE",
    //   await usdt.allowance(mainUser, plexusTokenManager_address)
    // );

    // console.log("testPlexusVaultERC20_address", testPlexusVaultERC20_address);
    const order = {
      inputs: [
        {
          token: USDT_ADDRESS,
          amount: "5000000",
        },
      ],
      outputs: [
        { token: testPlexusVaultERC20_address, minOutputAmount: "4844817" },
        { token: USDT_ADDRESS, minOutputAmount: "0" },
      ],
      relay: {
        target: "0x0000000000000000000000000000000000000000",
        value: "0",
        data: "0x",
      },
      user: mainUser,
      recipient: mainUser,
    };

    const route = [
      {
        target: testPlexusVaultERC20_address,
        value: "0",
        data: "0xde5f6268",
        tokens: [{ token: USDT_ADDRESS, index: -1 }],
      },
    ];

    // await plexusZapRouter.connect(mainUser).executeOrder(order, route);
    // console.log("zapRouter deposit clear (non swap)");
  });
});
