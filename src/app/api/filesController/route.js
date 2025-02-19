import { Builder } from "xml2js";
import PDFDocument from "pdfkit";
import { NextResponse } from 'next/server';

// Example usage
const exampleData = {
  orderNo: "2025001600",
  dispDate: "",
  basketId: "4737",
  head: {
      comm: "Copied Basket: rfghjhg",
      articleNo: "2025001600",
      customer: "",
      retailer: "",
      client: "y.attaoui@tecnibo.com",
      program: "",
      employee: "Younes Attaoui",
      textLong: "",
      textShort: "Copied Basket: rfghjhg",
      createDate: "03.02.2025",
      deliveryDate: "",
      shippingDate: "",
      colour1: "",
      colour2: "",
      colour3: "",
      colour4: "",
      colour5: "",
      info1: "Younes Attaoui",
      info2: "",
      info3: "",
      info4: "",
      info5: "",
      info6: "",
      info7: "",
      info8: "y.attaoui@tecnibo.com",
      info9: "",
      info10: "",
      info11: "",
      info12: "",
      editor1: "Younes Attaoui",
      editor2: "",
      editor3: "",
      editor4: "",
      editor5: "",
      editor6: "",
      editor7: "",
      editor8: "y.attaoui@tecnibo.com",
      orderPriceInfo1: "3786.71",
      orderPriceInfo2: "0",
      orderPriceInfo3: "3786.71",
      orderPriceInfo4: "719.47",
      orderPriceInfo5: "4506.18",
      customInfo1: "5",
      customInfo2: "5",
      fileList: [
          "https://2124.netshop.imos3d.com/FE_SESSION_KEY-e36e005a20438256b11202a04a748fec.1bef864e340fcfed2f303ac727054c2c5b58072f992014e161085b24714e7152-1b8d31cb711d0c619d00292d0390a12a/fileadmin/imosnet/vg2124/fileStorage/basket/2025/0016/00/uploads/img-1737121973.jpg"
      ]
  },
  builderList: [
      {
          lineNo: "1",
          hierarchicalPos: "1",
          pName: "P_SD_FH_AF20_40",
          count: "1",
          uid: "34497",
          program: "2124_3",
          pVarString: "ART_NAME:=P_SD_FH_AF20_40|...",
          refId: "34497",
          articleTextInfo1: "P_SD_FH_AF20_40",
          articlePriceInfo1: "615.31",
          articlePriceInfo2: "615.31",
          articlePriceInfo3: "615.31",
          articlePriceInfo4: "19",
          articlePriceInfo5: "116.91"
      },
      {
          lineNo: "2",
          hierarchicalPos: "2",
          pName: "P_SD_FH_AF20_50",
          count: "1",
          uid: "34500",
          program: "2124_3",
          pVarString: "ART_NAME:=P_SD_FH_AF20_50|...",
          refId: "34500",
          articleTextInfo1: "P_SD_FH_AF20_50",
          articlePriceInfo1: "972.41",
          articlePriceInfo2: "972.41",
          articlePriceInfo3: "972.41",
          articlePriceInfo4: "19",
          articlePriceInfo5: "184.76"
      }
  ]
};


