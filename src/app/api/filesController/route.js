import { NextResponse } from "next/server";
import { generatePDF, transformProjectData } from "./pdfGenerator";
import { generateXML } from "./xmlGenerator";
import { createClient } from '@supabase/supabase-js';
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fetchProjectWithRelations(projectId) {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      versions (
        *,
        articles (*)
      ),
      managers (*)
    `)
    .eq('id', projectId)
    .single();

  console.log('Fetched project data:', JSON.stringify(data, null, 2));

  if (error) {
    console.error('Error fetching project:', error.message);
    throw new Error(`Error fetching project: ${error.message}`);
  }
  if (!data) {
    console.error('No project data found for projectId:', projectId);
    throw new Error('Project not found');
  }
  return data;
}

export async function POST(req) {
  const corsHeaders = getCorsHeaders(req); 

  try {
    
    const { projectId, versionId, format } = await req.json();

    if (!projectId || !versionId || !format) {
      return NextResponse.json(
        { error: 'Missing required parameters: projectId, versionId, or format' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    console.log(`Received request: projectId=${projectId}, versionId=${versionId}, format=${format}`);

    const projectData = await fetchProjectWithRelations(projectId);
    console.log('Project data fetched:', JSON.stringify(projectData, null, 2));
    const transformedData = transformProjectData(projectData, versionId);
    console.log('Transformed data:', transformedData);

    switch (format.toLowerCase()) {
      case 'pdf': {
        const pdfBuffer = await generatePDF(transformedData);
        return new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="order.pdf"',
          },
        });
      }
      case 'xml': {
        const xmlBuffer = generateXML(transformedData);
        return new NextResponse(xmlBuffer, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/xml',
            'Content-Disposition': 'inline; filename="order.xml"',
          },
        });
      }
      default:
        return NextResponse.json(
          { error: 'Unsupported format' },
          { status: 400, headers: corsHeaders }
        );
    }
  } catch (error) {
    console.error('Error handling request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(req) {
  return handleCorsPreflight(req); 
}

