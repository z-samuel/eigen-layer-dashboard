import { ethers } from 'ethers';

export interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  verbose?: boolean; // Whether to log detailed error messages
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  baseDelay: 2000, // Increased base delay for better rate limit handling
  maxDelay: 60000, // Increased max delay to 1 minute
  backoffMultiplier: 2,
  verbose: false // Reduced verbosity by default
};

/**
 * Checks if an error is a rate limiting error from Infura or similar services
 */
export function isRateLimitError(error: any): boolean {
  // Check for Infura rate limiting error format
  if (error.code === 'BAD_DATA' && 
      error.value && 
      Array.isArray(error.value) && 
      error.value.some((err: any) => err.code === -32005 || err.message?.includes('Too Many Requests'))) {
    return true;
  }
  
  // Check for generic rate limiting messages
  if (error.message?.includes('Too Many Requests') || 
      error.message?.includes('rate limit') ||
      error.message?.includes('Rate limit') ||
      error.message?.includes('429')) {
    return true;
  }
  
  // Check for specific RPC method rate limits
  if (error.info?.payload?.method === 'eth_getLogs' && 
      error.message?.includes('Too Many Requests')) {
    return true;
  }
  
  return false;
}

/**
 * Checks if an error is a "Block Not Found" error that should not be retried
 */
export function isBlockNotFoundError(error: any): boolean {
  // Check for "Block Not Found" error
  if (error.error?.code === -32000 && error.error?.message === 'Block Not Found') {
    return true;
  }
  
  // Check for generic block not found messages
  if (error.message?.includes('Block Not Found') || 
      error.message?.includes('block not found') ||
      error.message?.includes('block does not exist')) {
    return true;
  }
  
  return false;
}

/**
 * Calculates delay for retry with exponential backoff
 */
export function calculateRetryDelay(attempt: number, config: RetryConfig, isRateLimit: boolean = false): number {
  const { baseDelay = 1000, maxDelay = 30000, backoffMultiplier = 2 } = config;
  
  // Use longer delay for rate limits
  const multiplier = isRateLimit ? backoffMultiplier * 1.5 : backoffMultiplier;
  const delay = Math.min(baseDelay * Math.pow(multiplier, attempt - 1), maxDelay);
  
  return Math.floor(delay);
}

/**
 * Generic retry wrapper for any async function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  context: string = 'operation'
): Promise<T> {
  const { maxRetries = 5, verbose = false } = config;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit = isRateLimitError(error);
      const isBlockNotFound = isBlockNotFoundError(error);
      
      // Don't retry "Block Not Found" errors as they won't succeed
      if (isBlockNotFound) {
        console.warn(`${context} failed with "Block Not Found" error, not retrying: ${error.message || error}`);
        throw error;
      }
      
      if (attempt === maxRetries) {
        console.error(`${context} failed after ${maxRetries} attempts: ${error.message || error}`);
        throw error;
      }
      
      const delay = calculateRetryDelay(attempt, config, isRateLimit);
      
      if (isRateLimit) {
        console.warn(`${context} attempt ${attempt} failed (rate limited), retrying in ${delay}ms...`);
      } else if (verbose) {
        console.warn(`${context} attempt ${attempt} failed, retrying in ${delay}ms:`, error.message || error);
      } else {
        console.warn(`${context} attempt ${attempt} failed, retrying in ${delay}ms: ${error.message || 'Unknown error'}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error(`${context} max retries exceeded`);
}

/**
 * Retry wrapper specifically for ethers provider calls
 */
export async function withProviderRetry<T>(
  provider: ethers.Provider,
  operation: (provider: ethers.Provider) => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  context: string = 'provider operation'
): Promise<T> {
  return withRetry(() => operation(provider), config, context);
}

/**
 * Retry wrapper for getCode calls
 */
export async function getCodeWithRetry(
  provider: ethers.Provider,
  address: string,
  blockTag?: number | string,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<string> {
  return withProviderRetry(
    provider,
    (p) => p.getCode(address, blockTag),
    config,
    `getCode(${address}, ${blockTag})`
  );
}

/**
 * Retry wrapper for getBlockNumber calls
 */
export async function getBlockNumberWithRetry(
  provider: ethers.Provider,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<number> {
  return withProviderRetry(
    provider,
    (p) => p.getBlockNumber(),
    config,
    'getBlockNumber()'
  );
}

/**
 * Retry wrapper for getBlock calls
 */
export async function getBlockWithRetry(
  provider: ethers.Provider,
  blockNumber: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<any> {
  return withProviderRetry(
    provider,
    (p) => p.getBlock(blockNumber),
    config,
    `getBlock(${blockNumber})`
  );
}

/**
 * Retry wrapper for getTransaction calls
 */
export async function getTransactionWithRetry(
  provider: ethers.Provider,
  transactionHash: string,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<any> {
  return withProviderRetry(
    provider,
    (p) => p.getTransaction(transactionHash),
    config,
    `getTransaction(${transactionHash})`
  );
}

/**
 * Retry wrapper for queryEvents calls
 */
export async function queryEventsWithRetry(
  contract: ethers.Contract,
  filter: any,
  fromBlock: number,
  toBlock: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<any[]> {
  return withRetry(
    () => contract.queryFilter(filter, fromBlock, toBlock),
    config,
    `queryEvents(${fromBlock}-${toBlock})`
  );
}
