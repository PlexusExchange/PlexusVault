const { ethers } = require("ethers");

const zapRouter_ABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "target",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "callData",
        type: "bytes",
      },
    ],
    name: "CallFailed",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "caller",
        type: "address",
      },
    ],
    name: "CallerNotZap",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
    ],
    name: "EtherTransferFailed",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "balance",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "relayValue",
        type: "uint256",
      },
    ],
    name: "InsufficientRelayValue",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "caller",
        type: "address",
      },
    ],
    name: "InvalidCaller",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "minAmountOut",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "balance",
        type: "uint256",
      },
    ],
    name: "Slippage",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "target",
        type: "address",
      },
    ],
    name: "TargetingInvalidContract",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        components: [
          {
            components: [
              {
                internalType: "address",
                name: "token",
                type: "address",
              },
              {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
              },
            ],
            internalType: "struct IPlexusZapRouter.Input[]",
            name: "inputs",
            type: "tuple[]",
          },
          {
            components: [
              {
                internalType: "address",
                name: "token",
                type: "address",
              },
              {
                internalType: "uint256",
                name: "minOutputAmount",
                type: "uint256",
              },
            ],
            internalType: "struct IPlexusZapRouter.Output[]",
            name: "outputs",
            type: "tuple[]",
          },
          {
            components: [
              {
                internalType: "address",
                name: "target",
                type: "address",
              },
              {
                internalType: "uint256",
                name: "value",
                type: "uint256",
              },
              {
                internalType: "bytes",
                name: "data",
                type: "bytes",
              },
            ],
            internalType: "struct IPlexusZapRouter.Relay",
            name: "relay",
            type: "tuple",
          },
          {
            internalType: "address",
            name: "user",
            type: "address",
          },
          {
            internalType: "address",
            name: "recipient",
            type: "address",
          },
        ],
        indexed: true,
        internalType: "struct IPlexusZapRouter.Order",
        name: "order",
        type: "tuple",
      },
      {
        indexed: true,
        internalType: "address",
        name: "caller",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "recipient",
        type: "address",
      },
    ],
    name: "FulfilledOrder",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "Paused",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "target",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "RelayData",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "TokenReturned",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "Unpaused",
    type: "event",
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              {
                internalType: "address",
                name: "token",
                type: "address",
              },
              {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
              },
            ],
            internalType: "struct IPlexusZapRouter.Input[]",
            name: "inputs",
            type: "tuple[]",
          },
          {
            components: [
              {
                internalType: "address",
                name: "token",
                type: "address",
              },
              {
                internalType: "uint256",
                name: "minOutputAmount",
                type: "uint256",
              },
            ],
            internalType: "struct IPlexusZapRouter.Output[]",
            name: "outputs",
            type: "tuple[]",
          },
          {
            components: [
              {
                internalType: "address",
                name: "target",
                type: "address",
              },
              {
                internalType: "uint256",
                name: "value",
                type: "uint256",
              },
              {
                internalType: "bytes",
                name: "data",
                type: "bytes",
              },
            ],
            internalType: "struct IPlexusZapRouter.Relay",
            name: "relay",
            type: "tuple",
          },
          {
            internalType: "address",
            name: "user",
            type: "address",
          },
          {
            internalType: "address",
            name: "recipient",
            type: "address",
          },
        ],
        internalType: "struct IPlexusZapRouter.Order",
        name: "_order",
        type: "tuple",
      },
      {
        components: [
          {
            internalType: "address",
            name: "target",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "value",
            type: "uint256",
          },
          {
            internalType: "bytes",
            name: "data",
            type: "bytes",
          },
          {
            components: [
              {
                internalType: "address",
                name: "token",
                type: "address",
              },
              {
                internalType: "int32",
                name: "index",
                type: "int32",
              },
            ],
            internalType: "struct IPlexusZapRouter.StepToken[]",
            name: "tokens",
            type: "tuple[]",
          },
        ],
        internalType: "struct IPlexusZapRouter.Step[]",
        name: "_route",
        type: "tuple[]",
      },
    ],
    name: "executeOrder",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "tokenManager",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    stateMutability: "payable",
    type: "receive",
  },
];

