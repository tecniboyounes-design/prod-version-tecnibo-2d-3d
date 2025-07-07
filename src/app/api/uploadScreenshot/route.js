import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import updateProjectImage from './updateProjectImage';
import { getCorsHeaders, handleCorsPreflight } from '../../../lib/cors';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);



// Standalone function to get screenshot URL based on projectId and filename
export async function getScreenshotUrl(projectId, filename) {
  const origin = "https://configure.tecnibo.com";
  return `${origin}/api/screenshots?projectId=${projectId}&file=${filename}`;
}
 


export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}

export async function POST(req) {
  const corsHeaders = getCorsHeaders(req);

  // Read and parse the request body
  const body = await req.json();
  console.log('📥 POST request received:', body);
  
  // Extract projectId and screenshot from the parsed body
  const { projectId, screenshot } = body;

  console.log('🛠️ Parsed data:', { projectId, screenshot });
  
  // Validate inputs
  if (!projectId || !screenshot) {
    console.error('❌ Missing projectId or screenshot');
    return new Response(JSON.stringify({ error: 'Missing projectId or screenshot' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // Define the directory path
  const dir = path.join(process.cwd(), 'storage', 'screenshots', projectId);

  // Create the directory if it doesn’t exist
  try {
    await mkdir(dir, { recursive: true });
    console.log('📁 Directory ensured:', dir);
  } catch (error) {
    console.error('❌ Failed to create directory:', error);
    return new Response(JSON.stringify({ error: 'Failed to create directory' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // Generate a unique filename using projectId and timestamp
  const timestamp = Date.now();
  const fileName = `${projectId}-${timestamp}.png`;
  const filePath = path.join(dir, fileName);

  // Convert base64 data URL to a buffer (remove "data:image/png;base64," prefix)
  let buffer;
  try {
    buffer = Buffer.from(screenshot.split(',')[1], 'base64');
  } catch (error) {
    console.error('❌ Invalid screenshot data:', error);
    return new Response(JSON.stringify({ error: 'Invalid screenshot data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    await writeFile(filePath, buffer);
    console.log('💾 File written to:', filePath);
    if (fs.existsSync(filePath)) {
      console.log('✅ File exists');
    } else {
      console.error('❌ File does not exist');
    } 
     
    // Generate URL using the API route with query parameters
    const url = await getScreenshotUrl(projectId, fileName);
    console.log('🌐 Screenshot URL:', url);
    await updateProjectImage(projectId, url);
    console.log('✅ Project image updated successfully');

    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('❌ Failed to save screenshot:', error);
    return new Response(JSON.stringify({ error: 'Failed to save screenshot' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}