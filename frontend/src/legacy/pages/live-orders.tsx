import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteBridgeOrder, patchBridgeOrderStatus, USER_BACKEND_URL } from "@/lib/bridge";
import { toast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

const statuses = ["Preparing", "Ready", "Delivered"] as const;

type LiveOrderItem = {
  name: string;
  variant: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type LiveOrder = {
  _id: string;
  customerName: string;
  phone: string;
  address: string;
  paymentMethod?: "Cash" | "GPay" | "PhonePe" | string;
  items: LiveOrderItem[];
  total: number;
  deliveryCharge?: number;
  status: (typeof statuses)[number];
  createdAt: string;
};

function getPaymentMethodLabel(paymentMethod?: string) {
  return paymentMethod && paymentMethod.trim() ? paymentMethod : "Cash";
}

function formatINR(value: number) {
  return `Rs ${value}`;
}

function nextStatus(currentStatus: LiveOrder["status"]) {
  const index = statuses.indexOf(currentStatus);
  if (index < 0 || index === statuses.length - 1) return currentStatus;
  return statuses[index + 1];
}

export default function LiveOrders() {
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      try {
        const response = await fetch(`${USER_BACKEND_URL}/api/orders`);
        const data = await response.json();
        setOrders(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
    const pollId = window.setInterval(loadOrders, 8000);

    return () => {
      window.clearInterval(pollId);
    };
  }, []);

  const activeCount = useMemo(() => orders.filter((order) => order.status !== "Delivered").length, [orders]);

  async function advanceStatus(order: LiveOrder) {
    const next = nextStatus(order.status);
    if (next === order.status) return;

      try {
        const updated = await patchBridgeOrderStatus(order._id, next);
        setOrders((prev) => prev.map((row) => (row._id === order._id ? updated : row)));
      } catch (error) {
        toast({
          title: "Failed to update order",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      }
  }

  async function deleteOrder(order: LiveOrder) {
    const ok = window.confirm(`Delete order #${order._id.slice(-6)}? This cannot be undone.`);
    if (!ok) return;

    try {
      await deleteBridgeOrder(order._id);
      setOrders((prev) => prev.filter((row) => row._id !== order._id));
    } catch (error) {
      toast({
        title: "Failed to delete order",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Live Orders (User App Bridge)</h1>
        <Badge variant="outline">{activeCount} active</Badge>
      </div>

      {loading && <p>Loading orders...</p>}
      {!loading && orders.length === 0 && (
        <Card className="p-6">
          <p className="text-muted-foreground">No live orders yet from user app.</p>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {orders.map((order) => (
          <Card key={order._id} className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Order #{order._id.slice(-6)}</h3>
              <Badge variant="secondary">{order.status}</Badge>
            </div>

            <div className="text-sm space-y-1">
              <p><strong>Name:</strong> {order.customerName}</p>
              <p><strong>Phone:</strong> {order.phone}</p>
              <p><strong>Address:</strong> {order.address}</p>
              <p><strong>Payment:</strong> {getPaymentMethodLabel(order.paymentMethod)}</p>
              <p><strong>Time:</strong> {new Date(order.createdAt).toLocaleString()}</p>
            </div>

            <div className="rounded-md border p-3 space-y-2">
              {order.items.map((item, index) => (
                <div key={`${item.name}-${index}`} className="text-sm flex items-center justify-between">
                  <span>{item.name} ({item.variant}) x {item.quantity}</span>
                  <span>{formatINR(item.totalPrice)}</span>
                </div>
              ))}
            </div>

            <div className="text-sm space-y-1">
              <p>Delivery: {formatINR(order.deliveryCharge || 0)}</p>
              <p className="font-semibold">Total: {formatINR(order.total)}</p>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => advanceStatus(order)} disabled={order.status === "Delivered"}>
                {order.status === "Delivered" ? "Completed" : `Mark as ${nextStatus(order.status)}`}
              </Button>
              <Button variant="destructive" onClick={() => deleteOrder(order)}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
