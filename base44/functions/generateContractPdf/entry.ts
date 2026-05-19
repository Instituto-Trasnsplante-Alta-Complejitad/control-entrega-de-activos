import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import PizZip from 'npm:pizzip@3.2.0';
import Docxtemplater from 'npm:docxtemplater@3.68.7';
import { jsPDF } from 'npm:jspdf@4.2.1';

const TEMPLATE_URL = 'https://media.base44.com/files/public/6a0b41b518760c50f55478db/0e11d6dd2_Plantilla_Base44_Notebook_Placeholders.docx';

function formatDate(dateStr) {
  if (!dateStr) return new Date().toLocaleDateString('es-AR');
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
      fecha: fecha,
      fecha_firma: fecha,
      empleado_nombre: delivery.recipient_name || '',
      empleado_dni: delivery.recipient_dni || '',
      empleado_domicilio: delivery.recipient_address || '',
      empleado_ciudad: delivery.recipient_city || '',
      equipo_nombre: delivery.equipment_asset || '',
      equipo_marca: delivery.equipment_brand || '',
      equipo_modelo: delivery.equipment_model || '',
      equipo_marca_modelo: `${delivery.equipment_brand || ''} ${delivery.equipment_model || ''}`.trim(),
      equipo_serie: delivery.equipment_serial || '',
      responsable_rrhh: 'Julieta Gomez Coll',
    };

    // Download template
    const templateRes = await fetch(TEMPLATE_URL);
    if (!templateRes.ok) {
      return Response.json({ error: 'No se pudo descargar el template', status: templateRes.status }, { status: 500 });
    }
    const templateBuffer = await templateRes.arrayBuffer();
    console.log('Template downloaded, size:', templateBuffer.byteLength);

    // Fill DOCX template
    // Word splits {{tag}} across multiple XML runs. We extract plain text per paragraph,
    // resolve tags there, then inject the result back.
    // The real fix: scan all <w:t> nodes and concatenate them, then inject resolved text.
    
    function fixDocxXml(xml) {
      // Step 1: collect all w:t text nodes and their positions in order to rebuild
      // The standard approach: replace entire paragraph XML text while keeping structure
      // Here we use a simpler heuristic: find <w:t> contents that together form a tag
      // by looking at consecutive runs and merging their text content.
      
      // Build a flat view of the XML with all w:t replaced by a sentinel that includes index
      let counter = 0;
      const texts = [];
      const withSentinels = xml.replace(/(<w:t(?:\s[^>]*)?>)([\s\S]*?)(<\/w:t>)/g, (match, open, content, close) => {
        const idx = counter++;
        texts.push(content);
        return `${open}__SENTINEL_${idx}__${close}`;
      });
      
      // Join all texts and fix broken tags (find {{..}} spans across sentinels)
      const joined = texts.join('');
      
      // Now reconstruct: replace sentinels back but with corrected content
      // The trick: find tags that span across multiple sentinels and consolidate
      // We do this by computing a cumulative string and identifying which sentinel
      // positions correspond to tag boundaries
      
      // Simple approach: reconstruct each sentinel's text by scanning the joined string
      let pos = 0;
      const sentinelLengths = texts.map(t => t.length);
      const sentinelStarts = [];
      for (let i = 0; i < texts.length; i++) {
        sentinelStarts.push(pos);
        pos += texts[i].length;
      }
      
      // Find all {{tag}} positions in the joined string
      const tagRegex = /\{\{[^{}]+\}\}/g;
      const tags = [];
      let tm;
      while ((tm = tagRegex.exec(joined)) !== null) {
        tags.push({ start: tm.index, end: tm.index + tm[0].length, text: tm[0] });
      }
      
      // For each tag, figure out which sentinels it spans and consolidate
      const newTexts = [...texts];
      for (const tag of tags) {
        // Find first and last sentinel that overlap with this tag
        let firstSentinel = -1, lastSentinel = -1;
        for (let i = 0; i < texts.length; i++) {
          const sStart = sentinelStarts[i];
          const sEnd = sStart + texts[i].length;
          if (sEnd > tag.start && sStart < tag.end) {
            if (firstSentinel === -1) firstSentinel = i;
            lastSentinel = i;
          }
        }
        if (firstSentinel === -1 || firstSentinel === lastSentinel) continue;
        
        // Merge: put full text in first sentinel, empty others
        // Rebuild the first sentinel's text: text before tag.start + tag.text + text after tag.end
        const firstStart = sentinelStarts[firstSentinel];
        const lastEnd = sentinelStarts[lastSentinel] + texts[lastSentinel].length;
        const beforeTag = joined.substring(firstStart, tag.start);
        const afterTag = joined.substring(tag.end, lastEnd);
        newTexts[firstSentinel] = beforeTag + tag.text + afterTag;
        for (let i = firstSentinel + 1; i <= lastSentinel; i++) {
          newTexts[i] = '';
        }
      }
      
      // Rebuild XML with new sentinel values
      let idx2 = 0;
      return withSentinels.replace(/__SENTINEL_(\d+)__/g, (match, num) => {
        return newTexts[parseInt(num)];
      });
    }

    let zip;
    let rawDocXml = '';
    try {
      zip = new PizZip(templateBuffer);
      rawDocXml = zip.files['word/document.xml'].asText();

      // DEBUG: return XML snippet
      if (format === 'debug') {
        const idx = rawDocXml.indexOf('{');
        return Response.json({ 
          snippet: idx >= 0 ? rawDocXml.substring(Math.max(0, idx - 50), idx + 600) : 'NOT FOUND',
          len: rawDocXml.length 
        });
      }

      zip.file('word/document.xml', fixDocxXml(rawDocXml));
    } catch (e) {
      return Response.json({ error: 'PizZip error: ' + e.message }, { status: 500 });
    }

    let doc;
    try {
      doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => '',
      });
      console.log('Docxtemplater created OK');
    } catch (e) {
      const details = e.properties?.errors?.map(x => x.message || String(x)) || [e.message];
      return Response.json({ error: 'Docxtemplater init error', details }, { status: 500 });
    }

    try {
      doc.render(data);
      console.log('Render OK');
    } catch (e) {
      const details = e.properties?.errors?.map(x => x.message || String(x)) || [e.message];
      return Response.json({ error: 'Render error', details }, { status: 500 });
    }

    const docxBuffer = doc.getZip().generate({ type: 'uint8array' });
    const fileName = `Normativa-${delivery.recipient_name}-${delivery.equipment_asset}`;

    if (format === 'docx') {
      return new Response(docxBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${fileName}.docx"`,
        },
      });
    }

    // Generate PDF from the filled content
    const pdfDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdfDoc.internal.pageSize.getWidth();
    const pageHeight = pdfDoc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let y = 25;

    const addText = (text, opts = {}) => {
      const { bold = false, italic = false, size = 10, center = false, indent = 0 } = opts;
      pdfDoc.setFont('helvetica', bold ? (italic ? 'bolditalic' : 'bold') : (italic ? 'italic' : 'normal'));
      pdfDoc.setFontSize(size);
      const lines = pdfDoc.splitTextToSize(text, maxWidth - indent);
      for (const line of lines) {
        if (y > pageHeight - 20) { pdfDoc.addPage(); y = 20; }
        const x = center ? pageWidth / 2 : margin + indent;
        pdfDoc.text(line, x, y, center ? { align: 'center' } : {});
        y += size * 0.45;
      }
    };

    const gap = (mm = 4) => { y += mm; };

    // Header
    addText(`Buenos Aires, ${data.fecha}`, { size: 10 });
    gap(6);
    addText('NORMATIVA CORPORATIVA DE PORTÁTILES', { bold: true, size: 12, center: true });
    gap(6);

    // Preamble
    addText(`Entre NEPHROLOGY S.A., domiciliada en Austria 2008, CP1425, de la Ciudad Autónoma de Buenos Aires, representada en este acto por la Sra. Gomez Coll Julieta María, DNI 36.194.528 en su carácter de apoderada (en adelante, la "Compañía") por una parte, y por la otra parte, el Sr/a. ${data.empleado_nombre}, DNI ${data.empleado_dni}, con domicilio real en ${data.empleado_domicilio}, ${data.empleado_ciudad} de Buenos Aires (en adelante, la "Empleada"), se acuerda celebrar el presente convenio, sujeto a las siguientes cláusulas y condiciones:`);
    gap();

    const clauses = [
      ['PRIMERA:', `La Compañía concede en calidad de préstamo de uso gratuito al Empleado, y este acepta, una notebook marca ${data.equipo_marca}, modelo ${data.equipo_modelo} con número de serie ${data.equipo_serie} para desempeñar sus tareas en la compañía.`],
      ['SEGUNDA:', `El responsable de un equipo portátil es aquel Empleado al que se le haya facilitado para desempeñar sus tareas. En el inventario de activos debe quedar reflejado el identificador del equipo y su responsable, así como el uso que se da al portátil, y el software y hardware que son requeridos por el Empleado.\n\nLa manipulación de los ordenadores portátiles queda restringida al departamento responsable de su mantenimiento. Por tanto, queda prohibido que el Empleado instale software o modifique las configuraciones sin autorización del departamento competente ya que estas modificaciones pueden comprometer la integridad del equipo y por extensión de los sistemas de la empresa.`],
      ['TERCERA:', `En los equipos portátiles hay que tener especial cuidado con la información que se almacena. Por tanto, toda la información corporativa que no sea estrictamente necesaria para el desarrollo de las tareas del Empleado no debe almacenarse en el equipo. En cualquier caso, toda la información confidencial debe almacenarse cifrada. Previo a la devolución del equipo, la información debe ser eliminada del equipo.`],
      ['CUARTA:', `Hay que tener especial cuidado con las redes a las que conecte el equipo portátil. Las conexiones a redes ajenas a las de la organización deben quedar reducidas a aquellas estrictamente necesarias para ejecutar las tareas propias del Empleado, y siempre que sean redes conocidas y privadas. La conexión a redes no confiables pone en peligro la seguridad del equipo y por extensión, la de toda la organización.\n\nSi se sospecha la infección por virus u otro software malicioso, el Empleado debe notificar a la mayor brevedad posible al personal técnico responsable.`],
      ['QUINTA:', `El equipo no debe quedar expuesto a altas temperaturas que puedan dañar sus componentes o impedir que se pueda acceder a la información almacenada en el mismo.\n\nEn ningún caso se debe dejar el portátil solo en un automóvil ni dejarlo visible o fácilmente accesible. Si se trabaja con él en lugares donde al finalizar la jornada no se garantice la custodia del equipo, éste debe quedar anclado con un candado de seguridad o guardado en un armario de seguridad.\n\nEn caso de robo o pérdida del equipo el Empleado debe notificar de manera inmediata al personal técnico responsable, facilitando toda la información posible acerca del hecho.`],
      ['SEXTA:', `El Empleado es el responsable del equipo portátil que se le ha facilitado para el correcto desempeño de sus tareas. Por tanto, es ésta la que debe garantizar la seguridad tanto del equipo como de la información que contiene.`],
      ['SÉPTIMA:', `Ante la extinción del vínculo laboral, ya sea por finalización de contrato o renuncia, el Empleado se compromete a la devolución del equipo en un periodo de 2 días hábiles en igual estado al que el entregado, salvo el deterioro por el uso normal del mismo.`],
      ['OCTAVA:', `El Empleado deberá restituir la herramienta prestada conforme lo establecido en la cláusula anterior. Si la restitución no se realizara en la forma y términos acordados, la Empleada deberá abonar en concepto de cláusula penal la suma de $1000.- (PESOS MIL) por cada día de atraso. La herramienta prestada deberá ser devuelta en el estado en que se halle sin perjuicio de la indemnización que pudiera corresponder como consecuencia del deterioro por mal uso o uso irregular de las mismas.`],
      ['NOVENA:', `Si el Empleado no restituyere la cosa por haber perdido la misma o por su propia culpa, abonará a la Compañía el valor total de la misma.`],
      ['DÉCIMA:', `La herramienta prestada es de propiedad exclusiva de la Compañía con todos los derechos y atribuciones inherentes a ese derecho.`],
    ];

    for (const [title, content] of clauses) {
      if (y > pageHeight - 30) { pdfDoc.addPage(); y = 20; }
      addText(title, { bold: true, size: 10 });
      y += 1;
      // Handle paragraphs separated by \n\n
      const paragraphs = content.split('\n\n');
      for (const p of paragraphs) {
        addText(p, { size: 10 });
        gap(2);
      }
      gap(2);
    }

    gap(2);
    addText('Esta normativa es de obligado cumplimiento, así como todas las relativas a la seguridad de los sistemas de la información que disponga la organización.', { italic: true });
    gap(4);
    addText('El Empleado confirma haber recibido el equipo en perfectas condiciones de estado y con su transformador. Asimismo, se compromete a cumplir con todas las normas establecidas en los incisos anteriores.');
    gap(6);
    addText(`EN PRUEBA DE CONFORMIDAD se firman dos ejemplares de un mismo tenor, uno para el Empleado y uno para la Compañía, en la Ciudad Autónoma de Buenos Aires al ${data.fecha_firma}.`);

    // Signature lines
    gap(15);
    if (y > pageHeight - 30) { pdfDoc.addPage(); y = 20; }
    pdfDoc.setDrawColor(0);
    pdfDoc.line(margin, y, margin + 60, y);
    pdfDoc.line(pageWidth / 2 + 10, y, pageWidth / 2 + 70, y);
    y += 5;
    addText('Firma del Empleado', { size: 9 });
    pdfDoc.setFont('helvetica', 'normal');
    pdfDoc.setFontSize(9);
    pdfDoc.text('Julieta Gomez Coll', pageWidth / 2 + 10, y); y += 4;
    pdfDoc.text('Gerente de RR.HH. y Sistemas', pageWidth / 2 + 10, y); y += 4;
    pdfDoc.text('Nephrology S.A.', pageWidth / 2 + 10, y);

    const pdfBytes = pdfDoc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}.pdf"`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});