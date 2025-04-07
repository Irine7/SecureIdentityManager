import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Home, 
  User, 
  Settings, 
  Shield, 
  LogOut, 
  Menu, 
  Sun, 
  Moon,
  ChevronDown
} from "lucide-react";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";

interface HeaderProps {
  toggleDarkMode: () => void;
  isDarkMode: boolean;
}

export function Header({ toggleDarkMode, isDarkMode }: HeaderProps) {
  const { t, language, changeLanguage } = useLanguage();
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const getInitials = () => {
    if (!user) return "?";
    
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    
    return `${firstName.charAt(0)}${lastName.charAt(0)}` || user.username?.charAt(0) || "?";
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-primary-600 text-xl font-bold">SecureAuth</span>
            </div>
            <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link href="/">
                <a className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                  location === "/" 
                    ? "border-b-2 border-primary-500 text-gray-900 dark:text-white" 
                    : "border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:border-gray-300"
                }`}>
                  <Home className="w-4 h-4 mr-1" />
                  {t("dashboard")}
                </a>
              </Link>
              <Link href="/profile">
                <a className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                  location === "/profile" 
                    ? "border-b-2 border-primary-500 text-gray-900 dark:text-white" 
                    : "border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:border-gray-300"
                }`}>
                  <User className="w-4 h-4 mr-1" />
                  {t("profile")}
                </a>
              </Link>
              {user?.role === "admin" && (
                <Link href="/admin">
                  <a className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                    location === "/admin" 
                      ? "border-b-2 border-primary-500 text-gray-900 dark:text-white" 
                      : "border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:border-gray-300"
                  }`}>
                    <Shield className="w-4 h-4 mr-1" />
                    {t("admin")}
                  </a>
                </Link>
              )}
            </nav>
          </div>
          
          <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
            {/* Language Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center">
                  {language === "en" && <span>🇺🇸 English</span>}
                  {language === "es" && <span>🇪🇸 Español</span>}
                  {language === "ru" && <span>🇷🇺 Русский</span>}
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => changeLanguage("en")}>
                  🇺🇸 English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeLanguage("es")}>
                  🇪🇸 Español
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeLanguage("ru")}>
                  🇷🇺 Русский
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Dark Mode Toggle */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggleDarkMode}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full">
                  <Avatar>
                    <AvatarFallback className="bg-primary-500 text-primary-foreground">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer w-full">
                    <User className="mr-2 h-4 w-4" />
                    <span>{t("profile")}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile?tab=security" className="cursor-pointer w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>{t("settings")}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t("logout")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="flex flex-col space-y-4 mt-4">
                  <Link href="/">
                    <a className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Home className="mr-3 h-5 w-5" />
                      {t("dashboard")}
                    </a>
                  </Link>
                  <Link href="/profile">
                    <a className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <User className="mr-3 h-5 w-5" />
                      {t("profile")}
                    </a>
                  </Link>
                  {user?.role === "admin" && (
                    <Link href="/admin">
                      <a className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Shield className="mr-3 h-5 w-5" />
                        {t("admin")}
                      </a>
                    </Link>
                  )}
                  
                  <div className="px-4 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {t("language")}
                    </p>
                    <div className="flex mt-2 space-x-2">
                      <Button 
                        variant={language === "en" ? "default" : "outline"} 
                        size="sm"
                        onClick={() => changeLanguage("en")}
                      >
                        🇺🇸 EN
                      </Button>
                      <Button 
                        variant={language === "es" ? "default" : "outline"} 
                        size="sm"
                        onClick={() => changeLanguage("es")}
                      >
                        🇪🇸 ES
                      </Button>
                      <Button 
                        variant={language === "ru" ? "default" : "outline"} 
                        size="sm"
                        onClick={() => changeLanguage("ru")}
                      >
                        🇷🇺 RU
                      </Button>
                    </div>
                  </div>
                  
                  <div className="px-4 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {t("darkMode")}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={toggleDarkMode}
                      className="mt-2"
                    >
                      {isDarkMode ? (
                        <><Sun className="mr-2 h-4 w-4" /> {t("darkMode")}</>
                      ) : (
                        <><Moon className="mr-2 h-4 w-4" /> {t("darkMode")}</>
                      )}
                    </Button>
                  </div>
                  
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {t("logout")}
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
