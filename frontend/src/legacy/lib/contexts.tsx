import React, { createContext, useContext, useState, useEffect } from "react";
import { getGetMeQueryKey, getGetOutletsQueryKey, useGetMe, useGetOutlets } from "@/lib/api-client-react";
import type { Outlet, User } from "@/lib/api-client-react";
import { useLocation } from "wouter";

const DEMO_AUTH = process.env.NEXT_PUBLIC_TABIO_DEMO_AUTH === "true";
const DEMO_OWNER_KEY = "cbk_tabio_demo_owner";

const demoUser: User = {
  id: 1,
  email: "owner@tabio.com",
  name: "Veg Spicy Hut Owner",
  role: "owner",
  outletId: 1,
};

const demoOutlets: Outlet[] = [
  {
    id: 1,
    name: "Veg Spicy Hut",
    address: "New Town, Kolkata - 700135",
    phone: "+91-84202 52042",
    email: "owner@tabio.com",
    currency: "INR",
    timezone: "Asia/Kolkata",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const [demoAuthenticated, setDemoAuthenticated] = useState(() => localStorage.getItem(DEMO_OWNER_KEY) === "1");
  const { data: user, isLoading, isError, isFetching } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !DEMO_AUTH,
    },
  });

  useEffect(() => {
    if (!DEMO_AUTH) return;
    const sync = () => setDemoAuthenticated(localStorage.getItem(DEMO_OWNER_KEY) === "1");
    window.addEventListener("storage", sync);
    window.addEventListener("cbk-demo-auth-changed", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("cbk-demo-auth-changed", sync as EventListener);
    };
  }, []);

  useEffect(() => {
    if (DEMO_AUTH) {
      if (!demoAuthenticated) {
        const currentPath = window.location.pathname;
        if (!currentPath.endsWith("/login")) {
          setLocation("/login");
        }
      }
      return;
    }
    // Only redirect when we've confirmed there's no session (not loading/fetching)
    if (!isLoading && !isFetching && isError) {
      const currentPath = window.location.pathname;
      if (!currentPath.endsWith("/login")) {
        setLocation("/login");
      }
    }
  }, [isLoading, isFetching, isError, setLocation]);

  return (
    <AuthContext.Provider
      value={{
        user: DEMO_AUTH ? (demoAuthenticated ? demoUser : null) : user || null,
        isLoading: DEMO_AUTH ? false : isLoading || isFetching,
        isAuthenticated: DEMO_AUTH ? demoAuthenticated : !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// --- Outlet Context ---
interface OutletContextType {
  outletId: number;
  setOutletId: (id: number) => void;
  outlets: Outlet[];
  isOutletsLoading: boolean;
}

const OutletContext = createContext<OutletContextType>({
  outletId: 1, // Defaulting to 1 for demo purposes
  setOutletId: () => {},
  outlets: [],
  isOutletsLoading: false,
});

export function OutletProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const { data: outlets = [], isLoading: isOutletsLoading } = useGetOutlets({
    query: {
      enabled: isAuthenticated && !DEMO_AUTH,
      queryKey: getGetOutletsQueryKey(),
    },
  });
  const [outletId, setOutletId] = useState(1);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (DEMO_AUTH) {
      setOutletId(1);
      localStorage.setItem("tabio_outlet_id", "1");
      return;
    }

    if (!outlets.length) return;

    const persistedOutletId = Number(localStorage.getItem("tabio_outlet_id"));
    const outletIds = outlets.map((outlet) => outlet.id);
    const userOutletId = user?.outletId ?? null;

    const nextOutletId = Number.isFinite(persistedOutletId) && outletIds.includes(persistedOutletId)
      ? persistedOutletId
      : userOutletId && outletIds.includes(userOutletId)
        ? userOutletId
        : outlets[0].id;

    setOutletId(nextOutletId);
  }, [isAuthenticated, outlets, user?.outletId]);

  const handleSetOutletId = (id: number) => {
    setOutletId(id);
    localStorage.setItem("tabio_outlet_id", String(id));
  };
  
  const activeOutlets = DEMO_AUTH ? demoOutlets : outlets;

  return (
    <OutletContext.Provider value={{ outletId, setOutletId: handleSetOutletId, outlets: activeOutlets, isOutletsLoading: DEMO_AUTH ? false : isOutletsLoading }}>
      {children}
    </OutletContext.Provider>
  );
}

export const useAppOutlet = () => useContext(OutletContext);
