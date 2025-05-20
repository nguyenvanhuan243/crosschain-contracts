import React, { useState, useEffect, ChangeEvent } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Select,
  VStack,
  Text,
  useToast,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  HStack,
  IconButton,
  Divider,
  Badge,
  Tooltip,
} from '@chakra-ui/react';
import { ethers } from 'ethers';
import Web3Modal from 'web3modal';
import { RepeatIcon } from '@chakra-ui/icons';

interface Token {
  address: string;
  symbol: string;
  decimals: number;
  logo: string;
}

interface ChainTokens {
  [key: string]: Token;
}

interface Chain {
  id: number;
  name: string;
  routerAddress: string;
  tokens: ChainTokens;
}

const CHAINS: { [key: string]: Chain } = {
  BSC_TESTNET: {
    id: 97,
    name: 'BSC Testnet',
    routerAddress: 'YOUR_BSC_ROUTER_ADDRESS',
    tokens: {
      BNB: {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'BNB',
        decimals: 18,
        logo: '🟡'
      },
      BUSD: {
        address: 'YOUR_BSC_BUSD_ADDRESS',
        symbol: 'BUSD',
        decimals: 18,
        logo: '💵'
      }
    }
  },
  BNW: {
    id: 714,
    name: 'BNW Chain',
    routerAddress: 'YOUR_BNW_ROUTER_ADDRESS',
    tokens: {
      BNW: {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'BNW',
        decimals: 18,
        logo: '🔷'
      },
      USDT: {
        address: 'YOUR_BNW_USDT_ADDRESS',
        symbol: 'USDT',
        decimals: 18,
        logo: '💵'
      }
    }
  },
};

