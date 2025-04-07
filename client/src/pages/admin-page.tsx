import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { useLanguage } from "@/hooks/use-language";
import { UsersList } from "@/components/admin/users-list";
import { PaymentHistory } from "@/components/admin/payment-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, CreditCard } from "lucide-react";

export default function AdminPage() {
  const { t } = useLanguage();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState("users");

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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between mb-8">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate flex items-center">
                <Shield className="mr-2 h-7 w-7" />
                {t("admin")}
              </h2>
            </div>
          </div>
          
          <Card>
            <CardHeader className="pb-0">
              <CardTitle>{t("adminPanel")}</CardTitle>
              <CardDescription>
                {t("adminPanelDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs 
                defaultValue={activeTab} 
                onValueChange={setActiveTab}
                className="mt-6"
              >
                <TabsList className="grid w-full grid-cols-2 mb-8">
                  <TabsTrigger value="users" className="flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    {t("users")}
                  </TabsTrigger>
                  <TabsTrigger value="payments" className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2" />
                    {t("payments")}
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="users">
                  <UsersList />
                </TabsContent>
                <TabsContent value="payments">
                  <PaymentHistory />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
