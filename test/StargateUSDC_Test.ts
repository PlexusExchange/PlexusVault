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
  let usdt_whale: HardhatEthersSigner;
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
  const NATIVE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

  const V2_USDC_FARM = "0x4694900bDbA99Edf07A2E46C4093f88F9106a90D";
  const V2_USDC_POOL = "0x9Aa02D4Fae7F58b8E8f34c66E756cC734DAc7fe4";

  before(async function () {
    const mainUserAddress = "0xb612cF824bFf640b5F3E408Eba5EAf2F46E1F09B";
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [mainUserAddress],
    });
    //91113475966
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [USDT_WHALE],
    });

    mainUser = await ethers.getSigner(mainUserAddress);

    usdt_whale = await ethers.getSigner(USDT_WHALE);

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
    await plexusFeeConfigurator.initialize(KEEPER, ethers.parseEther("0.05")); // 5% fee

    await plexusFeeConfigurator.setFeeCategory(
      0,
      ethers.parseEther("0.05"),
      "default",
      true
    );

    const chef = V2_USDC_FARM;
    const stargateRouter = V2_USDC_POOL;
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
      "Plexus StargateV2 USDC",
      "PlexusStargateV2USDC",
      21600
    );
    await strategyStargateV2.setHarvestOnDeposit(true);

    const swapInfo_oneinch_STG_WMATIC = {
      router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // SwapRouter02
      data: "0xb858183f00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000080000000000000000000000000b612cf824bff640b5f3e408eba5eaf2f46e1f09b0000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002b2f6f07cdcf3588944bf4c42ac74ff24bf56e7590000bb80d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000000000000000000000",
      amountIndex: 100,
    };

    const swapInfo_oneinch_WMATIC_USDC = {
      router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // SwapRouter02
      data: "0xb858183f00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000080000000000000000000000000b612cf824bff640b5f3e408eba5eaf2f46e1f09b0000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002b0d500b1d8e8ef31e21c99d1db9a6444d3adf1270000bb83c499c542cef5e3811e1192ce70d8cc03d5c3359000000000000000000000000000000000000000000",
      amountIndex: 100,
    };

    await simpleSwapper.setSwapInfo(
      STG_ADDRESS,
      WNATIVE,
      swapInfo_oneinch_STG_WMATIC
    );
    await simpleSwapper.setSwapInfo(
      WNATIVE,
      USDC_ADDRESS,
      swapInfo_oneinch_WMATIC_USDC
    );
    await strategyStargateV2.setRewardMinAmount(STG_ADDRESS, 10000000000000);
  });
  //USDT pool
  //   it("should deposit to vault", async function () {
  //     const usdt = await ethers.getContractAt(IERC20_SOURCE, USDT_ADDRESS);

  //     const depositAmount = ethers.parseUnits("3", 6);
  //     console.log("CHECK CONSOLE", depositAmount);

  //     await usdt
  //       .connect(usdt_whale)
  //       .approve(testPlexusVaultERC20_address, depositAmount);
  //     console.log("CHECK CONSOLE");

  //     console.log(
  //       "usdt ALLOWANCe",
  //       await usdt.allowance(usdt_whale, testPlexusVaultERC20_address)
  //     );

  //     await testPlexusVaultERC20.connect(usdt_whale).deposit(depositAmount);
  //     console.log("CHECK CONSOLE");
  //   });
  //USDT -> swap -> USDC pool
  //note : https://polygonscan.com/tx/0x2d5654cc371668a9abd6fc446811c379c9cade8b5f36613399b5ed140d196a2c
  it("should swap-deposit to zapRouter", async function () {
    console.log((await ethers.provider.getBlock("latest"))?.number);
    // instantly mine 1000 blocks
    await mine(1000);
    console.log((await ethers.provider.getBlock("latest"))?.number);
    const oneInchCallData = await fetchOneInchData(
      //1inch swap하고 받는곳 zapRouter로 설정.
      await plexusZapRouter.getAddress(),
      USDT_ADDRESS,
      USDC_ADDRESS,
      137,
      20000000
    );

    console.log(
      "oneinch",
      oneInchCallData.dstAmount,
      oneInchCallData.tx.to,
      oneInchCallData.tx.data
    );

    const usdt = await ethers.getContractAt(IERC20_SOURCE, USDT_ADDRESS);

    const depositAmount = ethers.parseUnits("20", 6);
    console.log("CHECK CONSOLE", depositAmount);

    await usdt
      .connect(usdt_whale)
      .approve(plexusTokenManager_address, depositAmount);
    console.log("CHECK CONSOLE");

    // console.log(
    //   await plexusZapRouter.tokenManager(),
    //   plexusTokenManager_address
    // );

    // console.log(
    //   "usdc ALLOWANCE",
    //   await usdc.allowance(mainUser, plexusTokenManager_address)
    // );

    console.log("testPlexusVaultERC20_address", testPlexusVaultERC20_address);
    const order = {
      inputs: [
        {
          token: USDT_ADDRESS,
          amount: "20000000",
        },
      ],
      outputs: [
        { token: testPlexusVaultERC20_address, minOutputAmount: "0" },
        { token: USDT_ADDRESS, minOutputAmount: "0" },
        {
          token: USDC_ADDRESS,
          minOutputAmount: "0",
        },
      ],
      relay: {
        target: "0x0000000000000000000000000000000000000000",
        value: "0",
        data: "0x",
      },
      user: usdt_whale,
      recipient: usdt_whale,
    };

    const route = [
      [
        oneInchCallData.tx.to,
        "0",
        oneInchCallData.tx.data,
        [{ token: USDT_ADDRESS, index: -1 }],
      ],
      [
        testPlexusVaultERC20_address,
        "0",
        "0xde5f6268",
        [{ token: USDC_ADDRESS, index: -1 }],
      ],
    ];

    console.log("executeOrder START");
    await plexusZapRouter.connect(usdt_whale).executeOrder(order, route);

    console.log("zapRouter deposit clear");
    console.log(
      "await testPlexusVaultERC20.decimal()",
      await testPlexusVaultERC20.decimals()
    );
    console.log(
      "await testPlexusVaultERC20.balanceOf(mainUser)",
      await testPlexusVaultERC20.balanceOf(usdt_whale)
    );
  });
  it("should depost to zapRouter (Non swap)", async function () {
    const usdt = await ethers.getContractAt(IERC20_SOURCE, USDT_ADDRESS);

    const depositAmount = ethers.parseUnits("5", 6);
    // console.log("CHECK CONSOLE", depositAmount);

    await usdt
      .connect(usdt_whale)
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

    console.log("testPlexusVaultERC20_address", testPlexusVaultERC20_address);
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
      user: usdt_whale,
      recipient: usdt_whale,
    };

    const route = [
      {
        target: testPlexusVaultERC20_address,
        value: "0",
        data: "0xde5f6268",
        tokens: [{ token: USDT_ADDRESS, index: -1 }],
      },
    ];

    await plexusZapRouter.connect(usdt_whale).executeOrder(order, route);
    console.log("zapRouter deposit clear (non swap)");
    console.log(
      "await testPlexusVaultERC20.decimal()",
      await testPlexusVaultERC20.decimals()
    );
    console.log(
      "await testPlexusVaultERC20.balanceOf(usdt_whale)",
      await testPlexusVaultERC20.balanceOf(usdt_whale)
    );
  });
});
