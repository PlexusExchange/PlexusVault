// test/vaultTest.ts

import { ethers, network } from "hardhat";
import {
  PlexusVaultERC20,
  PlexusVaultFactory,
  StrategyCompoundV3,
  PlexusFeeConfigurator,
  PlexusZapRouter,
  PlexusTokenManager,
} from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { mine } from "@nomicfoundation/hardhat-network-helpers";

import { fetchOneInchData } from "../scripts/oneinchData.js";

describe("VaultTest", function () {
  let plexusVaultFactory: PlexusVaultFactory;
  let testPlexusVaultERC20: PlexusVaultERC20;
  let plexusVault: PlexusVaultERC20;
  let strategyCompoundV3: StrategyCompoundV3;
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

  const USDCe_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
  const USDC_ADDRESS = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
  const STG_ADDRESS = "0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590";
  const WNATIVE = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
  const KEEPER = "0xb612cF824bFf640b5F3E408Eba5EAf2F46E1F09B";
  const STRATEGIST = "0x0Bb989a2593E7513B44ae408F1e3191E0183b20a";
  const USDT_WHALE = "0xF977814e90dA44bFA03b6295A0616a897441aceC";
  const ONEINCH = "0x111111125421cA6dc452d289314280a0f8842A65";

  const USDCe_CTOKEN = "0xF25212E676D1F7F89Cd72fFEe66158f541246445";

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
    const StrategyCompoundV3Factory = await ethers.getContractFactory(
      "StrategyCompoundV3"
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
    strategyCompoundV3 =
      (await StrategyCompoundV3Factory.deploy()) as unknown as StrategyCompoundV3;
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

    const cToken = USDCe_CTOKEN;
    const outputToNativePath =
      "0x8505b9d2254a7ae468c0e9dd10ccea3a837aef5c000bb87ceb23fd6bc0add59e62ac25578270cff1b9f6190001f40d500b1d8e8ef31e21c99d1db9a6444d3adf1270";
    const nativeToWantPath =
      "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf12700001f42791bca1f2de4661ed88a30c99a7a9449aa84174";

    /**
        address _cToken,
        bytes calldata _outputToNativePath,
        bytes calldata _nativeToWantPath,
     */

    const commonAddresses = {
      vault: testPlexusVaultERC20_address,
      unirouter: 0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45, // uniswap SwapRouter02
      keeper: KEEPER,
      strategist: STRATEGIST,
      plexusFeeRecipient: STRATEGIST,
      plexusFeeConfig: plexusFeeConfigurator.target,
    };

    await strategyCompoundV3.initialize(
      cToken,
      outputToNativePath,
      nativeToWantPath,
      commonAddresses
    );

    await testPlexusVaultERC20.initialize(
      strategyCompoundV3.target,
      "Plexus CompoundV3 USDCE",
      "PlexusCompoundV3USDCE",
      21600
    );
    await strategyCompoundV3.setHarvestOnDeposit(true);
  });

  //USDT pool
  it("should deposit to vault", async function () {
    const usdce = await ethers.getContractAt(IERC20_SOURCE, USDCe_ADDRESS);

    const depositAmount = ethers.parseUnits("3", 6);
    console.log("CHECK CONSOLE", depositAmount);

    await usdce
      .connect(mainUser)
      .approve(testPlexusVaultERC20_address, depositAmount);
    console.log("CHECK CONSOLE");

    console.log(
      "usdce ALLOWANCe",
      await usdce.allowance(mainUser, testPlexusVaultERC20_address)
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
      USDCe_ADDRESS,
      137,
      5000000
    );

    console.log(
      "oneinch",
      oneInchCallData.dstAmount,
      oneInchCallData.tx.to,
      oneInchCallData.tx.data
    );

    const usdce = await ethers.getContractAt(IERC20_SOURCE, USDCe_ADDRESS);

    const depositAmount = ethers.parseUnits("5", 6);
    console.log("CHECK CONSOLE", depositAmount);

    await usdce
      .connect(mainUser)
      .approve(plexusTokenManager_address, depositAmount);
    console.log("CHECK CONSOLE");

    console.log(
      await plexusZapRouter.tokenManager(),
      plexusTokenManager_address
    );

    console.log(
      "usdce ALLOWANCE",
      await usdce.allowance(mainUser, plexusTokenManager_address)
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
        { token: USDCe_ADDRESS, minOutputAmount: "0" },
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
        tokens: [{ token: USDCe_ADDRESS, index: -1 }],
      },
    ];

    await plexusZapRouter.connect(mainUser).executeOrder(order, route);

    console.log("zapRouter deposit clear");
  });

  it("should depost to zapRouter (Non swap)", async function () {
    const usdtc = await ethers.getContractAt(IERC20_SOURCE, USDCe_ADDRESS);

    const depositAmount = ethers.parseUnits("5", 6);
    // console.log("CHECK CONSOLE", depositAmount);

    await usdtc
      .connect(mainUser)
      .approve(plexusTokenManager_address, depositAmount);

    const order = {
      inputs: [
        {
          token: USDCe_ADDRESS,
          amount: "5000000",
        },
      ],
      outputs: [
        { token: testPlexusVaultERC20_address, minOutputAmount: "4844817" },
        { token: USDCe_ADDRESS, minOutputAmount: "0" },
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
        tokens: [{ token: USDCe_ADDRESS, index: -1 }],
      },
    ];

    // await plexusZapRouter.connect(mainUser).executeOrder(order, route);
    // console.log("zapRouter deposit clear (non swap)");
  });
});
