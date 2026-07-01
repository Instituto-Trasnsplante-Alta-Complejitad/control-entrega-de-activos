import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { Upload, Loader2 } from "lucide-react";

export default function PlanoManager({ open, onClose, onSave, nextOrder }) {
  const [nombre, setNombre] = useState("");
  const [orden, setOrden] = useState(0);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setNombre("");
      setOrden(nextOrder || 0);
      setFile(null);
      setPreview("");
    }
  }, [open, nextOrder]);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    if (!file || !nombre.trim()) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await onSave({ nombre, orden: Number(orden) || 0, imagen_url: file_url });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo plano</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Primer piso" />
          </div>
          <div className="space-y-2">
            <Label>Orden</Label>
            <Input type="number" value={orden} onChange={(e) => setOrden(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Imagen del plano</Label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-slate-50 min-h-32">
              {preview ? (
                <img src={preview} className="max-h-40 object-contain" />
              ) : (
                <>
                  <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Seleccionar imagen</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={onFile} />
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!file || !nombre.trim() || uploading} onClick={save}>
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</> : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}