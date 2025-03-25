// app/api/filesController/route.js
import { NextResponse } from "next/server";
import { generatePDF, transformProjectData } from "./pdfGenerator";
import { generateXML } from "./xmlGenerator";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Fetch the project by its ID from Supabase, including its versions (with articles) and managers.
 *
 * @param {string} projectId - The project ID to fetch.
 * @returns {Promise<object>} - The project data with relations.
 */
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

/**
 * Main API route to generate a file (PDF or XML) based on project data.
 */
export async function POST(req) {
    try {
        // Extract projectId, versionId, and format from the incoming JSON.
        const { projectId, versionId, format } = await req.json();

        // Validate input.
        if (!projectId || !versionId || !format) {
            return NextResponse.json(
                { error: 'Missing required parameters: projectId, versionId, or format' },
                { status: 400 }
            );
        }

        console.log(`Received request: projectId=${projectId}, versionId=${versionId}, format=${format}`);

        // Fetch project data from Supabase.
        const projectData = await fetchProjectWithRelations(projectId);

        // Transform the project data using the provided versionId.
        const transformedData = transformProjectData(projectData, versionId);
        console.log('Transformed data:', transformedData);

        // Depending on the requested format, generate PDF or XML.
        switch (format.toLowerCase()) {
            case 'pdf': {
                const pdfBuffer = await generatePDF(transformedData);
                return new NextResponse(pdfBuffer, {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/pdf',
                        'Content-Disposition': 'attachment; filename="order.pdf"',
                    },
                });
            }
            // For XML case in your switch statement:
            case 'xml': {
                const xmlBuffer = generateXML(transformedData);
                return new NextResponse(xmlBuffer, {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/xml',
                        'Content-Disposition': 'inline; filename="order.xml"', 
                    },
                });
            }

            default:
                return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
        }
    } catch (error) {
        console.error('Error handling request:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
