const axios = require("axios");
require("dotenv").config();

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
    return response.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

// (async () => {
//   const result = await fetchOneInchData(
//     diamond,
//     "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
//     "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
//     137,
//     1000000000000000000
//   );

//   console.log("fetchOneInchData result", result);
// })();
exports.fetchOneInchData = fetchOneInchData;
