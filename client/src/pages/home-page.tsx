import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Moon, Sun } from "lucide-react";

export default function HomePage() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">SecureAuth</h1>
          <div className="flex items-center space-x-4">
            <nav className="flex space-x-4">
              <Link href="/" className="px-3 py-2 rounded-md text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
                Home
              </Link>
              <Link href="/profile" className="px-3 py-2 rounded-md text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
                Profile
              </Link>
              <Link href="/subscription" className="px-3 py-2 rounded-md text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
                Subscription
              </Link>
              <Link href="/auth" className="px-3 py-2 rounded-md text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                Logout
              </Link>
            </nav>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleDarkMode}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between mb-8">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
                Welcome, User!
              </h2>
            </div>
          </div>
          
          {/* Subscription Status */}
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Subscription
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                Free Plan
              </p>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700">
              <div className="px-4 py-5 sm:p-6">
                <div className="sm:flex sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      Free Plan
                    </h3>
                    <div className="mt-2 max-w-xl text-sm text-gray-500 dark:text-gray-400">
                      <p>
                        Upgrade to Premium for additional features.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-0 sm:ml-6 sm:flex-shrink-0 sm:flex sm:items-center">
                    <Button asChild>
                      <Link href="/subscription">
                        Upgrade
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Recent Activity Section */}
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Recent Payments
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                View your recent payment history
              </p>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700">
              <div className="px-4 py-5 sm:p-6">
                <div className="py-8 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">No payment history found</p>
                  <Button variant="outline" className="mt-4" asChild>
                    <Link href="/subscription">
                      Upgrade
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            © 2025 SecureAuth. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