// Temporary placeholder for CrossChainRouter ABI until contract is compiled
const CrossChainRouter = {
  abi: [
    {
      inputs: [
        { name: 'tokenIn', type: 'address' },
        { name: 'tokenOut', type: 'address' },
        { name: 'amountIn', type: 'uint256' },
        { name: 'amountOutMin', type: 'uint256' },
        { name: 'dstChainId', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
      ],
      name: 'swapCrossChain',
      outputs: [],
      stateMutability: 'payable',
      type: 'function'
    }
  ]
};

const Swap: React.FC = () => {
  const [account, setAccount] = useState<string>('');
  const [chainId, setChainId] = useState<number>(CHAINS.BSC_TESTNET.id);
  const [fromToken, setFromToken] = useState<string>('');
  const [toToken, setToToken] = useState<string>('');
  const [amountIn, setAmountIn] = useState<string>('');
  const [amountOut, setAmountOut] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [balances, setBalances] = useState<{[key: string]: string}>({});
  const [priceImpact, setPriceImpact] = useState<string>('0');
  const [fee, setFee] = useState<string>('0.01');
  const toast = useToast();

  const currentChain = chainId === CHAINS.BSC_TESTNET.id ? CHAINS.BSC_TESTNET : CHAINS.BNW;
  const targetChain = chainId === CHAINS.BSC_TESTNET.id ? CHAINS.BNW : CHAINS.BSC_TESTNET;

  const connectWallet = async () => {
    try {
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const provider = new ethers.BrowserProvider(connection);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      
      setAccount(address);
      setChainId(Number(network.chainId));
      
      // Set initial tokens based on chain
      if (Number(network.chainId) === CHAINS.BSC_TESTNET.id) {
        setFromToken(CHAINS.BSC_TESTNET.tokens.BNB.address);
        setToToken(CHAINS.BNW.tokens.BNW.address);
      } else {
        setFromToken(CHAINS.BNW.tokens.BNW.address);
        setToToken(CHAINS.BSC_TESTNET.tokens.BNB.address);
      }
      
      connection.on('accountsChanged', (accounts: string[]) => {
        setAccount(accounts[0]);
      });
      
      connection.on('chainChanged', (chainId: string) => {
        setChainId(Number(chainId));
      });

      // Fetch initial balances
      await fetchBalances(provider, address);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect wallet',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const fetchBalances = async (provider: ethers.Provider, address: string) => {
    const newBalances: {[key: string]: string} = {};
    
    // Fetch native token balance
    const nativeTokenSymbol = currentChain.id === CHAINS.BSC_TESTNET.id ? 'BNB' : 'BNW';
    const nativeBalance = await provider.getBalance(address);
    newBalances[currentChain.tokens[nativeTokenSymbol].address] = 
      ethers.formatEther(nativeBalance);

    // Fetch other token balances
    for (const [symbol, token] of Object.entries(currentChain.tokens)) {
      if (token.address !== '0x0000000000000000000000000000000000000000') {
        const tokenContract = new ethers.Contract(
          token.address,
          ['function balanceOf(address) view returns (uint256)'],
          provider
        );
        const balance = await tokenContract.balanceOf(address);
        newBalances[token.address] = ethers.formatEther(balance);
      }
    }

    setBalances(newBalances);
  };

  const switchChain = async () => {
    try {
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const provider = new ethers.BrowserProvider(connection);
      
      // Request chain switch
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChain.id.toString(16)}` }],
      });

      // Update tokens after chain switch
      if (targetChain.id === CHAINS.BSC_TESTNET.id) {
        setFromToken(CHAINS.BSC_TESTNET.tokens.BNB.address);
        setToToken(CHAINS.BNW.tokens.BNW.address);
      } else {
        setFromToken(CHAINS.BNW.tokens.BNW.address);
        setToToken(CHAINS.BSC_TESTNET.tokens.BNB.address);
      }

      // Fetch new balances
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      await fetchBalances(provider, address);
    } catch (error) {
      console.error('Error switching chain:', error);
      toast({
        title: 'Error',
        description: 'Failed to switch chain',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSwap = async () => {
    if (!account) {
      toast({
        title: 'Error',
        description: 'Please connect your wallet first',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      setLoading(true);
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const provider = new ethers.BrowserProvider(connection);
      const signer = await provider.getSigner();

      const router = new ethers.Contract(
        currentChain.routerAddress,
        CrossChainRouter.abi,
        signer
      );

      const amountInWei = ethers.parseEther(amountIn);
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour

      const tx = await router.swapCrossChain(
        fromToken,
        toToken,
        amountInWei,
        ethers.parseEther(amountOut),
        targetChain.id,
        deadline,
        { value: ethers.parseEther(fee) }
      );

      await tx.wait();

      toast({
        title: 'Success',
        description: 'Swap transaction completed!',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Refresh balances after swap
      await fetchBalances(provider, account);
    } catch (error) {
      console.error('Error executing swap:', error);
      toast({
        title: 'Error',
        description: 'Failed to execute swap',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (value: string) => {
    setAmountIn(value);
    // TODO: Calculate amount out based on price impact and fees
    // This would typically involve calling a price oracle or router contract
    const calculatedAmountOut = (parseFloat(value) * 0.98).toString(); // Placeholder calculation
    setAmountOut(calculatedAmountOut);
    setPriceImpact('2.00'); // Placeholder price impact
  };

  return (
    <Box maxW="md" mx="auto" mt={8} p={6} borderWidth={1} borderRadius="lg" boxShadow="lg">
      <VStack spacing={4}>
        {!account ? (
          <Button colorScheme="blue" onClick={connectWallet} width="full" size="lg">
            Connect Wallet
          </Button>
        ) : (
          <>
            <HStack width="full" justify="space-between">
              <Badge colorScheme={currentChain.id === CHAINS.BSC_TESTNET.id ? 'yellow' : 'blue'}>
                {currentChain.name}
              </Badge>
              <Button size="sm" onClick={switchChain} leftIcon={<RepeatIcon />}>
                Switch to {targetChain.name}
              </Button>
            </HStack>

            <Text fontSize="sm" color="gray.500">Connected: {account}</Text>
            
            <FormControl>
              <FormLabel>From Token</FormLabel>
              <Select
                value={fromToken}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setFromToken(e.target.value)}
              >
                {Object.entries(currentChain.tokens).map(([symbol, token]) => (
                  <option key={token.address} value={token.address}>
                    {token.logo} {symbol} {balances[token.address] && `(${balances[token.address]})`}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>To Token</FormLabel>
              <Select
                value={toToken}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setToToken(e.target.value)}
              >
                {Object.entries(targetChain.tokens).map(([symbol, token]) => (
                  <option key={token.address} value={token.address}>
                    {token.logo} {symbol}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Amount In</FormLabel>
              <NumberInput
                value={amountIn}
                onChange={handleAmountChange}
                min={0}
                precision={18}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>

            <Divider />

            <FormControl>
              <FormLabel>Amount Out (Min)</FormLabel>
              <NumberInput
                value={amountOut}
                isReadOnly
                min={0}
                precision={18}
              >
                <NumberInputField />
              </NumberInput>
            </FormControl>

            <Box width="full" p={4} bg="gray.50" borderRadius="md">
              <VStack spacing={2} align="stretch">
                <HStack justify="space-between">
                  <Text fontSize="sm">Price Impact:</Text>
                  <Text fontSize="sm" color={parseFloat(priceImpact) > 5 ? 'red.500' : 'green.500'}>
                    {priceImpact}%
                  </Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm">Cross-chain Fee:</Text>
                  <Text fontSize="sm">{fee} {currentChain.id === CHAINS.BSC_TESTNET.id ? 'BNB' : 'BNW'}</Text>
                </HStack>
              </VStack>
            </Box>

            <Button
              colorScheme="blue"
              onClick={handleSwap}
              isLoading={loading}
              width="full"
              size="lg"
              isDisabled={!amountIn || !amountOut || parseFloat(amountIn) <= 0}
            >
              Swap
            </Button>
          </>
        )}
      </VStack>
    </Box>
  );
};

export default Swap; 
