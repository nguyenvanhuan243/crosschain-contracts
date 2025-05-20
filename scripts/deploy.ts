import { ethers } from "hardhat";

async function main() {
  // Deploy Factory
  const CrossChainFactory = await ethers.getContractFactory("CrossChainFactory");
  const factory = await CrossChainFactory.deploy();
  await factory.waitForDeployment();
  console.log("CrossChainFactory deployed to:", await factory.getAddress());

  // Deploy Router
  const CrossChainRouter = await ethers.getContractFactory("CrossChainRouter");
  
  // BSC Testnet deployment
  const WBNB_BSC = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd"; // BSC Testnet WBNB
  const WBNW_BSC = "0x..."; // Replace with actual WBNW address on BSC
  const LZ_ENDPOINT_BSC = "0x..."; // Replace with LayerZero endpoint on BSC
  
  const routerBSC = await CrossChainRouter.deploy(
    await factory.getAddress(),
    WBNB_BSC,
    WBNW_BSC,
    LZ_ENDPOINT_BSC
  );
  await routerBSC.waitForDeployment();
  console.log("CrossChainRouter deployed to BSC:", await routerBSC.getAddress());

  // BNW deployment
  const WBNB_BNW = "0x..."; // Replace with WBNB address on BNW
  const WBNW_BNW = "0x..."; // Replace with WBNW address on BNW
  const LZ_ENDPOINT_BNW = "0x..."; // Replace with LayerZero endpoint on BNW
  
  const routerBNW = await CrossChainRouter.deploy(
    await factory.getAddress(),
    WBNB_BNW,
    WBNW_BNW,
    LZ_ENDPOINT_BNW
  );
  await routerBNW.waitForDeployment();
  console.log("CrossChainRouter deployed to BNW:", await routerBNW.getAddress());

  // Set supported chains
  await factory.setSupportedChain(97, true); // BSC Testnet
  await factory.setSupportedChain(714, true); // BNW

  console.log("Deployment completed!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 
