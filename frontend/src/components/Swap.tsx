import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
  Text,
  useToast,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react';
import { ethers } from 'ethers';
import Web3Modal from 'web3modal';
import CrossChainRouter from '../../artifacts/contracts/CrossChainRouter.sol/CrossChainRouter.json';

const CHAINS = {
  BSC_TESTNET: {
    id: 97,
    name: 'BSC Testnet',
    routerAddress: 'YOUR_BSC_ROUTER_ADDRESS',
  },
  BNW: {
    id: 714,
    name: 'BNW Chain',
    routerAddress: 'YOUR_BNW_ROUTER_ADDRESS',
  },
};

const Swap: React.FC = () => {
  const [account, setAccount] = useState<string>('');
  const [chainId, setChainId] = useState<number>(CHAINS.BSC_TESTNET.id);
  const [tokenIn, setTokenIn] = useState<string>('');
  const [tokenOut, setTokenOut] = useState<string>('');
  const [amountIn, setAmountIn] = useState<string>('');
  const [amountOut, setAmountOut] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const toast = useToast();

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
      
      connection.on('accountsChanged', (accounts: string[]) => {
        setAccount(accounts[0]);
      });
      
      connection.on('chainChanged', (chainId: string) => {
        setChainId(Number(chainId));
      });
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

      const routerAddress = chainId === CHAINS.BSC_TESTNET.id 
        ? CHAINS.BSC_TESTNET.routerAddress 
        : CHAINS.BNW.routerAddress;

      const router = new ethers.Contract(
        routerAddress,
        CrossChainRouter.abi,
        signer
      );

      const dstChainId = chainId === CHAINS.BSC_TESTNET.id 
        ? CHAINS.BNW.id 
        : CHAINS.BSC_TESTNET.id;

      const amountInWei = ethers.parseEther(amountIn);
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour

      const tx = await router.swapCrossChain(
        tokenIn,
        tokenOut,
        amountInWei,
        ethers.parseEther(amountOut),
        dstChainId,
        deadline,
        { value: ethers.parseEther('0.01') } // Adjust gas fee as needed
      );

      await tx.wait();

      toast({
        title: 'Success',
        description: 'Swap transaction completed!',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
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

  return (
    <Box maxW="md" mx="auto" mt={8} p={6} borderWidth={1} borderRadius="lg">
      <VStack spacing={4}>
        {!account ? (
          <Button colorScheme="blue" onClick={connectWallet} width="full">
            Connect Wallet
          </Button>
        ) : (
          <>
            <Text>Connected: {account}</Text>
            <Text>Network: {chainId === CHAINS.BSC_TESTNET.id ? 'BSC Testnet' : 'BNW Chain'}</Text>
            
            <FormControl>
              <FormLabel>From Token</FormLabel>
              <Input
                value={tokenIn}
                onChange={(e) => setTokenIn(e.target.value)}
                placeholder="Token address"
              />
            </FormControl>

            <FormControl>
              <FormLabel>To Token</FormLabel>
              <Input
                value={tokenOut}
                onChange={(e) => setTokenOut(e.target.value)}
                placeholder="Token address"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Amount In</FormLabel>
              <NumberInput
                value={amountIn}
                onChange={(value) => setAmountIn(value)}
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

            <FormControl>
              <FormLabel>Amount Out (Min)</FormLabel>
              <NumberInput
                value={amountOut}
                onChange={(value) => setAmountOut(value)}
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

            <Button
              colorScheme="blue"
              onClick={handleSwap}
              isLoading={loading}
              width="full"
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
