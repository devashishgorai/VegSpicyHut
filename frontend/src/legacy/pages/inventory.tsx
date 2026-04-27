import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  BridgeInventoryItem,
  createInventoryItem,
  deleteInventoryItem,
  getStoredInventory,
  saveStoredInventory,
  subscribeInventoryChanges,
  updateInventoryItem,
} from "@/lib/bridge";

export default function Inventory() {
  const [items, setItems] = useState(getStoredInventory);
  const [draft, setDraft] = useState({
    name: "",
    category: "",
    unit: "kg",
    stock: "0",
    minStock: "0",
    cost: "0",
  });
  const [editId, setEditId] = useState<number | null>(null);

  useEffect(() => {
    return subscribeInventoryChanges((nextItems) => setItems(nextItems));
  }, []);

  function adjustStock(itemId: number, delta: number) {
    const updated = items.map((item) =>
      item.id === itemId ? { ...item, stock: Math.max(0, item.stock + delta) } : item,
    );
    setItems(updated);
    saveStoredInventory(updated);
  }

  function beginEdit(item: BridgeInventoryItem) {
    setEditId(item.id);
    setDraft({
      name: item.name,
      category: item.category,
      unit: item.unit,
      stock: String(item.stock),
      minStock: String(item.minStock),
      cost: String(item.cost),
    });
  }

  function resetDraft() {
    setDraft({
      name: "",
      category: "",
      unit: "kg",
      stock: "0",
      minStock: "0",
      cost: "0",
    });
    setEditId(null);
  }

  function submitItem() {
    if (!draft.name.trim() || !draft.category.trim() || !draft.unit.trim()) return;

    const payload = {
      name: draft.name.trim(),
      category: draft.category.trim(),
      unit: draft.unit.trim(),
      stock: Math.max(0, Number(draft.stock) || 0),
      minStock: Math.max(0, Number(draft.minStock) || 0),
      cost: Math.max(0, Number(draft.cost) || 0),
    };

    if (editId) {
      updateInventoryItem(editId, payload);
    } else {
      createInventoryItem(payload);
    }

    setItems(getStoredInventory());
    resetDraft();
  }

  function removeItem(item: BridgeInventoryItem) {
    const ok = window.confirm(`Delete inventory item \"${item.name}\"?`);
    if (!ok) return;
    deleteInventoryItem(item.id);
    setItems(getStoredInventory());
    if (editId === item.id) resetDraft();
  }

  const totalValue = useMemo(
    () => items.reduce((sum, item) => sum + item.stock * item.cost, 0),
    [items],
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Inventory</h1>
          <p className="text-muted-foreground">Realtime inventory with add, update, and delete support.</p>
        </div>
        <Badge variant="outline">Total Value: Rs {totalValue}</Badge>
      </div>

      <Card className="p-4 space-y-3 border-blue-200 bg-blue-50/40">
        <h2 className="font-semibold">{editId ? "Update Item" : "Add New Item"}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input placeholder="Item Name" value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} />
          <Input placeholder="Category" value={draft.category} onChange={(e) => setDraft((prev) => ({ ...prev, category: e.target.value }))} />
          <Input placeholder="Unit (kg, ltr, pcs)" value={draft.unit} onChange={(e) => setDraft((prev) => ({ ...prev, unit: e.target.value }))} />
          <Input placeholder="Stock" type="number" value={draft.stock} onChange={(e) => setDraft((prev) => ({ ...prev, stock: e.target.value }))} />
          <Input placeholder="Min Stock" type="number" value={draft.minStock} onChange={(e) => setDraft((prev) => ({ ...prev, minStock: e.target.value }))} />
          <Input placeholder="Unit Cost" type="number" value={draft.cost} onChange={(e) => setDraft((prev) => ({ ...prev, cost: e.target.value }))} />
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={submitItem}>
            <Plus className="w-4 h-4 mr-2" /> {editId ? "Update Item" : "Add Item"}
          </Button>
          {editId && (
            <Button type="button" variant="outline" onClick={resetDraft}>
              Cancel Edit
            </Button>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Min</TableHead>
              <TableHead>Unit Cost</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Adjust</TableHead>
              <TableHead className="text-right">Manage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const low = item.stock <= item.minStock;
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-semibold">{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.stock} {item.unit}</TableCell>
                  <TableCell>{item.minStock} {item.unit}</TableCell>
                  <TableCell>Rs {item.cost}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={low ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}>
                      {low ? "Low" : "Ok"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => adjustStock(item.id, -1)}>-1</Button>
                      <Button variant="outline" size="sm" onClick={() => adjustStock(item.id, 1)}>+1</Button>
                      <Button variant="outline" size="sm" onClick={() => adjustStock(item.id, 5)}>+5</Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => beginEdit(item)}>
                        <Pencil className="w-4 h-4 mr-1" /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => removeItem(item)}>
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
