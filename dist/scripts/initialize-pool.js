"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const PoolManager_1 = require("../generated/contracts/PoolManager");
const dotenv = __importStar(require("dotenv"));
// Load environment variables from .env file
dotenv.config();
async function main() {
    // Connect to the network
    const provider = new ethers_1.ethers.JsonRpcProvider("https://unichain-sepolia.drpc.org");
    // Create a wallet instance
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        throw new Error("Please set PRIVATE_KEY in .env file");
    }
    const wallet = new ethers_1.ethers.Wallet(privateKey, provider);
    // PoolManager contract address
    const poolManagerAddress = "0x00b036b58a818b1bc34d502d3fe730db729e62ac";
    // Create contract instance with signer
    const poolManager = new ethers_1.ethers.Contract(poolManagerAddress, PoolManager_1.PoolManager.abi, wallet);
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
        const event = receipt.logs.find((log) => log.topics[0] === poolManager.interface.getEvent('Initialize')?.topicHash);
        if (event) {
            const poolId = event.topics[1];
            console.log("Pool ID:", poolId);
        }
    }
    catch (error) {
        console.error("Error details:", error);
        if (error && typeof error === 'object' && 'data' in error) {
            console.error("Error data:", error.data);
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
