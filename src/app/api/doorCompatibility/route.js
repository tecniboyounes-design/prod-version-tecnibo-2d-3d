import doorCompatibility from '@/data/doorCompatibility.json';
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}

export async function GET(req) {
  const corsHeaders = getCorsHeaders(req);

  const { searchParams } = new URL(req.url);
  const wallType = searchParams.get('wallType');
  if (!wallType || !doorCompatibility[wallType]) {
    return new Response(JSON.stringify({ error: 'Wall type not found' }), {
      status: 404,
      headers: corsHeaders,
    });
  }
  return new Response(JSON.stringify({ doors: doorCompatibility[wallType] }), {
    status: 200,
    headers: corsHeaders,
  });
  
}

