
const createDataObjectFromParams = (jsonData) => {

  const { project, user } = jsonData;
  const { items } = jsonData.floorplanner

  const builderList = items.map((item, index) => ({
      lineNo: (index + 1).toString(), // Line number as string
      hierarchicalPos: (index + 1).toString(), // Hierarchical position as string
      pName: item.attributes.name, // Product name from item attributes
      count: item.quantity.toString(), // Count from item quantity
      uid: item.id, // Unique ID from item
      program: "2124_4", // Example program, adjust as needed
      pVarString: `ART_NAME:=${item.attributes.name}|...`, // Example variable string, adjust as needed
      refId: item.id, // Reference ID from item
      articleTextInfo1: item.attributes.name, // Article text info from item attributes
      articlePriceInfo1: item.attributes.price.toString(), // Article price info from item attributes
      articlePriceInfo2: item.attributes.price.toString(), // Article price info from item attributes
      articlePriceInfo3: item.attributes.price.toString(), // Article price info from item attributes
      articlePriceInfo4: "19", // Example VAT percentage, adjust as needed
      articlePriceInfo5: "116.91" // Example article price info, adjust as needed
  }));

  return {
      orderNo: project.id || "2025001602", // Use project ID or default
      dispDate: "", // Optional: Display date
      basketId: "4743", // Required: Basket ID
      head: {
          comm: `Project: ${project.display_name || "My portfolio"}`, // Comment
          articleNo: project.id || "2025001602", // Article number
          customer: "", // Optional: Customer name
          retailer: "", // Optional: Retailer name
          client: user.username || "y.attaoui@tecnibo.com", // Client email
          program: "", // Optional: Program
          employee: user.name || "Younes Attaoui", // Employee name
          textLong: "new project test in dev mode", // Long text description
          textShort: project.display_name || "Copied Basket: My portfolio", // Short description
          createDate: new Date().toLocaleDateString("de-DE"), // Current date in German format
          deliveryDate: "", // Optional: Delivery date
          shippingDate: "", // Optional: Shipping date
          colour1: "", // Optional: Colour 1
          colour2: "", // Optional: Colour 2
          colour3: "", // Optional: Colour 3
          colour4: "", // Optional: Colour 4
          colour5: "", // Optional: Colour 5
          info1: user.name || "Younes Attaoui", // Info 1
          info2: "", // Optional: Info 2
          info3: "", // Optional: Info 3
          info4: "", // Optional: Info 4
          info5: "", // Optional: Info 5
          info6: "", // Optional: Info 6
          info7: "", // Optional: Info 7
          info8: user.username || "y.attaoui@tecnibo.com", // Username
          info9: "", // Optional: Info 9
          info10: "", // Optional: Info 10
          info11: "", // Optional: Info 11
          info12: "", // Optional: Info 12
          editor1: user.name || "Younes Attaoui ", // Editor 1
          editor2: "", // Optional: Editor 2
          editor3: "", // Optional: Editor 3
          editor4: "", // Optional: Editor 4
          editor5: "", // Optional: Editor 5
          editor6: "", // Optional: Editor 6
          editor7: "", // Optional: Editor 7
          editor8: user.username || "y.attaoui@tecnibo.com", // Editor 8
          orderPriceInfo1: "615.31", // Example price info
          orderPriceInfo2: "0", // Example shipping cost
          orderPriceInfo3: "615.31", // Example total cost
          orderPriceInfo4: "116.91", // Example VAT amount
          orderPriceInfo5: "732.22", // Example gross total
          customInfo1: "1", // Example custom info
          customInfo2: "1", // Example custom info
          fileList: [
              "https://example.com/file1.jpg", // Example file URL
              "https://example.com/file2.jpg"  // Example file URL
          ]
      },
      builderList // Include the mapped builderList
  };

};


const handleDownloadFile = async (url, data, fileType) => {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to download ${fileType}`);
    }

    const blob = await response.blob();
    const fileURL = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = fileURL;
    link.download = `document.${fileType}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error("Download error:", error);
  }
};


export const handleDownloadXML = (jsonData) => {
  const data = createDataObjectFromParams(jsonData);
  const requestData = { format: 'xml', data }; 
  handleDownloadFile("/api/filesController", requestData, "xml");
};


export const handleDownloadPDF = (jsonData) => {
  console.log("pdf")
  const data = createDataObjectFromParams(jsonData);
  const requestData = { format: 'pdf', data };
  handleDownloadFile("/api/filesController", requestData, "pdf");
};




