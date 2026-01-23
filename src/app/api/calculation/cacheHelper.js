require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const ODOO_PRICE_URL = process.env.ODOO_URL
  ? `${process.env.ODOO_URL}/web/dataset/call_kw/product.template/web_search_read`
  : null;
if (!ODOO_PRICE_URL) throw new Error("[calculation/cacheHelper] ODOO_URL env is required");

// Function to fetch price from Odoo
async function getPriceFromOdoo(name) {
  const payload = {
    jsonrpc: '2.0',
    method: 'call',
    params: {
      model: 'product.template',
      method: 'web_search_read',
      args: [],
      kwargs: {
        domain: [['name', '=', name]],
        fields: ['list_price'],
        limit: 1,
      },
    },
  };
  const response = await fetch(ODOO_PRICE_URL, {
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
  const record = data.result?.records?.[0];
  return record ? record.list_price : null;
}

// Main function to update material prices
async function updateMaterialPrices() {
  try {
    // Fetch all materials from Supabase
    const { data: materials, error } = await supabase
      .from('material')
      .select('id, name')
      .not('name', 'is', null);

    if (error) {
      throw new Error(`Supabase fetch error: ${error.message}`);
    }

    for (const material of materials) {
      const price = await getPriceFromOdoo(material.name);
      if (price !== null) {
        // Update the price in Supabase
        const { error: updateError } = await supabase
          .from('material')
          .update({ price })
          .eq('id', material.id);

        if (updateError) {
          console.error(`Failed to update material ${material.id}:`, updateError);
        } else {
          console.log(`Updated price for material ${material.id} to ${price}`);
        }
      } else {
        console.log(`No price found for material ${material.id}`);
      }
    }
    console.log('All materials processed');
  } catch (error) {
    console.error('Error updating material prices:', error);
  }
}

// Run the function
updateMaterialPrices();
