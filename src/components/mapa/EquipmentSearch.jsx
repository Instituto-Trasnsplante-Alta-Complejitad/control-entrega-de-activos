import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function EquipmentSearch({ selected, onSelect }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const { data: all = [] } = useQuery({
    queryKey: ["equipment-map-search"],
    queryFn: () => base44.entities.Equipment.list("-updated_date", 2000),
  });

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? all.filter((e) =>
          [e.asset_number, e.serial_number, e.assigned_to, e.username, e.department, e.brand, e.model]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))
        )
      : all;
    return filtered.slice(0, 30);
  }, [query, all]);

  if (selected) {
    return (
      <div className="flex items-center justify-between border rounded-md px-3 py-2 bg-slate-50">
        <div className="text-sm min-w-0">
          <span className="font-medium">{selected.asset_number || "Sin asset"}</span>
          <span className="text-muted-foreground"> · {selected.brand} {selected.model}</span>
          {selected.assigned_to && <span className="text-muted-foreground"> · {selected.assigned_to}</span>}
        </div>
        <button
          onClick={() => { onSelect(null); setQuery(""); }}
          className="ml-2 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Buscar por asset, serial, usuario, sector..."
          className="pl-8"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto bg-white border rounded-md shadow-lg">
          {results.map((e) => (
            <button
              key={e.id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm border-b last:border-0"
              onClick={() => { onSelect(e); setOpen(false); setQuery(""); }}
            >
              <span className="font-medium">{e.asset_number || "Sin asset"}</span>
              <span className="text-muted-foreground"> · {e.brand} {e.model}</span>
              <span className="text-muted-foreground"> · {e.assigned_to || e.username || "-"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}