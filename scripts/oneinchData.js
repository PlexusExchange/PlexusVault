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

// 최상위 레벨에서 async 함수 호출
// (async () => {
//   const result = await fetchOneInchData(
//     diamond,
//     "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
//     "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
//     137,
//     5000000
//   );

//   console.log("fetchOneInchData result", result);
// })();
exports.fetchOneInchData = fetchOneInchData;
