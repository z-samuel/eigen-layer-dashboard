// Utility functions for formatting data across the application

export const formatWeiToEth = (wei: string): string => {
  const weiBigInt = BigInt(wei);
  const ethBigInt = weiBigInt / BigInt(10 ** 18);
  const remainder = weiBigInt % BigInt(10 ** 18);
  
  if (remainder === BigInt(0)) {
    return ethBigInt.toString();
  }
  
  // Format with decimal places
  const ethString = ethBigInt.toString();
  const remainderString = remainder.toString().padStart(18, '0');
  const trimmedRemainder = remainderString.replace(/0+$/, '');
  
  if (trimmedRemainder === '') {
    return ethBigInt.toString();
  }
  
  return `${ethString}.${trimmedRemainder}`;
};

export const formatTimestamp = (timestamp: number): string => {
  if (timestamp === 0) {
    return 'No events';
  }
  return new Date(timestamp * 1000).toLocaleString();
};

export const formatBlockNumber = (blockNumber: number): string => {
  return blockNumber.toLocaleString();
};

export const formatEventCount = (count: number): string => {
  return count.toLocaleString();
};

export const formatEthAmount = (wei: string): string => {
  const eth = formatWeiToEth(wei);
  return `${eth} ETH`;
};

export const formatShortEthAmount = (wei: string): string => {
  const eth = formatWeiToEth(wei);
  const num = parseFloat(eth);
  
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M ETH`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(2)}K ETH`;
  } else {
    return `${num.toFixed(4)} ETH`;
  }
};
