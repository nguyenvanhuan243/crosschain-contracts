// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CrossChainPair.sol";

contract CrossChainFactory is Ownable {
    // Chain ID mapping
    mapping(uint16 => bool) public supportedChains;
    
    // Pair creation
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;
    
    // Events
    event PairCreated(address indexed token0, address indexed token1, address pair, uint);
    event ChainSupported(uint16 chainId, bool supported);
    
    constructor() Ownable(msg.sender) {}
    
    // Set supported chain
    function setSupportedChain(uint16 _chainId, bool _supported) external onlyOwner {
        supportedChains[_chainId] = _supported;
        emit ChainSupported(_chainId, _supported);
    }
    
    // Create new pair
    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, 'CrossChainFactory: IDENTICAL_ADDRESSES');
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'CrossChainFactory: ZERO_ADDRESS');
        require(getPair[token0][token1] == address(0), 'CrossChainFactory: PAIR_EXISTS');
        
        // Create new pair contract
        bytes memory bytecode = type(CrossChainPair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        
        // Initialize pair
        ICrossChainPair(pair).initialize(token0, token1);
        
        // Update mappings
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        allPairs.push(pair);
        
        emit PairCreated(token0, token1, pair, allPairs.length);
    }
    
    // Get all pairs length
    function allPairsLength() external view returns (uint) {
        return allPairs.length;
    }
}

interface ICrossChainPair {
    function initialize(address _token0, address _token1) external;
} 
