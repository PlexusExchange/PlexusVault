// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";

contract PlexusPairVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IUniswapV2Router02 public router;
    IUniswapV2Pair public pair;
    address public PLX = 0xFB853ACEa0E76f73F8274B521FE1611C888670Cc;
    address public WETH = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;

    event Deposit(address user, uint _liquidity, uint _amountA, uint _amountB, uint fee0, uint fee1);
    event Withdraw(address user, uint _liquidity, uint amountA, uint amountB);

    constructor(IUniswapV2Router02 _router, IUniswapV2Pair _pair) {
        router = _router;
        pair = _pair;
    }

    function previewDeposit(uint amountWETH, uint amountPLX) external view returns (uint) {
        (uint112 reserve0, uint112 reserve1, ) = pair.getReserves();
        uint totalSupply = pair.totalSupply();

        require(reserve0 > 0 && reserve1 > 0, "Invalid reserves");

        uint lpTokensForAmount0 = (amountWETH * totalSupply) / reserve0;
        uint lpTokensForAmount1 = (amountPLX * totalSupply) / reserve1;

        return lpTokensForAmount0 < lpTokensForAmount1 ? lpTokensForAmount0 : lpTokensForAmount1;
    }

    function previewWithdraw(uint256 liquidity) public view returns (uint256 amountWETH, uint256 amountPLX) {
        (uint256 reserveA, uint256 reserveB, ) = IUniswapV2Pair(pair).getReserves();
        uint256 totalSupply = IUniswapV2Pair(pair).totalSupply();

        amountWETH = (liquidity * reserveA) / totalSupply;
        amountPLX = (liquidity * reserveB) / totalSupply;
    }

    function deposit(uint amountWETH, uint amountPLX, uint256 amountWETHMin, uint256 amountPLXMin) external payable nonReentrant {
        IERC20(WETH).safeTransferFrom(msg.sender, address(this), amountWETH);
        IERC20(PLX).safeTransferFrom(msg.sender, address(this), amountPLX);
        (uint amountA, uint amountB, uint liquidity) = _deposit(amountWETH, amountPLX, amountWETHMin, amountPLXMin);
        _after();
        emit Deposit(msg.sender, liquidity, amountA, amountB, 0, 0);
    }

    function withdraw(uint256 amountLP) public {
        IERC20(address(pair)).safeTransferFrom(msg.sender, address(this), amountLP);
        IERC20(address(pair)).forceApprove(address(router), amountLP);
        (uint256 amountA, uint256 amountB) = previewWithdraw(amountLP);
        router.removeLiquidity(WETH, PLX, amountLP, amountA, amountB, msg.sender, block.timestamp + 600);
        emit Withdraw(msg.sender, amountLP, amountA, amountB);
    }

    function _balance(address token) internal view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function _deposit(
        uint amountA,
        uint amountB,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal returns (uint amountWETH, uint amountPLX, uint liquidity) {
        IERC20(WETH).forceApprove(address(router), amountA);
        IERC20(PLX).forceApprove(address(router), amountB);
        (amountWETH, amountPLX, liquidity) = router.addLiquidity(
            WETH,
            PLX,
            amountA,
            amountB,
            amountAMin,
            amountBMin,
            msg.sender,
            block.timestamp + 600
        );
    }

    function _after() internal {
        uint256 balPLX = _balance(PLX);
        uint256 balWETH = _balance(WETH);
        if (balPLX > 0) {
            IERC20(PLX).transfer(msg.sender, balPLX);
        }
        if (balWETH > 0) {
            IERC20(WETH).transfer(msg.sender, balWETH);
        }
    }
}
