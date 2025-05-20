import React from 'react';
import { ChakraProvider, Container, Heading, VStack } from '@chakra-ui/react';
import Swap from './components/Swap';

const App: React.FC = () => {
  return (
    <ChakraProvider>
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8}>
          <Heading>Cross-Chain Swap</Heading>
          <Swap />
        </VStack>
      </Container>
    </ChakraProvider>
  );
};

export default App; 
