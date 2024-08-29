// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../../interfaces/hop/IHopLiquidityPool.sol";
import "../../interfaces/hop/IHopRewards.sol";
import "../../interfaces/common/IWrappedNative.sol";
import "../../interfaces/common/IERC20Extended.sol";
import "../../interfaces/plexus/IPlexusSwapper.sol";
import "../Common/StratFeeManagerInitializable.sol";

contract StrategyHop is StratFeeManagerInitializable {
    using SafeERC20 for IERC20;

    address[] public rewards;
    mapping(address => uint) public minAmounts; // tokens minimum amount to be swapped

    address public want;
    address public wnative;
    address public lpToken;
    address[] internal lpTokens;
    uint256 public lastHarvest;
    uint256 public totalLocked;
    uint256 public lockDuration;
    bool public harvestOnDeposit;

    event StratHarvest(address indexed harvester, uint256 wantHarvested, uint256 tvl);
    event Deposit(uint256 tvl);
    event Withdraw(uint256 tvl);
    event ChargedFees(uint256 plexusFees);

    // Third party contracts
    address public hopLiquidityPool;
    address public hopRewards;

    function initialize(
        address _hopLiquidityPool,
        address _hopRewards,
        address _lpToken,
        address _wnative,
        address[] calldata _rewards,
        CommonAddresses calldata _commonAddresses
    ) external initializer {
        __StratFeeManager_init(_commonAddresses);
        hopLiquidityPool = _hopLiquidityPool;
        hopRewards = _hopRewards;
        want = address(IHopLiquidityPool(hopLiquidityPool).getToken(0));
        lpToken = _lpToken;
        lpTokens.push(lpToken);
        wnative = _wnative;
        lockDuration = 1 days;
        for (uint i; i < _rewards.length; i++) {
            addReward(_rewards[i]);
        }
        setWithdrawalFee(0);
        _giveAllowances();
    }

    // puts the funds to work
    // addLiquidity -> stake
    function deposit() public whenNotPaused {
        uint256 wantBal = balanceOfWant();
        if (wantBal > 0) {
            uint256[] memory amounts = new uint256[](2);
            amounts[0] = wantBal;
            amounts[1] = 0;
            // uint256 minToMint = IHopLiquidityPool(hopLiquidityPool).calculateTokenAmount(hopLiquidityPool, amounts, true);
            IHopLiquidityPool(hopLiquidityPool).addLiquidity(amounts, 0, block.timestamp + 7 days);
            uint256 stakeBal = IERC20(lpToken).balanceOf(address(this));
            IHopRewards(hopRewards).stake(stakeBal);
            emit Deposit(balanceOf());
        }
    }

    //withdraw -> removeLiquidityOneToken
    function withdraw(uint256 _amount) external {
        require(msg.sender == vault, "!vault");

        uint256 wantBal = balanceOfWant();

        if (wantBal < _amount) {
            uint256 amount = _amount - wantBal;
            IHopRewards(hopRewards).withdraw(amount);
            uint256 removeLPamount = IERC20(lpToken).balanceOf(address(this));
            uint256 minAmount = IHopLiquidityPool(hopLiquidityPool).calculateRemoveLiquidityOneToken(address(this), removeLPamount, 0);
            IERC20(lpToken).safeApprove(hopLiquidityPool, removeLPamount);
            IHopLiquidityPool(hopLiquidityPool).removeLiquidityOneToken(removeLPamount, 0, minAmount, block.timestamp + 7 days);
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

    // compounds earnings and charges performance fee
    function _harvest() internal whenNotPaused {
        uint256 beforeBal = balanceOfWant();
        IHopRewards(hopRewards).getReward();
        _swapRewardsToNative();
        uint256 wnativeBal = IERC20(wnative).balanceOf(address(this));
        if (wnativeBal > 0) {
            _chargeFees();
            _swapToWant(wnative, want);
            uint256 wantHarvested = balanceOfWant() - beforeBal;
            totalLocked = wantHarvested + lockedProfit();
            lastHarvest = block.timestamp;
            deposit();
            emit StratHarvest(msg.sender, wantHarvested, balanceOf());
        }
    }

    function _swapRewardsToNative() internal virtual {
        for (uint i; i < rewards.length; ++i) {
            address token = rewards[i];
            uint256 amount = IERC20(token).balanceOf(address(this));
            if (amount > minAmounts[token]) {
                IPlexusSwapper(swapper).swap(token, wnative, amount);
            }
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
    //0.00000004578917526
    function _swapToWant(address tokenFrom, address tokenTo) internal {
        uint bal = IERC20(tokenFrom).balanceOf(address(this));
        IPlexusSwapper(swapper).swap(tokenFrom, tokenTo, bal);
    }

    function rewardsLength() external view returns (uint) {
        return rewards.length;
    }

    function addReward(address _token) public onlyManager {
        require(_token != want, "!want");
        require(_token != wnative, "!wnative");
        require(_token != lpToken, "!lpToken");

        rewards.push(_token);
        _approve(_token, swapper, 0);
        _approve(_token, swapper, type(uint).max);
    }

    function removeReward(uint i) external onlyManager {
        rewards[i] = rewards[rewards.length - 1];
        rewards.pop();
    }

    function resetRewards() external onlyManager {
        for (uint i; i < rewards.length; ++i) {
            _approve(rewards[i], swapper, 0);
        }
        delete rewards;
    }

    function updateSwapper(address _swapper) external onlyOwner {
        for (uint i; i < rewards.length; ++i) {
            address token = rewards[i];
            _approve(token, swapper, 0);
            _approve(token, _swapper, 0);
            _approve(token, _swapper, type(uint).max);
        }
        _approve(wnative, swapper, 0);
        _approve(wnative, _swapper, 0);
        _approve(wnative, _swapper, type(uint).max);
        swapper = _swapper;
        emit SetSwapper(_swapper);
    }

    function setRewardMinAmount(address token, uint minAmount) external onlyManager {
        minAmounts[token] = minAmount;
    }

    function lockedProfit() public view returns (uint256) {
        if (lockDuration == 0) return 0;
        uint256 elapsed = block.timestamp - lastHarvest;
        uint256 remaining = elapsed < lockDuration ? lockDuration - elapsed : 0;
        return (totalLocked * remaining) / lockDuration;
    }

    // calculate the total underlaying 'want' held by the strat.
    function balanceOf() public view returns (uint256) {
        return balanceOfWant() + balanceOfPool() - lockedProfit();
    }

    // it calculates how much 'want' this contract holds.
    function balanceOfWant() public view returns (uint256) {
        return IERC20(want).balanceOf(address(this));
    }

    function balanceOfPool() public view returns (uint256) {
        return IHopRewards(hopRewards).balanceOf(address(this));
    }

    function setHarvestOnDeposit(bool _harvestOnDeposit) public onlyManager {
        harvestOnDeposit = _harvestOnDeposit;
        if (harvestOnDeposit) {
            lockDuration = 0;
        } else {
            lockDuration = 1 days;
        }
    }

    function setLockDuration(uint _duration) external onlyManager {
        lockDuration = _duration;
    }

    function rewardsAvailable() external view virtual returns (uint) {
        return 0;
    }

    function callReward() external view virtual returns (uint) {
        return 0;
    }

    // called as part of strat migration. Sends all the available funds back to the vault.
    function retireStrat() external {
        require(msg.sender == vault, "!vault");
        IHopRewards(hopRewards).exit();
        uint256 removeLPamount = IERC20(lpToken).balanceOf(address(this));
        uint256 minAmount = IHopLiquidityPool(hopLiquidityPool).calculateRemoveLiquidityOneToken(address(this), removeLPamount, 0);
        IHopLiquidityPool(hopLiquidityPool).removeLiquidityOneToken(removeLPamount, 0, minAmount, block.timestamp + 7 days);
        IERC20(want).transfer(vault, balanceOfWant());
    }

    // pauses deposits and withdraws all funds from third party systems.
    function panic() public onlyManager {
        pause();
        IHopRewards(hopRewards).exit();
        uint256 removeLPamount = IERC20(lpToken).balanceOf(address(this));
        uint256 minAmount = IHopLiquidityPool(hopLiquidityPool).calculateRemoveLiquidityOneToken(address(this), removeLPamount, 0);
        IHopLiquidityPool(hopLiquidityPool).removeLiquidityOneToken(removeLPamount, 0, minAmount, block.timestamp + 7 days);
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

    function _approve(address _token, address _spender, uint amount) internal {
        IERC20(_token).safeApprove(_spender, amount);
    }

    function _giveAllowances() internal {
        IERC20(want).safeApprove(hopLiquidityPool, type(uint256).max);
        IERC20(lpToken).safeApprove(hopRewards, type(uint256).max);
        IERC20(wnative).safeApprove(swapper, type(uint256).max);

        for (uint i; i < rewards.length; i++) {
            IERC20(rewards[i]).safeApprove(swapper, 0);
            IERC20(rewards[i]).safeApprove(swapper, type(uint256).max);
        }
    }

    function _removeAllowances() internal {
        IERC20(want).safeApprove(hopLiquidityPool, 0);
        IERC20(lpToken).safeApprove(hopRewards, 0);
        IERC20(wnative).safeApprove(swapper, 0);

        for (uint i; i < rewards.length; i++) {
            IERC20(rewards[i]).safeApprove(swapper, 0);
        }
    }

    receive() external payable {
        if (msg.sender != wnative) IWrappedNative(wnative).deposit{value: address(this).balance}();
    }
}
