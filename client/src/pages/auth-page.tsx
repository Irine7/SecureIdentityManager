import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Wallet } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import Web3Modal from "web3modal";
import { ethers } from "ethers";
import { SiweMessage } from "siwe";
// Import our polyfills and helpers
import { 
  Buffer, 
  generateNonce, 
  formatAddress, 
  getRpcConfig, 
  getChainName,
  SUPPORTED_CHAINS
} from "@/lib/web3-polyfills";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Login form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  // Register form state
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  
  // 2FA state
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [twoFactorToken, setTwoFactorToken] = useState("");
  
  // Web3 state
  const [web3Modal, setWeb3Modal] = useState<Web3Modal | null>(null);
  const [isWeb3Loading, setIsWeb3Loading] = useState(false);
  
  // Initialize Web3Modal with our helper utility
  useEffect(() => {
    // Ensure global Buffer is available
    window.Buffer = Buffer;
    
    const initializeWeb3Modal = async () => {
      try {
        // Import our web3 modal helper
        const { createWeb3Modal } = await import('@/lib/web3-modal-helper');
        
        // Create a new Web3Modal instance using our helper
        try {
          const modal = await createWeb3Modal();
          setWeb3Modal(modal);
          console.log("Web3Modal initialized successfully");
        } catch (modalError) {
          console.error("Error creating Web3Modal instance:", modalError);
          toast({
            title: "Web3 Error",
            description: "Could not initialize wallet connection. Please try again later.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Failed to load Web3Modal dependencies:", error);
        toast({
          title: "Web3 Error",
          description: "Failed to load wallet connection dependencies.",
          variant: "destructive",
        });
      }
    };
    
    initializeWeb3Modal();
  }, [toast]); // Add toast to dependencies

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await apiRequest("POST", "/api/login", { username, password });
      const data = await response.json();
      
      if (data.requires2FA) {
        setRequiresTwoFactor(true);
        setUserId(data.userId);
      } else {
        toast({
          title: "Success",
          description: "Login successful!",
        });
        setLocation("/");
      }
    } catch (err) {
      toast({
        title: "Login failed",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password || !email) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await apiRequest("POST", "/api/register", { 
        username, 
        password, 
        email,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        role: "user", // Default role
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Registration successful! You are now logged in.",
        });
        setLocation("/");
      } else {
        const data = await response.json();
        throw new Error(data.message || "Registration failed");
      }
    } catch (err) {
      toast({
        title: "Registration failed",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!twoFactorToken || !userId) {
      toast({
        title: "Error",
        description: "Please enter verification code",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await apiRequest("POST", "/api/verify-2fa", { 
        token: twoFactorToken,
        userId
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "2FA verification successful!",
        });
        setLocation("/");
      } else {
        const data = await response.json();
        throw new Error(data.message || "Verification failed");
      }
    } catch (err) {
      toast({
        title: "Verification failed",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleWeb3Login = async () => {
    if (!web3Modal) {
      toast({
        title: "Web3 Error",
        description: "Web3Modal not initialized",
        variant: "destructive",
      });
      return;
    }
    
    setIsWeb3Loading(true);
    
    try {
      console.log("Starting Web3 login process...");
      
      // Import the helper functions
      const { connectWallet, createSiweMessage, signMessage } = await import('@/lib/web3-modal-helper');
      
      // First connect the wallet using our helper
      try {
        // Clear cached provider first
        if (web3Modal.cachedProvider) {
          web3Modal.clearCachedProvider();
        }
        
        // Connect and get account info
        const { signer, address, chainId, instance } = await connectWallet(web3Modal);
        
        // Set up event listeners for wallet events
        instance.on("accountsChanged", (accounts: string[]) => {
          console.log("Account changed:", accounts[0]);
          toast({
            title: "Account Changed",
            description: `Switched to account: ${formatAddress(accounts[0])}`,
          });
        });
        
        instance.on("chainChanged", (changedChainId: number) => {
          console.log("Chain changed:", changedChainId);
          toast({
            title: "Network Changed",
            description: `Switched to ${getChainName(changedChainId)}`,
          });
        });
        
        instance.on("disconnect", () => {
          console.log("Wallet disconnected");
          toast({
            title: "Wallet Disconnected",
            description: "Your wallet has been disconnected",
            variant: "destructive",
          });
          web3Modal.clearCachedProvider();
        });
        
        console.log(`Connected to address: ${address} on chain: ${chainId}`);
        
        // Create the SIWE message
        try {
          // Create message
          const statement = 'Sign in with Ethereum to SecureAuth Platform';
          const message = createSiweMessage(address, chainId, statement);
          const messageToSign = message.prepareMessage();
          console.log("Message to sign:", messageToSign);
          
          try {
            // Sign message
            const signature = await signMessage(signer, messageToSign);
            console.log("Signature received:", signature);
            
            // Send to backend
            const response = await apiRequest("POST", "/api/web3-login", {
              message: messageToSign,
              signature,
              address
            });
            
            if (response.ok) {
              console.log("Backend authentication successful");
              toast({
                title: "Success",
                description: `Logged in with ${formatAddress(address)}`,
              });
              
              // Navigate to home page
              setLocation("/");
            } else {
              const data = await response.json();
              throw new Error(data.message || "Web3 login failed");
            }
          } catch (signError: any) {
            // Handle signing errors
            console.error("Error during message signing:", signError);
            
            if (signError?.code === 4001 || 
                (signError?.message && signError.message.includes("reject"))) {
              toast({
                title: "Signature Rejected",
                description: "You must approve the signature request to log in",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Signing Error",
                description: signError?.message || "Failed to sign authentication message",
                variant: "destructive",
              });
            }
            web3Modal.clearCachedProvider();
          }
        } catch (messageError: any) {
          console.error("SIWE message error:", messageError);
          toast({
            title: "Authentication Error",
            description: "Could not create authentication message",
            variant: "destructive",
          });
        }
      } catch (connectError: any) {
        console.error("Wallet connection error:", connectError);
        
        // Provide user-friendly error messages
        let errorMessage = "Failed to connect to wallet";
        
        if (connectError?.code === 4001 || 
            (connectError?.message && connectError.message.includes("reject"))) {
          errorMessage = "You rejected the connection request";
        } else if (connectError?.message?.includes("already processing")) {
          errorMessage = "Connection request already in progress";
        } else if (connectError?.message?.includes("not installed")) {
          errorMessage = "MetaMask extension is not installed. Please install it to continue.";
        } else {
          errorMessage = connectError.message || errorMessage;
        }
        
        toast({
          title: "Connection Failed",
          description: errorMessage,
          variant: "destructive",
        });
        
        web3Modal.clearCachedProvider();
      }
    } catch (error: any) {
      console.error("Overall Web3 login process error:", error);
      toast({
        title: "Web3 Login Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsWeb3Loading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'dark' : ''}`}>
      <div className="absolute top-4 right-4 flex items-center space-x-4">
        <div className="flex space-x-2">
          <Button 
            variant="default"
            size="sm"
          >
            🇺🇸 EN
          </Button>
          <Button 
            variant="outline" 
            size="sm"
          >
            🇪🇸 ES
          </Button>
          <Button 
            variant="outline" 
            size="sm"
          >
            🇷🇺 RU
          </Button>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleDarkMode}
        >
          {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>

      <div className="flex flex-1 flex-col md:flex-row">
        {/* Hero Section */}
        <div className="bg-primary-600 dark:bg-primary-900 text-white p-8 md:w-1/2 flex flex-col justify-center">
          <div className="max-w-lg mx-auto md:mx-0 md:ml-auto">
            <h1 className="text-4xl font-extrabold tracking-tight mb-4">
              SecureAuth Platform
            </h1>
            <p className="text-xl mb-6">
              Secure your account with advanced 2-factor authentication and gain access to premium features.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Advanced 2-factor authentication
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Role-based user permissions
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Premium subscription features
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Multi-language support
              </li>
            </ul>
          </div>
        </div>

        {/* Form Section */}
        <div className="bg-white dark:bg-gray-800 p-8 md:w-1/2 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto">
            {requiresTwoFactor ? (
              <div>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                    Two-Factor Authentication
                  </h2>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Please enter the verification code from your authenticator app
                  </p>
                </div>
                
                <form onSubmit={handleVerify2FA} className="space-y-4">
                  <div>
                    <label htmlFor="token" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      id="token"
                      value={twoFactorToken}
                      onChange={(e) => setTwoFactorToken(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="123456"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Verifying..." : "Verify"}
                  </Button>
                </form>
              </div>
            ) : (
              <div>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                    {activeTab === "login" ? "Login" : "Register"}
                  </h2>
                </div>
  
                {activeTab === "login" ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Username
                      </label>
                      <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="username"
                      />
                    </div>
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Password
                      </label>
                      <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="••••••••"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Logging in..." : "Login"}
                    </Button>
                    
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-300"></span>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Or continue with</span>
                      </div>
                    </div>
                    
                    <Button 
                      type="button"
                      className="w-full flex items-center justify-center"
                      onClick={handleWeb3Login}
                      disabled={isWeb3Loading}
                      variant="outline"
                    >
                      <Wallet className="mr-2 h-4 w-4" />
                      {isWeb3Loading ? "Connecting..." : "Connect Wallet"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <label htmlFor="reg-username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Username
                      </label>
                      <input
                        type="text"
                        id="reg-username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="username"
                      />
                    </div>
                    <div>
                      <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email
                      </label>
                      <input
                        type="email"
                        id="reg-email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="you@example.com"
                      />
                    </div>
                    <div>
                      <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Password
                      </label>
                      <input
                        type="password"
                        id="reg-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          First Name
                        </label>
                        <input
                          type="text"
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Last Name
                        </label>
                        <input
                          type="text"
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Registering..." : "Register"}
                    </Button>
                  </form>
                )}
                
                <div className="text-center text-sm mt-4">
                  {activeTab === "login" ? (
                    <p className="text-gray-600 dark:text-gray-400">
                      Don't have an account?{" "}
                      <button
                        type="button"
                        onClick={() => setActiveTab("register")}
                        className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        Register
                      </button>
                    </p>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400">
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => setActiveTab("login")}
                        className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        Login
                      </button>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
