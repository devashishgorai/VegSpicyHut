import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ChefHat, CheckCircle2, Clock } from "lucide-react";
import {
  BridgeOrder,
  fetchBridgeOrders,
  nextBridgeStatus,
  patchBridgeOrderStatus,
  subscribeBridgeOrders,
} from "@/lib/bridge";

function getPaymentMethodLabel(paymentMethod?: string) {
  return paymentMethod && paymentMethod.trim() ? paymentMethod : "Cash";
}

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<BridgeOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchBridgeOrders();
        setOrders(data);
      } finally {
        setIsLoading(false);
      }
    }

    load();

    return subscribeBridgeOrders(
      (order) => setOrders((prev) => [order, ...prev]),
      (updated) => setOrders((prev) => prev.map((order) => (order._id === updated._id ? updated : order))),
    );
  }, []);

  const pendingOrders = useMemo(
    () => orders.filter((order) => order.status !== "Delivered"),
    [orders],
  );

  async function handleMarkNext(order: BridgeOrder) {
    if (order.status === "Delivered") return;
    try {
      const updated = await patchBridgeOrderStatus(order._id, nextBridgeStatus(order.status));
      setOrders((prev) => prev.map((row) => (row._id === updated._id ? updated : row)));
    } catch (error) {
      toast({
        title: "Failed to update order",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  if (isLoading) {
    return <div className="p-8">Loading kitchen view...</div>;
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <ChefHat className="text-orange-600 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Kitchen Display System</h1>
            <p className="text-muted-foreground text-sm">Live orders mapped to prep stations</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-lg py-1 px-4 border-orange-200 bg-orange-50 text-orange-700">
            {pendingOrders.length} Pending Tickets
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto custom-scrollbar pb-4">
        <div className="flex gap-6 h-full items-start">
          {pendingOrders.map(order => (
            <Card key={order._id} className="w-[350px] shrink-0 flex flex-col h-fit max-h-full border-t-4 border-t-orange-500 shadow-md">
              <CardHeader className="bg-slate-50/50 pb-4 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">#{order._id.slice(-6)}</CardTitle>
                    <p className="text-sm font-medium text-muted-foreground mt-1 uppercase tracking-wider">
                      Kitchen Ticket • {order.status}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="secondary" className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Badge>
                    <Badge variant="outline">{getPaymentMethodLabel(order.paymentMethod)}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-y-auto">
                <ul className="divide-y divide-border">
                  {(Array.isArray(order.items) ? order.items : []).map((item, idx) => (
                    <li key={idx} className="p-4 flex gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="w-8 h-8 rounded bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                        {item.quantity}x
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-lg leading-tight">{item.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">{item.variant}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <div className="p-4 bg-slate-50 border-t mt-auto">
                <Button 
                  className="w-full h-14 text-lg rounded-xl shadow-lg shadow-accent/20 bg-accent hover:bg-accent/90"
                  onClick={() => handleMarkNext(order)}
                  disabled={order.status === "Delivered"}
                >
                  <CheckCircle2 className="w-6 h-6 mr-2" />
                  {order.status === "Preparing" ? "Mark Ready" : order.status === "Ready" ? "Mark Delivered" : "Completed"}
                </Button>
              </div>
            </Card>
          ))}
          
          {pendingOrders.length === 0 && (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/50 pt-20">
              <ChefHat className="w-24 h-24 mb-4 opacity-50" />
              <h2 className="text-2xl font-display font-semibold">Kitchen is clear</h2>
              <p>Waiting for new orders...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
