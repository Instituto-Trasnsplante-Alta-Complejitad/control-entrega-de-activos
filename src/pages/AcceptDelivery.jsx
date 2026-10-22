import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, FileText, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { withAppBasePath } from "@/lib/app-path";

function generateContract(delivery) {
  const dateStr = delivery.delivery_date
    ? format(new Date(/^\d{4}-\d{2}-\d{2}$/.test(delivery.delivery_date) ? `${delivery.delivery_date}T00:00:00` : delivery.delivery_date), "d 'de' MMMM 'de' yyyy", { locale: es })
    : "___________________";

  return `Buenos Aires, ${dateStr}

NORMATIVA CORPORATIVA DE PORTATILES

Entre NEPHROLOGY S.A., domiciliada en Austria 2008, CP1425, de la Ciudad Autónoma de Buenos Aires, representada en este acto por la Sra. Gomez Coll Julieta María, DNI 36.194.528 en su carácter de apoderada (en adelante, la "Compañía") por una parte, y por la otra parte, el Sr/a. ${delivery.recipient_name || "___________________"}, DNI ${delivery.recipient_dni || "___________________"}, con domicilio real en ${delivery.recipient_address || "___________________"}, ${delivery.recipient_city || "___________________"} de Buenos Aires (en adelante, el "Empleado"), se acuerda celebrar el presente convenio, sujeto a las siguientes cláusulas y condiciones:

PRIMERA: La Compañía concede en calidad de préstamo de uso gratuito al Empleado, y este acepta, una ${delivery.equipment_type || "notebook"} marca ${delivery.equipment_brand || "___________________"}, modelo ${delivery.equipment_model || "___________________"} con número de serie ${delivery.equipment_serial || "___________________"} para desempeñar sus tareas en la compañía.

SEGUNDA: El responsable de un equipo portátil es aquel Empleado al que se le haya facilitado para desempeñar sus tareas. En el inventario de activos debe quedar reflejado el identificador del equipo y su responsable, así como el uso que se da al portátil, y el software y hardware que son requeridos por el Empleado.

La manipulación de los ordenadores portátiles queda restringida al departamento responsable de su mantenimiento. Por tanto, queda prohibido que el Empleado instale software o modifique las configuraciones sin autorización del departamento competente ya que estas modificaciones pueden comprometer la integridad del equipo y por extensión de los sistemas de la empresa.

TERCERA: En los equipos portátiles hay que tener especial cuidado con la información que se almacena. Por tanto, toda la información corporativa que no sea estrictamente necesaria para el desarrollo de las tareas del Empleado no debe almacenarse en el equipo. En cualquier caso, toda la información confidencial debe almacenarse cifrada. Previo a la devolución del equipo, la información debe ser eliminada del equipo.

CUARTA: Hay que tener especial cuidado con las redes a las que conecte el equipo portátil. Las conexiones a redes ajenas a las de la organización deben quedar reducidas a aquellas estrictamente necesarias para ejecutar las tareas propias del Empleado, y siempre que sean redes conocidas y privadas. La conexión a redes no confiables pone en peligro la seguridad del equipo y por extensión, la de toda la organización.

Si se sospecha la infección por virus u otro software malicioso, el Empleado debe notificar a la mayor brevedad posible al personal técnico responsable.

QUINTA: El equipo no debe quedar expuesto a altas temperaturas que puedan dañar sus componentes o impedir que se pueda acceder a la información almacenada en el mismo.

En ningún caso se debe dejar el portátil solo en un automóvil ni dejarlo visible o fácilmente accesible. Si se trabaja con él en lugares donde al finalizar la jornada no se garantice la custodia del equipo, éste debe quedar anclado con un candado de seguridad o guardado en un armario de seguridad.

En caso de robo o pérdida del equipo el Empleado debe notificar de manera inmediata al personal técnico responsable, facilitando toda la información posible acerca del hecho.

SEXTA: El Empleado es el responsable del equipo portátil que se le ha facilitado para el correcto desempeño de sus tareas. Por tanto, es éste el que debe garantizar la seguridad tanto del equipo como de la información que contiene.

SEPTIMA: Ante la extinción del vínculo laboral, ya sea por finalización de contrato o renuncia, el Empleado se compromete a la devolución del equipo en un periodo de 2 días hábiles en igual estado al que el entregado, salvo el deterioro por el uso normal del mismo.

OCTAVA: El Empleado deberá restituir la herramienta prestada conforme lo establecido en la cláusula anterior. Si la restitución no se realizara en la forma y términos acordados, el Empleado deberá abonar en concepto de cláusula penal la suma de $1000.- (PESOS MIL) por cada día de atraso. La herramienta prestada deberá ser devuelta en el estado en que se halle sin perjuicio de la indemnización que pudiera corresponder como consecuencia del deterioro por mal uso o uso irregular de las mismas.

NOVENA: Si el Empleado no restituyere la cosa por haber perdido la misma o por su propia culpa, abonará a la Compañía el valor total de la misma.

DECIMA: La herramienta prestada es de propiedad exclusiva de la Compañía con todos los derechos y atribuciones inherentes a ese derecho.

Esta normativa es de obligado cumplimiento, así como todas las relativas a la seguridad de los sistemas de la información que disponga la organización.

El Empleado confirma haber recibido el equipo en perfectas condiciones de estado y con su transformador. Asimismo, se compromete a cumplir con todas las normas establecidas en los incisos anteriores.

EN PRUEBA DE CONFORMIDAD se firman dos ejemplares de un mismo tenor, uno para el Empleado y uno para la Compañía, en la Ciudad Autónoma de Buenos Aires al ${dateStr}.`;
}

