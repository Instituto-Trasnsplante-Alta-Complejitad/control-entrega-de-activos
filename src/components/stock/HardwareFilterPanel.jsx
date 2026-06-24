import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SlidersHorizontal, X } from "lucide-react";

// Extrae número de GB de strings como "16 GB", "8GB", "32"
function parseGB(str) {
  if (!str) return null;
  const match = String(str).match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

const RAM_OPTIONS = ["all", "2", "4", "8", "16", "32", "64"];
const SPEC_FIELDS = [
  { value: "ram_amount", label: "RAM" },
  { value: "storage_capacity", label: "Almacenamiento" },
];

export default function HardwareFilterPanel({ equipment, onFilteredChange }) {
  const [open, setOpen] = useState(false);
  const [specField, setSpecField] = useState("ram_amount");
  const [minGB, setMinGB] = useState("");
  const [maxGB, setMaxGB] = useState("");
  const [sortDir, setSortDir] = useState("desc");
  const [onlyWithValue, setOnlyWithValue] = useState(false);

  const hasActiveFilter = minGB !== "" || maxGB !== "" || onlyWithValue;

  const applyFilter = () => {
    let result = [...equipment];

    // Solo equipos con el campo cargado
    if (onlyWithValue || minGB !== "" || maxGB !== "") {
      result = result.filter((e) => parseGB(e[specField]) !== null);
    }

    // Filtro mínimo
    if (minGB !== "") {
      const min = parseFloat(minGB);
      result = result.filter((e) => {
        const val = parseGB(e[specField]);
        return val !== null && val >= min;
      });
    }

    // Filtro máximo
    if (maxGB !== "") {
      const max = parseFloat(maxGB);
      result = result.filter((e) => {
        const val = parseGB(e[specField]);
        return val !== null && val <= max;
      });
    }

    // Ordenar
    result.sort((a, b) => {
      const valA = parseGB(a[specField]) ?? -1;
      const valB = parseGB(b[specField]) ?? -1;
      return sortDir === "desc" ? valB - valA : valA - valB;
    });

    onFilteredChange(result, specField);
  };

  const handleClear = () => {
    setMinGB("");
    setMaxGB("");
    setOnlyWithValue(false);
    setSortDir("desc");
    onFilteredChange(null, null);
  };

  return (
    <div>
      <Button
        variant={hasActiveFilter ? "default" : "outline"}
        className="gap-2"
        onClick={() => setOpen(!open)}
      >
        <SlidersHorizontal className="w-4 h-4" />
        Filtro Hardware
        {hasActiveFilter && <span className="ml-1 bg-white/20 text-xs px-1.5 rounded-full">activo</span>}
      </Button>

      {open && (
        <div className="mt-3 p-4 border border-border rounded-xl bg-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Filtrar por especificación</h3>
            {hasActiveFilter && (
              <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1 text-muted-foreground h-7">
                <X className="w-3 h-3" /> Limpiar
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Característica</label>
              <Select value={specField} onValueChange={setSpecField}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SPEC_FIELDS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Mínimo (GB)</label>
              <Input
                type="number"
                className="h-8 text-sm"
                placeholder="Ej: 8"
                value={minGB}
                onChange={(e) => setMinGB(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Máximo (GB)</label>
              <Input
                type="number"
                className="h-8 text-sm"
                placeholder="Ej: 32"
                value={maxGB}
                onChange={(e) => setMaxGB(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Ordenar</label>
              <Select value={sortDir} onValueChange={setSortDir}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Mayor a menor</SelectItem>
                  <SelectItem value="asc">Menor a mayor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={onlyWithValue}
                onChange={(e) => setOnlyWithValue(e.target.checked)}
                className="rounded"
              />
              Solo equipos con dato cargado
            </label>
          </div>

          <Button size="sm" onClick={applyFilter} className="gap-2">
            Aplicar filtro
          </Button>
        </div>
      )}
    </div>
  );
}