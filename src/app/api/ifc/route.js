import { buildIFCWithOpts } from "./minimal-writer";

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const bodyUnknown = await req.json().catch(() => null);
    if (!bodyUnknown || typeof bodyUnknown !== 'object') {
      return new Response('Invalid JSON body', { status: 400 });
    }
    const body = bodyUnknown;

    const projectName = String(body.projectName ?? 'Roometry Project');
    const schema = body.schema === 'IFC2X3' ? 'IFC2X3' : 'IFC4';
    let format = body.format === 'brep' ? 'brep' : 'tfs';
    if (schema === 'IFC2X3') format = 'brep';
    const bakeWorld = Boolean(body.bakeWorld ?? false);
    const compat = body.compat ?? {};
    const elements = Array.isArray(body.elements) ? body.elements : [];

    if (!elements.length) {
      return new Response('No elements provided', { status: 400 });
    }

    const ifcText = buildIFCWithOpts(projectName, elements, { schema, format, bakeWorld, compat });

    return new Response(ifcText, {
      status: 200,
      headers: {
        'Content-Type': 'application/step',
        'Content-Disposition': 'attachment; filename="export.ifc"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[IFC] API error:', err);
    return new Response(`IFC export failed: ${message}`, { status: 500 });
  }
}