export async function POST(req) {
    try {
        const data = await req.json(); 
 
        if (data.prices) {
            // Process the data and generate the XML here
            const xmlData = generateXML(exampleData);
            
            // Set the appropriate headers and return the response
            return new NextResponse(xmlData, {
                status: 200,
                headers: { 'Content-Type': 'application/xml' },
            });
        } else {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
        }
    } catch (error) {
        console.error('Error handling request:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


function generateXML(data) 
{
    // Create a new instance of Builder
    const builder = new Builder();

    // Structure the data in a way that xml2js expects
    const xmlData = {
        XML: {
            $: { Type: "ListBuilder" },
            Order: {
                $: {
                    No: data.orderNo,
                    DispDate: data.dispDate,
                    Basket: data.basketId
                },
                Head: {
                    COMM: data.head.comm,
                    ARTICLENO: data.head.articleNo,
                    CUSTOMER: data.head.customer,
                    RETAILER: data.head.retailer,
                    CLIENT: data.head.client,
                    PROGRAM: data.head.program,
                    EMPLOYEE: data.head.employee,
                    TEXT_LONG: data.head.textLong,
                    TEXT_SHORT: data.head.textShort,
                    CRDATE: data.head.createDate,
                    DELIVERY_DATE: data.head.deliveryDate,
                    SHIPPING_DATE: data.head.shippingDate,
                    COLOUR1: data.head.colour1,
                    COLOUR2: data.head.colour2,
                    COLOUR3: data.head.colour3,
                    COLOUR4: data.head.colour4,
                    COLOUR5: data.head.colour5,
                    INFO1: data.head.info1,
                    INFO2: data.head.info2,
                    INFO3: data.head.info3,
                    INFO4: data.head.info4,
                    INFO5: data.head.info5,
                    INFO6: data.head.info6,
                    INFO7: data.head.info7,
                    INFO8: data.head.info8,
                    INFO9: data.head.info9,
                    INFO10: data.head.info10,
                    INFO11: data.head.info11,
                    INFO12: data.head.info12,
                    EDITOR1: data.head.editor1,
                    EDITOR2: data.head.editor2,
                    EDITOR3: data.head.editor3,
                    EDITOR4: data.head.editor4,
                    EDITOR5: data.head.editor5,
                    EDITOR6: data.head.editor6,
                    EDITOR7: data.head.editor7,
                    EDITOR8: data.head.editor8,
                    ORDER_PRICE_INFO1: data.head.orderPriceInfo1,
                    ORDER_PRICE_INFO2: data.head.orderPriceInfo2,
                    ORDER_PRICE_INFO3: data.head.orderPriceInfo3,
                    ORDER_PRICE_INFO4: data.head.orderPriceInfo4,
                    ORDER_PRICE_INFO5: data.head.orderPriceInfo5,
                    CUSTOM_INFO1: data.head.customInfo1,
                    CUSTOM_INFO2: data.head.customInfo2,
                    FileList: {
                        File: data.head.fileList.map(file => file)
                    }
                },
                BuilderList: {
                    Set: data.builderList.map(item => ({
                        $: { LineNo: item.lineNo },
                        hierarchicalPos: item.hierarchicalPos,
                        Pname: item.pName,
                        Count: item.count,
                        UID: item.uid,
                        Program: item.program,
                        PVarString: item.pVarString,
                        REF_ID: item.refId,
                        ARTICLE_TEXT_INFO1: item.articleTextInfo1,
                        ARTICLE_PRICE_INFO1: item.articlePriceInfo1,
                        ARTICLE_PRICE_INFO2: item.articlePriceInfo2,
                        ARTICLE_PRICE_INFO3: item.articlePriceInfo3,
                        ARTICLE_PRICE_INFO4: item.articlePriceInfo4,
                        ARTICLE_PRICE_INFO5: item.articlePriceInfo5
                    }))
                }
            }
        }
    };

    // Convert the data to XML using the builder
    const xml = builder.buildObject(xmlData);
    
    return xml;
}



// Generate XML





// // Function to generate PDF and send it to the client
// const generatePDF = (prices, res) => {
//   console.log('Generating PDF file');  // Log PDF generation
// 
//   const doc = new PDFDocument();
//   let buffers = [];
// 
//   doc.on("data", buffers.push.bind(buffers));
//   doc.on("end", () => {
//     const pdfData = Buffer.concat(buffers);
//     res.setHeader("Content-Type", "application/pdf");
//     res.setHeader("Content-Disposition", 'attachment; filename="order.pdf"');
//     res.status(200).send(pdfData);
//     console.log('PDF file generated successfully');  // Log PDF generation success
//   });
// 
//   doc.fontSize(20).text("Order Summary", { align: "center" });
//   doc.moveDown();
//   doc.fontSize(12).text("Prices List:");
// 
//   prices.forEach((price, index) => {
//     doc.text(`${index + 1}. $${price.price} - ${price.item}`);
//   });
// 
//   doc.end();
// };
