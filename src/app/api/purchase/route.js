import axios from 'axios';
import { NextResponse } from 'next/server'; 

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(req) {
  try {
    // Log the incoming request body
    const body = await req.json(); // Since Next.js API routes use `req.json()`
    console.log('Received request:', body);

    // Extract session_id from request body
    const { session_id } = body;

    if (!session_id) {
      console.error('Session ID is missing!');
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400, headers: corsHeaders });
    }

    // Prepare headers for the request
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cookie': `session_id=${session_id}`, 
    };

    // Request payload for Odoo's call_kw API
    const payload = {
        "id": 10,
        "jsonrpc": "2.0",
        "method": "call",
        "params": {
            "model": "purchase.order",
            "method": "web_search_read",
            "args": [],
            "kwargs": {
                "specification": {
                    "priority": {},
                    "partner_ref": {},
                    "has_alternatives": {},
                    "name": {},
                    "date_approve": {},
                    "partner_id": {
                        "fields": {
                            "display_name": {}
                        }
                    },
                    "company_id": {
                        "fields": {
                            "display_name": {}
                        }
                    },
                    "date_planned": {},
                    "user_id": {
                        "fields": {
                            "display_name": {}
                        }
                    },
                    "date_order": {},
                    "activity_ids": {
                        "fields": {}
                    },
                    "activity_exception_decoration": {},
                    "activity_exception_icon": {},
                    "activity_state": {},
                    "activity_summary": {},
                    "activity_type_icon": {},
                    "activity_type_id": {
                        "fields": {
                            "display_name": {}
                        }
                    },
                    "origin": {},
                    "amount_untaxed": {},
                    "amount_total": {},
                    "currency_id": {
                        "fields": {}
                    },
                    "state": {},
                    "invoice_status": {}
                },
                "offset": 0,
                "order": "",
                "limit": 80,
                "context": {
                    "lang": "en_US",
                    "tz": "Africa/Casablanca",
                    "uid": 447,
                    "allowed_company_ids": [
                        11
                    ],
                    "bin_size": true,
                    "params": {
                        "action": 492,
                        "model": "purchase.order",
                        "view_type": "list",
                        "cids": 11,
                        "menu_id": 330
                    },
                    "quotation_only": true,
                    "current_company_id": 11
                },
                "count_limit": 10001,
                "domain": []
            }
        }
    };

    // Odoo endpoint
    const url = 'http://192.168.30.33:8069/web/dataset/call_kw/purchase.order/web_search_read';

    // Send POST request to Odoo
    const response = await axios.post(url, payload, { headers });
     console.log('Odoo response:', response.data); // Log the response from Odoo
    // Return the response from Odoo to the client
    return NextResponse.json(response.data, { status: 200, headers: corsHeaders });
  } catch (error) {
    // Log error details
    console.error('Error during Odoo request:', error.message);
    if (error.response) {
      console.error('Odoo error response:', error.response.data);
    } else {
      console.error('Error without response:', error);
    }

    // Return error response with NextResponse and custom error message
    return NextResponse.json({ error: 'An error occurred while communicating with Odoo' }, { status: 500, headers: corsHeaders });
  }
}


