// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../../interfaces/common/IERC20Extended.sol";
import "../Common/StratFeeManagerInitializable.sol";
import "../../interfaces/plexus/IPlexusSwapper.sol";
import "../../utils/UniV3Actions.sol";

interface IComet {
    function supply(address asset, uint amount) external;
    function withdraw(address asset, uint amount) external;
    function balanceOf(address user) external view returns (uint256);
    function baseToken() external view returns (address);
}

interface ICometRewards {
    function claim(address comet, address source, bool shouldAccrue) external;
}

contract StrategyCompoundV3 is StratFeeManagerInitializable {
    using SafeERC20 for IERC20;

    // Tokens used
    address public constant wnative = 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270;
    address public constant output = 0x8505b9d2254A7Ae468c0E9dd10Ccea3A837aef5c;
    address public want;
    address public cToken;

    // Third party contracts
    ICometRewards public constant rewards = ICometRewards(0x45939657d1CA34A8FA39A924B71D28Fe8431e581);
    bool public harvestOnDeposit;
    uint256 public lastHarvest;

    bytes public outputToNativePath;
    bytes public wnativeToWantPath;

    event StratHarvest(address indexed harvester, uint256 wantHarvested, uint256 tvl);
    event Deposit(uint256 tvl);
    event Withdraw(uint256 tvl);
    // event ChargedFees(uint256 callFees, uint256 plexusFees, uint256 strategistFees);
    event ChargedFees(uint256 plexusFees);

    function initialize(address _cToken, CommonAddresses calldata _commonAddresses) public initializer {
        __StratFeeManager_init(_commonAddresses);
        cToken = _cToken;
        want = IComet(cToken).baseToken();
        _giveAllowances();
    }

    // puts the funds to work
    function deposit() public whenNotPaused {
        uint256 bal = balanceOfWant();

        if (bal > 0) {
            IComet(cToken).supply(want, bal);
            emit Deposit(balanceOf());
        }
    }

    function withdraw(uint256 _amount) external {
        require(msg.sender == vault, "!vault");

        uint256 wantBal = balanceOfWant();

        if (wantBal < _amount) {
            uint256 toWithdraw = _amount - wantBal;
            uint256 cTokenBal = IERC20(want).balanceOf(cToken);
            require(cTokenBal >= toWithdraw, "Not Enough Underlying");

            IComet(cToken).withdraw(want, toWithdraw);
            wantBal = balanceOfWant();
        }

        if (wantBal > _amount) {
            wantBal = _amount;
        }

        if (tx.origin != owner() && !paused()) {
            uint256 withdrawalFeeAmount = (_amount * withdrawalFee) / WITHDRAWAL_MAX;
            _amount = _amount - withdrawalFeeAmount;
        }

        IERC20(want).safeTransfer(vault, _amount);

        emit Withdraw(balanceOf());
    }

    function beforeDeposit() external virtual override {
        if (harvestOnDeposit) {
            require(msg.sender == vault, "!vault");
            _harvest();
        }
    }

    // function harvest() external virtual {
    //     _harvest(tx.origin);
    // }

    function harvest() external virtual {
        _harvest();
    }

    // compounds earnings and charges performance fee
    function _harvest() internal whenNotPaused {
        rewards.claim(cToken, address(this), true);
        uint256 bal = IERC20(output).balanceOf(address(this));
        if (bal > 0) {
            _swapRewardsToNative();
            _chargeFees();
            _swapToWant();
            uint256 wantHarvested = balanceOfWant();
            deposit();

            lastHarvest = block.timestamp;
            emit StratHarvest(msg.sender, wantHarvested, balanceOf());
        }
    }

    function _swapRewardsToNative() internal whenNotPaused {
        uint256 amount = IERC20(output).balanceOf(address(this));
        if (amount > 0) {
            IPlexusSwapper(unirouter).swap(output, wnative, amount);
        }
    }

    // performance fees
    function _chargeFees() internal {
        IFeeConfig.FeeCategory memory fees = getFees();
        uint256 wnativeBal = (IERC20(wnative).balanceOf(address(this)) * fees.total) / DIVISOR;

        uint256 plexusFeeAmount = (wnativeBal * fees.plexus) / DIVISOR;
        IERC20(wnative).safeTransfer(plexusFeeRecipient, plexusFeeAmount);

        emit ChargedFees(plexusFeeAmount);
    }

    // Adds liquidity to AMM and gets more LP tokens.
    function _swapToWant() internal {
        uint256 bal = IERC20(wnative).balanceOf(address(this));
        if (wnativeToWantPath.length > 0) {
            UniV3Actions.swapV3(unirouter, wnativeToWantPath, bal);
        }
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
        return IComet(cToken).balanceOf(address(this));
    }

    // returns rewards unharvested
    function rewardsAvailable() public pure returns (uint256) {
        return 0;
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

        IComet(cToken).withdraw(want, balanceOfPool());

        uint256 wantBal = IERC20(want).balanceOf(address(this));
        IERC20(want).transfer(vault, wantBal);
    }

    // pauses deposits and withdraws all funds from third party systems.
    function panic() public onlyManager {
        IComet(cToken).withdraw(want, balanceOfPool());
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
        IERC20(output).approve(unirouter, type(uint).max);
        IERC20(wnative).approve(unirouter, type(uint).max);
        IERC20(want).approve(cToken, type(uint).max);
    }

    function _removeAllowances() internal {
        IERC20(output).approve(unirouter, 0);
        IERC20(wnative).approve(unirouter, 0);
        IERC20(want).approve(cToken, 0);
    }
}
