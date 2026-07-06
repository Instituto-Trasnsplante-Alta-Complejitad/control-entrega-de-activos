import React, { useState, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { toast } from "@/components/ui/use-toast";
import { Upload, Loader2, FileText, ImageIcon } from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export default function PlanoManager({ open, onClose, onSave, nextOrder }) {
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

  useEffect(() => {
    if (open) {
      setNombre("");
      setOrden(nextOrder || 0);
      setFile(null);
      setPreview("");
      setIsPdf(false);
      setPdfDoc(null);
      setPageThumbs([]);
      setSelectedPage(0);
    }
  }, [open, nextOrder]);

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview("");
    setIsPdf(false);
    setPdfDoc(null);
    setPageThumbs([]);
    setSelectedPage(0);

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
        toast({ title: "Error al cargar PDF", variant: "destructive" });
      } finally {
        setLoadingPdf(false);
      }
    } else {
      setPreview(URL.createObjectURL(f));
    }
  };

  const save = async () => {
    if (!nombre.trim()) return;
    setUploading(true);
    try {
      let file_url;
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
        await onSave({ nombre, orden: Number(orden) || 0, imagen_url: file_url });
        onClose();
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const canSave = nombre.trim() && (isPdf ? selectedPage : file) && !uploading;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo plano</DialogTitle>
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
            <Label>Imagen o PDF del plano</Label>
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
                    PNG, JPG, WEBP o PDF
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
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</> : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}