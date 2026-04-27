import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import {
  deleteBridgeMenuItem,
  fetchBridgeMenuGroups,
  getBridgeMenuGroups,
  subscribeBridgeMenu,
  updateBridgeMenuItem,
} from "@/lib/bridge";

export default function MenuManagement() {
  const [menuGroups, setMenuGroups] = useState(getBridgeMenuGroups);
  const [activeGroupId, setActiveGroupId] = useState(menuGroups[0]?.id || "");
  const [search, setSearch] = useState("");
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingPrices, setEditingPrices] = useState("");

  const activeGroup = menuGroups.find((group) => group.id === activeGroupId) || menuGroups[0];

  async function reloadMenu() {
    const refreshed = await fetchBridgeMenuGroups();
    setMenuGroups(refreshed);
    if (!refreshed.some((group) => group.id === activeGroupId)) {
      setActiveGroupId(refreshed[0]?.id || "");
    }
  }

  useEffect(() => {
    void reloadMenu();
    return subscribeBridgeMenu(() => {
      void reloadMenu();
    });
  }, []);

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return activeGroup?.items || [];
    return (activeGroup?.items || []).filter((item) => item.name.toLowerCase().includes(needle));
  }, [activeGroup?.items, search]);

  function formatPrices(prices: Record<string, number>) {
    const entries = Object.entries(prices || {}).filter(([, value]) => Number.isFinite(Number(value)));
    if (entries.length === 0) return "Rs 0";
    return entries.map(([variant, value]) => `${variant}: Rs ${Number(value)}`).join(" | ");
  }

  function parsePriceText(text: string) {
    const parts = text
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    const nextPrices: Record<string, number> = {};
    for (const part of parts) {
      const [variantRaw, amountRaw] = part.split(":").map((s) => s.trim());
      if (!variantRaw || !amountRaw) return null;
      const cleaned = amountRaw.replace(/rs\.?/gi, "").replace(/\/-/g, "").replace(/[^0-9.\-]/g, "").trim();
      const amount = Number(cleaned);
      if (!Number.isFinite(amount) || amount < 0) return null;
      nextPrices[variantRaw] = amount;
    }

    return Object.keys(nextPrices).length > 0 ? nextPrices : null;
  }

  function startEdit(item: { id: number; name: string; prices: Record<string, number> }) {
    setEditingItemId(item.id);
    setEditingName(item.name);
    const priceText = Object.entries(item.prices || {})
      .map(([variant, amount]) => `${variant}:${amount}`)
      .join(", ");
    setEditingPrices(priceText);
  }

  async function saveEdit() {
    if (!editingItemId) return;
    if (!editingName.trim()) return;

    const parsed = parsePriceText(editingPrices);
    if (!parsed) {
      window.alert("Use format like Full:200, Half:110 or Regular:90. You can also write Rs 200/-.");
      return;
    }

    try {
      await updateBridgeMenuItem(editingItemId, {
        name: editingName.trim(),
        prices: parsed,
      });

      setEditingItemId(null);
      setEditingName("");
      setEditingPrices("");
      await reloadMenu();
      window.alert("Menu item saved.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save menu item";
      window.alert(message);
    }
  }

  async function removeItem(itemId: number, itemName: string) {
    const ok = window.confirm(`Delete menu item "${itemName}"?`);
    if (!ok) return;
    try {
      await deleteBridgeMenuItem(itemId);
      await reloadMenu();
      window.alert("Menu item deleted.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete menu item";
      window.alert(message);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-display font-bold">Menu Items</h1>
        <p className="text-sm text-muted-foreground">Only food items with prices. Update or delete any item.</p>
      </div>

      <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search food item" />

      <div className="flex flex-wrap gap-2">
        {menuGroups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => setActiveGroupId(group.id)}
            className={
              activeGroupId === group.id
                ? "px-4 py-2 rounded-full bg-primary text-primary-foreground"
                : "px-4 py-2 rounded-full bg-muted text-foreground"
            }
          >
            {group.title}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.map((item) => (
          <Card key={item.id} className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-lg leading-tight">{item.name}</h3>
              <Badge variant="outline">{activeGroup?.title || "Menu"}</Badge>
            </div>

            {editingItemId === item.id ? (
              <div className="space-y-2">
                <Input value={editingName} onChange={(event) => setEditingName(event.target.value)} placeholder="Item name" />
                <Input
                  value={editingPrices}
                  onChange={(event) => setEditingPrices(event.target.value)}
                  placeholder="Full:200, Half:110"
                />
                <p className="text-xs text-muted-foreground">Format: Variant:Price, Variant:Price</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEdit}>Save</Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingItemId(null);
                      setEditingName("");
                      setEditingPrices("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="font-medium text-primary">{formatPrices(item.prices)}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => startEdit(item)}>Update</Button>
                  <Button size="sm" variant="destructive" onClick={() => removeItem(item.id, item.name)}>
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
                </div>
              </>
            )}
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <Card className="p-6 text-center text-muted-foreground">No matching food items found.</Card>
      )}
    </div>
  );
}
