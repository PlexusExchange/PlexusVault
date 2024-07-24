import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const networkName = "POLYGON";

const config: HardhatUserConfig = {
  defaultNetwork: networkName,
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      gas: 30000000, // 원하는 가스 리밋 값으로 조절
      gasPrice: 150000000000, // 100000000 => 0.1gwei 50000000000 => 50gwei
      //8160067549528925
      forking: {
        url: process.env.MAIN_POLYGON_URL,
      },
    },
    ETH: {
      url: process.env.MAIN_ETH_URL,
      accounts: [process.env.MAIN_PKEY],
    },
    POLYGON: {
      allowUnlimitedContractSize: true,
      url: process.env.MAIN_POLYGON_URL,
      accounts: [process.env.MAIN_PKEY],
      gasPrice: 300000000000,
    },
    BNB: {
      url: process.env.MAIN_BNB_URL,
      accounts: [process.env.MAIN_PKEY],
    },
    ARBI: {
      url: process.env.MAIN_ARBI_URL,
      accounts: [process.env.MAIN_PKEY],
    },
    FANTOM: {
      url: process.env.MAIN_FANTOM_URL,
      accounts: [process.env.MAIN_PKEY],
    },
    KAVA: {
      url: process.env.MAIN_KAVA_URL,
      accounts: [process.env.MAIN_PKEY],
      gasPrice: 1000000000,
    },
    AVAX: {
      url: process.env.MAIN_AVAX_URL,
      accounts: [process.env.MAIN_PKEY],
    },
    OP: {
      url: process.env.MAIN_OP_URL,
      accounts: [process.env.MAIN_PKEY],
    },
    AURORA: {
      url: process.env.MAIN_AURORA_URL,
      accounts: [process.env.MAIN_PKEY],
    },
    // GNOSIS: {
    //   url: process.env.MAIN_GNOSIS_URL,
    //   accounts: [process.env.MAIN_PKEY],
    // },
    KLAY: {
      url: process.env.MAIN_KLAY_URL,
      accounts: [process.env.MAIN_PKEY],
      gasPrice: 50000000000,
    },
    LINEA: {
      url: process.env.MAIN_LINEA_URL,
      accounts: [process.env.MAIN_PKEY],
    },
    ZKEVM: {
      url: process.env.MAIN_ZKEVM_URL,
      accounts: [process.env.MAIN_PKEY],
    },
    BASE: {
      url: process.env.MAIN_BASE_URL,
      accounts: [process.env.MAIN_PKEY],
    },
    SCROLL: {
      url: process.env.MAIN_SCROLL_URL,
      accounts: [process.env.MAIN_PKEY],
    },
    MANTLE: {
      url: process.env.MAIN_MANTLE_URL,
      accounts: [process.env.MAIN_PKEY],
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.19",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 20000,
  },

  gasReporter: {
    enabled: true,
    currency: "USD",
    gasPrice: 15,
    token: "ETH",
    coinmarketcap: process.env.COIN_MARKET_CAP_API,
  },
  etherscan: {
    apiKey: process.env[networkName + "_APIKEY"],
  },
};

export default config;
