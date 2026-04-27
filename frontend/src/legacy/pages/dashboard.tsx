import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingBag, TrendingUp, AlertTriangle, Leaf, Users } from "lucide-react";
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from "recharts";
import { format, isSameDay, subDays } from "date-fns";
import {
  BridgeOrder,
  deriveCustomersFromOrders,
  fetchBridgeOrders,
  getStoredInventory,
  subscribeBridgeOrders,
} from "@/lib/bridge";

export default function Dashboard() {
  const [orders, setOrders] = useState<BridgeOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const data = await fetchBridgeOrders();
        if (!active) return;
        setOrders(data);
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    const unsubscribe = subscribeBridgeOrders(
      (newOrder) => {
        setOrders((prev) => [newOrder, ...prev.filter((order) => order._id !== newOrder._id)]);
      },
      (updatedOrder) => {
        setOrders((prev) => prev.map((order) => (order._id === updatedOrder._id ? updatedOrder : order)));
      },
      (deletedOrder) => {
        setOrders((prev) => prev.filter((order) => order._id !== deletedOrder._id));
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const todayOrdersList = orders.filter((order) => isSameDay(new Date(order.createdAt), new Date()));
  const todaySales = todayOrdersList.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const todayOrders = todayOrdersList.length;
  const activeOrders = orders.filter((order) => order.status !== "Delivered").length;
  const totalCustomers = deriveCustomersFromOrders(orders).length;
  const lowStockItems = getStoredInventory().filter((item) => item.stock <= item.minStock).length;

  const weekSales = Array.from({ length: 7 }, (_, index) => {
    const date = subDays(new Date(), 6 - index);
    return {
      date: format(date, "yyyy-MM-dd"),
      sales: 0,
    };
  });

  const weekLookup = new Map(weekSales.map((day) => [day.date, day]));
  for (const order of orders) {
    const key = format(new Date(order.createdAt), "yyyy-MM-dd");
    const target = weekLookup.get(key);
    if (target) target.sales += Number(order.total || 0);
  }

  const topItems = useMemo(() => {
    const map = new Map<string, { itemId: string; name: string; quantity: number; revenue: number }>();

    for (const order of orders) {
      for (const item of order.items || []) {
        const key = `${item.name}-${item.variant || "regular"}`;
        const existing = map.get(key);
        if (existing) {
          existing.quantity += Number(item.quantity || 0);
          existing.revenue += Number(item.totalPrice || 0);
        } else {
          map.set(key, {
            itemId: key,
            name: item.name,
            quantity: Number(item.quantity || 0),
            revenue: Number(item.totalPrice || 0),
          });
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [orders]);

  const safeDashboard = {
    todaySales,
    todayOrders,
    activeOrders,
    totalCustomers,
    lowStockItems,
    weekSales,
    topItems,
  };

  if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Today's Sales" value={`₹${safeDashboard.todaySales.toLocaleString()}`} icon={DollarSign} />
        <StatCard title="Today's Orders" value={safeDashboard.todayOrders.toString()} icon={ShoppingBag} />
        <StatCard title="Active Orders" value={safeDashboard.activeOrders.toString()} icon={TrendingUp} alert={safeDashboard.activeOrders > 10} />
        <StatCard title="Total Customers" value={safeDashboard.totalCustomers.toString()} icon={Users} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-2 shadow-sm border-slate-100 hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Weekly Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={safeDashboard.weekSales}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tickFormatter={(v) => format(new Date(v), 'EEE')} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`₹${value}`, 'Sales']}
                  />
                  <Area type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: AI / Highlights */}
        <div className="space-y-6">
          {/* Carbon Tracker */}
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-100 border-emerald-200">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold mb-2">
                    <Leaf className="w-5 h-5" />
                    Green Impact
                  </div>
                  <h3 className="text-3xl font-display font-bold text-emerald-900">45kg</h3>
                  <p className="text-sm text-emerald-700 mt-1">CO₂ saved this month by optimized routing & digital bills.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Low Stock Alert */}
          {safeDashboard.lowStockItems > 0 && (
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <h4 className="font-semibold text-destructive">{safeDashboard.lowStockItems} Items Low on Stock</h4>
                  <p className="text-sm text-destructive/80">Check inventory tab immediately.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Selling Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {safeDashboard.topItems.slice(0, 4).map((item, i) => (
                  <div key={item.itemId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center font-bold text-sm text-muted-foreground">
                        #{i + 1}
                      </div>
                      <span className="font-medium text-sm">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">₹{item.revenue}</p>
                      <p className="text-xs text-muted-foreground">{item.quantity} sold</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, alert }: { title: string, value: string, icon: any, trend?: string, alert?: boolean }) {
  return (
    <Card className={`shadow-sm transition-all hover:shadow-md ${alert ? 'border-destructive/50 bg-destructive/5' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <h3 className="text-3xl font-display font-bold text-foreground tracking-tight">{value}</h3>
            {trend && (
              <p className="text-sm font-medium text-accent mt-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> {trend} vs last week
              </p>
            )}
          </div>
          <div className={`p-4 rounded-2xl ${alert ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
