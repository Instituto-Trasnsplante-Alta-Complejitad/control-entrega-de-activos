import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function formatDate(dateStr) {
  if (!dateStr) return new Date().toLocaleDateString('es-AR');
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function buildHtml(data) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Normativa Corporativa de Portátiles</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Libre Baskerville', Georgia, 'Times New Roman', Times, serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #000;
    background: #fff;
  }

  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 25mm 25mm 20mm 25mm;
  }

  h1 {
    font-size: 13pt;
    font-weight: bold;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 18pt;
  }

  .fecha {
    text-align: right;
    margin-bottom: 16pt;
    font-size: 11pt;
  }

  .intro {
    text-align: justify;
    margin-bottom: 14pt;
    hyphens: auto;
  }

  .clausula {
    margin-bottom: 12pt;
    text-align: justify;
    hyphens: auto;
  }

  .clausula-titulo {
    font-weight: bold;
    display: inline;
  }

  .clausula-texto {
    display: inline;
  }

  .nota-final {
    font-style: italic;
    text-align: justify;
    margin-top: 12pt;
    margin-bottom: 10pt;
  }

  .confirmacion {
    text-align: justify;
    margin-bottom: 10pt;
  }

  .conformidad {
    text-align: justify;
    margin-top: 12pt;
    margin-bottom: 30pt;
  }

  .firmas {
    display: flex;
    justify-content: space-between;
    margin-top: 20pt;
    gap: 40px;
  }

  .firma-bloque {
    flex: 1;
    border-top: 1px solid #000;
    padding-top: 6pt;
    font-size: 10pt;
  }
