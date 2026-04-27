import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, OutletProvider } from "@/lib/contexts";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/lib/contexts";
import NotFound from "@/pages/not-found";
import { canAccessRoute, getDefaultRouteForRole } from "@/lib/rbac";
import { useLocation } from "wouter";
import { useEffect } from "react";

// Page Imports
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import POS from "@/pages/pos";
import Orders from "@/pages/orders";
import Kitchen from "@/pages/kitchen";
import MenuManagement from "@/pages/menu";
import Tables from "@/pages/tables";
import Inventory from "@/pages/inventory";
import Reports from "@/pages/reports";
import Customers from "@/pages/customers";
import Settings from "@/pages/settings";
import Staff from "@/pages/staff";
import LiveOrders from "@/pages/live-orders";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, path }: { component: any; path: string }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    if (!canAccessRoute(path, user?.role)) {
      setLocation(getDefaultRouteForRole(user?.role));
    }
  }, [isLoading, isAuthenticated, path, setLocation, user?.role]);

  if (!isAuthenticated) return null;
  if (!canAccessRoute(path, user?.role)) return null;

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Protected Routes wrapped in Layout */}
      <Route path="/"><ProtectedRoute path="/" component={Dashboard} /></Route>
      <Route path="/pos"><ProtectedRoute path="/pos" component={POS} /></Route>
      <Route path="/orders"><ProtectedRoute path="/orders" component={Orders} /></Route>
      <Route path="/kitchen"><ProtectedRoute path="/kitchen" component={Kitchen} /></Route>
      <Route path="/menu"><ProtectedRoute path="/menu" component={MenuManagement} /></Route>
      <Route path="/tables"><ProtectedRoute path="/tables" component={Tables} /></Route>
      <Route path="/inventory"><ProtectedRoute path="/inventory" component={Inventory} /></Route>
      <Route path="/reports"><ProtectedRoute path="/reports" component={Reports} /></Route>
      <Route path="/customers"><ProtectedRoute path="/customers" component={Customers} /></Route>
      <Route path="/live-orders"><ProtectedRoute path="/live-orders" component={LiveOrders} /></Route>
      <Route path="/settings"><ProtectedRoute path="/settings" component={Settings} /></Route>
      <Route path="/staff"><ProtectedRoute path="/staff" component={Staff} /></Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <AuthProvider>
            <OutletProvider>
              <Router />
            </OutletProvider>
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
