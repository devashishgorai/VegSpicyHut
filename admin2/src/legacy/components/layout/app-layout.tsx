import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, ShoppingCart, ChefHat, MenuSquare,
  LayoutGrid, Package, BarChart3, Users, Store, Settings,
  LogOut, UserCircle
} from "lucide-react";
import { useAppOutlet, useAuth } from "@/lib/contexts";
import { useLogout, getGetMeQueryKey } from "@/lib/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { TOKEN_KEY } from "@/lib/constants";
import { NAV_ACCESS } from "@/lib/rbac";

const DEMO_AUTH = process.env.NEXT_PUBLIC_TABIO_DEMO_AUTH === "true";
const DEMO_OWNER_KEY = "cbk_tabio_demo_owner";
const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");

const NAV_ICON_MAP = {
  "/": LayoutDashboard,
  "/pos": ShoppingCart,
  "/orders": Package,
  "/kitchen": ChefHat,
  "/tables": LayoutGrid,
  "/menu": MenuSquare,
  "/inventory": Store,
  "/customers": Users,
  "/reports": BarChart3,
  "/live-orders": ShoppingCart,
  "/staff": UserCircle,
  "/settings": Settings,
} as const;

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { outletId, setOutletId, outlets } = useAppOutlet();
  const logout = useLogout();
  const queryClient = useQueryClient();

  const finalizeLocalLogout = () => {
    localStorage.removeItem(DEMO_OWNER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    queryClient.setQueryData(getGetMeQueryKey(), null);
    queryClient.clear();
    window.dispatchEvent(new Event("cbk-demo-auth-changed"));
    setLocation("/login");
  };

  const handleLogout = () => {
    if (DEMO_AUTH) {
      finalizeLocalLogout();
      return;
    }

    // Sign out locally first so UI always exits reliably even if API is unavailable.
    finalizeLocalLogout();
    logout.mutate(undefined);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <img
            src={`${BASE_PATH}/logo.png`}
            alt="Veg Spicy Hut Logo"
            className="w-12 h-12 object-contain animate-pulse"
          />
          <p className="text-foreground text-sm font-semibold">Loading Veg Spicy Hut Admin...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const allowedNavItems = NAV_ACCESS
    .filter((item) => item.allowedRoles.includes((user?.role as any) || ""))
    .map((item) => ({
      ...item,
      icon: NAV_ICON_MAP[item.href as keyof typeof NAV_ICON_MAP] ?? LayoutDashboard,
    }));

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col shadow-xl z-20 hidden md:flex">
        <div className="p-6 flex items-center gap-3">
          <img
            src={`${BASE_PATH}/logo.png`}
            alt="Veg Spicy Hut Logo"
            className="w-11 h-11 object-contain"
          />
          <span className="font-display font-extrabold text-[1.45rem] tracking-tight text-white">Veg Spicy Hut</span>
        </div>
        
        <nav className="flex-1 px-4 pb-4 space-y-1 overflow-y-auto custom-scrollbar">
          {allowedNavItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                  ${isActive 
                    ? "bg-primary/10 text-primary font-semibold" 
                    : "text-sidebar-foreground/90 hover:bg-sidebar-accent/10 hover:text-white"
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent/20 flex items-center justify-center text-primary font-bold uppercase">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate capitalize">{user?.role}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sidebar-foreground/90 hover:text-white hover:bg-sidebar-accent/10"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={`${BASE_PATH}/logo.png`}
              alt="Veg Spicy Hut Logo"
              className="w-10 h-10 object-contain"
            />
            <h1 className="text-xl font-display font-bold text-foreground truncate">
              {allowedNavItems.find(i => location === i.href || (i.href !== "/" && location.startsWith(i.href)))?.label || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {outlets.length > 0 && (
              <select
                value={String(outletId)}
                onChange={(e) => setOutletId(Number(e.target.value))}
                className="h-9 w-56 rounded-md border border-input bg-background px-3 text-sm"
              >
                {!outlets.some((outlet) => outlet.id === outletId) && (
                  <option value="">Select outlet</option>
                )}
                {outlets.map((outlet) => (
                  <option key={outlet.id} value={String(outlet.id)}>
                    {outlet.name}
                  </option>
                ))}
              </select>
            )}
            <div className="bg-accent/10 text-accent px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
              Live Server
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-white p-6 page-enter custom-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
}
