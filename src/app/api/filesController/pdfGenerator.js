import puppeteer from "puppeteer";
import { formatDate } from "@/data/models";

/**
 * Transforms raw project data into the structure expected by the PDF generator.
 *
 * @param {object} projectData - Raw project JSON object.
 * @param {string} versionId - The specific version ID to use.
 * @returns {object} An object containing { orderNo, head, builderList }.
 */

export function transformProjectData(projectData, versionId) {
  if (!projectData) {
    console.error('transformProjectData: projectData is undefined or null');
    throw new Error('Invalid project data received');
  }

  // Use the project_number as the order number.
  const orderNo = projectData.project_number;
  if (!orderNo) {
    console.warn('Warning: project_number is missing from the project data');
  }
  console.log(`Order number: ${orderNo}`);

  // Create head data using project details.
  const head = {
    customer: projectData.title || 'No title provided',
    client: projectData.managers && projectData.managers.length > 0
      ? projectData.managers[0].email
      : 'N/A',
    textLong: projectData.description || 'No description provided',
    comm: 'Project Communication Placeholder',
    createDate: projectData.created_on,
    orderPriceInfo1: 0,
    orderPriceInfo2: 0,
    orderPriceInfo4: 0,
    orderPriceInfo5: 0,
  };

  // Find the specific version using the versionId.
  const version = projectData.versions && projectData.versions.find((v) => v.id === versionId);
  if (!version) {
    console.error(`Error: Version with ID ${versionId} not found for the project`);
    throw new Error('Version not found for the project');
  }
  console.log(`Found version: ${version.version || 'Version property missing'}`);

  // Transform articles into the builderList.
  let builderList = [];
  let totalCost = 0; // Initialize total cost
  try {
    builderList = version.articles.reduce((acc, article) => {
      if (!Array.isArray(article.data)) {
        console.warn(`Warning: Article with ID ${article.id} does not have a valid data array`);
        return acc;
      }
      const items = article.data.map((item) => {
        if (!item.type || item.height == null || item.width == null || item.price == null) {
          console.warn(`Warning: Item data in article ${article.id} is missing required fields`);
        }
        totalCost += item.price || 0; // Add the price to the total cost
        return {
          pName: item.type || 'Unknown',
          articlePriceInfo5: item.height,
          articlePriceInfo4: item.width,
          price: item.price || 0, // Include price in the builder list
          count: 1,
        };
      });
      return acc.concat(items);
    }, []);
    console.log('Builder list created:', builderList);
  } catch (error) {
    console.error('Error processing articles:', error);
    throw new Error('Error transforming articles data');
  }

  // Update head with calculated costs
  head.orderPriceInfo1 = totalCost; // Subtotal
  head.orderPriceInfo2 = 50; // Example delivery cost
  head.orderPriceInfo4 = totalCost * 0.19; // VAT (19%)
  head.orderPriceInfo5 = head.orderPriceInfo1 + head.orderPriceInfo2 + head.orderPriceInfo4; // Total

  // Capture the project's image URL; if missing, you can later fallback.
  const image_url = projectData.image_url;

  return { orderNo, head, builderList, image_url };
}


/**
 * Main function: Fetches the project by its ID and then transforms it using the provided version ID.
 *
 * @param {string} projectId - The project ID.
 * @param {string} versionId - The specific version ID.
 * @returns {Promise<object>} - Resolves with { orderNo, head, builderList }.
 */


export async function getAndTransformProject(
  projectId = "d6854054-02d7-462d-90ea-4f7178eb6d97",
  versionId = "a45446d7-ee60-45f7-9747-b5d8aa1bf143"
) {
  try {
    const projectData = await fetchProjectWithRelations(projectId);
    console.log('Project Data received for transformation:', JSON.stringify(projectData, null, 2));
    return transformProjectData(projectData, versionId);
  } catch (error) {
    console.error('Error in getAndTransformProject:', error);
    throw error;
  }
}


export const generatePDF = async (data, project) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Destructure data for easy access, including image_url.
  const { orderNo, head, builderList, image_url } = data;
  // console.log("orderNo", orderNo);

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
            padding: 15px;
            margin: 0;
            color: #333;
            line-height: 1.5;
            background-color: #f9f9f9;
          }
          h1 {
            font-size: 22px;
            margin-bottom: 8px;
            padding-bottom: 6px;
          }
          h2 {
            font-size: 18px;
            margin-top: 15px;
            margin-bottom: 8px;
            border-bottom: 1px solid #0056b3;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .logo {
            width: 50%;
            height: auto;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            background-color: #fff;
          }
          table, th, td {
            border: 1px solid #ddd;
          }
          th, td {
            padding: 8px;
            text-align: left;
            font-size: 14px;
          }
          th {
            background-color: #f2f2f2;
          }
          tr:hover {
            background-color: #f1f1f1;
          }
          .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #666;
            padding: 8px;
            border-top: 1px solid #ddd;
            background-color: #e9ecef;
            text-align: center;
          }
          .total {
            font-weight: bold;
            font-size: 16px;
            background-color: #e2f0d9;
          }
          .head-data {
            margin-left: 20px;
          }
          .project-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
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
          <img class="logo" src="${image_url || 'fallback-image-url.jpg'}" alt="Company Logo" />
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
            <th>Price (€)</th>
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
              <td>€ ${item.price.toFixed(2)}</td>
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
            <td>€ ${head.orderPriceInfo1.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Delivery Cost:</td>
            <td>€ ${head.orderPriceInfo2.toFixed(2)}</td>
          </tr>
          <tr>
            <td>VAT 19%:</td>
            <td>€ ${head.orderPriceInfo4.toFixed(2)}</td>
          </tr>
          <tr class="total">
            <td>Total:</td>
            <td>€ ${head.orderPriceInfo5.toFixed(2)}</td>
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


