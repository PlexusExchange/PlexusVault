// test/vaultTest.ts

import { ethers, network } from "hardhat";
import {
  PlexusVaultERC20,
  PlexusVaultFactory,
  StrategyHop,
  SimpleSwapper,
  PlexusFeeConfigurator,
  PlexusZapRouter,
  PlexusTokenManager,
} from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { mine } from "@nomicfoundation/hardhat-network-helpers";

import { fetchOneInchData } from "../scripts/oneinchData.js";
import { makeUniswapPath } from "../scripts/makeUniswapPath.js";

describe("VaultTest", function () {
  let plexusVaultFactory: PlexusVaultFactory;
  let testPlexusVaultERC20: PlexusVaultERC20;
  let plexusVault: PlexusVaultERC20;
  let strategyHop: StrategyHop;
  let simpleSwapper: SimpleSwapper;
  let plexusFeeConfigurator: PlexusFeeConfigurator;
  let plexusZapRouter: PlexusZapRouter;
  let plexusTokenManager: PlexusTokenManager;
  let mainUser: HardhatEthersSigner;
  let usdc_whale: HardhatEthersSigner;
  let testPlexusVaultERC20_address: string;
  let plexusTokenManager_address: string;

  const IERC20_SOURCE = "contracts/interfaces/common/IERC20.sol:IERC20";

  const HOP_ADDRESS_OPTI = "0xc5102fE9359FD9a28f877a67E36B0F050d81a3CC";
  const USDT_ADDRESS_OPTI = "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58";
  const USDC_ADDRESS_OPTI = "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85";
  const WNATIVE_OPTI = "0x4200000000000000000000000000000000000006";
  const NATIVE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

  const HopLiquidityPool = "0xeC4B41Af04cF917b54AEb6Df58c0f8D78895b5Ef";
  const HopRewards = "0xAeB1b49921E0D2D96FcDBe0D486190B2907B3e0B";
  const USDT_hUSDT_lpToken = "0xF753A50fc755c6622BBCAa0f59F0522f264F006e";

  const KEEPER = "0xb612cF824bFf640b5F3E408Eba5EAf2F46E1F09B";
  const STRATEGIST = "0x0Bb989a2593E7513B44ae408F1e3191E0183b20a";
  const ONEINCH = "0x111111125421cA6dc452d289314280a0f8842A65";
  const UniswapRouterV2 = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";

  before(async function () {
    const mainUserAddress = "0xacD03D601e5bB1B275Bb94076fF46ED9D753435A";
    const USDC_WHALE = "0xacD03D601e5bB1B275Bb94076fF46ED9D753435A";
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [mainUserAddress],
    });

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [USDC_WHALE],
    });

    mainUser = await ethers.getSigner(mainUserAddress);

    usdc_whale = await ethers.getSigner(USDC_WHALE);

    const PlexusVaultERC20Factory = await ethers.getContractFactory(
      "PlexusVaultERC20"
    );
    const PlexusVaultFactoryFactory = await ethers.getContractFactory(
      "PlexusVaultFactory"
    );
    const StrategyHopFactory = await ethers.getContractFactory("StrategyHop");
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
    strategyHop = (await StrategyHopFactory.deploy()) as unknown as StrategyHop;
    simpleSwapper = (await SimpleSwapperFactory.deploy(
      WNATIVE_OPTI,
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

    const commonAddresses = {
      vault: testPlexusVaultERC20_address,
      swapper: simpleSwapper.target,
      keeper: KEEPER,
      strategist: STRATEGIST,
      plexusFeeRecipient: STRATEGIST,
      plexusFeeConfig: plexusFeeConfigurator.target,
    };

    await strategyHop.initialize(
      HopLiquidityPool,
      HopRewards,
      USDT_hUSDT_lpToken,
      WNATIVE_OPTI,
      [HOP_ADDRESS_OPTI],
      commonAddresses
    );

    await testPlexusVaultERC20.initialize(
      strategyHop.target,
      "Plexus Hop USDT",
      "PlexusHopUSDT",
      21600
    );
    await strategyHop.setHarvestOnDeposit(true);

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

    // HOP -> WETH
    const swapPath = await makeUniswapPath(
      HOP_ADDRESS_OPTI,
      10000,
      WNATIVE_OPTI
    );

    console.log("swapPath", swapPath);
    const functionArguments1 = [
      swapPath,
      simpleSwapper.target.toString(),
      ethers.parseUnits("1.0", 18),
      ethers.parseUnits("0", 18),
    ];
    const iface = new ethers.Interface(uniswap_exactInput_ABI);

    // 인코딩된 데이터를 생성합니다.
    const encodedData1 = iface.encodeFunctionData("exactInput", [
      functionArguments1,
    ]);
    console.log("encodedData1", encodedData1);

    // ETH/WETH 풀 있음. 0.01%
    // ETH/USDT 풀 있음. 0.05%
    // => WETH -> ETH -> USDT 이렇게 가야함?
    /**
     0x4200000000000000000000000000000000000006
     1000
     0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
     5000
     0x94b008aa00579c1307b0ef2c499ad98a8ce58e58
     */

    //WETH -> USDT
    const swapPath2 = await makeUniswapPath(
      WNATIVE_OPTI,
      3000,
      USDT_ADDRESS_OPTI
    );
    console.log("swapPath", swapPath2);
    const functionArguments2 = [
      swapPath2,
      simpleSwapper.target.toString(),
      ethers.parseUnits("1.0", 18),
      ethers.parseUnits("0", 6),
    ];

    // 인코딩된 데이터를 생성합니다.
    const encodedData2 = iface.encodeFunctionData("exactInput", [
      functionArguments2,
    ]);
    console.log("encodedData2", encodedData2);

    //data주소부분 simpleSwapper로 바꿔야함
    const swapInfo_HOP_WETHER = {
      router: UniswapRouterV2,
      data: encodedData1,
      amountIndex: 100,
    };

    const swapInfo_WETHER_USDT = {
      router: UniswapRouterV2,
      data: encodedData2,
      amountIndex: 100,
    };

    await simpleSwapper.setSwapInfo(
      HOP_ADDRESS_OPTI,
      WNATIVE_OPTI,
      swapInfo_HOP_WETHER
    );
    await simpleSwapper.setSwapInfo(
      WNATIVE_OPTI,
      USDT_ADDRESS_OPTI,
      swapInfo_WETHER_USDT
    );
  });

  //USDT pool
  it("should deposit to vault", async function () {
    const usdt = await ethers.getContractAt(IERC20_SOURCE, USDT_ADDRESS_OPTI);

    const depositAmount = ethers.parseUnits("5", 6);
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
    console.log(
      "testPlexusVaultERC20 balance",
      await testPlexusVaultERC20.balanceOf(mainUser) // 4.718942685189445332n
    );
    console.log("CHECK CONSOLE");
  });

  //USDC -> swap -> USDTpool
  //note : https://polygonscan.com/tx/0x2d5654cc371668a9abd6fc446811c379c9cade8b5f36613399b5ed140d196a2c
  it("should swap-deposit to zapRouter", async function () {
    console.log((await ethers.provider.getBlock("latest"))?.number);
    // instantly mine 1000 blocks
    await mine(1000);
    console.log((await ethers.provider.getBlock("latest"))?.number);
    const oneInchCallData = await fetchOneInchData(
      //1inch swap하고 받는곳 zapRouter로 설정.
      await plexusZapRouter.getAddress(),
      USDC_ADDRESS_OPTI,
      USDT_ADDRESS_OPTI,
      10,
      50000000
    );

    console.log(
      "oneinch",
      oneInchCallData.dstAmount,
      oneInchCallData.tx.to,
      oneInchCallData.tx.data
    );

    const usdc = await ethers.getContractAt(IERC20_SOURCE, USDC_ADDRESS_OPTI);

    const depositAmount = ethers.parseUnits("50", 6);
    console.log("CHECK CONSOLE", depositAmount);

    await usdc
      .connect(usdc_whale)
      .approve(plexusTokenManager_address, depositAmount);
    console.log("CHECK CONSOLE");

    console.log(
      await plexusZapRouter.tokenManager(),
      plexusTokenManager_address
    );

    console.log(
      "usdce ALLOWANCE",
      await usdc.allowance(usdc_whale, plexusTokenManager_address)
    );

    console.log("testPlexusVaultERC20_address", testPlexusVaultERC20_address);
    const order = {
      inputs: [
        {
          token: USDC_ADDRESS_OPTI,
          amount: "50000000",
        },
      ],
      outputs: [
        { token: testPlexusVaultERC20_address, minOutputAmount: "0" },
        { token: USDC_ADDRESS_OPTI, minOutputAmount: "0" },
        { token: USDT_ADDRESS_OPTI, minOutputAmount: "0" },
      ],
      relay: {
        target: "0x0000000000000000000000000000000000000000",
        value: "0",
        data: "0x",
      },
      user: usdc_whale,
      recipient: usdc_whale,
    };

    const route = [
      {
        target: oneInchCallData.tx.to,
        value: "0",
        data: oneInchCallData.tx.data,
        tokens: [{ token: USDC_ADDRESS_OPTI, index: -1 }],
      },
      {
        target: testPlexusVaultERC20_address,
        value: "0",
        data: "0xde5f6268",
        tokens: [{ token: USDT_ADDRESS_OPTI, index: -1 }],
      },
    ];

    console.log(
      "usdc_whale amount ",
      await testPlexusVaultERC20.balanceOf(usdc_whale)
    );

    await plexusZapRouter.connect(usdc_whale).executeOrder(order, route);

    console.log("zapRouter deposit clear");
  });

  //USDT pool
  it("should withdraw to vault", async function () {
    const vault_token = await ethers.getContractAt(
      IERC20_SOURCE,
      testPlexusVaultERC20_address
    );

    await testPlexusVaultERC20
      .connect(mainUser)
      .approve(
        testPlexusVaultERC20_address,
        await testPlexusVaultERC20.balanceOf(mainUser)
      );

    console.log("APPROVE CLEAR");

    console.log(
      "mainuser amount ",
      await testPlexusVaultERC20.balanceOf(mainUser) // 51.886493660128820777n
    );

    console.log(
      "ALLOWANCE",
      await testPlexusVaultERC20.allowance(
        mainUser,
        testPlexusVaultERC20_address
      )
    );

    // await testPlexusVaultERC20.connect(mainUser).withdrawAll();
    await testPlexusVaultERC20.connect(mainUser).withdraw(518419160140);
    console.log("CHECK CONSOLE");
  });

  //ETH -> swap -> USDTpool
  //note : https://polygonscan.com/tx/0x2d5654cc371668a9abd6fc446811c379c9cade8b5f36613399b5ed140d196a2c
  it("should swap-deposit to zapRouter", async function () {
    console.log((await ethers.provider.getBlock("latest"))?.number);
    // instantly mine 1000 blocks
    await mine(1000);
    console.log((await ethers.provider.getBlock("latest"))?.number);
    const oneInchCallData = await fetchOneInchData(
      //1inch swap하고 받는곳 zapRouter로 설정.
      await plexusZapRouter.getAddress(),
      NATIVE,
      USDT_ADDRESS_OPTI,
      10,
      1000000000000000
    );

    console.log(
      "oneinch",
      oneInchCallData.dstAmount,
      oneInchCallData.tx.to,
      oneInchCallData.tx.data
    );

    const usdc = await ethers.getContractAt(IERC20_SOURCE, USDC_ADDRESS_OPTI);

    const depositAmount = ethers.parseUnits("50", 6);
    console.log("CHECK CONSOLE", depositAmount);

    await usdc
      .connect(usdc_whale)
      .approve(plexusTokenManager_address, depositAmount);
    console.log("CHECK CONSOLE");

    console.log(
      await plexusZapRouter.tokenManager(),
      plexusTokenManager_address
    );

    console.log(
      "usdce ALLOWANCE",
      await usdc.allowance(usdc_whale, plexusTokenManager_address)
    );

    console.log("testPlexusVaultERC20_address", testPlexusVaultERC20_address);
    const order = {
      inputs: [
        {
          token: NATIVE,
          amount: "1000000000000000",
        },
      ],
      outputs: [
        { token: testPlexusVaultERC20_address, minOutputAmount: "0" },
        { token: USDT_ADDRESS_OPTI, minOutputAmount: "0" },
        { token: NATIVE, minOutputAmount: "0" },
      ],
      relay: {
        target: "0x0000000000000000000000000000000000000000",
        value: "0",
        data: "0x",
      },
      user: usdc_whale,
      recipient: usdc_whale,
    };

    const route = [
      {
        target: oneInchCallData.tx.to,
        value: "1000000000000000",
        data: oneInchCallData.tx.data,
        tokens: [{ token: NATIVE, index: -1 }],
      },
      {
        target: testPlexusVaultERC20_address,
        value: "0",
        // data: "0xde5f6268",
        //tokens: [{ token: USDT_ADDRESS_OPTI, index: -1 }],
        data: "0xb6b55f25000000000000000000000000000000000000000000000000000000000028fb1e",
        tokens: [{ token: USDT_ADDRESS_OPTI, index: 4 }],
      },
    ];

    console.log("ETH -> swap -> USDT");

    await plexusZapRouter
      .connect(usdc_whale)
      .executeOrder(order, route, { value: 1000000000000000 });

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
