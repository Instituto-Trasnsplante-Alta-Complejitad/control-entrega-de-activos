import { jsPDF } from 'npm:jspdf@4.2.1';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const { deliveryId } = await req.json();
    
    if (!deliveryId) {
      return Response.json({ error: 'deliveryId requerido' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const delivery = await base44.asServiceRole.entities.Delivery.get(deliveryId);

    if (!delivery) {
      return Response.json({ error: 'Delivery no encontrada' }, { status: 404 });
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 15;

    // Título
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('NORMATIVA CORPORATIVA DE PORTÁTILES', pageWidth / 2, yPos, { align: 'center' });

    yPos += 10;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);

    // Preámbulo
    const preamble = `Entre NEPHROLOGY S.A., domiciliada en Austria 2008, CP1425, de la Ciudad Autónoma de Buenos Aires, representada en este acto por la Sra. Gomez Coll Julieta María, DNI 36.194.528 en su carácter de apoderada (en adelante, la "Compañía") por una parte, y por la otra parte, el Sr/a. ${delivery.recipient_name || '_________________________________'}, DNI ${delivery.recipient_dni || '_________________'}, con domicilio real en ${delivery.recipient_address || '______________________________________________________________'}, ${delivery.recipient_city || '__________________________'} de Buenos Aires (en adelante, la "Empleada"), se acuerda celebrar el presente convenio, sujeto a las siguientes cláusulas y condiciones:`;

    let lines = doc.splitTextToSize(preamble, pageWidth - 20);
    doc.text(lines, 10, yPos);
    yPos += lines.length * 3 + 5;

    const addSection = (title, content) => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = 15;
      }

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(title, 10, yPos);
      yPos += 5;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      const contentLines = doc.splitTextToSize(content, pageWidth - 20);
      doc.text(contentLines, 10, yPos);
      yPos += contentLines.length * 3 + 4;
    };

    addSection('PRIMERA:', `La Compañía concede en calidad de préstamo de uso gratuito al Empleado, y este acepta, una notebook marca ${delivery.equipment_brand || '_________________'}, modelo ${delivery.equipment_model || '_________________'} con número de serie ${delivery.equipment_serial || '_________________'} para desempeñar sus tareas en la compañía.`);

    addSection('SEGUNDA:', `El responsable de un equipo portátil es aquel Empleado al que se le haya facilitado para desempeñar sus tareas. En el inventario de activos debe quedar reflejado el identificador del equipo y su responsable, así como el uso que se da al portátil, y el software y hardware que son requeridos por el Empleado.\n\nLa manipulación de los ordenadores portátiles queda restringida al departamento responsable de su mantenimiento. Por tanto, queda prohibido que el Empleado instale software o modifique las configuraciones sin autorización del departamento competente ya que estas modificaciones pueden comprometer la integridad del equipo y por extensión de los sistemas de la empresa.`);

    addSection('TERCERA:', `En los equipos portátiles hay que tener especial cuidado con la información que se almacena. Por tanto, toda la información corporativa que no sea estrictamente necesaria para el desarrollo de las tareas del Empleado no debe almacenarse en el equipo. En cualquier caso, toda la información confidencial debe almacenarse cifrada. Previo a la devolución del equipo, la información debe ser eliminada del equipo.`);

    addSection('CUARTA:', `Hay que tener especial cuidado con las redes a las que conecte el equipo portátil. Las conexiones a redes ajenas a las de la organización deben quedar reducidas a aquellas estrictamente necesarias para ejecutar las tareas propias del Empleado, y siempre que sean redes conocidas y privadas. La conexión a redes no confiables pone en peligro la seguridad del equipo y por extensión, la de toda la organización.\n\nSi se sospecha la infección por virus u otro software malicioso, el Empleado debe notificar a la mayor brevedad posible al personal técnico responsable.`);

    addSection('QUINTA:', `El equipo no debe quedar expuesto a altas temperaturas que puedan dañar sus componentes o impedir que se pueda acceder a la información almacenada en el mismo. En ningún caso se debe dejar el portátil solo en un automóvil ni dejarlo visible o fácilmente accesible. Si se trabaja con él en lugares donde al finalizar la jornada no se garantice la custodia del equipo, éste debe quedar anclado con un candado de seguridad o guardado en un armario de seguridad.\n\nEn caso de robo o pérdida del equipo el Empleado debe notificar de manera inmediata al personal técnico responsable, facilitando toda la información posible acerca del hecho.`);

    addSection('SEXTA:', `El Empleado es el responsable del equipo portátil que se le ha facilitado para el correcto desempeño de sus tareas. Por tanto, es ésta la que debe garantizar la seguridad tanto del equipo como de la información que contiene.`);

    addSection('SÉPTIMA:', `Ante la extinción del vínculo laboral, ya sea por finalización de contrato o renuncia, el Empleado se compromete a la devolución del equipo en un periodo de 2 días hábiles en igual estado al que el entregado, salvo el deterioro por el uso normal del mismo.`);

    addSection('OCTAVA:', `El Empleado deberá restituir la herramienta prestada conforme lo establecido en la cláusula anterior. Si la restitución no se realizara en la forma y términos acordados, la Empleada deberá abonar en concepto de cláusula penal la suma de $1000.- (PESOS MIL) por cada día de atraso. La herramienta prestada deberá ser devuelta en el estado en que se halle sin perjuicio de la indemnización que pudiera corresponder como consecuencia del deterioro por mal uso o uso irregular de las mismas.`);

    addSection('NOVENA:', `Si el Empleado no restituyere la cosa por haber perdido la misma o por su propia culpa, abonará a la Compañía el valor total de la misma.`);

    addSection('DÉCIMA:', `La herramienta prestada es de propiedad exclusiva de la Compañía con todos los derechos y atribuciones inherentes a ese derecho.`);

    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = 15;
    }

    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.text('Esta normativa es de obligado cumplimiento, así como todas las relativas a la seguridad de los sistemas de la información que disponga la organización.', 10, yPos);
    yPos += 15;

    // Tabla de dispositivo
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Nombre del dispositivo', 10, yPos);
    doc.text('Marca / Modelo', 60, yPos);
    doc.text('N° de Serie', 110, yPos);
    yPos += 8;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(delivery.equipment_asset || '__________________', 10, yPos);
    doc.text(`${delivery.equipment_brand} ${delivery.equipment_model}` || '__________________', 60, yPos);
    doc.text(delivery.equipment_serial || '__________________', 110, yPos);

    yPos += 15;
    doc.setFontSize(8.5);
    const confirmText = 'El Empleado confirma haber recibido el equipo en perfectas condiciones de estado y con su transformador. Asimismo, se compromete a cumplir con todas las normas establecidas en los incisos anteriores.';
    const confirmLines = doc.splitTextToSize(confirmText, pageWidth - 20);
    doc.text(confirmLines, 10, yPos);
    yPos += confirmLines.length * 3 + 10;

    // Fecha y firmas
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`EN PRUEBA DE CONFORMIDAD se firman dos ejemplares de un mismo tenor, uno para el Empleado y uno para la Compañía, en la Ciudad Autónoma de Buenos Aires al ${new Date().toLocaleDateString('es-AR')}.`, 10, yPos);

    yPos += 20;
    doc.line(10, yPos, 50, yPos);
    doc.text('Firma del Empleado', 10, yPos + 5);

    doc.line(110, yPos, 150, yPos);
    doc.text('Julieta Gomez Coll', 110, yPos + 5);
    doc.text('Gerente de Recursos Humanos y Sistemas', 100, yPos + 10);
    doc.text('Nephrology S.A.', 110, yPos + 15);

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Normativa-Portátiles-${delivery.recipient_name}-${delivery.equipment_asset}.pdf"`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});