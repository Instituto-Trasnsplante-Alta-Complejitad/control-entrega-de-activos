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

    // Usar fuente que soporte UTF-8
    doc.setFont('Times', 'normal');
    doc.setFontSize(10);
    doc.text(`Buenos Aires, ${new Date().toLocaleDateString('es-AR')}`, 15, yPos);

    yPos += 12;
    doc.setFontSize(14);
    doc.setFont('Times', 'bold');
    doc.text('NORMATIVA CORPORATIVA DE PORTÁTILES', 15, yPos);

    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('Times', 'normal');

    const paragraphs = [
      `Entre NEPHROLOGY S.A., domiciliada en Austria 2008, CP1425, de la Ciudad Autónoma de Buenos Aires, representada en este acto por la Sra. Gomez Coll Julieta María, DNI 36.194.528 en su carácter de apoderada (en adelante, la "Compañía") por una parte, y por la otra parte, el Sr/a. ${delivery.recipient_name || '___________________________'}, DNI ${delivery.recipient_dni || '__________________'}, con domicilio real en ${delivery.recipient_address || '___________________________'}, ${delivery.recipient_city || '__________________________'} de Buenos Aires (en adelante, la "Empleada"), se acuerda celebrar el presente convenio, sujeto a las siguientes cláusulas y condiciones:`,
      `PRIMERA: La Compañía concede en calidad de préstamo de uso gratuito al Empleado, y este acepta, una notebook marca ${delivery.equipment_brand || '__________________'}, modelo ${delivery.equipment_model || '__________________'} con número de serie ${delivery.equipment_serial || '__________________'} para desempeñar sus tareas en la compañía.`,
      `SEGUNDA: El responsable de un equipo portátil es aquel Empleado al que se le haya facilitado para desempeñar sus funciones. Queda establecido que el equipamiento informático es propiedad de la Compañía, siendo cedido en uso al Empleado.`,
      `TERCERA: El Empleado se compromete a cuidar y mantener el equipamiento en buen estado de conservación y funcionamiento, siendo responsable por el daño, pérdida o sustracción del mismo durante el período en que lo tenga en su poder.`,
      `CUARTA: El Empleado se obliga a utilizar el equipo exclusivamente para las tareas asignadas por la Compañía y conforme a las políticas corporativas de seguridad informática.`,
      `QUINTA: El Empleado se obliga a respetar todas las políticas de seguridad informática, confidencialidad y protección de datos establecidas por la Compañía.`,
      `SEXTA: El Empleado deberá devolver el equipamiento informático en perfectas condiciones al momento de cesación de la relación laboral o cuando la Compañía lo requiera.`,
      `SÉPTIMA: La Compañía se reserva el derecho de realizar inspecciones periódicas al equipamiento asignado.`,
      `En testimonio de lo anterior, las partes firman el presente convenio en la fecha indicada al inicio del presente documento.`
    ];

    paragraphs.forEach(para => {
      const lines = doc.splitTextToSize(para, pageWidth - 30);
      doc.text(lines, 15, yPos);
      yPos += lines.length * 5 + 5;

      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 15;
      }
    });

    yPos += 10;
    doc.text('Firma Compañía: _____________________', 15, yPos);
    yPos += 10;
    doc.text(`Firma Empleado: _____________________`, 15, yPos);

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Contrato-${delivery.recipient_name}-${delivery.equipment_asset}.pdf"`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});