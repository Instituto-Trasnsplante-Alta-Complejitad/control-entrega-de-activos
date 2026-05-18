import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    console.log('[INIT] Iniciando proceso de envío de email...');
    
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    console.log('[AUTH] Usuario autenticado:', user?.email);
    if (!user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { deliveryId } = await req.json();
    console.log('[PAYLOAD] deliveryId recibido:', deliveryId);
    if (!deliveryId) {
      return Response.json({ error: 'Falta deliveryId' }, { status: 400 });
    }

    console.log('[DB] Buscando entrega con ID:', deliveryId);
    const deliveries = await base44.asServiceRole.entities.Delivery.filter({ id: deliveryId });
    const delivery = deliveries[0];
    console.log('[DB] Entrega encontrada:', { recipient_email: delivery?.recipient_email, recipient_name: delivery?.recipient_name });
    if (!delivery) {
      console.error('[ERROR] Entrega no encontrada para ID:', deliveryId);
      return Response.json({ error: 'Entrega no encontrada' }, { status: 404 });
    }

    const appUrl = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^/]*$/, '') || '';
    const acceptUrl = `${appUrl}/aceptar?token=${delivery.acceptance_token}&id=${delivery.id}`;

    const dateStr = delivery.delivery_date
      ? new Date(delivery.delivery_date).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'la fecha indicada';

    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; font-weight: 600; }
    .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px; }
    .greeting { font-size: 16px; color: #1e293b; margin-bottom: 16px; }
    .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #64748b; font-size: 13px; }
    .info-value { color: #1e293b; font-size: 13px; font-weight: 600; }
    .contract-section { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; font-size: 12px; line-height: 1.7; color: #374151; max-height: 300px; overflow-y: auto; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 24px 0; }
    .footer { padding: 24px 32px; background: #f8fafc; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Constancia de Entrega de Equipo</h1>
      <p>NEPHROLOGY S.A.</p>
    </div>
    <div class="body">
      <p class="greeting">Hola <strong>${delivery.recipient_name}</strong>,</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        Se te ha asignado un equipo de la compañía. A continuación encontrarás los detalles y el contrato de entrega.
        Por favor revisalo y hacé clic en el botón para aceptar.
      </p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Equipo</span>
          <span class="info-value">${delivery.equipment_brand} ${delivery.equipment_model}</span>
        </div>
        <div class="info-row">
          <span class="info-label">N° Activo</span>
          <span class="info-value">${delivery.equipment_asset}</span>
        </div>
        <div class="info-row">
          <span class="info-label">N° Serie</span>
          <span class="info-value">${delivery.equipment_serial}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Fecha de Entrega</span>
          <span class="info-value">${dateStr}</span>
        </div>
      </div>

      <p style="color: #475569; font-size: 14px;">Para aceptar la entrega y confirmar que recibiste el equipo en condiciones, hacé clic en el siguiente botón:</p>
      
      <div style="text-align: center;">
        <a href="${acceptUrl}" class="btn" style="color: #ffffff;">Revisar y Aceptar Contrato</a>
      </div>
      
      <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
        Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br>
        <a href="${acceptUrl}" style="color: #2563eb; word-break: break-all;">${acceptUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p>NEPHROLOGY S.A. — Austria 2008, CABA</p>
      <p>Este es un email automático, por favor no respondas a este mensaje.</p>
    </div>
  </div>
</body>
</html>`;

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    console.log('[CONFIG] Verificando RESEND_API_KEY...');
    if (!resendApiKey) {
      console.error('[ERROR] RESEND_API_KEY no configurado');
      throw new Error('RESEND_API_KEY no configurado');
    }
    console.log('[CONFIG] RESEND_API_KEY encontrado');
    
    const emailPayload = {
      from: 'noreply@nephrology.com',
      to: delivery.recipient_email,
      subject: `Entrega de equipo - ${delivery.equipment_brand} ${delivery.equipment_model}`,
      html: emailBody,
      reply_to: 'it@nephrology.com',
    };
    
    console.log('[RESEND] Enviando email a:', delivery.recipient_email);
    console.log('[RESEND] Payload preparado, tamaño:', JSON.stringify(emailPayload).length, 'bytes');
    
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    console.log('[RESEND] Respuesta HTTP:', emailResponse.status, emailResponse.statusText);
    
    const responseData = await emailResponse.json();
    console.log('[RESEND] Respuesta JSON:', JSON.stringify(responseData).substring(0, 500));
    
    if (!emailResponse.ok) {
      console.error('[ERROR] Resend API falló:', {
        status: emailResponse.status,
        statusText: emailResponse.statusText,
        error: responseData.message || responseData.error,
        details: responseData
      });
      throw new Error(`Error enviando email: ${responseData.message || responseData.error || emailResponse.statusText}`);
    }

    console.log('[SUCCESS] Email enviado exitosamente. ID:', responseData.id);
    return Response.json({ success: true, message: 'Email enviado', emailId: responseData.id });
  } catch (error) {
    console.error('[FATAL]', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return Response.json({ 
      error: error.message,
      details: {
        stage: 'email_delivery',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
});