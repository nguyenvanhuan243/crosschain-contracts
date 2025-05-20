// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@layerzerolabs/solidity-examples/contracts/lzApp/NonblockingLzApp.sol";

interface ICrossChainFactory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

interface ICrossChainPair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;
}

contract CrossChainRouter is NonblockingLzApp, ReentrancyGuard, Ownable {
    address public immutable factory;
    address public immutable WBNB;
    address public immutable WBNW;

    // LayerZero endpoint addresses for different chains
    mapping(uint16 => bytes) public lzEndpoints;
    
    // Events
    event SwapCrossChain(
        address indexed sender,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint16 dstChainId
    );

    modifier ensure(uint deadline) {
        require(deadline >= block.timestamp, 'CrossChainRouter: EXPIRED');
        _;
    }

    constructor(
        address _factory,
        address _WBNB,
        address _WBNW,
        address _lzEndpoint
    ) NonblockingLzApp(_lzEndpoint) Ownable(msg.sender) {
        factory = _factory;
        WBNB = _WBNB;
        WBNW = _WBNW;
    }

    // Set LayerZero endpoint for a specific chain
    function setLzEndpoint(uint16 _chainId, bytes calldata _endpoint) external onlyOwner {
        lzEndpoints[_chainId] = _endpoint;
    }

    // Cross-chain swap function
    function swapCrossChain(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        uint16 dstChainId,
        uint256 deadline
    ) external payable ensure(deadline) nonReentrant {
        require(lzEndpoints[dstChainId].length > 0, "CrossChainRouter: Invalid chain ID");
        
        // Transfer tokens from user
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Prepare cross-chain message
        bytes memory payload = abi.encode(
            tokenIn,
            tokenOut,
            amountIn,
            msg.sender
        );

        // Send cross-chain message
        _lzSend(
            dstChainId,
            payload,
            payable(msg.sender),
            address(0x0),
            bytes(""),
            msg.value
        );

        emit SwapCrossChain(
            msg.sender,
            tokenIn,
            tokenOut,
            amountIn,
            amountOutMin,
            dstChainId
        );
    }

    // LayerZero receive function
    function _nonblockingLzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) internal override {
        (
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            address to
        ) = abi.decode(_payload, (address, address, uint256, address));

        // Execute swap on destination chain
        _executeSwap(tokenIn, tokenOut, amountIn, to);
    }

    // Internal swap execution
    function _executeSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address to
    ) internal {
        // Get pair address
        address pair = ICrossChainFactory(factory).getPair(tokenIn, tokenOut);
        require(pair != address(0), "CrossChainRouter: Pair does not exist");

        // Transfer tokens to pair
        IERC20(tokenIn).transfer(pair, amountIn);

        // Get reserves
        (uint112 reserve0, uint112 reserve1,) = ICrossChainPair(pair).getReserves();
        
        // Calculate amount out using constant product formula
        uint256 amountOut = getAmountOut(amountIn, reserve0, reserve1);
        
        // Execute swap
        ICrossChainPair(pair).swap(
            tokenIn < tokenOut ? 0 : amountOut,
            tokenIn < tokenOut ? amountOut : 0,
            to,
            new bytes(0)
        );
    }

    // Calculate amount out using constant product formula
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256 amountOut) {
        require(amountIn > 0, "CrossChainRouter: INSUFFICIENT_INPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "CrossChainRouter: INSUFFICIENT_LIQUIDITY");
        
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }

    // Emergency withdraw function
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }

    // Receive function for native token
    receive() external payable {}
} 
