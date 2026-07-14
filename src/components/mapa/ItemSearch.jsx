import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function ItemSearch({ onAdd, excludeKeys = [] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const equipQ = useQuery({
    queryKey: ["equipment-map-search"],
    queryFn: () => base44.entities.Equipment.list("-updated_date", 2000),
  });
  const printerQ = useQuery({
    queryKey: ["printers-map-search"],
    queryFn: () => base44.entities.Printer.list("-updated_date", 500),
  });

  const all = useMemo(() => {
    const eq = (equipQ.data || []).map((e) => ({
      tipo: "equipo",
      id: e.id,
      label: e.asset_number || e.serial_number || "Sin asset",
      sub: [e.brand, e.model].filter(Boolean).join(" "),
      extra: [e.assigned_to, e.username, e.department].filter(Boolean).join(" · "),
    }));
    const pr = (printerQ.data || []).map((p) => ({
      tipo: "impresora",
      id: p.id,
      label: p.printer_id || `${p.marca} ${p.modelo}`.trim(),
      sub: [p.marca, p.modelo].filter(Boolean).join(" "),
      extra: [p.sector, p.piso, p.edificio].filter(Boolean).join(" · "),
    }));
    return [...eq, ...pr];
  }, [equipQ.data, printerQ.data]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const ex = new Set(excludeKeys);
    const filtered = q
      ? all.filter((it) =>
          [it.label, it.sub, it.extra].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
        )
      : all;
    return filtered.filter((it) => !ex.has(`${it.tipo}:${it.id}`)).slice(0, 30);
  }, [query, all, excludeKeys]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Buscar equipo o impresora..."
          className="pl-8"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto bg-white border rounded-md shadow-lg">
          {results.map((it) => (
            <button
              key={`${it.tipo}:${it.id}`}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm border-b last:border-0 flex items-center gap-2"
              onClick={() => { onAdd(it); setOpen(false); setQuery(""); }}
            >
              <Badge variant={it.tipo === "equipo" ? "default" : "secondary"} className="text-[10px] shrink-0">
                {it.tipo === "equipo" ? "Equipo" : "Impresora"}
              </Badge>
              <span className="font-medium shrink-0">{it.label}</span>
              <span className="text-muted-foreground truncate">{it.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}