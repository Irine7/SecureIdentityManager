import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, CreditCard, Calendar, Shield, Globe, Zap } from "lucide-react";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || "");

const SubscribeForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/subscription?success=true",
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "You are now subscribed!",
      });
      onSuccess();
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement className="mb-6" />
      <Button type="submit" disabled={!stripe || isLoading} className="w-full">
        {isLoading ? "Processing..." : t("subscribe")}
      </Button>
    </form>
  );
};

export default function SubscriptionPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(user?.isPremium || false);

  // Check if the URL has a success parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      toast({
        title: "Subscription Successful",
        description: "Thank you for subscribing to our premium plan!",
      });
      setIsSubscribed(true);
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

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

  const handleStartSubscription = async () => {
    try {
      const response = await apiRequest("POST", "/api/get-or-create-subscription");
      const data = await response.json();
      setClientSecret(data.clientSecret);
      setShowPaymentForm(true);
    } catch (error) {
      console.error("Error starting subscription:", error);
      toast({
        title: "Error",
        description: "Failed to start subscription process. Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await apiRequest("POST", "/api/cancel-subscription");
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled. You will still have access until the end of your billing period.",
      });
      setIsSubscribed(false);
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleSubscriptionSuccess = () => {
    setShowPaymentForm(false);
    setIsSubscribed(true);
    toast({
      title: "Subscription Successful",
      description: "Thank you for subscribing to our premium plan!",
    });
  };

  const premiumFeatures = [
    {
      icon: Shield,
      title: t("advancedSecurity"),
      description: t("advancedSecurityDesc"),
    },
    {
      icon: Globe,
      title: t("allLanguages"),
      description: t("allLanguagesDesc"),
    },
    {
      icon: Calendar,
      title: t("prioritySupport"),
      description: t("prioritySupportDesc"),
    },
    {
      icon: Zap,
      title: t("advancedFeatures"),
      description: t("advancedFeaturesDesc"),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between mb-8">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
                {t("subscription")}
              </h2>
            </div>
          </div>
          
          {showPaymentForm && clientSecret ? (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>{t("completeSubscription")}</CardTitle>
                <CardDescription>{t("enterPaymentDetails")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <SubscribeForm onSuccess={handleSubscriptionSuccess} />
                </Elements>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              {/* Free Plan */}
              <Card className={`${!isSubscribed ? "border-primary" : ""}`}>
                <CardHeader>
                  <CardTitle>{t("freePlan")}</CardTitle>
                  <CardDescription>{t("freePlanDesc")}</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">$0</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">{t("perMonth")}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
                      <span>{t("basicSecurity")}</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
                      <span>{t("basicFeatures")}</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
                      <span>{t("standardSupport")}</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" disabled={!isSubscribed} onClick={handleCancelSubscription}>
                    {isSubscribed ? t("switchToFree") : t("currentPlan")}
                  </Button>
                </CardFooter>
              </Card>
              
              {/* Premium Plan */}
              <Card className={`${isSubscribed ? "border-primary" : ""}`}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>{t("premiumPlan")}</CardTitle>
                    {isSubscribed && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100">
                        {t("active")}
                      </span>
                    )}
                  </div>
                  <CardDescription>{t("premiumPlanDesc")}</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">$19.99</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">{t("perMonth")}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {premiumFeatures.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
                        <span>{feature.title}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {isSubscribed ? (
                    <Button variant="outline" className="w-full" onClick={handleCancelSubscription}>
                      {t("cancelSubscription")}
                    </Button>
                  ) : (
                    <Button className="w-full" onClick={handleStartSubscription}>
                      <CreditCard className="mr-2 h-4 w-4" />
                      {t("subscribePremium")}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </div>
          )}

          {/* Premium Features */}
          {!showPaymentForm && (
            <div className="mt-12">
              <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">
                {t("premiumFeatures")}
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {premiumFeatures.map((feature, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center">
                        <div className="p-3 bg-primary/10 rounded-full mb-4">
                          <feature.icon className="h-6 w-6 text-primary" />
                        </div>
                        <h4 className="font-medium mb-2">{feature.title}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {feature.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
