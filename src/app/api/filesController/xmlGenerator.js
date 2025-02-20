import { Builder } from "xml2js";

export function generateXML(data) 
{
    // Create a new instance of Builder
    const builder = new Builder();

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