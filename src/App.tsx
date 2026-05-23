import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppShell } from "@/components/app-shell";
import { DashboardLayout } from "@/components/dashboard-layout";
import { AuthProvider } from "@/hooks/use-auth";
import { AuthLoadingBoundary } from "@/components/auth-loading-boundary";
import { RequireAuth } from "@/components/require-auth";
import { ToolShell } from "@/components/tool-shell";
import { ThemeProvider } from "@/components/theme-provider";
import { AppErrorBoundary } from "@/components/app-error-boundary";

const LandingPage = lazy(() => import("@/pages/landing").then((m) => ({ default: m.LandingPage })));
const AuthPage = lazy(() => import("@/pages/auth").then((m) => ({ default: m.AuthPage })));
const CalculatorPage = lazy(() => import("@/pages/calculator").then((m) => ({ default: m.CalculatorPage })));
const SettingsPage = lazy(() => import("@/pages/settings").then((m) => ({ default: m.SettingsPage })));
const SupportPage = lazy(() => import("@/pages/support").then((m) => ({ default: m.SupportPage })));
const ProfilePage = lazy(() => import("@/pages/profile").then((m) => ({ default: m.ProfilePage })));
const ClientsPage = lazy(() => import("@/pages/clients").then((m) => ({ default: m.ClientsPage })));
const SuppliersPage = lazy(() => import("@/pages/suppliers").then((m) => ({ default: m.SuppliersPage })));
const OrdersPage = lazy(() => import("@/pages/orders").then((m) => ({ default: m.OrdersPage })));
const FinancePage = lazy(() => import("@/pages/finance").then((m) => ({ default: m.FinancePage })));
const AccountsPage = lazy(() => import("@/pages/accounts").then((m) => ({ default: m.AccountsPage })));
const ProductsPage = lazy(() => import("@/pages/products").then((m) => ({ default: m.ProductsPage })));
const DashboardPage = lazy(() => import("@/pages/dashboard").then((m) => ({ default: m.DashboardPage })));
const ServicesPage = lazy(() => import("@/pages/services").then((m) => ({ default: m.ServicesPage })));
const HistoryPage = lazy(() => import("@/pages/history").then((m) => ({ default: m.HistoryPage })));
const ReportsPage = lazy(() => import("@/pages/reports").then((m) => ({ default: m.ReportsPage })));
const BgRemoverPage = lazy(() => import("@/pages/bg-remover").then((m) => ({ default: m.BgRemoverPage })));
const MockupsPage = lazy(() => import("@/pages/mockups").then((m) => ({ default: m.MockupsPage })));

function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
      <div className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
    </div>
  );
}

function App() {
  return (
    <TooltipProvider>
      <AuthProvider>
        <ThemeProvider defaultTheme="dark" storageKey="app-theme">
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppErrorBoundary>
              <AuthLoadingBoundary>
                <Suspense fallback={<RouteFallback />}>
                  <Switch>
                    <Route path="/">
                      <AppShell>
                        <LandingPage />
                      </AppShell>
                    </Route>
                    <Route path="/auth">
                      <AuthPage />
                    </Route>
                    <Route path="/app">
                      <ToolShell>
                        <CalculatorPage />
                      </ToolShell>
                    </Route>
                    <Route path="/mockups">
                      <RequireAuth>
                        <DashboardLayout>
                          <MockupsPage />
                        </DashboardLayout>
                      </RequireAuth>
                    </Route>
                    <Route path="/bg-remover">
                      <ToolShell>
                        <BgRemoverPage />
                      </ToolShell>
                    </Route>
                    <Route path="/history">
                      <RequireAuth>
                        <DashboardLayout>
                          <HistoryPage />
                        </DashboardLayout>
                      </RequireAuth>
                    </Route>
                    <Route path="/settings">
                      <RequireAuth>
                        <DashboardLayout>
                          <SettingsPage />
                        </DashboardLayout>
                      </RequireAuth>
                    </Route>
                    <Route path="/profile">
                      <RequireAuth>
                        <DashboardLayout>
                          <ProfilePage />
                        </DashboardLayout>
                      </RequireAuth>
                    </Route>
                    <Route path="/clients">
                      <RequireAuth>
                        <DashboardLayout>
                          <ClientsPage />
                        </DashboardLayout>
                      </RequireAuth>
                    </Route>
                    <Route path="/suppliers">
                      <RequireAuth>
                        <DashboardLayout>
                          <SuppliersPage />
                        </DashboardLayout>
                      </RequireAuth>
                    </Route>
                    <Route path="/orders">
                      <RequireAuth>
                        <DashboardLayout>
                          <OrdersPage />
                        </DashboardLayout>
                      </RequireAuth>
                    </Route>
                    <Route path="/services">
                      <RequireAuth>
                        <DashboardLayout>
                          <ServicesPage />
                        </DashboardLayout>
                      </RequireAuth>
                    </Route>
                    <Route path="/finance">
                      <RequireAuth>
                        <DashboardLayout>
                          <FinancePage />
                        </DashboardLayout>
                      </RequireAuth>
                    </Route>
                    <Route path="/accounts">
                      <RequireAuth>
                        <DashboardLayout>
                          <AccountsPage />
                        </DashboardLayout>
                      </RequireAuth>
                    </Route>
                    <Route path="/reports">
                      <RequireAuth>
                        <DashboardLayout>
                          <ReportsPage />
                        </DashboardLayout>
                      </RequireAuth>
                    </Route>
                    <Route path="/products">
                      <RequireAuth>
                        <DashboardLayout>
                          <ProductsPage />
                        </DashboardLayout>
                      </RequireAuth>
                    </Route>
                    <Route path="/dashboard">
                      <RequireAuth>
                        <DashboardLayout>
                          <DashboardPage />
                        </DashboardLayout>
                      </RequireAuth>
                    </Route>
                    <Route path="/support">
                      <DashboardLayout>
                        <SupportPage />
                      </DashboardLayout>
                    </Route>
                    <Route>
                      <AppShell>
                        <NotFound />
                      </AppShell>
                    </Route>
                  </Switch>
                </Suspense>
              </AuthLoadingBoundary>
            </AppErrorBoundary>
          </WouterRouter>
        </ThemeProvider>
      </AuthProvider>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
