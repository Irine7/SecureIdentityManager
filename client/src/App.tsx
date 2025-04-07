import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import ProfilePage from "@/pages/profile-page";
import AdminPage from "@/pages/admin-page";
import SubscriptionPage from "@/pages/subscription-page";

function App() {
  return (
    <>
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route path="/" component={HomePage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/subscription" component={SubscriptionPage} />
        <Route component={NotFound} />
      </Switch>
      <Toaster />
    </>
  );
}

export default App;
