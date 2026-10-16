import { useState } from "react";
import { Download, FileArchive, FileJson, Loader2, AlertTriangle, CheckCircle2, Lock, Files } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  EXPORT_ENTITIES,
  APP_NAME,
  buildFullExport,
  buildFilesOnlyZip,
  exportSingleEntity,
  downloadBlob,
  downloadJson,
} from "@/lib/exportador";

export default function Exportar() {
  const { isAdmin } = useCurrentUser();
  const [running, setRunning] = useState(null); // 'full' | 'files' | null
  const [entityStatus, setEntityStatus] = useState({});
  const [fileStatus, setFileStatus] = useState({ total: 0, done: 0, errors: 0, current: null });
  const [zipPercent, setZipPercent] = useState(0);
  const [summary, setSummary] = useState(null);
  const [filesSummary, setFilesSummary] = useState(null);
  const [errors, setErrors] = useState([]);
  const [singleLoading, setSingleLoading] = useState(null);

  const reset = () => {
    setEntityStatus({});
    setFileStatus({ total: 0, done: 0, errors: 0, current: null });
    setZipPercent(0);
    setSummary(null);
    setFilesSummary(null);
    setErrors([]);
  };

  const onProgress = (evt) => {
    if (evt.type === "entity") {
      setEntityStatus((prev) => ({
        ...prev,
        [evt.entity]: { status: evt.status, count: evt.count, error: evt.error },
      }));
    } else if (evt.type === "file") {
      setFileStatus((prev) => ({
        ...prev,
        total: evt.total,
        current: evt.url,
        done: evt.status === "done" ? prev.done + 1 : prev.done,
        errors: evt.status === "error" ? prev.errors + 1 : prev.errors,
      }));
    } else if (evt.type === "zipping") {
      setZipPercent(evt.percent);
    }
  };

  const handleFullExport = async () => {
    reset();
    setRunning("full");
    try {
      const { blob, manifest, errors: errs } = await buildFullExport({ onProgress });
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      downloadBlob(blob, `exportacion-${APP_NAME.toLowerCase().replace(/\s+/g, "-")}-${ts}.zip`);
      setSummary(manifest);
      setErrors(errs);
    } catch (e) {
      setErrors([{ entity: "general", error: e.message }]);
    } finally {
      setRunning(null);
    }
  };

  const handleFilesOnly = async () => {
    reset();
    setRunning("files");
    try {
      const { blob, errors: errs, downloaded, failed } = await buildFilesOnlyZip({ onProgress });
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      downloadBlob(blob, `archivos-${ts}.zip`);
      setFilesSummary({ downloaded, failed, total: downloaded + failed });
      setErrors(errs);
    } catch (e) {
      setErrors([{ entity: "general", error: e.message }]);
    } finally {
      setRunning(null);
    }
  };

  const handleSingleEntity = async (entityName) => {
    setSingleLoading(entityName);
    try {
      const data = await exportSingleEntity(entityName);
      downloadJson(data, `${entityName}.json`);
    } catch (e) {
      setErrors((prev) => [...prev, { entity: entityName, error: e.message }]);
    } finally {
      setSingleLoading(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <Card>
          <CardContent className="py-16 flex flex-col items-center text-center gap-3">
            <Lock className="w-10 h-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Acceso restringido</h2>
            <p className="text-sm text-muted-foreground">
              La exportación completa de datos está disponible únicamente para administradores.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalRecords = summary ? summary.total_records : 0;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Exportación completa</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Exportá todos los registros y archivos para migrar a PostgreSQL. Incluye paginación completa,
          manifiestos y descarga de archivos propios.
        </p>
      </div>

      <Card>
        <CardContent className="py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div className="flex items-start gap-3">
            <FileArchive className="w-8 h-8 text-primary shrink-0" />
            <div>
              <p className="font-medium">Exportación completa (ZIP)</p>
              <p className="text-xs text-muted-foreground">
                manifest.json + data/*.json + files/ + files-manifest.json
              </p>
            </div>
          </div>
          <Button onClick={handleFullExport} disabled={!!running} className="shrink-0">
            {running === "full" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {running === "full" ? "Exportando..." : "Exportar todo"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div className="flex items-start gap-3">
            <Files className="w-8 h-8 text-primary shrink-0" />
            <div>
              <p className="font-medium">Solo archivos propios (ZIP)</p>
              <p className="text-xs text-muted-foreground">
                files/ + files-manifest.json. Útil si la exportación completa es muy pesada.
              </p>
            </div>
          </div>
          <Button onClick={handleFilesOnly} disabled={!!running} variant="outline" className="shrink-0">
            {running === "files" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {running === "files" ? "Descargando..." : "Descargar archivos"}
          </Button>
        </CardContent>
      </Card>

      {/* Progreso de entidades */}
      {running && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {running === "full" ? "Progreso de exportación" : "Progreso de archivos"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {running === "full" &&
              EXPORT_ENTITIES.map((name) => {
                const st = entityStatus[name];
                return (
                  <div key={name} className="flex items-center justify-between text-sm py-1">
                    <span className="font-mono text-xs">{name}</span>
                    {st?.status === "loading" && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                    {st?.status === "done" && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {st.count} registros
                      </Badge>
                    )}
                    {st?.status === "error" && (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        error
                      </Badge>
                    )}
                  </div>
                );
              })}
            {fileStatus.total > 0 && (
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Archivos descargados</span>
                  <span className="font-mono text-xs">
                    {fileStatus.done}/{fileStatus.total} {fileStatus.errors > 0 && `· ${fileStatus.errors} errores`}
                  </span>
                </div>
              </div>
            )}
            {zipPercent > 0 && (
              <div className="pt-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Comprimiendo ZIP</span>
                  <span className="font-mono text-xs">{zipPercent}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${zipPercent}%` }} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabla de entidades con descarga individual */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Entidades (descarga individual)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Si la exportación completa es muy pesada, descargá cada entidad por separado.
          </p>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {EXPORT_ENTITIES.map((name) => {
              const st = entityStatus[name];
              return (
                <div key={name} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <FileJson className="w-4 h-4 text-muted-foreground" />
                    <span className="font-mono text-sm">{name}.json</span>
                    {st?.status === "done" && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {st.count}
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSingleEntity(name)}
                    disabled={!!running || singleLoading === name}
                  >
                    {singleLoading === name ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    Descargar
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Resumen final */}
      {summary && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Resumen de exportación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Total registros</p>
                <p className="text-xl font-bold">{totalRecords}</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Archivos descargados</p>
                <p className="text-xl font-bold">{summary.files_count}</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Fecha</p>
                <p className="text-sm font-medium">{new Date(summary.exported_at).toLocaleString("es-AR")}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Registros por entidad</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(summary.entities).map(([ent, count]) => (
                  <Badge key={ent} variant="outline" className="font-mono text-xs">
                    {ent}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumen de archivos */}
      {filesSummary && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Resumen de archivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Descargados</p>
                <p className="text-xl font-bold text-green-700">{filesSummary.downloaded}</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Fallidos</p>
                <p className="text-xl font-bold text-destructive">{filesSummary.failed}</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Total referencias</p>
                <p className="text-xl font-bold">{filesSummary.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Errores */}
      {errors.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              Errores encontrados ({errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 max-h-60 overflow-auto">
              {errors.map((e, i) => (
                <li key={i} className="text-xs font-mono bg-destructive/5 rounded p-2 border border-destructive/20">
                  {e.entity || e.file}: {e.error}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}