// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IStrategyFactory {
    function createStrategy(
        string calldata _strategyName
    ) external returns (address);
    function wnative() external view returns (address);
    function keeper() external view returns (address);
    function plexusFeeRecipient() external view returns (address);
    function plexusFeeConfig() external view returns (address);
    function globalPause() external view returns (bool);
    function strategyPause(
        string calldata stratName
    ) external view returns (bool);
    function native() external view returns (address);
    function rebalancers(address) external view returns (bool);
}
