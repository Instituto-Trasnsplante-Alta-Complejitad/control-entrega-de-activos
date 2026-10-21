import React, { useState, useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { toast } from "@/components/ui/use-toast";
import { AlertTriangle, Upload, Loader2, FileText } from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export default function PlanoManager({ open, onClose, onSave, nextOrder, initial = null }) {
  const [nombre, setNombre] = useState("");
  const [orden, setOrden] = useState(0);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [isPdf, setIsPdf] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageThumbs, setPageThumbs] = useState([]);
  const [selectedPage, setSelectedPage] = useState(0);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aspectWarning, setAspectWarning] = useState(false);
  const objectUrlRef = useRef(null);

  const revokeObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  useEffect(() => {
    if (open) {
      revokeObjectUrl();
      setNombre(initial?.nombre || "");
      setOrden(initial?.orden ?? nextOrder ?? 0);
      setFile(null);
      setPreview(initial?.imagen_url || "");
      setIsPdf(false);
      setPdfDoc(null);
      setPageThumbs([]);
      setSelectedPage(0);
      setAspectWarning(false);
    }
  }, [open, nextOrder, initial]);

  useEffect(() => () => revokeObjectUrl(), []);

  const imageSize = (source) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = reject;
    image.src = source;
  });

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview("");
    setIsPdf(false);
    setPdfDoc(null);
    setPageThumbs([]);
    setSelectedPage(0);
    revokeObjectUrl();

    if (f.type === "application/pdf") {
      setIsPdf(true);
      setLoadingPdf(true);
      try {
        const buf = await f.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        setPdfDoc(pdf);
        const thumbs = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.4 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          await page.render({ canvasContext: ctx, viewport }).promise;
          thumbs.push({ pageNum: i, dataUrl: canvas.toDataURL("image/png") });
        }
        setPageThumbs(thumbs);
        if (thumbs.length > 0) setSelectedPage(1);
      } catch (err) {
        console.error(err);
        setFile(null);
        setIsPdf(false);
        setPreview(initial?.imagen_url || "");
        toast({ title: "Error al cargar PDF", variant: "destructive" });
      } finally {
        setLoadingPdf(false);
      }
    } else {
      const objectUrl = URL.createObjectURL(f);
      objectUrlRef.current = objectUrl;
      setPreview(objectUrl);
      if (initial?.imagen_url) {
        try {
          const [before, after] = await Promise.all([imageSize(initial.imagen_url), imageSize(objectUrl)]);
          const beforeRatio = before.width / before.height;
          const afterRatio = after.width / after.height;
          setAspectWarning(Math.abs(beforeRatio - afterRatio) / beforeRatio > 0.05);
        } catch {
          setAspectWarning(false);
        }
      }
    }
  };

  const save = async () => {
    if (!nombre.trim()) return;
    setUploading(true);
    try {
      let file_url = initial?.imagen_url;
      if (isPdf && pdfDoc && selectedPage) {
        const page = await pdfDoc.getPage(selectedPage);
        const viewport = page.getViewport({ scale: 2.5 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        await page.render({ canvasContext: ctx, viewport }).promise;
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
        const imgFile = new File([blob], `${nombre.replace(/\s+/g, "_")}.png`, { type: "image/png" });
        const res = await base44.integrations.Core.UploadFile({ file: imgFile });
        file_url = res.file_url;
      } else if (file) {
        const res = await base44.integrations.Core.UploadFile({ file });
        file_url = res.file_url;
      }
      if (file_url) {
        await onSave({ nombre: nombre.trim(), orden: Number(orden) || 0, imagen_url: file_url });
        onClose();
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const hasUsableImage = file ? (isPdf ? selectedPage > 0 : true) : Boolean(initial?.imagen_url);
  const canSave = nombre.trim() && hasUsableImage && !uploading;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar plano" : "Nuevo plano"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto">
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label>Nombre</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Primer piso" />
            </div>
            <div className="w-28 space-y-2">
              <Label>Orden</Label>
              <Input type="number" value={orden} onChange={(e) => setOrden(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{initial ? "Reemplazar imagen o PDF (opcional)" : "Imagen o PDF del plano"}</Label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-slate-50 min-h-32">
              {preview ? (
                <img src={preview} className="max-h-40 object-contain" />
              ) : loadingPdf ? (
                <div className="flex flex-col items-center gap-2 py-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Cargando PDF...</span>
                </div>
              ) : isPdf ? (
                <FileText className="w-8 h-8 text-muted-foreground" />
              ) : (
                <>
                  <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground text-center">
                    {initial ? "Elegí un archivo para reemplazar el actual" : "PNG, JPG, WEBP o PDF"}
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                className="hidden"
                onChange={onFile}
              />
            </label>
          </div>

          {aspectWarning && (
            <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p>La nueva imagen tiene otra proporción. Los puntos conservarán sus coordenadas, pero conviene revisar visualmente su ubicación después de guardar.</p>
            </div>
          )}

          {isPdf && pageThumbs.length > 0 && (
            <div className="space-y-2">
              <Label>
                Seleccionar página del PDF ({pageThumbs.length} {pageThumbs.length === 1 ? "página" : "páginas"})
              </Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {pageThumbs.map((t) => (
                  <button
                    key={t.pageNum}
                    onClick={() => setSelectedPage(t.pageNum)}
                    className={`relative rounded-lg overflow-hidden border-2 transition ${
                      selectedPage === t.pageNum
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-transparent hover:border-slate-300"
                    }`}
                  >
                    <img src={t.dataUrl} className="w-full object-contain" />
                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-0.5 text-center">
                      Pág. {t.pageNum}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!canSave} onClick={save}>
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : initial ? "Guardar cambios" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
