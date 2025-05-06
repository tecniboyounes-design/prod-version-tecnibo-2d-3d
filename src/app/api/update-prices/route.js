import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Function to fetch price from Odoo using search_read
async function getPriceFromOdoo(name) {
  const url = 'http://192.168.30.33:8069/web/dataset/call_kw/product.template/search_read';
  const payload = {
    jsonrpc: '2.0',
    method: 'call',
    params: {
      model: 'product.template',
      method: 'search_read',
      args: [
        [
          '&',
          ['purchase_ok', '=', true],
          '|',
          '|',
          '|',
          ['default_code', 'ilike', name],
          ['product_variant_ids.default_code', 'ilike', name],
          ['name', 'ilike', name],
          ['barcode', 'ilike', name]
        ],
        ['list_price']
      ],
      kwargs: {}
    },
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `session_id=${process.env.ODOO_SESSION_ID}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (data.error) {
    console.error('Odoo error:', data.error);
    return null;
  }
  const record = data.result?.[0];
  return record ? record.list_price : null;
}

// Function to update material prices with pagination
async function updateMaterialPrices() {
  try {
    let offset = 0;
    const pageSize = 1000;
    let allMaterials = [];
    
    // Fetch all materials in batches
    while (true) {
      const { data, error } = await supabase
        .from('material')
        .select('id, name')
        .not('name', 'is', null)
        .range(offset, offset + pageSize - 1);
      
      if (error) {
        throw new Error(`Supabase fetch error: ${error.message}`);
      }
      
      allMaterials = allMaterials.concat(data);
      if (data.length < pageSize) break; // Exit when fewer than pageSize records are returned
      offset += pageSize;
    }
    
    console.log(`Fetched ${allMaterials.length} materials from Supabase`);
    
    // Process each material (e.g., update prices)
    for (const material of allMaterials) {
      try {
        const price = await getPriceFromOdoo(material.name);
        if (price !== null) {
          const { error: updateError } = await supabase
            .from('material')
            .update({ price })
            .eq('id', material.id);
          
          if (updateError) {
            console.error(`Failed to update material ${material.id}:`, updateError);
          } else {
            console.log(`Updated price for material ${material.id} to ${price}`);
          }
        }
      } catch (innerError) {
        console.error(`Error processing material ${material.id}:`, innerError);
      }
    }
    
    return { message: 'All materials processed successfully' };
  } catch (error) {
    console.error('Error updating material prices:', error);
    throw error;
  }
}

// GET route handler with token check
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  console.log('Received request with search params:', searchParams.toString());
  const token = searchParams.get('token');
  
  if (token !== process.env.UPDATE_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  try {
    const result = await updateMaterialPrices();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update material prices', details: error.message }, { status: 500 });
  }
}