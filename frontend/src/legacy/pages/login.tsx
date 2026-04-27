import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin, getGetMeQueryKey } from "@/lib/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { TOKEN_KEY } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { getDefaultRouteForRole } from "@/lib/rbac";

const DEMO_AUTH = process.env.NEXT_PUBLIC_TABIO_DEMO_AUTH === "true";
const DEMO_OWNER_KEY = "cbk_tabio_demo_owner";
const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");

const featuredMenuImages = [
  { src: "/VegSpicyMenu/ShahiThali.png", label: "Shahi Thali", span: "md:col-span-2 md:row-span-2" },
  { src: "/VegSpicyMenu/PaneerMakhani.jpg", label: "Paneer Makhani", span: "md:col-span-1 md:row-span-1" },
  { src: "/VegSpicyMenu/MasalaChole.jpg", label: "Masala Chole", span: "md:col-span-1 md:row-span-1" },
  { src: "/VegSpicyMenu/ClassicThali.png", label: "Classic Thali", span: "md:col-span-1 md:row-span-1" },
  { src: "/VegSpicyMenu/AlooPrantha.jpg", label: "Aloo Prantha", span: "md:col-span-1 md:row-span-1" },
  { src: "/VegSpicyMenu/Lassi.webp", label: "Lassi", span: "md:col-span-1 md:row-span-1" },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const loginMutation = useLogin();
  
  const [email, setEmail] = useState("owner@tabio.com");
  const [password, setPassword] = useState("demo1234");
  const [demoError, setDemoError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (DEMO_AUTH) {
      if (email === "owner@tabio.com" && password === "demo1234") {
        setDemoError(false);
        localStorage.setItem(DEMO_OWNER_KEY, "1");
        window.dispatchEvent(new Event("cbk-demo-auth-changed"));
        setLocation("/pos");
        return;
      }
      setDemoError(true);
      return;
    }

    loginMutation.mutate({ data: { email, password } }, {
      onSuccess: (data) => {
        // Persist token so customFetch sends it on every request
        if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
        // Set user data directly in the cache so AuthProvider sees it immediately
        queryClient.setQueryData(getGetMeQueryKey(), data.user);
        setLocation(getDefaultRouteForRole((data.user as { role?: string | null })?.role ?? null));
      }
    });
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_rgba(229,246,240,0.95)_38%,_rgba(214,234,230,1))]">
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl items-center gap-10 px-4 py-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] lg:px-8">
        <div className="flex items-center justify-center lg:justify-start">
          <Card className="w-full max-w-md p-8 shadow-2xl bg-card/95 backdrop-blur-xl border-blue-200/70">
            <div className="flex flex-col items-center mb-8">
              <img
                src={`${BASE_PATH}/logo.png`}
                alt="Veg Spicy Hut Logo"
                className="w-16 h-16 rounded-2xl shadow-lg object-contain bg-white p-1.5 border border-blue-200 mb-4"
              />
              <h1 className="text-3xl font-display font-extrabold text-foreground text-center">Veg Spicy Hut Admin</h1>
              <p className="text-foreground/85 mt-2 text-center font-medium">Sign in to manage POS, KOT, inventory, reports, and more.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="bg-white/90 focus:bg-white transition-colors py-6 text-lg text-slate-900 font-semibold"
                  placeholder="owner@tabio.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="bg-white/90 focus:bg-white transition-colors py-6 text-lg text-slate-900 font-semibold"
                  placeholder="••••••••"
                  required
                />
              </div>
              
              {(loginMutation.isError || demoError) && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  Invalid credentials. Try owner@tabio.com / demo1234
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full py-6 text-lg rounded-xl bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Sign In"}
              </Button>
            </form>

            <div className="mt-8 text-center text-sm text-muted-foreground">
              <p>Demo Owner Credentials:</p>
              <p className="font-mono mt-1 bg-muted inline-block px-3 py-1 rounded-md">owner@tabio.com / demo1234</p>
            </div>
          </Card>
        </div>

        <div className="hidden lg:block">
          <div className="mb-5 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-primary/80">Veg Spicy Menu</p>
            <h2 className="mt-3 text-5xl font-display font-black leading-tight text-foreground">
              Menu imagery aligned with the brand, not floating at random.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              The assets from <span className="font-semibold text-foreground">public/VegSpicyMenu</span> are now arranged into a clean mosaic so the login page feels intentional and polished.
            </p>
          </div>

          <div className="grid grid-cols-2 auto-rows-[150px] gap-4 rounded-[2rem] border border-white/70 bg-white/70 p-4 shadow-[0_30px_100px_rgba(15,23,42,0.12)] backdrop-blur-md md:auto-rows-[175px]">
            {featuredMenuImages.map((item) => (
              <figure
                key={item.src}
                className={`group relative overflow-hidden rounded-3xl border border-white/80 bg-slate-100 shadow-lg ${item.span}`}
              >
                <img
                  src={item.src}
                  alt={item.label}
                  className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-105"
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent px-4 pb-4 pt-10 text-sm font-semibold text-white">
                  {item.label}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
