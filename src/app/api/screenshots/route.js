import fs from 'fs';
import path from 'path';
import { getCorsHeaders, handleCorsPreflight } from '../../../lib/cors'; // Adjust path if necessary

export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}

export async function GET(req) {
  const corsHeaders = getCorsHeaders(req);

  try {
    // Extract projectId and file from query parameters
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const file = searchParams.get('file');
    
    // Validate inputs 
    if (!projectId || !file) {
      return new Response(
        JSON.stringify({ error: 'Missing projectId or file parameter' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }
     
    // Construct the file path
    const baseDir = path.join(process.cwd(), 'storage', 'screenshots', projectId);
    const filePath = path.join(baseDir, file);

    // Prevent directory traversal attacks
    if (!filePath.startsWith(baseDir + path.sep)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file parameter' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return new Response(
        JSON.stringify({ error: 'File not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Read the file into a buffer
    const fileBuffer = fs.readFileSync(filePath);

    // Return the image file with appropriate headers
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="${file}"`,
        'Cache-Control': 'public, max-age=31536000, immutable', // Long-term caching
      },
    });
  } catch (error) {
    console.error('Error serving screenshot:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
}