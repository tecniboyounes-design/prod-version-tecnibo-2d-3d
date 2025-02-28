import sql from '@/db.js'; 

export default async function handler(req, res) {
  try {
    // Query the database (this can be any SQL query)
    const result = await sql`SELECT NOW()`;
    
    // Send the result as a response
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    // Handle any errors that may occur
    res.status(500).json({ success: false, error: error.message });
  }
}


