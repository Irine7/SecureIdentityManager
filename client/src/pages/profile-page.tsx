import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { useLanguage } from "@/hooks/use-language";
import { ProfileForm } from "@/components/user/profile-form";
import { SecuritySettings } from "@/components/user/security-settings";
import { BillingInfo } from "@/components/user/billing-info";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { User, Lock, CreditCard } from "lucide-react";

export default function ProfilePage() {
  const { t } = useLanguage();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [location, setLocation] = useLocation();
  
  // Extract tab from URL if present
  const [activeTab, setActiveTab] = useState<string>(() => {
    const urlSearchParams = new URLSearchParams(window.location.search);
    return urlSearchParams.get("tab") || "personal";
  });

  useEffect(() => {
    // Check for dark mode preference
    const isDark = localStorage.getItem("darkMode") === "true";
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem("darkMode", newDarkMode.toString());
    document.documentElement.classList.toggle("dark");
  };

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setLocation(`/profile?tab=${value}`, { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between mb-8">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
                {t("profile")}
              </h2>
            </div>
          </div>
          
          <Card>
            <CardHeader className="pb-0">
              <CardTitle>{t("profile")}</CardTitle>
              <CardDescription>
                {t("profileDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs 
                defaultValue={activeTab} 
                onValueChange={handleTabChange}
                className="mt-6"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="personal" className="flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    {t("personal")}
                  </TabsTrigger>
                  <TabsTrigger value="security" className="flex items-center">
                    <Lock className="h-4 w-4 mr-2" />
                    {t("security")}
                  </TabsTrigger>
                  <TabsTrigger value="billing" className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2" />
                    {t("billing")}
                  </TabsTrigger>
                </TabsList>
                <div className="mt-6">
                  <TabsContent value="personal">
                    <ProfileForm />
                  </TabsContent>
                  <TabsContent value="security">
                    <SecuritySettings />
                  </TabsContent>
                  <TabsContent value="billing">
                    <BillingInfo />
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
