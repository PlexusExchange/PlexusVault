// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../../interfaces/aave/IDataProvider.sol";
import "../../interfaces/aave/IAaveV3Incentives.sol";
import "../../interfaces/aave/ILendingPool.sol";
import "../../utils/UniswapV3Utils.sol";
import "../Common/StratFeeManagerInitializable.sol";

contract StrategyAaveSupplyOnlyUniV3 is StratFeeManagerInitializable {
    using SafeERC20 for IERC20;

    // Tokens used
    address public wnative;
    address public output;
    address public want;
    address public aToken;

    // Third party contracts
    address public dataProvider;
    address public lendingPool;
    address public incentivesController;

    // Routes
    bytes public outputToNativePath;
    bytes public outputToWantPath;

    bool public harvestOnDeposit;
    uint256 public lastHarvest;

    event StratHarvest(address indexed harvester, uint256 wantHarvested, uint256 tvl);
    event Deposit(uint256 tvl);
    event Withdraw(uint256 tvl);
    event ChargedFees(uint256 plexusFees);

    function initialize(
        address _dataProvider,
        address _lendingPool,
        address _incentivesController,
        CommonAddresses calldata _commonAddresses,
        address[] calldata _outputToNativeRoute,
        uint24[] calldata _outputToNativeFees,
        address[] calldata _outputToWantRoute,
        uint24[] calldata _outputToWantFees
    ) external initializer {
        __StratFeeManager_init(_commonAddresses);

        outputToNativePath = UniswapV3Utils.routeToPath(_outputToNativeRoute, _outputToNativeFees);
        outputToWantPath = UniswapV3Utils.routeToPath(_outputToWantRoute, _outputToWantFees);

        wnative = _outputToNativeRoute[_outputToNativeRoute.length - 1];
        want = _outputToWantRoute[_outputToWantRoute.length - 1];
        output = _outputToNativeRoute[0];

        dataProvider = _dataProvider;
        lendingPool = _lendingPool;
        incentivesController = _incentivesController;

        (aToken, , ) = IDataProvider(dataProvider).getReserveTokensAddresses(want);

        _giveAllowances();
    }

    // puts the funds to work
    function deposit() public whenNotPaused {
        uint256 wantBal = balanceOfWant();

        if (wantBal > 0) {
            ILendingPool(lendingPool).deposit(want, wantBal, address(this), 0);
            emit Deposit(balanceOf());
        }
    }

    function withdraw(uint256 _amount) external {
        require(msg.sender == vault, "!vault");

        uint256 wantBal = balanceOfWant();
        if (wantBal < _amount) {
            ILendingPool(lendingPool).withdraw(want, _amount - wantBal, address(this));
            wantBal = balanceOfWant();
        }

        if (wantBal > _amount) {
            wantBal = _amount;
        }

        if (tx.origin != owner() && !paused()) {
            uint256 withdrawalFeeAmount = (wantBal * withdrawalFee) / WITHDRAWAL_MAX;
            wantBal = wantBal - withdrawalFeeAmount;
        }

        IERC20(want).safeTransfer(vault, wantBal);
        emit Withdraw(balanceOf());
    }

    function beforeDeposit() external override {
        if (harvestOnDeposit) {
            require(msg.sender == vault, "!vault");
            _harvest();
        }
    }

    function harvest() external virtual {
        _harvest();
    }

    function managerHarvest() external onlyManager {
        _harvest();
    }

    // compounds earnings and charges performance fee
    function _harvest() internal whenNotPaused {
        address[] memory assets = new address[](1);
        assets[0] = aToken;
        IAaveV3Incentives(incentivesController).claimRewards(assets, type(uint).max, address(this), output);

        uint256 outputBal = IERC20(output).balanceOf(address(this));
        if (outputBal > 0) {
            _chargeFees();
            _swapRewards();
            uint256 wantHarvested = balanceOfWant();
            deposit();

            lastHarvest = block.timestamp;
            emit StratHarvest(msg.sender, wantHarvested, balanceOf());
        }
    }

    // performance fees
    function _chargeFees() internal {
        IFeeConfig.FeeCategory memory fees = getFees();
        uint256 toNative = (IERC20(output).balanceOf(address(this)) * fees.total) / DIVISOR;
        UniswapV3Utils.swap(unirouter, outputToNativePath, toNative);

        uint256 stratFees = IERC20(wnative).balanceOf(address(this));

        uint256 plexusFeeAmount = (stratFees * fees.plexus) / DIVISOR;
        IERC20(wnative).safeTransfer(plexusFeeRecipient, plexusFeeAmount);

        emit ChargedFees(plexusFeeAmount);
    }

    // swap rewards to {want}
    function _swapRewards() internal {
        uint256 outputBal = IERC20(output).balanceOf(address(this));
        UniswapV3Utils.swap(unirouter, outputToWantPath, outputBal);
    }

    // return supply and borrow balance
    function userReserves() public view returns (uint256, uint256) {
        (uint256 supplyBal, , uint256 borrowBal, , , , , , ) = IDataProvider(dataProvider).getUserReserveData(want, address(this));
        return (supplyBal, borrowBal);
    }

    // returns the user account data across all the reserves
    function userAccountData()
        public
        view
        returns (
            uint256 totalCollateralETH,
            uint256 totalDebtETH,
            uint256 availableBorrowsETH,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        )
    {
        return ILendingPool(lendingPool).getUserAccountData(address(this));
    }

    // calculate the total underlaying 'want' held by the strat.
    function balanceOf() public view returns (uint256) {
        return balanceOfWant() + balanceOfPool();
    }

    // it calculates how much 'want' this contract holds.
    function balanceOfWant() public view returns (uint256) {
        return IERC20(want).balanceOf(address(this));
    }

    // it calculates how much 'want' the strategy has working in the farm.
    function balanceOfPool() public view returns (uint256) {
        (uint256 supplyBal, uint256 borrowBal) = userReserves();
        return supplyBal - borrowBal;
    }

    // returns rewards unharvested
    function rewardsAvailable() public view returns (uint256) {
        address[] memory assets = new address[](1);
        assets[0] = aToken;
        return IAaveV3Incentives(incentivesController).getUserRewards(assets, address(this), output);
    }

    // wnative reward amount for calling harvest
    function callReward() public pure returns (uint256) {
        return 0;
    }

    function setHarvestOnDeposit(bool _harvestOnDeposit) external onlyManager {
        harvestOnDeposit = _harvestOnDeposit;
        if (harvestOnDeposit) {
            setWithdrawalFee(0);
        } else {
            setWithdrawalFee(10);
        }
    }

    // called as part of strat migration. Sends all the available funds back to the vault.
    function retireStrat() external {
        require(msg.sender == vault, "!vault");

        ILendingPool(lendingPool).withdraw(want, type(uint).max, address(this));

        uint256 wantBal = balanceOfWant();
        IERC20(want).transfer(vault, wantBal);
    }

    // pauses deposits and withdraws all funds from third party systems.
    function panic() public onlyManager {
        ILendingPool(lendingPool).withdraw(want, type(uint).max, address(this));
        pause();
    }

    function pause() public onlyManager {
        _pause();

        _removeAllowances();
    }

    function unpause() external onlyManager {
        _unpause();

        _giveAllowances();

        deposit();
    }

    function _giveAllowances() internal {
        IERC20(want).safeApprove(lendingPool, type(uint).max);
        IERC20(output).safeApprove(unirouter, type(uint).max);
    }

    function _removeAllowances() internal {
        IERC20(want).safeApprove(lendingPool, 0);
        IERC20(output).safeApprove(unirouter, 0);
    }

    function outputToNative() external view returns (address[] memory) {
        return UniswapV3Utils.pathToRoute(outputToNativePath);
    }

    function outputToWant() external view returns (address[] memory) {
        return UniswapV3Utils.pathToRoute(outputToWantPath);
    }
}
