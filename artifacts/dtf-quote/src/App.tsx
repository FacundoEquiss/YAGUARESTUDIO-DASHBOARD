import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { CalculatorPage } from "@/pages/calculator";
import { HistoryPage } from "@/pages/history";
import { SettingsPage } from "@/pages/settings";
import { MockupsPage } from "@/pages/mockups";
import { ProfilePage } from "@/pages/profile";
import { AuthPage } from "@/pages/auth";
import { LandingPage } from "@/pages/landing";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { UsageProvider } from "@/hooks/use-usage";
import { PlanGuard } from "@/components/plan-guard";
import { useTheme } from "@/hooks/use-theme";

const queryClient = new QueryClient();

function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation(to); }, [to, setLocation]);
  return null;
}

function AuthRedirect() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next") || "/app";
  return <Redirect to={next} />;
}

function ProtectedRedirect() {
  const [location] = useLocation();
  const validPaths = ["/app", "/mockups", "/history", "/settings", "/profile"];
  const next = validPaths.includes(location) ? location : "/app";
  return <Redirect to={`/auth?next=${next}`} />;
}

function Router() {
  const { currentUser, loading } = useAuth();
  useTheme();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[100dvh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route path="/" component={LandingPage} />
        <Route><ProtectedRedirect /></Route>
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth">
        {currentUser.role === "guest" ? <AuthPage /> : <AuthRedirect />}
      </Route>
      <Route path="/app">
        <Layout>
          <PlanGuard feature="dtf_quotes" featureLabel="cotizaciones DTF">
            <CalculatorPage />
          </PlanGuard>
        </Layout>
      </Route>
      <Route path="/mockups">
        <Layout>
          <PlanGuard feature="mockup_pngs" featureLabel="mockups">
            <MockupsPage />
          </PlanGuard>
        </Layout>
      </Route>
      <Route path="/history">
        <Layout>
          <HistoryPage />
        </Layout>
      </Route>
      <Route path="/settings">
        <Layout>
          <SettingsPage />
        </Layout>
      </Route>
      <Route path="/profile">
        <Layout>
          <ProfilePage />
        </Layout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <UsageProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
          </UsageProvider>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
