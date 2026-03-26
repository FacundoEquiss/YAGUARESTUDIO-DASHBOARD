import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { CalculatorPage } from "@/pages/calculator";
import { HistoryPage } from "@/pages/history";
import { SettingsPage } from "@/pages/settings";
import { AuthPage } from "@/pages/auth";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { UsageProvider } from "@/hooks/use-usage";
import { PlanGuard } from "@/components/plan-guard";

const queryClient = new QueryClient();

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
    return <AuthPage />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/">
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
