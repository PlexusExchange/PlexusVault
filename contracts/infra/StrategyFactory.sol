// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Minimal proxy pattern for creating new Plexus strategies
contract StrategyFactory is Ownable {
    /// @notice instance mapping to strategy name with version.
    mapping(string => UpgradeableBeacon) public instances;

    /// @notice approved rebalancer mapping
    mapping(address => bool) public rebalancers;

    /// @notice Pause state by strategyName
    mapping(string => bool) public strategyPause;

    /// @notice deployed strategy types
    string[] public strategyTypes;

    /// @notice The address of the wnative token
    address public wnative;

    /// @notice The address of the keeper
    address public keeper;

    /// @notice The plexus fee recipient
    address public plexusFeeRecipient;

    /// @notice The plexus fee config
    address public plexusFeeConfig;

    /// @notice Global pause state for all strategies that use this
    bool public globalPause;

    // Events
    event ProxyCreated(string strategyName, address proxy);
    event InstanceUpgraded(string strategyName, address newImplementation);
    event NewStrategyAdded(string strategyName, address implementation);
    event SetPlexusFeeRecipient(address plexusFeeRecipient);
    event SetPlexusFeeConfig(address plexusFeeConfig);
    event SetKeeper(address keeper);
    event GlobalPause(bool paused);
    event StratPause(string strategyName, bool paused);
    event RebalancerChanged(address rebalancer, bool isRebalancer);

    // Errors
    error NotManager();
    error StratVersionExists();

    /// @notice Throws if called by any account other than the owner or the keeper/
    modifier onlyManager() {
        if (msg.sender != owner() && msg.sender != address(keeper)) revert NotManager();
        _;
    }

    /// @notice Constructor initializes the keeper address
    constructor(address _wnative, address _keeper, address _plexusFeeRecipient, address _plexusFeeConfig) Ownable() {
        wnative = _wnative;
        keeper = _keeper;
        plexusFeeRecipient = _plexusFeeRecipient;
        plexusFeeConfig = _plexusFeeConfig;
    }

    /** @notice Creates a new Plexus Strategy as a proxy of the template instance
     * @param _strategyName The name of the strategy
     * @return A reference to the new proxied Plexus Strategy
     */
    function createStrategy(string calldata _strategyName) external returns (address) {
        // Create a new Plexus Strategy as a proxy of the template instance
        UpgradeableBeacon instance = instances[_strategyName];
        BeaconProxy proxy = new BeaconProxy(address(instance), "");

        emit ProxyCreated(_strategyName, address(proxy));

        return address(proxy);
    }

    /**
     * @notice Upgrades the implementation of a strategy
     * @param _strategyName The name of the strategy
     * @param _newImplementation The new implementation address
     */
    function upgradeTo(string calldata _strategyName, address _newImplementation) external onlyOwner {
        UpgradeableBeacon instance = instances[_strategyName];
        instance.upgradeTo(_newImplementation);
        emit InstanceUpgraded(_strategyName, _newImplementation);
    }

    /**
     * @notice Adds a new strategy to the factory
     * @param _strategyName The name of the strategy
     * @param _implementation The implementation address
     */
    function addStrategy(string calldata _strategyName, address _implementation) external onlyManager {
        if (address(instances[_strategyName]) != address(0)) revert StratVersionExists();
        instances[_strategyName] = new UpgradeableBeacon(_implementation);

        // Store in our deployed strategy type array
        strategyTypes.push(_strategyName);
        emit NewStrategyAdded(_strategyName, _implementation);
    }

    /**
     * @notice Pauses all strategies
     */
    function pauseAllStrats() external onlyManager {
        globalPause = true;
        emit GlobalPause(true);
    }

    /**
     * @notice Unpauses all strategies
     */
    function unpauseAllStrats() external onlyOwner {
        globalPause = false;
        emit GlobalPause(false);
    }

    function pauseStrategy(string calldata _strategyName) external onlyManager {
        strategyPause[_strategyName] = true;
        emit StratPause(_strategyName, true);
    }

    function unpauseStrategy(string calldata _strategyName) external onlyOwner {
        strategyPause[_strategyName] = false;
        emit StratPause(_strategyName, false);
    }

    /**
     * @notice Adds a rebalancer callable by the owner
     * @param _rebalancer The rebalancer address
     */
    function addRebalancer(address _rebalancer) external onlyOwner {
        rebalancers[_rebalancer] = true;
        emit RebalancerChanged(_rebalancer, true);
    }

    /**
     * @notice Removes a rebalancer callable by a manager
     * @param _rebalancer The rebalancer address
     */
    function removeRebalancer(address _rebalancer) external onlyManager {
        rebalancers[_rebalancer] = false;
        emit RebalancerChanged(_rebalancer, false);
    }

    /**
     * @notice set the plexus fee recipient address
     * @param _plexusFeeRecipient The new plexus fee recipient address
     */
    function setPlexusFeeRecipient(address _plexusFeeRecipient) external onlyOwner {
        plexusFeeRecipient = _plexusFeeRecipient;
        emit SetPlexusFeeRecipient(_plexusFeeRecipient);
    }

    /**
     * @notice set the plexus fee config address
     * @param _plexusFeeConfig The new plexus fee config address
     */
    function setPlexusFeeConfig(address _plexusFeeConfig) external onlyOwner {
        plexusFeeConfig = _plexusFeeConfig;
        emit SetPlexusFeeConfig(_plexusFeeConfig);
    }

    /**
     * @notice set the keeper address
     * @param _keeper The new keeper address
     */
    function setKeeper(address _keeper) external onlyOwner {
        keeper = _keeper;
        emit SetKeeper(_keeper);
    }

    /**
     * @notice Gets the implementation of a strategy
     * @param _strategyName The name of the strategy
     * @return The implementation address
     */
    function getImplementation(string calldata _strategyName) external view returns (address) {
        return instances[_strategyName].implementation();
    }

    /**
     * @notice Gets the array of deployed strategies
     * @return The array of deployed strategies
     */
    function getStrategyTypes() external view returns (string[] memory) {
        return strategyTypes;
    }
}