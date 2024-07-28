// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./PlexusVaultERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "hardhat/console.sol";

// Minimal proxy pattern for creating new PlexusVaultERC20 vaults
contract PlexusVaultFactory {
    using ClonesUpgradeable for address;

    // Contract template for deploying proxied Plexus vaults
    PlexusVaultERC20 public instance;

    event ProxyCreated(address proxy);

    // Initializes the Factory with an instance of the Plexus Vault
    constructor(address _instance) {
        if (_instance == address(0)) {
            instance = new PlexusVaultERC20();
        } else {
            instance = PlexusVaultERC20(_instance);
        }
    }

    // Creates a new Plexus Vault as a proxy of the template instance
    // A reference to the new proxied Plexus Vault
    function cloneVault() external returns (PlexusVaultERC20) {
        return PlexusVaultERC20(cloneContract(address(instance)));
    }

    // Deploys and returns the address of a clone that mimics the behaviour of `implementation`
    function cloneContract(address implementation) public returns (address) {
        address proxy = implementation.clone();
        emit ProxyCreated(proxy);
        return proxy;
    }
}
