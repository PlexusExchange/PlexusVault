// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IPlexusSwapper} from "../../interfaces/plexus/IPlexusSwapper.sol";
import "../Common/StratFeeManagerInitializable.sol";

interface ISilo {
    function deposit(address asset, uint amount, bool collateralOnly) external;
    function withdraw(address asset, uint amount, bool collateralOnly) external;
    function balanceOf(address user) external view returns (uint256);
}

interface ISiloCollateralToken {
    function asset() external view returns (address);
}

interface ISiloLens {
    function balanceOfUnderlying(uint256 _assetTotalDeposits, address _shareToken, address _user) external view returns (uint256);
    function totalDepositsWithInterest(address _silo, address _asset) external view returns (uint256 _totalDeposits);
}

interface ISiloRewards {
    function claimRewardsToSelf(address[] memory assets, uint256 amount) external;
}

contract StrategySilo is StratFeeManagerInitializable {
    using SafeERC20 for IERC20;

    // Tokens used
    address public constant wnative = 0x4200000000000000000000000000000000000006;
    address public constant output = 0x4200000000000000000000000000000000000042;
    address public want;
    address public silo;
    address public collateralToken;
    address[] public rewardsClaim;
    ISiloRewards public constant rewards = ISiloRewards(0x847D9420643e117798e803d9C5F0e406277CB622);
    ISiloLens public constant siloLens = ISiloLens(0xd3De080436b9d38DC315944c16d89C050C414Fed);
    bool public harvestOnDeposit;
    uint256 public lastHarvest;

    event StratHarvest(address indexed harvester, uint256 wantHarvested, uint256 tvl);
    event Deposit(uint256 tvl);
    event Withdraw(uint256 tvl);
    event ChargedFees(uint256 plexusFees);

    function initialize(address _collateralToken, address _silo, CommonAddresses calldata _commonAddresses) public initializer {
        __StratFeeManager_init(_commonAddresses);
        collateralToken = _collateralToken;
        silo = _silo;
        want = ISiloCollateralToken(collateralToken).asset();

        rewardsClaim.push(collateralToken);

        _giveAllowances();
    }

    // puts the funds to work
    function deposit() public whenNotPaused {
        uint256 bal = balanceOfWant();

        if (bal > 0) {
            ISilo(silo).deposit(want, bal, false);
            emit Deposit(balanceOf());
        }
    }

    // Withdraws funds and sends them back to the vault
    function withdraw(uint256 _amount) external {
        require(msg.sender == vault, "!vault");

        uint256 wantBal = balanceOfWant();

        if (wantBal < _amount) {
            uint256 toWithdraw = _amount - wantBal;
            ISilo(silo).withdraw(want, toWithdraw, false);
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

    /**
     * Harvest farm tokens and convert to want tokens.
     */
    function harvest() external virtual {
        _harvest();
    }

    // compounds earnings and charges performance fee
    function _harvest() internal whenNotPaused {
        rewards.claimRewardsToSelf(rewardsClaim, type(uint).max);
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

    function _swapRewardsToNative() internal {
        uint bal = IERC20(output).balanceOf(address(this));
        if (bal > 0) {
            IPlexusSwapper(swapper).swap(output, wnative, bal);
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
        if (want != wnative) {
            IPlexusSwapper(swapper).swap(wnative, want, bal);
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
        uint256 totalDeposits = siloLens.totalDepositsWithInterest(silo, want);
        return siloLens.balanceOfUnderlying(totalDeposits, collateralToken, address(this));
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

        uint256 amount = balanceOfPool();
        if (amount > 0) {
            ISilo(silo).withdraw(want, balanceOfPool(), false);
        }

        uint256 wantBal = IERC20(want).balanceOf(address(this));
        IERC20(want).transfer(vault, wantBal);
    }

    // pauses deposits and withdraws all funds from third party systems.
    function panic() public onlyManager {
        pause();
        uint256 amount = balanceOfPool();
        if (amount > 0) {
            ISilo(silo).withdraw(want, balanceOfPool(), false);
        }
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
        IERC20(output).approve(swapper, type(uint).max);
        IERC20(wnative).approve(swapper, type(uint).max);
        IERC20(want).approve(silo, type(uint).max);
    }

    function _removeAllowances() internal {
        IERC20(output).approve(swapper, 0);
        IERC20(wnative).approve(swapper, 0);
        IERC20(want).approve(silo, 0);
    }
}
