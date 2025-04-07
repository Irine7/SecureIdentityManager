// Web3 polyfills
import * as buffer from 'buffer';

// Make Buffer available globally
if (typeof window !== 'undefined') {
  window.Buffer = buffer.Buffer;
}

// Export to use in components
export const Buffer = buffer.Buffer;

// Helper to create a nonce for SIWE messages
export function generateNonce(): string {
  return Math.floor(Math.random() * 1000000).toString();
}

// Helper to format wallet addresses for display
export function formatAddress(address: string, startLength = 6, endLength = 4): string {
  if (!address) return '';
  return `${address.substring(0, startLength)}...${address.substring(address.length - endLength)}`;
}

// Define chain info type
interface ChainInfo {
  name: string;
  rpcUrl: string;
  blockExplorer: string;
}

// Chain information with explicit type mapping
export const SUPPORTED_CHAINS: Record<number, ChainInfo> = {
  // Mainnets
  1: {
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    blockExplorer: 'https://etherscan.io'
  },
  56: {
    name: 'Binance Smart Chain',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    blockExplorer: 'https://bscscan.com'
  },
  137: {
    name: 'Polygon',
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorer: 'https://polygonscan.com'
  },
  // Testnets
  5: {
    name: 'Goerli Testnet',
    rpcUrl: 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    blockExplorer: 'https://goerli.etherscan.io'
  },
  17000: {
    name: 'Holesky Testnet',
    rpcUrl: 'https://ethereum-holesky.publicnode.com',
    blockExplorer: 'https://holesky.etherscan.io'
  },
  97: {
    name: 'BSC Testnet',
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    blockExplorer: 'https://testnet.bscscan.com'
  },
  80001: {
    name: 'Mumbai (Polygon Testnet)',
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    blockExplorer: 'https://mumbai.polygonscan.com'
  }
};

// Function to get chain name from ID with safer typing
export function getChainName(chainId: number): string {
  return chainId in SUPPORTED_CHAINS 
    ? SUPPORTED_CHAINS[chainId].name 
    : `Chain ID ${chainId}`;
}

// RPC configuration for WalletConnect with proper typing
export const getRpcConfig = (): Record<string, string> => {
  const rpcConfig: Record<string, string> = {};
  
  (Object.keys(SUPPORTED_CHAINS) as unknown as number[]).forEach(chainId => {
    rpcConfig[chainId.toString()] = SUPPORTED_CHAINS[chainId].rpcUrl;
  });
  
  return rpcConfig;
};