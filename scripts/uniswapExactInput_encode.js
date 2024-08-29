const { ethers, solidityPacked } = require("ethers");
const UNISWAP_SWAPROUTERV2_ABI = [
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
    outputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
];

const iface = new ethers.Interface(UNISWAP_SWAPROUTERV2_ABI);

const params = {
  path: solidityPacked(
    ["address", "uint24", "address"],
    [
      "0xE3B53AF74a4BF62Ae5511055290838050bf764Df",
      10000,
      "0x4200000000000000000000000000000000000006",
    ]
  ),
  recipient: "0xb612cF824bFf640b5F3E408Eba5EAf2F46E1F09B",
  amountIn: ethers.parseUnits("1.0", 18),
  amountOutMinimum: 0,
};

const encodedData = iface.encodeFunctionData("exactInput", [params]);

console.log("Encoded data:", encodedData);
