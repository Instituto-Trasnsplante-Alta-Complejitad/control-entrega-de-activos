import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [equipment, printers] = await Promise.all([
      base44.asServiceRole.entities.Equipment.list('-updated_date', 2000),
      base44.asServiceRole.entities.Printer.list('-updated_date', 500),
    ]);

    return Response.json({ equipment, printers });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});