import { ethers } from 'ethers';
import { SiweMessage } from 'siwe';

/**
 * A simpler wallet connector that uses direct Ethereum detection
 * without relying on the web3modal library
 */

// Check if MetaMask or similar injected provider is available
export function isWalletAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.ethereum;
}

// Connect to the wallet and return provider/signer
export async function connectWallet() {
  if (!isWalletAvailable()) {
    throw new Error('No Ethereum wallet detected. Please install MetaMask or another wallet.');
  }
  
  try {
    // Request account access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found. Please ensure your wallet is unlocked.');
    }
    
    // Create providers and signers
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = accounts[0];
    
    // Get the chain ID
    const { chainId } = await provider.getNetwork();
    
    // Return wallet information
    return {
      provider,
      signer,
      address,
      chainId: Number(chainId),
      accounts
    };
  } catch (error: any) {
    // Handle errors more specifically
    if (error.code === 4001) {
      throw new Error('You rejected the connection request.');
    }
    
    // Re-throw with better error message
    throw new Error(`Failed to connect wallet: ${error.message || 'Unknown error'}`);
  }
}

// Create a SIWE message
export function createSiweMessage(address: string, chainId: number) {
  // Prepare the message data
  const domain = window.location.host;
  const origin = window.location.origin;
  const statement = 'Sign in with Ethereum to SecureAuth Platform';
  const now = new Date();
  const expirationTime = new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1 hour from now
  const nonce = Math.floor(Math.random() * 1000000).toString();
  
  return new SiweMessage({
    domain,
    address,
    statement,
    uri: origin,
    version: '1',
    chainId,
    nonce,
    issuedAt: now.toISOString(),
    expirationTime: expirationTime.toISOString(),
    resources: ['https://secureauth.example/terms', 'https://secureauth.example/privacy'],
  });
}

// Sign a message with the signer
export async function signMessage(signer: ethers.Signer, message: string) {
  return await signer.signMessage(message);
}

// Set up event listeners for wallet events
export function setupWalletListeners(
  onAccountsChanged: (accounts: string[]) => void, 
  onChainChanged: (chainId: string) => void, 
  onDisconnect: () => void
) {
  if (!isWalletAvailable()) return;
  
  // Account changes
  window.ethereum.on('accountsChanged', onAccountsChanged);
  
  // Chain changes
  window.ethereum.on('chainChanged', onChainChanged);
  
  // Disconnect (MetaMask specific)
  window.ethereum.on('disconnect', onDisconnect);
  
  // Return cleanup function
  return () => {
    window.ethereum.removeListener('accountsChanged', onAccountsChanged);
    window.ethereum.removeListener('chainChanged', onChainChanged);
    window.ethereum.removeListener('disconnect', onDisconnect);
  };
}

// Get chain name from chain ID
export function getChainName(chainId: number): string {
  const chains: Record<number, string> = {
    1: 'Ethereum Mainnet',
    5: 'Goerli Testnet',
    11155111: 'Sepolia Testnet',
    56: 'Binance Smart Chain',
    97: 'BSC Testnet',
    137: 'Polygon',
    80001: 'Mumbai (Polygon Testnet)',
    17000: 'Holesky Testnet'
  };
  
  return chains[chainId] || `Chain ID ${chainId}`;
}

// Format wallet address to be more readable
export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}