const vault_ABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "shares",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "fee0",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "fee1",
        type: "uint256",
      },
    ],
    name: "Deposit",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint8",
        name: "version",
        type: "uint8",
      },
    ],
    name: "Initialized",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "implementation",
        type: "address",
      },
    ],
    name: "NewStratCandidate",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "Paused",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "Unpaused",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "implementation",
        type: "address",
      },
    ],
    name: "UpgradeStrat",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "shares",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1",
        type: "uint256",
      },
    ],
    name: "Withdraw",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
    ],
    name: "allowance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "approvalDelay",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "available",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "balance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "subtractedValue",
        type: "uint256",
      },
    ],
    name: "decreaseAllowance",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "depositAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "earn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getPricePerFullShare",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_token",
        type: "address",
      },
    ],
    name: "inCaseTokensGetStuck",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "addedValue",
        type: "uint256",
      },
    ],
    name: "increaseAllowance",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_strategy",
        type: "address",
      },
      {
        internalType: "string",
        name: "_name",
        type: "string",
      },
      {
        internalType: "string",
        name: "_symbol",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "_approvalDelay",
        type: "uint256",
      },
    ],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_implementation",
        type: "address",
      },
    ],
    name: "proposeStrat",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "stratCandidate",
    outputs: [
      {
        internalType: "address",
        name: "implementation",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "proposedTime",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "strategy",
    outputs: [
      {
        internalType: "contract IStrategy",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferFrom",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "upgradeStrat",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "want",
    outputs: [
      {
        internalType: "contract IERC20Upgradeable",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_shares",
        type: "uint256",
      },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdrawAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_shares",
        type: "uint256",
      },
    ],
    name: "withdrawEstimate",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const txData =
  "0xf41b2db6000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000002e000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000220000000000000000000000000b612cf824bff640b5f3e408eba5eaf2f46e1f09b000000000000000000000000b612cf824bff640b5f3e408eba5eaf2f46e1f09b000000000000000000000000000000000000000000000000000000000000000100000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab1000000000000000000000000000000000000000000000000001c6bf526340000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000fb853acea0e76f73f8274b521fe1611c888670cc0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ba68d5bfb2755f254ee959711d89edc8ece3852700000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000220000000000000000000000000a669e7a0d4b3e4fa48af2de86bd4cd7126be4e1300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000000d983bd37f9000b0001fb853acea0e76f73f8274b521fe1611c888670cc070e35fa931a00000a03071fdcd167e9400000028f5c00019b99e9c620b2E2f09E0b9Fced8F679eEcF2653FE0001AbAa8a997Fd5acCe3A63394Ec74A71c392d36c360001b612cF824bFf640b5F3E408Eba5EAf2F46E1F09B2c89c91a0301020300030101000102011eff00000000000000000000000000000000000000abaa8a997fd5acce3a63394ec74a71c392d36c3682af49447d8a07e3bd95bd0d56f35241523fbab100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab1ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000000000000000000000ba68d5bfb2755f254ee959711d89edc8ece3852700000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000000842505c3d9000000000000000000000000000000000000000000000000000e35fa931a00000000000000000000000000000000000000000000000003071fdcd167e94000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab10000000000000000000000000000000000000000000000000000000000000004000000000000000000000000fb853acea0e76f73f8274b521fe1611c888670cc0000000000000000000000000000000000000000000000000000000000000004";
const iface = new ethers.Interface(zapRouter_ABI);
const decodedData = iface.decodeFunctionData("executeOrder", txData);

function formatDecodedData(decodedData) {
  function formatResult(result) {
    if (Array.isArray(result)) {
      return result.map(formatResult);
    }
    if (typeof result === "bigint") {
      return result.toString();
    }
    if (typeof result === "object" && result !== null) {
      return formatResult(Object.values(result));
    }
    return result;
  }

  return formatResult(decodedData);
}
const formattedData = formatDecodedData(decodedData);
console.log(JSON.stringify(formattedData, null, 2));
