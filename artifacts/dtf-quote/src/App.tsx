import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppShell } from "@/components/app-shell";
import { DashboardLayout } from "@/components/dashboard-layout";
import { CalculatorPage } from "@/pages/calculator";
import { HistoryPage } from "@/pages/history";
import { SettingsPage } from "@/pages/settings";
import { SupportPage } from "@/pages/support";
import { MockupsPage } from "@/pages/mockups";
import { ProfilePage } from "@/pages/profile";
import { DashboardPage } from "@/pages/dashboard";
import { OrdersPage } from "@/pages/orders";
import { ClientsPage } from "@/pages/clients";
import { SuppliersPage } from "@/pages/suppliers";
import { FinancePage } from "@/pages/finance";
import { ReportsPage } from "@/pages/reports";
import { AccountsPage } from "@/pages/accounts";
import { AuthPage } from "@/pages/auth";
import { LandingPage } from "@/pages/landing";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { UsageProvider } from "@/hooks/use-usage";
import { PlanGuard } from "@/components/plan-guard";
import { ThemeProvider } from "@/components/theme-provider";

const queryClient = new QueryClient();

function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation(to); }, [to, setLocation]);
  return null;
}

function AuthRedirect() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next") || "/dashboard";
  return <Redirect to={next} />;
}

function ProtectedRedirect() {
  const [location] = useLocation();
  const validPaths = ["/dashboard", "/app", "/mockups", "/history", "/settings", "/support", "/profile", "/orders", "/clients", "/suppliers", "/finance", "/reports", "/accounts"];
  const next = validPaths.includes(location) ? location : "/dashboard";
  return <Redirect to={`/auth?next=${next}`} />;
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
      <AppShell>
        <Switch>
          <Route path="/auth" component={AuthPage} />
          <Route path="/" component={LandingPage} />
          <Route><ProtectedRedirect /></Route>
        </Switch>
      </AppShell>
    );
  }

  return (
    <Switch>
      <Route path="/">
        <AppShell>
          <LandingPage />
        </AppShell>
      </Route>
      <Route path="/auth">
        <AppShell>
          {currentUser.role === "guest" ? <AuthPage /> : <AuthRedirect />}
        </AppShell>
      </Route>

      <Route path="/dashboard">
        <DashboardLayout>
          <DashboardPage />
        </DashboardLayout>
      </Route>
      <Route path="/app">
        <DashboardLayout>
          <PlanGuard feature="dtf_quotes" featureLabel="cotizaciones DTF">
            <CalculatorPage />
          </PlanGuard>
        </DashboardLayout>
      </Route>
      <Route path="/mockups">
        <DashboardLayout>
          <PlanGuard feature="mockup_pngs" featureLabel="mockups">
            <MockupsPage />
          </PlanGuard>
        </DashboardLayout>
      </Route>
      <Route path="/orders">
        <DashboardLayout>
          <OrdersPage />
        </DashboardLayout>
      </Route>
      <Route path="/clients">
        <DashboardLayout>
          <ClientsPage />
        </DashboardLayout>
      </Route>
      <Route path="/suppliers">
        <DashboardLayout>
          <SuppliersPage />
        </DashboardLayout>
      </Route>
      <Route path="/finance">
        <DashboardLayout>
          <FinancePage />
        </DashboardLayout>
      </Route>
      <Route path="/reports">
        <DashboardLayout>
          <ReportsPage />
        </DashboardLayout>
      </Route>
      <Route path="/accounts">
        <DashboardLayout>
          <AccountsPage />
        </DashboardLayout>
      </Route>
      <Route path="/history">
        <DashboardLayout>
          <HistoryPage />
        </DashboardLayout>
      </Route>
      <Route path="/settings">
        <DashboardLayout>
          <SettingsPage />
        </DashboardLayout>
      </Route>
      <Route path="/support">
        <DashboardLayout>
          <SupportPage />
        </DashboardLayout>
      </Route>
      <Route path="/profile">
        <DashboardLayout>
          <ProfilePage />
        </DashboardLayout>
      </Route>
      <Route>
        <DashboardLayout>
          <NotFound />
        </DashboardLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <UsageProvider>
            <ThemeProvider defaultTheme="dark" storageKey="app-theme">
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
            </ThemeProvider>
          </UsageProvider>
        </AuthProvider>
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
