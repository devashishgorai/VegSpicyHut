import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, Trash2 } from "lucide-react";
import {
  createBridgeMenuItem,
  deleteBridgeMenuItem,
  fetchBridgeMenuGroups,
  getBridgeMenuGroups,
  subscribeBridgeMenu,
  updateBridgeMenuItem,
} from "@/lib/bridge";

type MenuItemLite = {
  id: number;
  name: string;
  prices: Record<string, number>;
};

type MenuGroupLite = {
  id: string;
  title: string;
  items: MenuItemLite[];
};

function formatPosterPrice(value: number | null) {
  if (!Number.isFinite(Number(value))) return "---";
  return `${Number(value)}/-`;
}

function pickVariantPrice(prices: Record<string, number>, variantMatchers: string[], fallbackIndex: number) {
  const entries = Object.entries(prices || {}).filter(([, value]) => Number.isFinite(Number(value)));
  if (!entries.length) return null;

  const exact = entries.find(([variant]) => {
    const lower = variant.toLowerCase();
    return variantMatchers.some((token) => lower.includes(token));
  });
  if (exact) return Number(exact[1]);

  if (entries[fallbackIndex]) return Number(entries[fallbackIndex][1]);
  return null;
}

function getSectionTheme(title: string) {
  const key = title.toLowerCase();
  if (key.includes("daily") || key.includes("main course")) return { r: 245, g: 158, b: 11, textR: 255, textG: 247, textB: 214 };
  if (key.includes("rice")) return { r: 214, g: 31, b: 116, textR: 255, textG: 233, textB: 246 };
  if (key.includes("roti") || key.includes("prantha") || key.includes("parantha")) return { r: 230, g: 0, b: 255, textR: 255, textG: 241, textB: 255 };
  if (key.includes("dessert") || key.includes("sweet")) return { r: 201, g: 0, b: 0, textR: 255, textG: 243, textB: 243 };
  if (key.includes("raita") || key.includes("curd")) return { r: 255, g: 12, b: 139, textR: 255, textG: 241, textB: 248 };
  if (key.includes("salad") || key.includes("papad")) return { r: 0, g: 107, b: 0, textR: 238, textG: 252, textB: 232 };
  return { r: 31, g: 79, b: 219, textR: 238, textG: 243, textB: 255 };
}

function getPrintableSectionTitle(title: string) {
  const key = title.toLowerCase();
  if (key.includes("combo")) return "Pocket Friendly Combo";
  return title;
}