export default function AcceptDelivery() {
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    const loadDelivery = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const deliveryId = params.get("id");

      if (!token || !deliveryId) {
        setError("Enlace inválido");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          withAppBasePath(`/api/public/deliveries/${encodeURIComponent(deliveryId)}/acceptance?token=${encodeURIComponent(token)}`),
        );
        const found = await response.json().catch(() => null);

        if (!response.ok || !found) {
          setError(found?.message || "Entrega no encontrada");
        } else if (found.status === "aceptado") {
          setResult("already_accepted");
          setDelivery(found);
        } else if (found.status === "firmado") {
          setResult("already_signed");
          setDelivery(found);
        } else if (found.status === "rechazado") {
          setError("Este contrato fue rechazado y ya no admite aceptación");
        } else if (found.status === "devuelto") {
          setError("La entrega asociada a este contrato fue devuelta");
        } else {
          setDelivery(found);
        }
      } catch {
        setError("No se pudo consultar la entrega");
      }
      setLoading(false);
    };
    loadDelivery();
  }, []);

  const handleAccept = async () => {
    setProcessing(true);
    setSubmitError(null);
    try {
      const token = new URLSearchParams(window.location.search).get("token");
      const response = await fetch(withAppBasePath(`/api/public/deliveries/${encodeURIComponent(delivery.id)}/acceptance`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || "No se pudo registrar la aceptación");
      setResult("accepted");
    } catch (acceptanceError) {
      setSubmitError(acceptanceError.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold">{error}</h2>
            <p className="text-sm text-muted-foreground mt-2">No fue posible abrir el contrato con este enlace.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (result === "accepted" || result === "already_accepted" || result === "already_signed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground">
              {result === "already_signed"
                ? "Contrato ya firmado"
                : result === "already_accepted"
                  ? "Contrato ya aceptado en línea"
                  : "¡Contrato aceptado!"}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {result === "already_signed"
                ? "La administración registró previamente la firma manual de este contrato."
                : result === "already_accepted"
                  ? "Este contrato ya fue aceptado digitalmente."
                  : "Tu aceptación quedó registrada. Podés cerrar esta ventana."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center">
          <FileText className="w-10 h-10 text-primary mx-auto mb-3" />
          <h1 className="text-xl font-bold">Constancia de Entrega de Equipo</h1>
          <p className="text-sm text-muted-foreground mt-1">Revisá el contrato y aceptá para confirmar la recepción</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Detalles del equipo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Destinatario:</span> <span className="font-medium">{delivery.recipient_name}</span></div>
              <div><span className="text-muted-foreground">Equipo:</span> <span className="font-medium">{delivery.equipment_brand} {delivery.equipment_model}</span></div>
              <div><span className="text-muted-foreground">N° Serie:</span> <span className="font-mono">{delivery.equipment_serial}</span></div>
              <div><span className="text-muted-foreground">N° Activo:</span> <span className="font-mono">{delivery.equipment_asset}</span></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contrato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-4 md:p-6 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-xs leading-relaxed font-inter text-foreground">
                {generateContract(delivery)}
              </pre>
            </div>
          </CardContent>
        </Card>

        {submitError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}. Podés volver a intentarlo.
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={handleAccept} disabled={processing} className="flex-1 gap-2" size="lg">
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {processing ? "Procesando..." : "Acepto el contrato"}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Al aceptar, confirmás que recibiste el equipo en condiciones y te comprometés a cumplir con las cláusulas del contrato.
        </p>
      </div>
    </div>
  );
}
