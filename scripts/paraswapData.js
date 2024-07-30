// import Web3 from "web3";
const axios = require("axios");

// proxyPortal = 0xe0b5452DDB57d5bDd9F49470BAc24BAD879C68E0
// user = "0xb612cF824bFf640b5F3E408Eba5EAf2F46E1F09B"

const diamond = "0x94246aC21feacFD33D043C46014f373F174Edc17";
const NATIVE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const USDC = "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85";

async function fetchOneInchData(
  diamondAddr,
  fromAddr,
  toAddr,
  chainId,
  amount
) {
  const url = `https://api.1inch.dev/swap/v6.0/${chainId}/swap`;

  const config = {
    headers: {
      Authorization: `${process.env.ONE_INCH_API_KEY}`,
    },
    params: {
      src: fromAddr,
      dst: toAddr,
      amount: amount,
      from: diamondAddr,
      slippage: "50",
      disableEstimate: "true",
    },
  };

  try {
    const response = await axios.get(url, config);
    console.log("1inch response", response.data);
    // return response.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

console.log(
  "fetchOneInchData",
  fetchOneInchData(diamond, NATIVE, USDC, 10, 9979583385388267)
);
// exports.fetchOneInchData = fetchOneInchData;