export default function MenuManagement() {
  const [menuGroups, setMenuGroups] = useState<MenuGroupLite[]>(getBridgeMenuGroups);
  const [activeGroupId, setActiveGroupId] = useState(menuGroups[0]?.id || "");
  const [search, setSearch] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingPrices, setEditingPrices] = useState("");
  const [newItemGroupId, setNewItemGroupId] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrices, setNewItemPrices] = useState("Regular:100");

  const activeGroup = menuGroups.find((group) => group.id === activeGroupId) || menuGroups[0];

  async function reloadMenu() {
    const refreshed = await fetchBridgeMenuGroups();
    setMenuGroups(refreshed);

    const validItemIds = new Set(refreshed.flatMap((group) => group.items.map((item) => item.id)));
    setSelectedItemIds((prev) => {
      const next = new Set<number>();
      prev.forEach((id) => {
        if (validItemIds.has(id)) next.add(id);
      });
      return next;
    });

    if (!refreshed.some((group) => group.id === activeGroupId)) {
      setActiveGroupId(refreshed[0]?.id || "");
    }
    if (!refreshed.some((group) => group.id === newItemGroupId)) {
      setNewItemGroupId(refreshed[0]?.id || "");
    }
  }

  useEffect(() => {
    const boot = window.setTimeout(() => {
      void reloadMenu();
    }, 0);
    const unsubscribe = subscribeBridgeMenu(() => {
      void reloadMenu();
    });
    return () => {
      window.clearTimeout(boot);
      unsubscribe();
    };
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

  function getSelectedGroups() {
    return menuGroups
      .map((group) => ({
        id: group.id,
        title: group.title,
        items: group.items
          .filter((item) => selectedItemIds.has(item.id))
          .map((item) => ({ id: item.id, name: item.name, prices: item.prices })),
      }))
      .filter((group) => group.items.length > 0);
  }

  async function generateSelectedMenuPdf() {
    const selectedGroups = getSelectedGroups();
    if (!selectedGroups.length) {
      window.alert("Please select menu items first, then print.");
      return;
    }

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = 210;
    const margin = 4;
    const colGap = 2;
    const colW = (pageW - margin * 2 - colGap) / 2;
    const leftX = margin;
    const rightX = margin + colW + colGap;
    const sectionBottomLimit = 232;

    function drawMainHeader() {
      doc.setFillColor(143, 0, 71);
      doc.rect(0, 0, pageW, 19, "F");
      doc.setDrawColor(250, 204, 21);
      doc.setLineWidth(0.4);
      doc.line(0, 19, pageW, 19);

      doc.setFont("times", "bold");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text("Veg Spicy Hut", pageW / 2, 12, { align: "center" });

      doc.setFontSize(8);
      doc.text("Selected Today Menu", pageW / 2, 17, { align: "center" });

      return 22;
    }

    function estimateRowHeight(name: string, nameW: number) {
      doc.setFont("times", "bold");
      doc.setFontSize(8.6);
      const lines = doc.splitTextToSize(name, nameW - 2);
      return Math.max(5.2, lines.length * 3.4 + 1.2);
    }

    function estimateSectionHeight(group: { items: Array<{ name: string }> }) {
      const nameW = colW - 18 - 18;
      return 8.5 + group.items.reduce((sum, item) => sum + estimateRowHeight(item.name, nameW), 0);
    }

    function drawSection(group: { title: string; items: Array<{ name: string; prices: Record<string, number> }> }, x: number, y: number) {
      const priceW = 18;
      const nameW = colW - priceW * 2;
      const theme = getSectionTheme(group.title);

      doc.setFillColor(247, 230, 161);
      doc.rect(x, y, colW, 8.5, "F");
      doc.setDrawColor(17, 17, 17);
      doc.rect(x, y, colW, 8.5);
      doc.line(x + nameW, y, x + nameW, y + 8.5);
      doc.line(x + nameW + priceW, y, x + nameW + priceW, y + 8.5);

      doc.setTextColor(122, 0, 0);
      doc.setFont("times", "bold");
      doc.setFontSize(8.5);
      doc.text(getPrintableSectionTitle(group.title), x + nameW / 2, y + 5.3, { align: "center" });
      doc.setFontSize(7.2);
      doc.text("Full\n[500ml]", x + nameW + priceW / 2, y + 2.7, { align: "center" });
      doc.text("Half\n[250ml]", x + nameW + priceW + priceW / 2, y + 2.7, { align: "center" });

      let cursorY = y + 8.5;
      group.items.forEach((item) => {
        const fullPrice = pickVariantPrice(item.prices, ["full", "regular", "large"], 0);
        const halfPrice = pickVariantPrice(item.prices, ["half", "small"], 1);
        const rowH = estimateRowHeight(item.name, nameW);

        doc.setFillColor(theme.r, theme.g, theme.b);
        doc.rect(x, cursorY, colW, rowH, "F");
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.1);
        doc.line(x, cursorY + rowH, x + colW, cursorY + rowH);
        doc.setDrawColor(17, 17, 17);
        doc.setLineWidth(0.2);
        doc.line(x + nameW, cursorY, x + nameW, cursorY + rowH);
        doc.line(x + nameW + priceW, cursorY, x + nameW + priceW, cursorY + rowH);

        doc.setTextColor(theme.textR, theme.textG, theme.textB);
        doc.setFont("times", "bold");
        doc.setFontSize(8.6);
        const nameLines = doc.splitTextToSize(item.name, nameW - 2);
        doc.text(nameLines, x + 1.2, cursorY + 3.6);

        doc.setFontSize(9.6);
        doc.text(formatPosterPrice(fullPrice), x + nameW + priceW - 1, cursorY + 3.9, { align: "right" });
        doc.text(formatPosterPrice(halfPrice), x + nameW + priceW * 2 - 1, cursorY + 3.9, { align: "right" });

        cursorY += rowH;
      });

      doc.setDrawColor(17, 17, 17);
      doc.setLineWidth(0.2);
      doc.rect(x, y, colW, cursorY - y);
      return cursorY + 0.8;
    }

    function drawFooterStrips(startY: number) {
      let y = startY;

      const strips = [
        { title: "Shahi Thali -- 255/-", desc: "( Rice, Dal, Paneer, Sabzi, 4pcs Butter Roti, Mithai, Papad, Onion Salad, Pickle )", color: [112, 48, 160] },
        { title: "Premium Thali -- 210/-", desc: "( Rice, Dal, Paneer, Sabzi, 3pcs Roti, Mithai, Pickle )", color: [214, 35, 131] },
        { title: "Classic Thali -- 160/-", desc: "( Rice, Dal, Sabzi, 3pcs Roti, Mithai, Pickle )", color: [31, 41, 55] },
      ] as const;

      strips.forEach((strip) => {
        doc.setFillColor(strip.color[0], strip.color[1], strip.color[2]);
        doc.rect(0, y, pageW, 15, "F");
        doc.setDrawColor(250, 204, 21);
        doc.setLineWidth(0.5);
        doc.rect(0, y, pageW, 15);

        doc.setFont("times", "bold");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.text(strip.title, pageW / 2, y + 6.6, { align: "center" });
        doc.setFontSize(7.5);
        doc.text(strip.desc, pageW / 2, y + 11.4, { align: "center" });
        y += 15;
      });

      doc.setFillColor(143, 0, 71);
      doc.rect(0, y, pageW, 10, "F");
      doc.setDrawColor(250, 204, 21);
      doc.rect(0, y, pageW, 10);
      doc.setFont("times", "bold");
      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      doc.text("Cold Drinks and Kinley Water also available", pageW / 2, y + 6.8, { align: "center" });
      y += 10;

      doc.setFillColor(143, 0, 71);
      doc.rect(0, y, pageW, 8, "F");
      doc.setDrawColor(250, 204, 21);
      doc.rect(0, y, pageW, 8);
      doc.setFont("times", "bold");
      doc.setFontSize(10);
      doc.text("# 9830604536 , 7044489358", pageW / 2, y + 5.2, { align: "center" });
    }

    let baseY = drawMainHeader();
    let leftY = baseY;
    let rightY = baseY;

    for (const group of selectedGroups) {
      const sectionH = estimateSectionHeight(group);
      const fitsLeft = leftY + sectionH <= sectionBottomLimit;
      const fitsRight = rightY + sectionH <= sectionBottomLimit;

      if (!fitsLeft && !fitsRight) {
        doc.addPage("a4", "portrait");
        baseY = drawMainHeader();
        leftY = baseY;
        rightY = baseY;
      }

      const drawLeft = (leftY <= rightY && leftY + sectionH <= sectionBottomLimit) || rightY + sectionH > sectionBottomLimit;
      if (drawLeft) {
        leftY = drawSection(group, leftX, leftY);
      } else {
        rightY = drawSection(group, rightX, rightY);
      }
    }

    let footerStart = Math.max(leftY, rightY) + 1;
    if (footerStart > 234) {
      doc.addPage("a4", "portrait");
      footerStart = drawMainHeader();
    }
    drawFooterStrips(footerStart);

    const dateStamp = new Date().toISOString().slice(0, 10);
    doc.save(`veg-spicy-hut-menu-${dateStamp}.pdf`);
  }

  function toggleItemSelection(itemId: number) {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function selectVisibleItems() {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      filteredItems.forEach((item) => next.add(item.id));
      return next;
    });
  }

  function clearSelection() {
    setSelectedItemIds(new Set());
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

  async function addNewCustomItem() {
    const targetGroupId = newItemGroupId || activeGroupId || menuGroups[0]?.id || "";
    const targetGroup = menuGroups.find((group) => group.id === targetGroupId);

    if (!targetGroup) {
      window.alert("Please select a menu section first.");
      return;
    }
    if (!newItemName.trim()) {
      window.alert("Please enter food name.");
      return;
    }

    const parsed = parsePriceText(newItemPrices);
    if (!parsed) {
      window.alert("Use format like Full:200, Half:110 or Regular:90.");
      return;
    }

    try {
      await createBridgeMenuItem({
        categoryId: targetGroup.id,
        categoryTitle: targetGroup.title,
        name: newItemName.trim(),
        prices: parsed,
      });
      setNewItemName("");
      setNewItemPrices("Regular:100");
      setActiveGroupId(targetGroup.id);
      await reloadMenu();
      window.alert("New custom food item added.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add menu item";
      window.alert(message);
    }
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-display font-bold">Menu Items</h1>
          <p className="text-sm text-muted-foreground">Select items for today, then generate A4 PDF.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{selectedItemIds.size} selected</Badge>
          <Button type="button" variant="outline" onClick={selectVisibleItems}>Select Visible</Button>
          <Button type="button" variant="outline" onClick={clearSelection}>Clear</Button>
          <Button type="button" onClick={generateSelectedMenuPdf} className="gap-2" disabled={selectedItemIds.size === 0}>
            <Printer className="w-4 h-4" />
            Generate Selected Menu PDF
          </Button>
        </div>
      </div>

      <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search food item" />

      <Card className="p-4 md:p-5 space-y-3 border-dashed">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base md:text-lg font-semibold">Add New Custom Food Item</h3>
          <Badge variant="outline">Future Menu</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1 md:col-span-1">
            <p className="text-xs text-muted-foreground">Menu Section</p>
            <select
              value={newItemGroupId || activeGroupId}
              onChange={(event) => setNewItemGroupId(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {menuGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.title}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 md:col-span-1">
            <p className="text-xs text-muted-foreground">Food Name</p>
            <Input value={newItemName} onChange={(event) => setNewItemName(event.target.value)} placeholder="Ex: Paneer Tikka Roll" />
          </div>
          <div className="space-y-1 md:col-span-1">
            <p className="text-xs text-muted-foreground">Prices</p>
            <Input value={newItemPrices} onChange={(event) => setNewItemPrices(event.target.value)} placeholder="Regular:120 or Full:200, Half:110" />
          </div>
          <div className="md:col-span-1 flex items-end">
            <Button type="button" className="w-full" onClick={addNewCustomItem}>
              Add Item
            </Button>
          </div>
        </div>
      </Card>

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
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-primary"
                  checked={selectedItemIds.has(item.id)}
                  onChange={() => toggleItemSelection(item.id)}
                  aria-label={`Select ${item.name} for print`}
                />
                <h3 className="font-semibold text-lg leading-tight">{item.name}</h3>
              </div>
              <Badge variant={selectedItemIds.has(item.id) ? "default" : "outline"}>
                {selectedItemIds.has(item.id) ? "Selected" : activeGroup?.title || "Menu"}
              </Badge>
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
