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
import { AuthPage } from "@/pages/auth";
import { LandingPage } from "@/pages/landing";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { UsageProvider } from "@/hooks/use-usage";
import { PlanGuard } from "@/components/plan-guard";

const queryClient = new QueryClient();

function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation(to); }, [to, setLocation]);
  return null;
}

function Router() {
  const { currentUser, loading } = useAuth();

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
        <Route><Redirect to="/" /></Route>
      </Switch>
    );
  }

  return (
    <Layout>
      <Switch>
        <Route path="/auth"><Redirect to="/app" /></Route>
        <Route path="/"><Redirect to="/app" /></Route>
        <Route path="/app">
          <PlanGuard feature="dtf_quotes" featureLabel="cotizaciones DTF">
            <CalculatorPage />
          </PlanGuard>
        </Route>
        <Route path="/history" component={HistoryPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
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
