import Web3Modal from 'web3modal';
import { ethers } from 'ethers';
import { SiweMessage } from 'siwe';
import { getRpcConfig } from './web3-polyfills';

// This file contains a simplified wrapper for Web3Modal that handles common errors and edge cases

// Initialize a new Web3Modal instance with proper error handling
export const createWeb3Modal = async () => {
  try {
    // Import WalletConnect provider dynamically to avoid build issues
    const WalletConnectProvider = (await import('@walletconnect/web3-provider')).default;
    
    // Get RPC configuration from our polyfills
    const rpcConfig = getRpcConfig();
    
    const providerOptions = {
      injected: {
        display: {
          name: "Metamask",
          description: "Connect with MetaMask"
        },
        package: null
      },
      walletconnect: {
        package: WalletConnectProvider,
        options: {
          rpc: rpcConfig,
          bridge: "https://bridge.walletconnect.org",
          qrcodeModalOptions: {
            mobileLinks: [
              "metamask", 
              "rainbow", 
              "trust", 
              "argent"
            ]
          }
        }
      }
    };
    
    // Create and return a new instance
    return new Web3Modal({
      network: "any",
      cacheProvider: false,
      providerOptions,
      theme: {
        background: "rgb(39, 49, 56)",
        main: "rgb(199, 199, 199)",
        secondary: "rgb(136, 136, 136)",
        border: "rgba(195, 195, 195, 0.14)",
        hover: "rgb(16, 26, 32)"
      }
    });
  } catch (error) {
    console.error("Failed to create Web3Modal:", error);
    throw error;
  }
};

// Connect to wallet and get signer
export const connectWallet = async (web3Modal: Web3Modal) => {
  try {
    // Connect to the provider
    const instance = await web3Modal.connect();
    
    // Create ethers provider from the connected instance
    const provider = new ethers.BrowserProvider(instance);
    
    // Get signer (wallet account)
    const signer = await provider.getSigner();
    
    // Get address from signer
    const address = await signer.getAddress();
    
    // Get network information
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    
    return { provider, signer, address, chainId, instance };
  } catch (error) {
    console.error("Failed to connect wallet:", error);
    throw error;
  }
};

// Create a SIWE message for authentication
export const createSiweMessage = (address: string, chainId: number, statement: string = 'Sign in with Ethereum') => {
  const domain = window.location.host;
  const origin = window.location.origin;
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
};

// Sign a message with the given signer
export const signMessage = async (signer: ethers.Signer, message: string) => {
  try {
    return await signer.signMessage(message);
  } catch (error) {
    console.error("Failed to sign message:", error);
    throw error;
  }
};