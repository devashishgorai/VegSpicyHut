import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BridgeCustomer, deleteBridgeCustomer, fetchBridgeCustomers, subscribeBridgeCustomers, upsertBridgeCustomer } from "@/lib/bridge";

export default function Customers() {
  const [customers, setCustomers] = useState<BridgeCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [note, setNote] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await fetchBridgeCustomers();
        if (active) {
          setCustomers(data);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    load();

    return subscribeBridgeCustomers((nextCustomers) => {
      if (active) {
        setCustomers(nextCustomers);
      }
    });
  }, []);

  const summary = useMemo(() => {
    const wallet = customers.reduce((sum, customer) => sum + Math.max(customer.balance, 0), 0);
    const due = customers.reduce((sum, customer) => sum + Math.max(Math.abs(customer.balance), 0) * (customer.balance < 0 ? 1 : 0), 0);
    return { wallet, due };
  }, [customers]);

  async function handleSaveAdvance() {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await upsertBridgeCustomer({
        name,
        phone,
        address,
        openingBalance: Number(openingBalance) || 0,
        note: note.trim() || "Monthly advance",
      });
      setCustomers(await fetchBridgeCustomers());
      setName("");
      setPhone("");
      setAddress("");
      setOpeningBalance("");
      setNote("");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteCustomer(customer: BridgeCustomer) {
    const confirmed = window.confirm(`Delete customer ${customer.name}? This will remove their balance record.`);
    if (!confirmed) return;

    setDeletingId(customer._id);
    try {
      await deleteBridgeCustomer(customer._id);
      setCustomers(await fetchBridgeCustomers());
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) return <div className="p-8">Loading CRM...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold">Customer Balances</h1>
          <p className="text-muted-foreground">Track prepaid balance, bill deductions, and dues for regular customers.</p>
        </div>
        <div className="flex gap-2 text-sm">
          <Badge variant="secondary" className="px-3 py-1">Wallet Rs {summary.wallet.toFixed(2)}</Badge>
          <Badge variant="secondary" className="px-3 py-1">Due Rs {summary.due.toFixed(2)}</Badge>
        </div>
      </div>

      <Card className="shadow-sm border-border p-4 space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Customer name" />
          <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone" />
          <Input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Address / area" />
          <Input value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} placeholder="Advance amount" />
          <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note" />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSaveAdvance} disabled={isSaving || !name.trim()}>{isSaving ? "Saving..." : "Save / Add Advance"}</Button>
        </div>
      </Card>

      <Card className="shadow-sm border-border overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Lifetime Spend</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Last Visit</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer._id}>
                <TableCell className="font-semibold">{customer.name}</TableCell>
                <TableCell>{customer.phone || "-"}</TableCell>
                <TableCell>{customer.orderCount}</TableCell>
                <TableCell className="font-bold text-primary">Rs {customer.lifetimeSpend.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={customer.balance >= 0 ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-rose-100 text-rose-800 border-rose-200"}>
                    {customer.balance >= 0 ? `Rs ${customer.balance.toFixed(2)}` : `Due Rs ${Math.abs(customer.balance).toFixed(2)}`}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium text-muted-foreground">Rs {customer.due.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 max-w-[280px] truncate">
                    {customer.address || "-"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {customer.lastVisit ? format(new Date(customer.lastVisit), "MMM d, yyyy") : "Never"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteCustomer(customer)}
                    disabled={deletingId === customer._id}
                  >
                    {deletingId === customer._id ? "Deleting..." : "Delete"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                  No customers yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
