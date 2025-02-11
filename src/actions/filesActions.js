const handleDownloadFile = async (url, data, fileType) => {
  console.log(url, data, fileType);

  try {
    // Make the POST request to the server
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    console.log('Response status:', response.status); // Log the response status

    if (!response.ok) throw new Error(`Failed to generate ${fileType}`);

    // Handle response and create a Blob based on file type
    const fileData = fileType === "xml" ? await response.text() : await response.blob();

    const blob = new Blob([fileData], { type: fileType === "xml" ? "application/xml" : "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `order.${fileType}`; 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error(`Download failed for ${fileType}:`, error);
  }
};


// Function for downloading XML
export const handleDownloadXML = () => {
  const fakePrices = [
    { item: "Table", price: 200 },
    { item: "Chair", price: 100 },
    { item: "Lamp", price: 50 },
  ];
  handleDownloadFile("/api/filesController?format=xml", { prices: fakePrices }, "xml");
};


// Function for downloading PDF
export const handleDownloadPDF = () => {
  const fakePrices = [
    { item: "Table", price: 200 },
    { item: "Chair", price: 100 },
    { item: "Lamp", price: 50 },
  ];
  handleDownloadFile("/api/filesController?format=pdf", { prices: fakePrices }, "pdf");
};
