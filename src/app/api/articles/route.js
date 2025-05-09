import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../filesController/route';
import { cors } from '../catalog/route';



export async function GET(req) {
    console.log("Received request to fetch articles");
  
    const headers = cors(req); 
    
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId')?.trim();
    const versionId = searchParams.get('versionId')?.trim();
     
    if (!projectId || !versionId) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing projectId or versionId' }),
        { status: 400, headers }
      );
    }
    
    const { data: versionCheck, error: versionError } = await supabase
      .from('versions')
      .select('id')
      .eq('id', versionId)
      .eq('project_id', projectId)
      .single();
  
    if (versionError || !versionCheck) {
      return new NextResponse(
        JSON.stringify({ error: 'Version not found in this project' }),
        { status: 404, headers }
      );
    }
    
    const { data: articles, error } = await supabase
      .from('articles')
      .select('*')
      .eq('version_id', versionId);
     
    if (error) {
      return new NextResponse(
        JSON.stringify({ error: error.message }),
        { status: 500, headers }
      );
    }
    
    return new NextResponse(
      JSON.stringify({ articles }),
      { status: 200, headers }
    );
  
}


export async function OPTIONS(req) {
  const corsHeaders = cors(req); 
  return new Response(null, { status: 204, headers: corsHeaders });
}
  