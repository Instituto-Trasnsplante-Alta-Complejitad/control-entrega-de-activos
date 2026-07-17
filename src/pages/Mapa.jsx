import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useSearchParams } from "react-router-dom";
import { Loader2, Map as MapIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";
import SedeSelector from "@/components/mapa/SedeSelector";
import SedeForm from "@/components/mapa/SedeForm";
import PlanoTabs from "@/components/mapa/PlanoTabs";
import PlanoManager from "@/components/mapa/PlanoManager";
import MapVisualizer from "@/components/mapa/MapVisualizer";
import MapToolbar from "@/components/mapa/MapToolbar";
import MapFilters from "@/components/mapa/MapFilters";
import PuntoForm from "@/components/mapa/PuntoForm";
import PuntoDetailModal from "@/components/mapa/PuntoDetailModal";
import { getPuntoItems, itemLabel } from "@/lib/mapaHelpers";

export default function Mapa() {
  const { canManageMapa } = useCurrentUser();
  const qc = useQueryClient();

  const [activeSedeId, setActiveSedeId] = useState(null);
  const [activePlanoId, setActivePlanoId] = useState(null);
  const [mode, setMode] = useState("view");
  const [fullscreen, setFullscreen] = useState(false);
  const [filters, setFilters] = useState({ tipo: "", estado: "", sector: "", usuario: "" });
  const [sedeForm, setSedeForm] = useState({ open: false, initial: null });
  const [planoForm, setPlanoForm] = useState(false);
  const [puntoForm, setPuntoForm] = useState({ open: false, pendingXY: null, initial: null });
  const [detail, setDetail] = useState({ open: false, punto: null });
  const [confirmSede, setConfirmSede] = useState(null);
  const [confirmDeletePunto, setConfirmDeletePunto] = useState(null);
  const [highlightPuntoId, setHighlightPuntoId] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const locateEquipoId = searchParams.get("equipo");
  const locateImpresoraId = searchParams.get("impresora");
  const autoOpenedRef = useRef(null);
  const [pendingPlanoId, setPendingPlanoId] = useState(null);

  const sedesQ = useQuery({
    queryKey: ["sedes"],
    queryFn: () => base44.entities.Sede.list("-updated_date", 100),
  });
  const planosQ = useQuery({
    queryKey: ["planos", activeSedeId],
    queryFn: () => base44.entities.MapaPlano.filter({ sede_id: activeSedeId }, "orden", 100),
    enabled: !!activeSedeId,
  });
  const puntosQ = useQuery({
    queryKey: ["puntos", activePlanoId],
    queryFn: () => base44.entities.MapaPunto.filter({ plano_id: activePlanoId }, "-updated_date", 500),
    enabled: !!activePlanoId,
  });
  const mapDataQ = useQuery({
    queryKey: ["map-data"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getMapData", {});
      return res.data;
    },
  });
  const locationQ = useQuery({
    queryKey: ["locate-map", locateEquipoId, locateImpresoraId],
    queryFn: async () => {
      const [allPlanos, allPuntos] = await Promise.all([
        base44.entities.MapaPlano.list("orden", 500),
        base44.entities.MapaPunto.list("-updated_date", 3000),
      ]);
      const match = (p) => {
        const items = getPuntoItems(p);
        if (locateEquipoId) return items.some((it) => it.tipo === "equipo" && it.id === locateEquipoId);
        if (locateImpresoraId) return items.some((it) => it.tipo === "impresora" && it.id === locateImpresoraId);
        return false;
      };
      const punto = allPuntos.find(match);
      const plano = punto ? allPlanos.find((pl) => pl.id === punto.plano_id) : null;
      return { punto, plano };
    },
    enabled: !!(locateEquipoId || locateImpresoraId),
  });

  const sedes = sedesQ.data || [];
  const planos = planosQ.data || [];
  const puntos = puntosQ.data || [];
  const equipment = mapDataQ.data?.equipment || [];
  const printers = mapDataQ.data?.printers || [];
  const equiposById = useMemo(() => Object.fromEntries(equipment.map((e) => [e.id, e])), [equipment]);
  const impresorasById = useMemo(() => Object.fromEntries(printers.map((p) => [p.id, p])), [printers]);
  const activePlano = planos.find((p) => p.id === activePlanoId) || planos[0];
  const activeSedeRec = sedes.find((s) => s.id === activeSedeId);

  useEffect(() => {
    if (!activeSedeId && sedes.length) setActiveSedeId(sedes[0].id);
  }, [sedes, activeSedeId]);

  useEffect(() => {
    if (!pendingPlanoId) setActivePlanoId(null);
  }, [activeSedeId, pendingPlanoId]);

  useEffect(() => {
    if (activeSedeId && planos.length && !planos.find((p) => p.id === activePlanoId)) {
      setActivePlanoId(planos[0].id);
    }
  }, [planos, activeSedeId, activePlanoId]);

  useEffect(() => {
    setMode("view");
  }, [activePlanoId]);

  // ── Localización desde /mapa?equipo=<id> ──
  useEffect(() => {
    if (!locationQ.data) return;
    const { punto, plano } = locationQ.data;
    if (punto && plano) {
      setActiveSedeId(plano.sede_id);
      setPendingPlanoId(plano.id);
      setHighlightPuntoId(punto.id);
      autoOpenedRef.current = null;
    } else {
      toast({ title: "No está mapeado en ningún plano", variant: "destructive" });
    }
    setSearchParams({}, { replace: true });
  }, [locationQ.data]);

  useEffect(() => {
    if (pendingPlanoId && planos.length && planos.find((p) => p.id === pendingPlanoId)) {
      setActivePlanoId(pendingPlanoId);
      setPendingPlanoId(null);
    }
  }, [pendingPlanoId, planos]);

  // Al localizar desde Stock/Impresoras solo resaltamos el punto, sin abrir el detalle.

  // ── Mutaciones sedes ──
  const createSede = useMutation({
    mutationFn: (data) => base44.entities.Sede.create({ ...data, estado: "activa" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sedes"] }); toast({ title: "Sede creada" }); setSedeForm({ open: false, initial: null }); },
  });
  const updateSede = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Sede.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sedes"] }); toast({ title: "Sede actualizada" }); setSedeForm({ open: false, initial: null }); },
  });
  const deleteSede = useMutation({
    mutationFn: async (sede) => {
      await base44.entities.MapaPunto.deleteMany({ sede_id: sede.id });
      await base44.entities.MapaPlano.deleteMany({ sede_id: sede.id });
      await base44.entities.Sede.delete(sede.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sedes"] });
      setActiveSedeId(null);
      toast({ title: "Sede eliminada" });
      setConfirmSede(null);
    },
  });

  // ── Mutaciones planos ──
  const createPlano = useMutation({
    mutationFn: (data) => base44.entities.MapaPlano.create({ sede_id: activeSedeId, ...data }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["planos", activeSedeId] }); toast({ title: "Plano creado" }); setPlanoForm(false); },
  });
  const deletePlano = useMutation({
    mutationFn: async (planoId) => {
      await base44.entities.MapaPunto.deleteMany({ plano_id: planoId });
      await base44.entities.MapaPlano.delete(planoId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planos", activeSedeId] });
      setActivePlanoId(null);
      toast({ title: "Plano eliminado" });
    },
  });

  // ── Mutaciones puntos ──
  const createPunto = useMutation({
    mutationFn: (data) => base44.entities.MapaPunto.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["puntos", activePlanoId] }); toast({ title: "Punto creado" }); setMode("view"); },
  });
  const updatePunto = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MapaPunto.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["puntos", activePlanoId] }); toast({ title: "Punto actualizado" }); setMode("view"); },
  });
  const deletePunto = useMutation({
    mutationFn: (id) => base44.entities.MapaPunto.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["puntos", activePlanoId] }); toast({ title: "Punto eliminado del mapa" }); setMode("view"); },
  });

  // ── Handlers ──
  const selectSede = (id) => { setHighlightPuntoId(null); setActiveSedeId(id); };
  const selectPlano = (id) => { setHighlightPuntoId(null); setActivePlanoId(id); };

  const onMovePoint = (id, x, y) => {
    qc.setQueryData(["puntos", activePlanoId], (old) => (old || []).map((p) => (p.id === id ? { ...p, x, y } : p)));
  };
  const onMoveEnd = (id) => {
    const current = qc.getQueryData(["puntos", activePlanoId]) || [];
    const p = current.find((x) => x.id === id);
    if (p) updatePunto.mutate({ id, data: { x: p.x, y: p.y } });
  };

  const onAddPoint = (x, y) => {
    if (!canManageMapa || mode !== "add") return;
    setPuntoForm({ open: true, pendingXY: { x, y }, initial: null });
  };

  const onSelectPoint = (punto) => {
    if (mode === "delete") {
      setConfirmDeletePunto(punto);
    } else if (mode === "modify") {
      const items = getPuntoItems(punto);
      setPuntoForm({ open: true, pendingXY: null, initial: { id: punto.id, items, observacion: punto.observacion } });
    } else {
      setDetail({ open: true, punto });
    }
  };

  const syncItemUbicacion = async (items, prevItems, sedeId, planoId) => {
    const ent = (tipo) => (tipo === "impresora" ? "Printer" : "Equipment");
    if (prevItems && prevItems.length) {
      for (const it of prevItems) {
        if (!items.some((i) => i.tipo === it.tipo && i.id === it.id)) {
          try { await base44.entities[ent(it.tipo)].update(it.id, { sede_id: "", plano_id: "" }); } catch {}
        }
      }
    }
    for (const it of items) {
      try { await base44.entities[ent(it.tipo)].update(it.id, { sede_id: sedeId, plano_id: planoId }); } catch {}
    }
  };

  const savePunto = async (data) => {
    const prevItems = puntoForm.initial?.items;
    try {
      if (puntoForm.initial?.id) {
        await updatePunto.mutateAsync({ id: puntoForm.initial.id, data: { items: data.items, observacion: data.observacion } });
        await syncItemUbicacion(data.items, prevItems, activeSedeId, activePlano?.id);
      } else if (puntoForm.pendingXY) {
        await createPunto.mutateAsync({
          sede_id: activeSedeId,
          plano_id: activePlano.id,
          items: data.items,
          x: puntoForm.pendingXY.x,
          y: puntoForm.pendingXY.y,
          observacion: data.observacion,
        });
        await syncItemUbicacion(data.items, null, activeSedeId, activePlano?.id);
      }
    } finally {
      setPuntoForm({ open: false, pendingXY: null, initial: null });
      qc.invalidateQueries({ queryKey: ["equipment"] });
      qc.invalidateQueries({ queryKey: ["printers"] });
    }
  };

  const editFromDetail = () => {
    const p = detail.punto;
    const items = getPuntoItems(p);
    setDetail({ open: false, punto: null });
    setMode("modify");
    setPuntoForm({ open: true, pendingXY: null, initial: { id: p.id, items, observacion: p.observacion } });
  };
  const deleteFromDetail = () => {
    setConfirmDeletePunto(detail.punto);
    setDetail({ open: false, punto: null });
  };

  const confirmPuntoItems = confirmDeletePunto ? getPuntoItems(confirmDeletePunto) : [];
  const confirmPuntoLabel = confirmPuntoItems
    .map((it) => itemLabel(it, equiposById, impresorasById))
    .join(", ");

  const detailItems = detail.punto ? getPuntoItems(detail.punto) : [];

  const containerClass = fullscreen
    ? "fixed inset-0 z-50 bg-white flex flex-col p-3 gap-2"
    : "p-4 md:p-6 space-y-4";

  return (
    <div className={containerClass}>
      {!fullscreen && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapIcon className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Mapa de sedes</h1>
          </div>
          <SedeSelector
            sedes={sedes}
            activeId={activeSedeId}
            onSelect={selectSede}
            canEdit={canManageMapa}
            onAdd={() => setSedeForm({ open: true, initial: null })}
            onEdit={() => {
              const s = sedes.find((x) => x.id === activeSedeId);
              if (s) setSedeForm({ open: true, initial: s });
            }}
            onDelete={() => {
              const s = sedes.find((x) => x.id === activeSedeId);
              if (s) setConfirmSede(s);
            }}
          />
        </div>
      )}

      {fullscreen && activeSedeRec && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{activeSedeRec.nombre}</span>
          {activePlano && <span>· {activePlano.nombre}</span>}
        </div>
      )}

      {sedesQ.isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : !activeSedeId ? (
        <div className="text-center py-20 text-muted-foreground">
          {canManageMapa ? "Creá una sede para comenzar." : "No hay sedes disponibles."}
        </div>
      ) : (
        <>
          {!fullscreen && activeSedeRec && (activeSedeRec.direccion || activeSedeRec.descripcion) && (
            <p className="text-sm text-muted-foreground">
              {activeSedeRec.direccion}{activeSedeRec.direccion && activeSedeRec.descripcion ? " · " : ""}{activeSedeRec.descripcion}
            </p>
          )}

          {!fullscreen && (
            <PlanoTabs
              planos={planos}
              activeId={activePlano?.id}
              onSelect={selectPlano}
              canEdit={canManageMapa}
              onAdd={() => setPlanoForm(true)}
              onDeleteActive={() => activePlano && deletePlano.mutate(activePlano.id)}
            />
          )}

          {planosQ.isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : !activePlano ? (
            <div className="text-center py-20 text-muted-foreground border rounded-lg bg-white">
              {canManageMapa ? "Cargá el primer plano de esta sede." : "Esta sede aún no tiene planos."}
            </div>
          ) : (
            <>
              {!fullscreen && <MapFilters filters={filters} setFilters={setFilters} equipmentList={equipment} />}
              <MapToolbar
                mode={mode}
                setMode={setMode}
                canEdit={canManageMapa}
                fullscreen={fullscreen}
                onToggleFullscreen={() => setFullscreen((f) => !f)}
                hasPlano={!!activePlano}
              />
              <div className={fullscreen ? "flex-1 min-h-0" : ""}>
                <MapVisualizer
                  plano={activePlano}
                  puntos={puntos}
                  equiposById={equiposById}
                  impresorasById={impresorasById}
                  mode={mode}
                  highlightPuntoId={highlightPuntoId}
                  onAddPoint={onAddPoint}
                  onMovePoint={onMovePoint}
                  onMoveEnd={onMoveEnd}
                  onSelectPoint={onSelectPoint}
                  filters={filters}
                  fullscreen={fullscreen}
                />
              </div>
            </>
          )}
        </>
      )}

      {/* ── Modals ── */}
      <SedeForm
        open={sedeForm.open}
        onClose={() => setSedeForm({ open: false, initial: null })}
        initial={sedeForm.initial}
        onSave={(data) => {
          if (sedeForm.initial?.id) updateSede.mutate({ id: sedeForm.initial.id, data });
          else createSede.mutate(data);
        }}
      />

      <PlanoManager
        open={planoForm}
        onClose={() => setPlanoForm(false)}
        nextOrder={planos.length}
        onSave={(data) => createPlano.mutate(data)}
      />

      <PuntoForm
        open={puntoForm.open}
        onClose={() => setPuntoForm({ open: false, pendingXY: null, initial: null })}
        initial={puntoForm.initial}
        onSave={savePunto}
      />

      <PuntoDetailModal
        punto={detail.punto}
        items={detailItems}
        equiposById={equiposById}
        impresorasById={impresorasById}
        open={detail.open}
        onClose={() => setDetail({ open: false, punto: null })}
        canEdit={canManageMapa}
        onEdit={editFromDetail}
        onDelete={deleteFromDetail}
      />

      <AlertDialog open={!!confirmSede} onOpenChange={(o) => !o && setConfirmSede(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar sede "{confirmSede?.nombre}"</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán también todos sus planos y puntos asociados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteSede.mutate(confirmSede)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDeletePunto} onOpenChange={(o) => !o && setConfirmDeletePunto(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar punto del mapa</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar el punto con ítems <strong>{confirmPuntoLabel || "seleccionado"}</strong>?
              Solo se quitará del mapa, los equipos e impresoras no serán borrados del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDeletePunto) deletePunto.mutate(confirmDeletePunto.id);
                setConfirmDeletePunto(null);
              }}
            >
              Eliminar punto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}