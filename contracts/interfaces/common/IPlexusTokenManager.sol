// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {IPlexusZapRouter} from "./IPlexusZapRouter.sol";

/**
 * @title Token manager interface
 * @notice Interface for the token manager
 */
interface IPlexusTokenManager {
    /**
     * @notice Pull tokens from a user
     * @param _user Address of user to transfer tokens from
     * @param _inputs Addresses and amounts of tokens to transfer
     */
    function pullTokens(
        address _user,
        IPlexusZapRouter.Input[] calldata _inputs
    ) external;
}
