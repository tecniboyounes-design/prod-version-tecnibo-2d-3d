import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import updateProjectImage from './updateProjectImage';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

export async function POST(req) {
  // Read and parse the request body
  const body = await req.json();
  console.log('POST request received:', body);
  
  // Extract projectId and screenshot from the parsed body
  const { projectId, screenshot } = body;
  console.log('Parsed data:', { projectId, screenshot });
  
  // Validate inputs
  if (!projectId || !screenshot) {
    return new Response(JSON.stringify({ error: 'Missing projectId or screenshot' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Define the directory path
  const dir = path.join(process.cwd(), 'public', 'screenshots', projectId);

  // Create the directory if it doesn’t exist
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      return new Response(JSON.stringify({ error: 'Failed to create directory' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Generate a unique filename using a timestamp
  const timestamp = Date.now();
  const fileName = `${timestamp}.png`;
  const filePath = path.join(dir, fileName);
  
  // Convert base64 data URL to a buffer (remove "data:image/png;base64," prefix)
  let buffer;
  try {
    buffer = Buffer.from(screenshot.split(',')[1], 'base64');
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid screenshot data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  

  try {
    await writeFile(filePath, buffer);
    
    // Get the origin from the request (e.g., http://localhost:3000);
    
    const origin = new URL(req.url, `http://${req.headers.get('host')}`).origin;
    
    // Construct the full public URL with origin
    const url = `${origin}/screenshots/${projectId}/${fileName}`;
    
    await updateProjectImage(projectId, url);

    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to save screenshot' }), 
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }


}

