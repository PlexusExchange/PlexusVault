const { getAddress } = require("ethers");
function bytesToAddress(bytes) {
  // Remove the leading zeros and take the last 20 bytes (40 hex characters)
  const strippedBytes = "0x" + bytes.slice(-40);
  return getAddress(strippedBytes);
}
// Example input
const input =
  "0x0000000000000000000000008d268df24717a1ba910c4d77726846a8b6ac8b68";
const address = bytesToAddress(input);
console.log(address);
