import { ethers } from 'ethers';
import { getCodeWithRetry, getBlockNumberWithRetry } from './retry-utils';

export interface ContractDeploymentConfig {
  knownDeploymentBlock?: number;
  contractName: string;
  fallbackBlockOffset?: number; // Number of blocks to go back as fallback
}

/**
 * Finds the deployment block of a contract using a known block first, then binary search
 * @param provider - Ethers provider instance
 * @param contractAddress - Address of the contract to check
 * @param config - Configuration for the contract deployment detection
 * @returns Promise<number> - The deployment block number
 */
export async function getContractDeploymentBlock(
  provider: ethers.Provider,
  contractAddress: string,
  config: ContractDeploymentConfig
): Promise<number> {
  console.log(`Finding ${config.contractName} deployment block...`);
  
  // First, try the known deployment block if provided
  if (config.knownDeploymentBlock) {
    try {
      const code = await getCodeWithRetry(provider, contractAddress, config.knownDeploymentBlock);
      if (code && code !== '0x') {
        console.log(`${config.contractName} found at known block ${config.knownDeploymentBlock}`);
        return config.knownDeploymentBlock;
      }
    } catch (error) {
      console.warn(`Could not verify known deployment block for ${config.contractName}:`, error);
    }
  }

  // Fallback: binary search to find deployment block
  const currentBlock = await getBlockNumberWithRetry(provider);
  let low = 0;
  let high = currentBlock;
  let deploymentBlock = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    try {
      const code = await getCodeWithRetry(provider, contractAddress, mid);
      if (code && code !== '0x') {
        deploymentBlock = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    } catch (error) {
      console.warn(`Error checking block ${mid} for ${config.contractName}:`, error);
      low = mid + 1;
    }
  }

  if (deploymentBlock === 0) {
    // Use fallback block offset if provided
    if (config.fallbackBlockOffset) {
      const fallbackBlock = Math.max(0, currentBlock - config.fallbackBlockOffset);
      console.log(`Using fallback deployment block for ${config.contractName}: ${fallbackBlock}`);
      return fallbackBlock;
    }
    throw new Error(`Could not find ${config.contractName} deployment block`);
  }

  console.log(`${config.contractName} deployment block: ${deploymentBlock}`);
  return deploymentBlock;
}

