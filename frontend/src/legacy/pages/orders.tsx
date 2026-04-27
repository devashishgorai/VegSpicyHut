import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  BridgeOrder,
  deleteBridgeOrder,
  fetchBridgeOrders,
  nextBridgeStatus,
  patchBridgeOrderStatus,
  subscribeBridgeOrders,
} from "@/lib/bridge";

function getPaymentMethodLabel(paymentMethod?: string) {
  return paymentMethod && paymentMethod.trim() ? paymentMethod : "Cash";
}

export default function Orders() {
  const [orders, setOrders] = useState<BridgeOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<BridgeOrder | null>(null);

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
      (deleted) => setOrders((prev) => prev.filter((order) => order._id !== deleted._id)),
    );
  }, []);

  const activeCount = useMemo(() => orders.filter((order) => order.status !== "Delivered").length, [orders]);

  if (isLoading) return <div className="p-8">Loading orders...</div>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered":
        return "bg-accent/10 text-accent border-accent/20";
      case "Ready":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      default:
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    }
  };

  async function handleNextStatus(order: BridgeOrder) {
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

  async function handleDeleteOrder(order: BridgeOrder) {
    const ok = window.confirm(`Delete order #${order._id.slice(-6)}? This cannot be undone.`);
    if (!ok) return;
    try {
      await deleteBridgeOrder(order._id);
      setOrders((prev) => prev.filter((row) => row._id !== order._id));
      if (selectedOrder?._id === order._id) {
        setSelectedOrder(null);
      }
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
        <h1 className="text-2xl font-display font-bold">Order History</h1>
        <Badge variant="outline">{activeCount} active</Badge>
      </div>

      <Card className="shadow-sm border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order._id} className="hover:bg-slate-50/50">
                  <TableCell className="font-semibold">#{order._id.slice(-6)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(order.createdAt), "MMM d, h:mm a")}
                  </TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell>{order.phone}</TableCell>
                  <TableCell className="font-bold">Rs {order.total}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getPaymentMethodLabel(order.paymentMethod)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`capitalize ${getStatusColor(order.status)}`}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <Eye className="w-4 h-4 mr-2" /> View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 ml-2"
                      onClick={() => handleNextStatus(order)}
                      disabled={order.status === "Delivered"}
                    >
                      {order.status === "Delivered" ? "Completed" : `Mark ${nextBridgeStatus(order.status)}`}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 ml-2"
                      onClick={() => handleDeleteOrder(order)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No orders found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog
        open={selectedOrder !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedOrder(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedOrder ? `Order #${selectedOrder._id.slice(-6)}` : "Order Details"}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Placed At</p>
                  <p className="font-medium">{format(new Date(selectedOrder.createdAt), "MMM d, yyyy h:mm a")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedOrder.customerName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant="outline" className={`capitalize ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedOrder.phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment</p>
                  <p className="font-medium">{getPaymentMethodLabel(selectedOrder.paymentMethod)}</p>
                </div>
              </div>

              <div className="rounded-md border p-3">
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{selectedOrder.address}</p>
              </div>

              <div className="rounded-md border p-3">
                <p className="text-sm font-semibold mb-2">Items</p>
                <div className="space-y-2 max-h-52 overflow-auto">
                  {(selectedOrder.items || []).map((item, index) => (
                    <div key={`${item.name}-${index}`} className="flex items-center justify-between text-sm">
                      <span>{item.quantity}x {item.name} ({item.variant})</span>
                      <span className="font-medium">Rs {item.totalPrice}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md bg-slate-50 p-3 text-sm space-y-1">
                <div className="flex justify-between"><span>Delivery</span><span>Rs {selectedOrder.deliveryCharge || 0}</span></div>
                <div className="flex justify-between font-semibold text-base pt-1 border-t"><span>Total</span><span>Rs {selectedOrder.total}</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
