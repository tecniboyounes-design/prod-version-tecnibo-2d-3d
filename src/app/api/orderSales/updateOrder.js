export const generateUpdateOrderPayload = (orderId, userData, items, company_id, project_id) => {
    console.log('orderId:', orderId);
    console.log('userData:', userData);
    console.log('items:', items);
    console.log('company_id:', company_id);
    console.log('project_id:', project_id);

    const orderLine = items.map((item, index) => [
        0,
        "virtual_" + (index + 9),
        {
          display_type: false,
          sequence: 10,
          product_id: item?.id ?? 875586,
          product_uom_qty: item?.quantity ?? 0,
          move_ids: [],
          product_uom: 1,
          qty_delivered: 0,
          product_packaging_qty: 0,
          product_packaging_id: false,
          manual_progress_perc: 0,
          advance_payment_pct: 0,
          is_delivery: false,
          price_unit: item?.price ?? 5310.231000000001,
          purchase_price: 0,
          analytic_line_type_id: 5,
          tax_id: [],
          discount: 0,
          customer_lead: 0,
          route_id: false,
          analytic_distribution: false,
          section_product_id: false,
          phase_id: false,
          name: item?.name ?? "otman CLI Test #1 product test #1",
          section_id: false,
          cr_id: false,
          product_template_id: item?.product_template_id ?? 867535,
          product_custom_attribute_value_ids: [],
          product_no_variant_attribute_value_ids: [],
          price_unitre: 0,
        },
      ]);
// 
    return {
        "id": orderId, 
        "jsonrpc": "2.0",
        "method": "call",
        "params": {
            "model": "sale.order",
            "method": "web_save",
            "args": [
                [orderId], 
                {
                    "order_line": orderLine, 
                }
            ],
            "kwargs": {
                "context": {
                    "lang": "en_US",
                    "tz": "Africa/Casablanca",
                    "uid": userData?.uid || 447,
                    "allowed_company_ids": [userData?.user_companies?.current_company]
                },
                "specification": {} 
            }
        }
    };

};
