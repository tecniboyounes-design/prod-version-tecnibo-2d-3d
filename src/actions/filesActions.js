
/**
 * Creates a structured data object from the given JSON input.
 * 
 * @param {Object} jsonData - The input JSON containing project, user, and floorplanner details.
 * @param {Object} jsonData.project - Project details.
 * @param {string} jsonData.project.id - Project ID.
 * @param {string} [jsonData.project.display_name] - Project display name.
 * @param {string} [jsonData.project.title] - Project title.
 * @param {Object} jsonData.user - User details.
 * @param {string} jsonData.user.username - User email or username.
 * @param {string} [jsonData.user.name] - User's full name.
 * @param {Object} jsonData.floorplanner - Floorplanner data.
 * @param {Array} jsonData.floorplanner.items - List of items.
 * @returns {Object} - The structured order data object.
 */
const createDataObjectFromParams = (jsonData) => {
  const { project, user } = jsonData;
  const { items } = jsonData.floorplanner || { items: [] };
  // console.log("items", project, user, items);
  const builderList = items.map((item, index) => ({
    lineNo: (index + 1).toString(),
    hierarchicalPos: (index + 1).toString(),
    pName: item?.attributes?.name ?? item?.itemName ?? "Unknown",
    count: item?.quantity?.toString() ?? "1",
    uid: item?.id ?? uuidv4(),
    program: "2124_4",
    pVarString: `ART_NAME:=${item?.attributes?.name ?? item?.itemName ?? "Unknown"}|...`,
    refId: item?.id ?? uuidv4(),
    articleTextInfo1: item?.attributes?.name ?? item?.itemName ?? "Unknown",
    articlePriceInfo1: item?.attributes?.price?.toString() ?? "0",
    articlePriceInfo2: item?.attributes?.price?.toString() ?? "0",
    articlePriceInfo3: item?.attributes?.price?.toString() ?? "0",
    articlePriceInfo4: "19",
    articlePriceInfo5: "116.91"
  }));

  return {
    orderNo: project?.project_number || "2025001602",
    dispDate: "",
    basketId: "4743",
    head: {
      comm: `Project: ${project?.display_name || project?.title}`,
      articleNo: project?.id || "2025001602",
      customer: "",
      retailer: "",
      client: user?.username || "y.attaoui@tecnibo.com",
      program: "",
      employee: user?.name || "Younes Attaoui",
      textLong: "new project test in dev mode",
      textShort: project?.display_name || project?.title,
      createDate: new Date().toLocaleDateString("de-DE"),
      deliveryDate: "",
      shippingDate: "",
      colour1: "",
      colour2: "",
      colour3: "",
      colour4: "",
      colour5: "",
      info1: user?.name || "Younes Attaoui",
      info2: "",
      info3: "",
      info4: "",
      info5: "",
      info6: "",
      info7: "",
      info8: user?.username || "y.attaoui@tecnibo.com",
      info9: "",
      info10: "",
      info11: "",
      info12: "",
      editor1: user?.name || "Younes Attaoui",
      editor2: "",
      editor3: "",
      editor4: "",
      editor5: "",
      editor6: "",
      editor7: "",
      editor8: user?.username || "y.attaoui@tecnibo.com",
      orderPriceInfo1: "615.31",
      orderPriceInfo2: "0",
      orderPriceInfo3: "615.31",
      orderPriceInfo4: "116.91",
      orderPriceInfo5: "732.22",
      customInfo1: "1",
      customInfo2: "1",
      fileList: [
        "https://example.com/file1.jpg",
        "https://example.com/file2.jpg"
      ]
    },
    builderList
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




