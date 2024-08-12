// test/vaultTest.ts

import { ethers, network } from "hardhat";
import {
  PlexusVaultERC20,
  PlexusVaultFactory,
  StrategyCompoundV3,
  SimpleSwapper,
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
  let simpleSwapper: SimpleSwapper;
  let plexusFeeConfigurator: PlexusFeeConfigurator;
  let plexusZapRouter: PlexusZapRouter;
  let plexusTokenManager: PlexusTokenManager;
  let mainUser: HardhatEthersSigner;
  let testPlexusVaultERC20_address: string;
  let plexusTokenManager_address: string;

  const IERC20_SOURCE = "contracts/interfaces/common/IERC20.sol:IERC20";

  const COMP_ADDRESS = "0x8505b9d2254a7ae468c0e9dd10ccea3a837aef5c";
  const USDCe_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
  const USDC_ADDRESS = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
  const WNATIVE = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
  const USDCe_CTOKEN = "0xF25212E676D1F7F89Cd72fFEe66158f541246445";

  const KEEPER = "0xb612cF824bFf640b5F3E408Eba5EAf2F46E1F09B";
  const STRATEGIST = "0x0Bb989a2593E7513B44ae408F1e3191E0183b20a";
  const ONEINCH = "0x111111125421cA6dc452d289314280a0f8842A65";
  const COMET_REWARDS = "0x45939657d1CA34A8FA39A924B71D28Fe8431e581";

  before(async function () {
    const mainUserAddress = "0xb612cF824bFf640b5F3E408Eba5EAf2F46E1F09B";
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [mainUserAddress],
    });

    mainUser = await ethers.getSigner(mainUserAddress);

    const PlexusVaultERC20Factory = await ethers.getContractFactory(
      "PlexusVaultERC20"
    );
    const PlexusVaultFactoryFactory = await ethers.getContractFactory(
      "PlexusVaultFactory"
    );
    const StrategyCompoundV3Factory = await ethers.getContractFactory(
      "StrategyCompoundV3"
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
    strategyCompoundV3 =
      (await StrategyCompoundV3Factory.deploy()) as unknown as StrategyCompoundV3;
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

    const cToken = USDCe_CTOKEN;

    const commonAddresses = {
      vault: testPlexusVaultERC20_address,
      swapper: simpleSwapper.target,
      keeper: KEEPER,
      strategist: STRATEGIST,
      plexusFeeRecipient: STRATEGIST,
      plexusFeeConfig: plexusFeeConfigurator.target,
    };

    await strategyCompoundV3.initialize(
      cToken,
      WNATIVE,
      COMP_ADDRESS,
      COMET_REWARDS,
      commonAddresses
    );

    await testPlexusVaultERC20.initialize(
      strategyCompoundV3.target,
      "Plexus CompoundV3 USDCE",
      "PlexusCompoundV3USDCE",
      21600
    );
    await strategyCompoundV3.setHarvestOnDeposit(true);

    const uniswap_exactInput_ABI = [
      {
        inputs: [
          {
            components: [
              { internalType: "bytes", name: "path", type: "bytes" },
              { internalType: "address", name: "recipient", type: "address" },
              { internalType: "uint256", name: "amountIn", type: "uint256" },
              {
                internalType: "uint256",
                name: "amountOutMinimum",
                type: "uint256",
              },
            ],
            internalType: "struct IV3SwapRouter.ExactInputParams",
            name: "params",
            type: "tuple",
          },
        ],
        name: "exactInput",
        outputs: [
          { internalType: "uint256", name: "amountOut", type: "uint256" },
        ],
        stateMutability: "payable",
        type: "function",
      },
    ];
    const uniswap_exactInput_data =
      "0xb858183f00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000080000000000000000000000000b612cf824bff640b5f3e408eba5eaf2f46e1f09b0000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002b8505b9d2254a7ae468c0e9dd10ccea3a837aef5c000bb80d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000000000000000000000";

    const iface = new ethers.Interface(uniswap_exactInput_ABI);
    const decodedData = iface.decodeFunctionData(
      "exactInput",
      uniswap_exactInput_data
    );

    const [input1, input2, input3, input4] = decodedData[0];

    const encodedData = iface.encodeFunctionData("exactInput", [
      [
        input1.toString(),
        simpleSwapper.target.toString(),
        input3.toString(),
        input4.toString(),
      ],
    ]);

    //data주소부분 simpleSwapper로 바꿔야함
    const swapInfo_oneinch_COMP_WMATIC = {
      router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", //uniswap
      data: encodedData,
      amountIndex: 100,
    };

    const swapInfo_oneinch_WMATIC_USDCe = {
      router: ONEINCH,
      data: "0x83800a8e0000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf12700000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000000000000008800000000000003b6d0340604229c960e5cacf2aaeac8be68ac07ba9df81c3ea822ca3",
      amountIndex: 36,
    };

    await simpleSwapper.setSwapInfo(
      COMP_ADDRESS,
      WNATIVE,
      swapInfo_oneinch_COMP_WMATIC
    );
    await simpleSwapper.setSwapInfo(
      WNATIVE,
      USDCe_ADDRESS,
      swapInfo_oneinch_WMATIC_USDCe
    );
  });

  //USDCe pool
  it("should deposit to vault", async function () {
    const usdce = await ethers.getContractAt(IERC20_SOURCE, USDCe_ADDRESS);

    const depositAmount = ethers.parseUnits("5", 6);
    console.log("CHECK CONSOLE", depositAmount);

    await usdce
      .connect(mainUser)
      .approve(testPlexusVaultERC20_address, depositAmount);

    await testPlexusVaultERC20.connect(mainUser).deposit(depositAmount);
  });

  //USDC -> swap -> USDCepool
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

    const usdc = await ethers.getContractAt(IERC20_SOURCE, USDC_ADDRESS);

    const depositAmount = ethers.parseUnits("5", 6);

    await usdc
      .connect(mainUser)
      .approve(plexusTokenManager_address, depositAmount);

    console.log(
      "usdce ALLOWANCE",
      await usdc.allowance(mainUser, plexusTokenManager_address)
    );

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
  /**

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
   */
});
