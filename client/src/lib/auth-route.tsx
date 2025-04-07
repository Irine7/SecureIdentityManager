import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, RouteComponentProps } from "wouter";

type AuthRouteProps = {
  path: string;
  component: React.ComponentType<RouteComponentProps>;
};

export function AuthRoute({
  path,
  component: Component,
}: AuthRouteProps) {
  const { user, isLoading, is2FARequired } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        {(params) => (
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </Route>
    );
  }

  // Redirect to home if already logged in and 2FA not required
  if (user && !is2FARequired) {
    return (
      <Route path={path}>
        {() => <Redirect to="/" />}
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}