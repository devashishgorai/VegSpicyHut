import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { BridgeTableStatus, getStoredTables, saveStoredTables } from "@/lib/bridge";

export default function Tables() {
  const [tables, setTables] = useState(getStoredTables);

  function updateStatus(tableId: number, status: BridgeTableStatus) {
    const updated = tables.map((table) => (table.id === tableId ? { ...table, status } : table));
    setTables(updated);
    saveStoredTables(updated);
  }

  function statusClasses(status: BridgeTableStatus) {
    if (status === "available") return "bg-emerald-500/10 text-emerald-700 border-emerald-300";
    if (status === "occupied") return "bg-red-500/10 text-red-700 border-red-300";
    return "bg-amber-500/10 text-amber-700 border-amber-300";
  }

  function buttonVariant(tableStatus: BridgeTableStatus, targetStatus: BridgeTableStatus): "default" | "outline" {
    return tableStatus === targetStatus ? "default" : "outline";
  }

  function renderChair(chairClass: string, index: number) {
    return (
      <span
        key={`${chairClass}-${index}`}
        className={`absolute ${chairClass} h-6 w-3 rounded-sm border border-cyan-400/80 bg-cyan-200/80 shadow-sm`}
      />
    );
  }

  function renderTablePreview(capacity: number, label: string) {
    const topCount = Math.max(1, Math.floor(capacity / 4));
    const sideCount = Math.max(1, Math.ceil(capacity / 4));

    return (
      <div className="relative mx-auto h-36 w-44">
        <div className="absolute inset-x-8 top-8 bottom-8 rounded-xl border-2 border-cyan-500 bg-gradient-to-b from-white to-cyan-100 shadow-md flex items-center justify-center">
          <span className="text-sm font-extrabold tracking-wide text-cyan-900">{label}</span>
        </div>

        <span className="absolute left-9 top-9 h-3 w-3 rounded-sm bg-cyan-700/80" />
        <span className="absolute right-9 top-9 h-3 w-3 rounded-sm bg-cyan-700/80" />
        <span className="absolute left-9 bottom-9 h-3 w-3 rounded-sm bg-cyan-700/80" />
        <span className="absolute right-9 bottom-9 h-3 w-3 rounded-sm bg-cyan-700/80" />

        {Array.from({ length: topCount }).map((_, index) =>
          renderChair(`top-0 ${topCount === 1 ? "left-1/2 -translate-x-1/2" : index === 0 ? "left-[36%]" : "right-[36%]"}`, index),
        )}

        {Array.from({ length: topCount }).map((_, index) =>
          renderChair(`bottom-0 ${topCount === 1 ? "left-1/2 -translate-x-1/2" : index === 0 ? "left-[36%]" : "right-[36%]"}`, index),
        )}

        {Array.from({ length: sideCount }).map((_, index) =>
          renderChair(`left-0 ${sideCount === 1 ? "top-1/2 -translate-y-1/2" : index === 0 ? "top-[34%]" : "bottom-[34%]"}`, index),
        )}

        {Array.from({ length: sideCount }).map((_, index) =>
          renderChair(`right-0 ${sideCount === 1 ? "top-1/2 -translate-y-1/2" : index === 0 ? "top-[34%]" : "bottom-[34%]"}`, index),
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Tables</h1>
          <p className="text-muted-foreground">Manage table flow with one-click status controls.</p>
        </div>
      </div>

      <Card className="p-4 bg-gradient-to-r from-emerald-50 via-cyan-50 to-blue-50 border-cyan-200">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-300">Available</Badge>
          <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-300">Occupied</Badge>
          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-300">Reserved</Badge>
          <span className="text-muted-foreground">Tap any status button to instantly update that table.</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {tables.map((table) => (
          <Card key={table.id} className="p-5 space-y-4 border-cyan-200 shadow-md shadow-cyan-100/70 bg-gradient-to-b from-white to-cyan-50/40">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{table.name}</h2>
              <Badge variant="outline" className={statusClasses(table.status)}>
                {table.status}
              </Badge>
            </div>

            <div className="rounded-2xl border border-cyan-200 bg-gradient-to-b from-cyan-50 to-white p-4">
              {renderTablePreview(table.capacity, table.name)}
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              Capacity {table.capacity}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={buttonVariant(table.status, "available")}
                className={table.status === "available" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                onClick={() => updateStatus(table.id, "available")}
              >
                Available
              </Button>
              <Button
                variant={buttonVariant(table.status, "occupied")}
                className={table.status === "occupied" ? "bg-red-600 hover:bg-red-700" : ""}
                onClick={() => updateStatus(table.id, "occupied")}
              >
                Occupied
              </Button>
              <Button
                variant={buttonVariant(table.status, "reserved")}
                className={table.status === "reserved" ? "bg-amber-600 hover:bg-amber-700" : ""}
                onClick={() => updateStatus(table.id, "reserved")}
              >
                Reserved
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
