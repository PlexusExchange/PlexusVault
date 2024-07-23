// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

interface IBeefyVaultV7 {
    function name() external view returns (string memory);

    function deposit(uint256) external;

    function depositAll() external;

    function withdraw(uint256) external;

    function withdrawAll() external;

    function getPricePerFullShare() external view returns (uint256);

    function upgradeStrat() external;

    function balance() external view returns (uint256);

    function balanceOf(address) external view returns (uint256);
}
