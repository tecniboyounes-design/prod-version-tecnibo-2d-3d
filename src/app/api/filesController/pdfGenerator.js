import puppeteer from 'puppeteer';

export const generatePDF = async (data) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Destructure data for easy access
  const { orderNo, head, builderList } = data;

  // Static header and footer information
  const companyInfo = "imos AG • Planckstraße 24 • D-32052 Herford • +49 (0) 5221.976-0 • info@imos3d.com • www.imos3d.com";
  
  // Construct HTML content for the PDF
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Project PDF</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            margin: 0;
            color: #333;
          }
          h1, h2 {
            color: #007BFF;
          }
          h1 {
            font-size: 24px;
            margin-bottom: 10px;
          }
          h2 {
            font-size: 18px;
            margin-top: 20px;
            margin-bottom: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          table, th, td {
            border: 1px solid #ddd;
          }
          th, td {
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
          }
          .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #666;
          }
          .total {
            font-weight: bold;
            font-size: 16px;
          }
        </style>
      </head>
      <body>
        <h1>Project: ${head.textShort}</h1>
        <h2>Project Number: ${orderNo} Create Date: ${head.createDate}</h2>
        
        <h2>Article List</h2>
        <table>
          <tr>
            <th>#</th>
            <th>Article Name</th>
            <th>Details</th>
            <th>Count</th>
          </tr>
          ${builderList.map((item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${item.pName}</td>
              <td>
                Height: ${item.articlePriceInfo5} mm<br>
                Width: ${item.articlePriceInfo4} mm
              </td>
              <td>${item.count}</td>
            </tr>
          `).join('')}
        </table>

        <h2>Head Data</h2>
        <p>Company Name: ${head.customer || 'N/A'}</p>
        <p>Email: ${head.client}</p>
        <p>Description: ${head.textLong}</p>

        <h2>Costs</h2>
        <table>
          <tr>
            <th>Description</th>
            <th>Price (€)</th>
          </tr>
          <tr>
            <td>Subtotal:</td>
            <td>€ ${head.orderPriceInfo1}</td>
          </tr>
          <tr>
            <td>Delivery Cost:</td>
            <td>€ ${head.orderPriceInfo2}</td>
          </tr>
          <tr>
            <td>VAT 19%:</td>
            <td>€ ${head.orderPriceInfo4}</td>
          </tr>
          <tr class="total">
            <td>Total:</td>
            <td>€ ${head.orderPriceInfo5}</td>
          </tr>
        </table>

        <div class="footer">${companyInfo}</div>
      </body>
    </html>
  `;

  await page.setContent(html);
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
  
  await browser.close();
  
  console.log("PDF generated successfully");
  return pdfBuffer;
};
