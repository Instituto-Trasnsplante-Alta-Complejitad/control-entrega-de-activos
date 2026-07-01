import React from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";

const CONFIG = [
  { key: "tipo", label: "Tipo", field: "type" },
  { key: "estado", label: "Estado", field: "status" },
  { key: "sector", label: "Sector", field: "department" },
  { key: "usuario", label: "Usuario", field: "assigned_to" },
];

export default function MapFilters({ filters, setFilters, equipmentList }) {
  const anyActive = Object.values(filters).some(Boolean);

  const optionsFor = (field) => {
    const set = new Set(equipmentList.map((e) => e[field]).filter(Boolean));
    return [...set].sort();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Filter className="w-3 h-3" /> Filtros:
      </span>
      {CONFIG.map(({ key, label, field }) => (
        <Select
          key={key}
          value={filters[key] || "all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, [key]: v === "all" ? "" : v }))}
        >
          <SelectTrigger className="w-36 h-8">
            <SelectValue placeholder={label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {optionsFor(field).map((v) => (
              <SelectItem key={v} value={v}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      {anyActive && (
        <Button variant="ghost" size="sm" onClick={() => setFilters({ tipo: "", estado: "", sector: "", usuario: "" })}>
          Limpiar
        </Button>
      )}
    </div>
  );
}