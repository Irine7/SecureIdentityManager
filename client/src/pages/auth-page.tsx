import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
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
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                {activeTab === "login" ? "Login" : "Register"}
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <Button className="w-full">
                  {activeTab === "login" ? "Login" : "Register"}
                </Button>
              </div>
              <div className="text-center text-sm">
                {activeTab === "login" ? (
                  <p className="text-gray-600 dark:text-gray-400">
                    Don't have an account?{" "}
                    <button
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
                      onClick={() => setActiveTab("login")}
                      className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                    >
                      Login
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