</style>
</head>
<body>
<div class="page">

  <p class="fecha">Buenos Aires, ${data.fecha}</p>

  <h1>Normativa Corporativa de Portátiles</h1>

  <p class="intro">
    Entre <strong>NEPHROLOGY S.A.</strong>, domiciliada en Austria 2008, CP1425, de la Ciudad Autónoma de Buenos Aires,
    representada en este acto por la Sra. Gomez Coll Julieta María, DNI 36.194.528 en su carácter de apoderada
    (en adelante, la <em>"Compañía"</em>) por una parte, y por la otra parte, el Sr/a.
    <strong>${data.empleado_nombre}</strong>, DNI <strong>${data.empleado_dni}</strong>,
    con domicilio real en ${data.empleado_domicilio}, ${data.empleado_ciudad} de Buenos Aires
    (en adelante, el <em>"Empleado"</em>), se acuerda celebrar el presente convenio, sujeto a las siguientes
    cláusulas y condiciones:
  </p>

  <div class="clausula">
    <span class="clausula-titulo">PRIMERA: </span>
    <span class="clausula-texto">La Compañía concede en calidad de préstamo de uso gratuito al Empleado, y este acepta, una notebook marca
    <strong>${data.equipo_marca}</strong>, modelo <strong>${data.equipo_modelo}</strong> con número de serie
    <strong>${data.equipo_serie}</strong> para desempeñar sus tareas en la compañía.</span>
  </div>

  <div class="clausula">
    <span class="clausula-titulo">SEGUNDA: </span>
    <span class="clausula-texto">El responsable de un equipo portátil es aquel Empleado al que se le haya facilitado para desempeñar sus tareas.
    En el inventario de activos debe quedar reflejado el identificador del equipo y su responsable, así como el uso que
    se da al portátil, y el software y hardware que son requeridos por el Empleado.</span>
    <br><br>
    <span class="clausula-texto">La manipulación de los ordenadores portátiles queda restringida al departamento responsable de su mantenimiento.
    Por tanto, queda prohibido que el Empleado instale software o modifique las configuraciones sin autorización del
    departamento competente ya que estas modificaciones pueden comprometer la integridad del equipo y por extensión
    de los sistemas de la empresa.</span>
  </div>

  <div class="clausula">
    <span class="clausula-titulo">TERCERA: </span>
    <span class="clausula-texto">En los equipos portátiles hay que tener especial cuidado con la información que se almacena. Por tanto, toda
    la información corporativa que no sea estrictamente necesaria para el desarrollo de las tareas del Empleado no
    debe almacenarse en el equipo. En cualquier caso, toda la información confidencial debe almacenarse cifrada.
    Previo a la devolución del equipo, la información debe ser eliminada del equipo.</span>
  </div>

  <div class="clausula">
    <span class="clausula-titulo">CUARTA: </span>
    <span class="clausula-texto">Hay que tener especial cuidado con las redes a las que conecte el equipo portátil. Las conexiones a redes
    ajenas a las de la organización deben quedar reducidas a aquellas estrictamente necesarias para ejecutar las
    tareas propias del Empleado, y siempre que sean redes conocidas y privadas. La conexión a redes no confiables
    pone en peligro la seguridad del equipo y por extensión, la de toda la organización.</span>
    <br><br>
    <span class="clausula-texto">Si se sospecha la infección por virus u otro software malicioso, el Empleado debe notificar a la mayor
    brevedad posible al personal técnico responsable.</span>
  </div>

  <div class="clausula">
    <span class="clausula-titulo">QUINTA: </span>
    <span class="clausula-texto">El equipo no debe quedar expuesto a altas temperaturas que puedan dañar sus componentes o impedir que
    se pueda acceder a la información almacenada en el mismo.</span>
    <br><br>
    <span class="clausula-texto">En ningún caso se debe dejar el portátil solo en un automóvil ni dejarlo visible o fácilmente accesible.
    Si se trabaja con él en lugares donde al finalizar la jornada no se garantice la custodia del equipo, éste debe
    quedar anclado con un candado de seguridad o guardado en un armario de seguridad.</span>
    <br><br>
    <span class="clausula-texto">En caso de robo o pérdida del equipo el Empleado debe notificar de manera inmediata al personal técnico
    responsable, facilitando toda la información posible acerca del hecho.</span>
  </div>

  <div class="clausula">
    <span class="clausula-titulo">SEXTA: </span>
    <span class="clausula-texto">El Empleado es el responsable del equipo portátil que se le ha facilitado para el correcto desempeño de
    sus tareas. Por tanto, es éste quien debe garantizar la seguridad tanto del equipo como de la información
    que contiene.</span>
  </div>

  <div class="clausula">
    <span class="clausula-titulo">SÉPTIMA: </span>
    <span class="clausula-texto">Ante la extinción del vínculo laboral, ya sea por finalización de contrato o renuncia, el Empleado se
    compromete a la devolución del equipo en un periodo de 2 días hábiles en igual estado al que el entregado,
    salvo el deterioro por el uso normal del mismo.</span>
  </div>

  <div class="clausula">
    <span class="clausula-titulo">OCTAVA: </span>
    <span class="clausula-texto">El Empleado deberá restituir la herramienta prestada conforme lo establecido en la cláusula anterior.
    Si la restitución no se realizara en la forma y términos acordados, el Empleado deberá abonar en concepto
    de cláusula penal la suma de $1000.- (PESOS MIL) por cada día de atraso. La herramienta prestada deberá
    ser devuelta en el estado en que se halle sin perjuicio de la indemnización que pudiera corresponder como
    consecuencia del deterioro por mal uso o uso irregular de las mismas.</span>
  </div>

  <div class="clausula">
    <span class="clausula-titulo">NOVENA: </span>
    <span class="clausula-texto">Si el Empleado no restituyere la cosa por haber perdido la misma o por su propia culpa, abonará a la
    Compañía el valor total de la misma.</span>
  </div>

  <div class="clausula">
    <span class="clausula-titulo">DÉCIMA: </span>
    <span class="clausula-texto">La herramienta prestada es de propiedad exclusiva de la Compañía con todos los derechos y atribuciones
    inherentes a ese derecho.</span>
  </div>

  <p class="nota-final">
    Esta normativa es de obligado cumplimiento, así como todas las relativas a la seguridad de los sistemas
    de la información que disponga la organización.
  </p>

  <p class="confirmacion">
    El Empleado confirma haber recibido el equipo en perfectas condiciones de estado y con su transformador.
    Asimismo, se compromete a cumplir con todas las normas establecidas en los incisos anteriores.
  </p>

  <p class="conformidad">
    <strong>EN PRUEBA DE CONFORMIDAD</strong> se firman dos ejemplares de un mismo tenor, uno para el Empleado
    y uno para la Compañía, en la Ciudad Autónoma de Buenos Aires al ${data.fecha_firma}.
  </p>

  <div class="firmas">
    <div class="firma-bloque">
      <p>${data.empleado_nombre}</p>
      <p>DNI: ${data.empleado_dni}</p>
      <p>Empleado</p>
    </div>
    <div class="firma-bloque">
      <p>Julieta Gomez Coll</p>
      <p>Gerente de RR.HH. y Sistemas</p>
      <p>Nephrology S.A.</p>
    </div>
  </div>

</div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const { deliveryId, format = 'pdf' } = await req.json();

    if (!deliveryId) {
      return Response.json({ error: 'deliveryId requerido' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const delivery = await base44.asServiceRole.entities.Delivery.get(deliveryId);

    if (!delivery) {
      return Response.json({ error: 'Delivery no encontrada' }, { status: 404 });
    }

    const fecha = formatDate(delivery.delivery_date);

    const data = {
      fecha,
      fecha_firma: fecha,
      empleado_nombre: delivery.recipient_name || '',
      empleado_dni: delivery.recipient_dni || '',
      empleado_domicilio: delivery.recipient_address || '',
      empleado_ciudad: delivery.recipient_city || '',
      equipo_marca: delivery.equipment_brand || '',
      equipo_modelo: delivery.equipment_model || '',
      equipo_serie: delivery.equipment_serial || '',
      equipo_asset: delivery.equipment_asset || '',
    };

    const html = buildHtml(data);
    const fileName = `Normativa-${delivery.recipient_name}-${delivery.equipment_asset}`;

    // HTML format: return directly for browser printing
    if (format === 'html') {
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `inline; filename="${fileName}.html"`,
        },
      });
    }

    // PDF: return HTML inline — user opens in browser and prints to PDF (Ctrl+P)
    // This guarantees 100% UTF-8 fidelity with no external dependencies
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${fileName}.html"`,
        'X-Print-To-PDF': 'true',
      },
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});