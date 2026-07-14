import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import ItemSearch from "./ItemSearch";

export default function PuntoForm({ open, onClose, onSave, initial }) {
  const [items, setItems] = useState([]);
  const [observacion, setObservacion] = useState("");

  useEffect(() => {
    if (open) {
      setItems(initial?.items || []);
      setObservacion(initial?.observacion || "");
    }
  }, [open, initial]);

  const addItem = (it) => {
    if (items.some((i) => i.tipo === it.tipo && i.id === it.id)) return;
    setItems((prev) => [...prev, { tipo: it.tipo, id: it.id, label: it.label, sub: it.sub }]);
  };
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Editar punto" : "Asociar ítems al punto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Ítems asociados ({items.length})</Label>
            <ItemSearch onAdd={addItem} excludeKeys={items.map((i) => `${i.tipo}:${i.id}`)} />
            {items.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {items.map((it, idx) => (
                  <div key={`${it.tipo}:${it.id}`} className="flex items-center gap-1.5 bg-slate-100 rounded-md pl-2 pr-1 py-1">
                    <Badge variant={it.tipo === "equipo" ? "default" : "secondary"} className="text-[10px]">
                      {it.tipo === "equipo" ? "Eq" : "Imp"}
                    </Badge>
                    <span className="text-sm font-medium">{it.label}</span>
                    {it.sub && <span className="text-xs text-muted-foreground hidden sm:inline">{it.sub}</span>}
                    <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Observación</Label>
            <Textarea value={observacion} onChange={(e) => setObservacion(e.target.value)} rows={2} placeholder="Opcional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={items.length === 0} onClick={() => onSave({ items: items.map(({ tipo, id }) => ({ tipo, id })), observacion })}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}