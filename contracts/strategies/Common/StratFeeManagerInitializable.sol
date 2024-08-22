// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "../../interfaces/common/IFeeConfig.sol";

contract StratFeeManagerInitializable is
    OwnableUpgradeable,
    PausableUpgradeable
{
    struct CommonAddresses {
        address vault;
        address swapper;
        address keeper;
        address strategist;
        address plexusFeeRecipient;
        address plexusFeeConfig;
    }

    // common addresses for the strategy
    address public vault;
    address public swapper;
    address public keeper;
    address public strategist;
    address public plexusFeeRecipient;
    IFeeConfig public plexusFeeConfig;

    uint256 constant DIVISOR = 1 ether;
    uint256 public constant WITHDRAWAL_FEE_CAP = 50;
    uint256 public constant WITHDRAWAL_MAX = 10000;
    uint256 internal withdrawalFee;

    event SetStratFeeId(uint256 feeId);
    event SetWithdrawalFee(uint256 withdrawalFee);
    event SetVault(address vault);
    event SetSwapper(address swapper);
    event SetKeeper(address keeper);
    event SetStrategist(address strategist);
    event SetPlexusFeeRecipient(address plexusFeeRecipient);
    event SetPlexusFeeConfig(address plexusFeeConfig);

    function __StratFeeManager_init(
        CommonAddresses calldata _commonAddresses
    ) internal onlyInitializing {
        __Ownable_init();
        __Pausable_init();
        vault = _commonAddresses.vault;
        swapper = _commonAddresses.swapper;
        keeper = _commonAddresses.keeper;
        strategist = _commonAddresses.strategist;
        plexusFeeRecipient = _commonAddresses.plexusFeeRecipient;
        plexusFeeConfig = IFeeConfig(_commonAddresses.plexusFeeConfig);
        withdrawalFee = 10;
    }

    // checks that caller is either owner or keeper.
    modifier onlyManager() {
        _checkManager();
        _;
    }

    function _checkManager() internal view {
        require(msg.sender == owner() || msg.sender == keeper, "!manager");
    }

    // fetch fees from config contract
    function getFees() internal view returns (IFeeConfig.FeeCategory memory) {
        return plexusFeeConfig.getFees(address(this));
    }

    // fetch fees from config contract and dynamic deposit/withdraw fees
    function getAllFees() external view returns (IFeeConfig.AllFees memory) {
        return IFeeConfig.AllFees(getFees(), depositFee(), withdrawFee());
    }

    function getStratFeeId() external view returns (uint256) {
        return plexusFeeConfig.stratFeeId(address(this));
    }

    function setStratFeeId(uint256 _feeId) external onlyManager {
        plexusFeeConfig.setStratFeeId(_feeId);
        emit SetStratFeeId(_feeId);
    }

    // adjust withdrawal fee
    function setWithdrawalFee(uint256 _fee) public onlyManager {
        require(_fee <= WITHDRAWAL_FEE_CAP, "!cap");
        withdrawalFee = _fee;
        emit SetWithdrawalFee(_fee);
    }

    // set new vault (only for strategy upgrades)
    function setVault(address _vault) external onlyOwner {
        vault = _vault;
        emit SetVault(_vault);
    }

    // set new swapper
    function setSwapper(address _swapper) external onlyOwner {
        swapper = _swapper;
        emit SetSwapper(_swapper);
    }

    // set new keeper to manage strat
    function setKeeper(address _keeper) external onlyManager {
        keeper = _keeper;
        emit SetKeeper(_keeper);
    }

    // set new strategist address to receive strat fees
    function setStrategist(address _strategist) external {
        require(msg.sender == strategist, "!strategist");
        strategist = _strategist;
        emit SetStrategist(_strategist);
    }

    // set new plexus fee address to receive plexus fees
    function setPlexusFeeRecipient(
        address _plexusFeeRecipient
    ) external onlyOwner {
        plexusFeeRecipient = _plexusFeeRecipient;
        emit SetPlexusFeeRecipient(_plexusFeeRecipient);
    }

    // set new fee config address to fetch fees
    function setPlexusFeeConfig(address _plexusFeeConfig) external onlyOwner {
        plexusFeeConfig = IFeeConfig(_plexusFeeConfig);
        emit SetPlexusFeeConfig(_plexusFeeConfig);
    }

    function depositFee() public view virtual returns (uint256) {
        return 0;
    }

    function withdrawFee() public view virtual returns (uint256) {
        return paused() ? 0 : withdrawalFee;
    }

    function beforeDeposit() external virtual {}
}
