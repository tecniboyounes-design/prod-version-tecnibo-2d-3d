import { formatDate } from "@/data/models";
import puppeteer from "puppeteer";

export const generatePDF = async (data) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Destructure data for easy access
  const { orderNo, head, builderList } = data;
  // console.log('head', head)
  // console.log('builderList', builderList)
  console.log("orderNo", orderNo);
  
  // Static header and footer information
  const companyInfo =
    "Tecnibo Lux • 68 Rue de Koerich • Steinfort 8437 • Luxembourg • +352 26 10 80 77 • info@tecnibo.com";

  // Construct HTML content for the PDF
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Project PDF</title>
        <style>
          body {
            font-family: 'Helvetica', Arial, sans-serif;
            padding: 15px; /* Increased padding */
            margin: 0;
            color: #333;
            line-height: 1.5; /* Adjusted line height for better readability */
            background-color: #f9f9f9;
          }
          h1 {
            font-size: 22px; /* Slightly increased font size */
            margin-bottom: 8px; /* Increased margin */
            padding-bottom: 6px;
          }
          h2 {
            font-size: 18px; /* Slightly increased font size */
            margin-top: 15px; /* Kept margin */
            margin-bottom: 8px; /* Increased margin */
           border-bottom: 1px solid #0056b3;

          }
          .header {
            display: flex;
            align-items: center; /* Vertically centers items */
            justify-content: space-between; /* Aligns items to left and right */
            margin-bottom: 20px; /* Spacing below header */
          }
          .logo {
            width: 50%; /* Set a fixed width for the logo */
            height: auto; /* Maintain aspect ratio */
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px; /* Increased margin */
            background-color: #fff;
          }
          table, th, td {
            border: 1px solid #ddd;
          }
          th, td {
            padding: 8px; /* Increased padding */
            text-align: left;
            font-size: 14px; /* Increased font size */
          }
          th {
            background-color: #f2f2f2;
          }
          tr:hover {
            background-color: #f1f1f1;
          }
          .footer {
            margin-top: 20px; /* Kept margin */
            font-size: 12px; /* Slightly increased font size */
            color: #666;
            padding: 8px; /* Increased padding */
            border-top: 1px solid #ddd;
            background-color: #e9ecef;
            text-align: center;
          }
          .total {
            font-weight: bold;
            font-size: 16px; /* Kept font size */
            background-color: #e2f0d9;
          }
          .head-data {
            margin-left: 20px; /* Spacing between image and text */
          }
            .project-header {
  display: flex;
  justify-content: space-between; /* Ensures equal space between elements */
  align-items: center; /* Aligns text vertically */
  font-size: 18px;
  border-bottom: 1px solid #0056b3;
  padding-bottom: 5px;
  margin-bottom: 10px;
}

        </style>
      </head>
      <body>
<div class="project-header">
  <span>Project Number: ${orderNo}</span>
  <span>Create Date: ${formatDate(head.createDate, 'long')}</span>
</div>

        <div class="header">
          <img class="logo" src="https://tecnibo-2d-3d.vercel.app/Room.jpeg" alt="Company Logo" />
          <div class="head-data">
            <h2>Head Data</h2>
            <p>Company Name: ${head.customer || "N/A"}</p>
            <p>Email: ${head.client}</p>
            <p>Description: ${head.textLong}</p>
          </div>
        </div>
        
        <h1>${head.comm}</h1>
      
        <h2>Article List</h2>
        <table>
          <tr>
            <th>#</th>
            <th>Article Name</th>
            <th>Details</th>
            <th>Count</th>
          </tr>
          ${builderList
      .map(
        (item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${item.pName}</td>
              <td>
                Height: ${item.articlePriceInfo5} mm<br>
                Width: ${item.articlePriceInfo4} mm
              </td>
              <td>${item.count}</td>
            </tr>
          `
      )
      .join("")}
        </table>
  
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
  const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
  
  await browser.close();
  
  console.log("PDF generated successfully");

  return pdfBuffer;

};


