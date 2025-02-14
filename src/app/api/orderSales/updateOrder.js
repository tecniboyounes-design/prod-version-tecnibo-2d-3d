const order_line = [
    [
        0, // Indicates creating a new record
        "virtual_531", // Unique identifier for the first product
        {
            display_type: false,
            sequence: 1,
            product_id: 930956, // The ID of the first product
            product_uom_qty: 5, // Quantity of the first product
            move_ids: [],
            advance_payment_pct: 0,
            analytic_distribution: false,
            analytic_line_type_id: 5,
            cr_id: false,
            customer_lead: 0,
            discount: 0,
            display_type: false,
            is_delivery: false,
            manual_progress_perc: 0,
            name: "Verres Feuilleté 66.2 clair", // Name of the first product
            phase_id: false,
            price_unit: 15.99, // Price of the first product
            price_unitre: 0,
            product_custom_attribute_value_ids: [],
            product_no_variant_attribute_value_ids: [],
            product_packaging_id: false,
            product_packaging_qty: 0,
            product_template_id: 922973,
            product_uom: 1,
            qty_delivered: 0,
            route_id: false,
            section_id: false,
            section_product_id: false,
            sequence: 1,
            tax_id: []
        }
    ],
    [
        0, // Indicates creating a new record
        "virtual_532", // Unique identifier for the second product
        {
            display_type: false,
            sequence: 2,
            product_id: 930957, // The ID of the second product
            product_uom_qty: 3, // Quantity of the second product
            move_ids: [],
            advance_payment_pct: 0,
            analytic_distribution: false,
            analytic_line_type_id: 5,
            cr_id: false,
            customer_lead: 0,
            discount: 0,
            display_type: false,
            is_delivery: false,
            manual_progress_perc: 0,
            name: "Verres Feuilleté 66.3 clair", // Name of the second product
            phase_id: false,
            price_unit: 20.50, // Price of the second product
            price_unitre: 0,
            product_custom_attribute_value_ids: [],
            product_no_variant_attribute_value_ids: [],
            product_packaging_id: false,
            product_packaging_qty: 0,
            product_template_id: 922974,
            product_uom: 1,
            qty_delivered: 0,
            route_id: false,
            section_id: false,
            section_product_id: false,
            sequence: 2,
            tax_id: []
        }
    ],
    [
        0, // Indicates creating a new record
        "virtual_533", // Unique identifier for the third product
        {
            display_type: false,
            sequence: 3,
            product_id: 930958, // The ID of the third product
            product_uom_qty: 10, // Quantity of the third product
            move_ids: [],
            advance_payment_pct: 0,
            analytic_distribution: false,
            analytic_line_type_id: 5,
            cr_id: false,
            customer_lead: 0,
            discount: 0,
            display_type: false,
            is_delivery: false,
            manual_progress_perc: 0,
            name: "Verres Feuilleté 66.4 clair", // Name of the third product
            phase_id: false,
            price_unit: 12.75, // Price of the third product
            price_unitre: 0,
            product_custom_attribute_value_ids: [],
            product_no_variant_attribute_value_ids: [],
            product_packaging_id: false,
            product_packaging_qty: 0,
            product_template_id:  922975,
            product_uom: 1,
            qty_delivered: 0,
            route_id: false,
            section_id: false,
            section_product_id: false,
            sequence: 3,
            tax_id: []
        }
    ]
];



export const updateOrderPayload = {
    "id": 63,
    "jsonrpc": "2.0",
    "method": "call",
    "params": {
        "model": "sale.order",
        "method": "web_save",
        "args": [
            [
                22201 
            ],
            {
                "order_line": order_line,
                "number": 20 
            }
        ],
        "kwargs": {
            "context": {
                "lang": "en_US",
                "tz": "Africa/Casablanca",
                "uid": 447,
                "allowed_company_ids": [11]
            },
            "specification": {}
        }
    }
};