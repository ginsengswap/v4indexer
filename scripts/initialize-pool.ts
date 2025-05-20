import { ethers } from "ethers";
import { PoolManager } from "../generated/contracts/PoolManager";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

async function main() {
  // Connect to the network
  const provider = new ethers.JsonRpcProvider("https://unichain-sepolia.drpc.org");
  
  // Create a wallet instance
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("Please set PRIVATE_KEY in .env file");
  }
  const wallet = new ethers.Wallet(privateKey, provider);
  
  // PoolManager contract address
  const poolManagerAddress = "0x00b036b58a818b1bc34d502d3fe730db729e62ac";
  
  // Create contract instance with signer
  const poolManager = new ethers.Contract(
    poolManagerAddress,
    PoolManager.abi,
    wallet
  );

  // Pool configuration
  const ethAddress = "0x0000000000000000000000000000000000000000"; // Native ETH
  const usdcAddress = "0x31d0220469e10c4E71834a79b1f276d740d3768F"; // USDC
  
  // Ensure currency0 < currency1
  const [currency0, currency1] = [ethAddress, usdcAddress].sort();
  
  const fee = 5000; // 0.50%
  const tickSpacing = 10; // Standard tick spacing for 0.50% fee tier
  const hooks = "0x0000000000000000000000000000000000000000"; // No hooks

  // Calculate sqrtPriceX96 for 1:1 price
  // For 1:1 price, we use 2^96 as the sqrtPriceX96
  const startingPrice = "79228162514264337593543950336"; // 2^96

  // Create pool key
  const poolKey = {
    currency0,
    currency1,
    fee,
    tickSpacing,
    hooks
  };

  console.log("Initializing pool with parameters:");
  console.log("Pool Key:", poolKey);
  console.log("Starting Price:", startingPrice);

  try {
    // Estimate gas first
    const gasEstimate = await poolManager.initialize.estimateGas(poolKey, startingPrice);
    console.log("Estimated gas:", gasEstimate.toString());

    // Initialize the pool with gas limit
    const tx = await poolManager.initialize(poolKey, startingPrice, {
      gasLimit: gasEstimate * BigInt(120) / BigInt(100) // Add 20% buffer
    });
    console.log("Transaction hash:", tx.hash);
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    console.log("Pool initialized in block:", receipt.blockNumber);

    // Get the pool ID from the Initialize event
    const event = receipt.logs.find(
      (log: { topics: string[] }) => log.topics[0] === poolManager.interface.getEvent('Initialize')?.topicHash
    );
    if (event) {
      const poolId = event.topics[1];
      console.log("Pool ID:", poolId);
    }
  } catch (error: unknown) {
    console.error("Error details:", error);
    if (error && typeof error === 'object' && 'data' in error) {
      console.error("Error data:", (error as { data: unknown }).data);
    }
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 