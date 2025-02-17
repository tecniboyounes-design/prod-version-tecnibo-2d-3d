import axios from 'axios';
import { createOrderPayload } from './CreateOrderPayload';


export async function POST(req) {
    try {
        const request = await req.json();
        const items = request.items;
        const orderName = request.orderName;
        const userData = request.userData;
        
        // console.log('Items:', items);
        // console.log('Order Name:', orderName);

        const payload = createOrderPayload(items, orderName, userData);
        // console.log('Created object:', JSON.stringify(payload, null, 2));
        
        // Example URL for API (replace with the actual endpoint)
        const url = "http://192.168.30.33:8069/web/dataset/call_kw/sale.order/web_save";

        // Example session ID (replace with actual session ID or handle authentication as needed)
        const session_id = "90b2efee0ceae079db00256c15986d1e02f36d2c"; 

        // Send POST request to the Odoo server
        const response = await axios.post(url, payload, {
            withCredentials: true,
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Cookie": `session_id=${session_id}; frontend_lang=fr_BE; tz=Africa/Casablanca`
            }
        });

        console.log('Response from Odoo server:', response);
        console.log('Response data:', response.data.result);

        if (response.data.error) {
            console.error('Error details:', response.data.error);
            return new Response(JSON.stringify({ message: 'Error creating sale order', error: response.data.error }), { status: 500 });
        }

        return new Response(JSON.stringify(response.data.result), { status: 200 });
    } catch (error) {
        console.error('Caught error:', error);
        return new Response(JSON.stringify({ message: 'Error creating sale order', error: error.message }), { status: 500 });
    }
}


