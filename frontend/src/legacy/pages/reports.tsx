import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";
import { BridgeOrder, fetchBridgeOrders, subscribeBridgeOrders } from "@/lib/bridge";

export default function Reports() {
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
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const totalRevenue = useMemo(() => orders.reduce((sum, order) => sum + Number(order.total || 0), 0), [orders]);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, index) => {
      const date = subDays(new Date(), 6 - index);
      return {
        date: format(date, "yyyy-MM-dd"),
        sales: 0,
      };
    });

    const lookup = new Map(last7Days.map((item) => [item.date, item]));
    for (const order of orders) {
      const key = format(new Date(order.createdAt), "yyyy-MM-dd");
      const target = lookup.get(key);
      if (target) target.sales += Number(order.total || 0);
    }

    return last7Days;
  }, [orders]);

  if (isLoading) return <div className="p-8">Loading reports...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Analytics & Reports</h1>
          <p className="text-muted-foreground">Live report from realtime user orders (updates automatically).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
            <h3 className="text-3xl font-display font-bold mt-2">₹{totalRevenue.toLocaleString()}</h3>
            <p className="text-sm mt-2 font-medium text-accent">Realtime aggregate</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
            <h3 className="text-3xl font-display font-bold mt-2">{totalOrders.toLocaleString()}</h3>
            <p className="text-sm mt-2 font-medium text-accent">Includes your latest live orders</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">Avg. Order Value</p>
            <h3 className="text-3xl font-display font-bold mt-2">₹{avgOrderValue.toFixed(2)}</h3>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Revenue Breakdown (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tickFormatter={(v) => format(new Date(v), 'MMM d')} />
                <YAxis />
                <Tooltip cursor={{fill: 'hsl(var(--muted)/0.5)'}} />
                <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
