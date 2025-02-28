// pages/api/project.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    console.log(req)
    const {
        query: { id }, // Extract the 'id' from the query parameters
    } = req;

    if (req.method === 'GET') {
        try {
            // Fetch data from Supabase
            const { data, error } = await supabase
                .from('projects') // Replace with your actual table name
                .select('*')
                .eq('id', id); // Assuming 'id' is the column you are querying

            if (error) {
                return res.status(400).json({ error: error.message });
            }

            if (!data.length) {
                return res.status(404).json({ message: 'Project not found' });
            }

            // Send the response back
            res.status(200).json(data[0]); // Send the first project data
        } catch (err) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
