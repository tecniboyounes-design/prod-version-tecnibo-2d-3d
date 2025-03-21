import { NextResponse } from "next/server";
import { generatePDF } from "./pdfGenerator";
import { generateXML } from "./xmlGenerator";

export async function POST(req) {
    
    try {
        console.log('req', req)
        const { format, data } = await req.json(); 
        // console.log('Received format:', format);
        console.log('Received data:', data);
     
        // Validate input
        if (!format || !data) {
            return NextResponse.json({ error: 'Invalid request: format or data missing' }, { status: 400 });
        }

        
        // Handle the format and call the appropriate function
        switch (format) {
            case 'xml':
                const xmlBuffer = generateXML(data);
                return new NextResponse(xmlBuffer, {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/xml',
                        'Content-Disposition': 'attachment; filename="order.xml"',
                     },
                });
            case 'pdf':
                const pdfBuffer = await generatePDF(data);
                return new NextResponse(pdfBuffer, {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/pdf',
                        'Content-Disposition': 'attachment; filename="order.pdf"',
                    },
                });

            default:
                return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
        }
        
    } catch (error) {
        console.error('Error handling request:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
