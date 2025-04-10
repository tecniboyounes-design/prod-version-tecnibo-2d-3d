
   // Function to format the date to "YYYY-MM-DD HH:mm:ss"
export  const getCurrentDateTime = () => {
    const now = new Date(); // Get the current date and time
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

export const wrapPurchaseOrderPayload = ( order_line ,  company_id, userData) => {
    const user_id = userData?.uid;
    const companyId = userData?.user_companies?.current_company;
     
    // Get the current date and time
    const currentDateTime = getCurrentDateTime();
    

    const newPayload = {
        "id": 33,
        "jsonrpc": "2.0",
        "method": "call",
        "params": {
            "model": "purchase.order",
            "method": "web_save",
            "args": [
                [],
                {
                    "priority": "0",
                    "is_quantity_copy": false,
                    "partner_id": 17085,
                    "partner_ref": false,
                    "requisition_id": false,
                    "to_review": false,
                    "prepaiement": false,
                    "promise_to_pay": "2025-04-30",
                    "currency_id": 3,
                    "opportunity_id": false,
                    "company_id": companyId,
                    "date_order": currentDateTime,
                    "status_date": false,
                    "user_ids": [
                        [
                            4,
                            408
                        ],
                        [
                            4,
                            209
                        ]
                    ],
                    "picking_type_id": 95,
                    "attente_retour_fr": false,
                    "dest_address_id": false,
                    "order_line": order_line,
                    "user_id": user_id,
                    "origin": false,
                    "incoterm_id": false,
                    "incoterm_location": false,
                    "payment_term_id": false,
                    "fiscal_position_id": false,
                    "project_id": false,
                    "phase_id": false,
                    "notes": false,
                    "alias_id": false,
                    "alias_name": false,
                    "alias_contact": "everyone",
                    "ticket_ids": [],
                    "lead_id": false,
                    "po_timesheet_ids": []
                }
            ],
            "kwargs": {
                "context": {
                    "lang": "en_US",
                    "tz": "Africa/Casablanca",
                    "uid": 447,
                    "allowed_company_ids": [
                        11
                    ],
                    "params": {
                        "action": 492,
                        "model": "purchase.order",
                        "view_type": "list",
                        "cids": 11,
                        "menu_id": 330
                    },
                    "quotation_only": true
                },


                "specification": {
                    "state": {},
                    "lead_count": {},
                    "so_transfer_count": {},
                    "so_transfert_packs_count": {},
                    "sale_order_count": {},
                    "priority": {},
                    "name": {},
                    "is_quantity_copy": {},
                    "partner_id": {
                        "fields": {
                            "display_name": {}
                        },
                        "context": {
                            "res_partner_search_mode": "supplier",
                            "show_vat": true
                        }
                    },
                    "partner_ref": {},
                    "requisition_id": {
                        "fields": {
                            "display_name": {}
                        }
                    },
                    "to_review": {},
                    "reviewed": {},
                    "prepaiement": {},
                    "prepayer": {},
                    "promise_to_pay": {},
                    "currency_id": {
                        "fields": {
                            "display_name": {}
                        }
                    },
                    "is_shipped": {},
                    "id": {},
                    "opportunity_id": {
                        "fields": {
                            "display_name": {}
                        }
                    },
                    "company_id": {
                        "fields": {
                            "display_name": {}
                        }
                    },
                    "tax_calculation_rounding_method": {},
                    "date_order": {},
                    "status_date": {},
                    "user_ids": {
                        "fields": {
                            "display_name": {}
                        }
                    },
                    "date_approve": {},
                    "mail_reception_confirmed": {},
                    "date_planned": {},
                    "mail_reminder_confirmed": {},
                    "on_time_rate": {},
                    "picking_type_id": {
                        "fields": {
                            "display_name": {}
                        }
                    },
                    "attente_retour_fr": {},
                    "dest_address_id": {
                        "fields": {
                            "display_name": {}
                        }
                    },
                    "effective_date": {},
                    "tax_country_id": {
                        "fields": {}
                    },
                    "order_line": {
                        "fields": {
                            "tax_calculation_rounding_method": {},
                            "display_type": {},
                            "company_id": {
                                "fields": {}
                            },
                            "currency_id": {
                                "fields": {}
                            },
                            "state": {},
                            "product_type": {},
                            "product_uom_category_id": {
                                "fields": {}
                            },
                            "invoice_lines": {},
                            "sequence": {},
                            "product_id": {
                                "fields": {
                                    "display_name": {}
                                },
                                "context": {
                                    "use_partner_name": false
                                }
                            },
                            "name": {},
                            "is_user_purchase_manger": {},
                            "project_id": {
                                "fields": {
                                    "display_name": {}
                                }
                            },
                            "phase_id": {
                                "fields": {
                                    "display_name": {}
                                }
                            },
                            "task_id": {
                                "fields": {
                                    "display_name": {}
                                }
                            },
                            "status_date": {},
                            "date_planned": {},
                            "planned_date": {},
                            "move_dest_ids": {},
                            "analytic_distribution": {},
                            "analytic_precision": {},
                            "product_qty": {},
                            "forecasted_issue": {},
                            "qty_received_manual": {},
                            "qty_received_method": {},
                            "qty_received": {},
                            "qty_invoiced": {},
                            "product_uom": {
                                "fields": {
                                    "display_name": {}
                                }
                            },
                            "product_packaging_qty": {},
                            "product_packaging_id": {
                                "fields": {
                                    "display_name": {}
                                },
                                "context": {
                                    "tree_view_ref": "product.product_packaging_tree_view",
                                    "form_view_ref": "product.product_packaging_form_view"
                                }
                            },
                            "price_unit": {},
                            "taxes_id": {
                                "fields": {
                                    "display_name": {}
                                },
                                "context": {
                                    "default_type_tax_use": "purchase",
                                    "search_view_ref": "account.account_tax_view_search"
                                }
                            },
                            "discount": {},
                            "price_subtotal": {},
                            "price_total": {},
                            "move_ids": {}
                        },
                        "limit": 40,
                        "order": "sequence ASC, id ASC"
                    },
                    "tax_totals": {},
                    "user_id": {
                        "fields": {
                            "display_name": {}
                        }
                    },
                    "origin": {},
                    "default_location_dest_id_usage": {},
                    "incoterm_id": {
                        "fields": {
                            "display_name": {}
                        }
                    },
                    "incoterm_location": {},
                    "force_invoice_state": {},
                    "receipt_status": {},
                    "invoice_status": {},
                    "payment_term_id": {
                        "fields": {
                            "display_name": {}
                        }
                    },
                    "fiscal_position_id": {
                        "fields": {
                            "display_name": {}
                        }
                    },
                    "project_id": {
                        "fields": {
                            "display_name": {}
                        }
                    },
                    "phase_id": {
                        "fields": {
                            "display_name": {}
                        }
                    },
                    "alternative_po_ids": {
                        "fields": {
                            "currency_id": {
                                "fields": {}
                            },
                            "partner_id": {
                                "fields": {
                                    "display_name": {}
                                }
                            },
                            "on_time_rate_perc": {},
                            "name": {},
                            "date_planned": {},
                            "amount_total": {},
                            "state": {}
                        },
                        "limit": 40,
                        "order": "",
                        "context": {
                            "quotation_only": true
                        }
                    },
                    "notes": {},
                    "alias_id": {
                        "fields": {
                            "display_name": {}
                        }
                    },
                    "alias_name": {},
                    "alias_domain": {},
                    "alias_contact": {},
                    "ticket_ids": {
                        "fields": {
                            "name": {},
                            "partner_id": {
                                "fields": {
                                    "display_name": {}
                                }
                            },
                            "user_id": {
                                "fields": {
                                    "display_name": {}
                                }
                            },
                            "priority": {},
                            "stage_id": {
                                "fields": {
                                    "display_name": {}
                                }
                            }
                        },
                        "limit": 40,
                        "order": ""
                    },
                    "lead_id": {
                        "fields": {}
                    },
                    "po_timesheet_ids": {
                        "fields": {
                            "lead_id": {
                                "fields": {
                                    "display_name": {}
                                }
                            },
                            "date": {},
                            "employee_id": {
                                "fields": {
                                    "display_name": {}
                                },
                                "context": {
                                    "active_test": false
                                }
                            },
                            "project_id": {
                                "fields": {
                                    "display_name": {}
                                }
                            },
                            "phase_id": {
                                "fields": {
                                    "display_name": {}
                                }
                            },
                            "task_id": {
                                "fields": {
                                    "display_name": {}
                                }
                            },
                            "name": {},
                            "unit_amount": {},
                            "company_id": {
                                "fields": {}
                            },
                            "user_id": {
                                "fields": {}
                            }
                        },
                        "limit": 40,
                        "order": ""
                    },
                    "display_name": {}
                }
            }
        }
    
    } 
    
    return newPayload;
   
};




/**
 * Format cart items into order lines for Odoo payload
 * @param {Object} params
 * @param {Array} params.items - Array of cart items
 * @param {number} params.odoo_project_id - Odoo project ID
 * @param {number} [params.analytic_account_id=10450] - Optional analytic account ID
 * @returns {Array} Formatted order lines
 */

export const formatOrderLinesFromCart = ({ items, odoo_project_id, analytic_account_id = 10450 }) => {
    console.log('Formatting order lines from cart:', items, odoo_project_id, analytic_account_id);
  
    // For each cart item, build an order detail object.
    const orderLineDetails = items.map((item, index) => [
        0, // Indicates a new record
        0, // Indicates that the record is not yet created
        {
            display_type: false,
            sequence: (index + 1) * 10,
            product_id: item.id,
            name: `[${item.id}] Interne fake product name Dynamic data project Reference [${item.id}]`,
            project_id: odoo_project_id,
            phase_id: false,
            task_id: false,
            date_planned: new Date().toISOString().slice(0, 19).replace("T", " "),
            planned_date: false,
            move_dest_ids: [],
            analytic_distribution: {
                [analytic_account_id]: 100,
            },
            product_qty: item.quantity,
            qty_received_manual: 0,
            product_uom: 1,
            product_packaging_qty: 0,
            product_packaging_id: false,
            price_unit: item.price,
            taxes_id: [],
            discount: 0,
        }
    ]);
  
    return orderLineDetails; // Return the array of order lines
};


  

const realStaticPayload = {
    "id": 24,
    "jsonrpc": "2.0",
    "method": "call",
    "params": {
        "model": "purchase.order",
        "method": "web_save",
        "args": [
            [],
            {
                "priority": "0",
                "is_quantity_copy": false,
                "partner_id": 17085,
                "partner_ref": false,
                "requisition_id": false,
                "to_review": false,
                "prepaiement": false,
                "promise_to_pay": false,
                "currency_id": 111,
                "opportunity_id": false,
                "company_id": 11,
                "date_order": "2025-04-09 10:25:04",
                "status_date": false,
                "user_ids": [
                    [
                        4,
                        447
                    ],
                    [
                        4,
                        408
                    ]
                ],
                "picking_type_id": 95,
                "attente_retour_fr": false,
                "dest_address_id": false,
                "order_line": [
                    [
                        0,
                        "virtual_8",
                        {
                            "display_type": false,
                            "sequence": 10,
                            "product_id": 755423,
                            "name": "[0025205] Cache Hettch 0025205 plastique brun - Ø35 x 9.5mm",
                            "project_id": 2984,
                            "phase_id": false,
                            "task_id": false,
                            "date_planned": "2025-04-09 10:25:04",
                            "planned_date": false,
                            "move_dest_ids": [],
                            "analytic_distribution": {
                                "12822": 100
                            },
                            "product_qty": 1,
                            "qty_received_manual": 0,
                            "product_uom": 1,
                            "product_packaging_qty": 0,
                            "product_packaging_id": false,
                            "price_unit": 0,
                            "taxes_id": [],
                            "discount": 0
                        }
                    ]
                ],
                "user_id": 447,
                "origin": false,
                "incoterm_id": false,
                "incoterm_location": false,
                "payment_term_id": false,
                "fiscal_position_id": false,
                "project_id": false,
                "phase_id": false,
                "notes": false,
                "alias_id": false,
                "alias_name": false,
                "alias_contact": "everyone",
                "ticket_ids": [],
                "lead_id": false,
                "po_timesheet_ids": []
            }
        ],
        "kwargs": {
            "context": {
                "lang": "en_US",
                "tz": "Africa/Casablanca",
                "uid": 447,
                "allowed_company_ids": [
                    11
                ],
                "params": {
                    "cids": 11,
                    "menu_id": 330,
                    "action": 492,
                    "model": "purchase.order",
                    "view_type": "form"
                },
                "quotation_only": true
            },
            "specification": {
                "state": {},
                "lead_count": {},
                "so_transfer_count": {},
                "so_transfert_packs_count": {},
                "sale_order_count": {},
                "priority": {},
                "name": {},
                "is_quantity_copy": {},
                "partner_id": {
                    "fields": {
                        "display_name": {}
                    },
                    "context": {
                        "res_partner_search_mode": "supplier",
                        "show_vat": true
                    }
                },
                "partner_ref": {},
                "requisition_id": {
                    "fields": {
                        "display_name": {}
                    }
                },
                "to_review": {},
                "reviewed": {},
                "prepaiement": {},
                "prepayer": {},
                "promise_to_pay": {},
                "currency_id": {
                    "fields": {
                        "display_name": {}
                    }
                },
                "is_shipped": {},
                "id": {},
                "opportunity_id": {
                    "fields": {
                        "display_name": {}
                    }
                },
                "company_id": {
                    "fields": {
                        "display_name": {}
                    }
                },
                "tax_calculation_rounding_method": {},
                "date_order": {},
                "status_date": {},
                "user_ids": {
                    "fields": {
                        "display_name": {}
                    }
                },
                "date_approve": {},
                "mail_reception_confirmed": {},
                "date_planned": {},
                "mail_reminder_confirmed": {},
                "on_time_rate": {},
                "picking_type_id": {
                    "fields": {
                        "display_name": {}
                    }
                },
                "attente_retour_fr": {},
                "dest_address_id": {
                    "fields": {
                        "display_name": {}
                    }
                },
                "effective_date": {},
                "tax_country_id": {
                    "fields": {}
                },
                "order_line": {
                    "fields": {
                        "tax_calculation_rounding_method": {},
                        "display_type": {},
                        "company_id": {
                            "fields": {}
                        },
                        "currency_id": {
                            "fields": {}
                        },
                        "state": {},
                        "product_type": {},
                        "product_uom_category_id": {
                            "fields": {}
                        },
                        "invoice_lines": {},
                        "sequence": {},
                        "product_id": {
                            "fields": {
                                "display_name": {}
                            },
                            "context": {
                                "use_partner_name": false
                            }
                        },
                        "name": {},
                        "is_user_purchase_manger": {},
                        "project_id": {
                            "fields": {
                                "display_name": {}
                            }
                        },
                        "phase_id": {
                            "fields": {
                                "display_name": {}
                            }
                        },
                        "task_id": {
                            "fields": {
                                "display_name": {}
                            }
                        },
                        "status_date": {},
                        "date_planned": {},
                        "planned_date": {},
                        "move_dest_ids": {},
                        "analytic_distribution": {},
                        "analytic_precision": {},
                        "product_qty": {},
                        "forecasted_issue": {},
                        "qty_received_manual": {},
                        "qty_received_method": {},
                        "qty_received": {},
                        "qty_invoiced": {},
                        "product_uom": {
                            "fields": {
                                "display_name": {}
                            }
                        },
                        "product_packaging_qty": {},
                        "product_packaging_id": {
                            "fields": {
                                "display_name": {}
                            },
                            "context": {
                                "tree_view_ref": "product.product_packaging_tree_view",
                                "form_view_ref": "product.product_packaging_form_view"
                            }
                        },
                        "price_unit": {},
                        "taxes_id": {
                            "fields": {
                                "display_name": {}
                            },
                            "context": {
                                "default_type_tax_use": "purchase",
                                "search_view_ref": "account.account_tax_view_search"
                            }
                        },
                        "discount": {},
                        "price_subtotal": {},
                        "price_total": {},
                        "move_ids": {}
                    },
                    "limit": 40,
                    "order": "sequence ASC, id ASC"
                },
                "tax_totals": {},
                "user_id": {
                    "fields": {
                        "display_name": {}
                    }
                },
                "origin": {},
                "default_location_dest_id_usage": {},
                "incoterm_id": {
                    "fields": {
                        "display_name": {}
                    }
                },
                "incoterm_location": {},
                "force_invoice_state": {},
                "receipt_status": {},
                "invoice_status": {},
                "payment_term_id": {
                    "fields": {
                        "display_name": {}
                    }
                },
                "fiscal_position_id": {
                    "fields": {
                        "display_name": {}
                    }
                },
                "project_id": {
                    "fields": {
                        "display_name": {}
                    }
                },
                "phase_id": {
                    "fields": {
                        "display_name": {}
                    }
                },
                "alternative_po_ids": {
                    "fields": {
                        "currency_id": {
                            "fields": {}
                        },
                        "partner_id": {
                            "fields": {
                                "display_name": {}
                            }
                        },
                        "on_time_rate_perc": {},
                        "name": {},
                        "date_planned": {},
                        "amount_total": {},
                        "state": {}
                    },
                    "limit": 40,
                    "order": "",
                    "context": {
                        "quotation_only": true
                    }
                },
                "notes": {},
                "alias_id": {
                    "fields": {
                        "display_name": {}
                    }
                },
                "alias_name": {},
                "alias_domain": {},
                "alias_contact": {},
                "ticket_ids": {
                    "fields": {
                        "name": {},
                        "partner_id": {
                            "fields": {
                                "display_name": {}
                            }
                        },
                        "user_id": {
                            "fields": {
                                "display_name": {}
                            }
                        },
                        "priority": {},
                        "stage_id": {
                            "fields": {
                                "display_name": {}
                            }
                        }
                    },
                    "limit": 40,
                    "order": ""
                },
                "lead_id": {
                    "fields": {}
                },
                "po_timesheet_ids": {
                    "fields": {
                        "lead_id": {
                            "fields": {
                                "display_name": {}
                            }
                        },
                        "date": {},
                        "employee_id": {
                            "fields": {
                                "display_name": {}
                            },
                            "context": {
                                "active_test": false
                            }
                        },
                        "project_id": {
                            "fields": {
                                "display_name": {}
                            }
                        },
                        "phase_id": {
                            "fields": {
                                "display_name": {}
                            }
                        },
                        "task_id": {
                            "fields": {
                                "display_name": {}
                            }
                        },
                        "name": {},
                        "unit_amount": {},
                        "company_id": {
                            "fields": {}
                        },
                        "user_id": {
                            "fields": {}
                        }
                    },
                    "limit": 40,
                    "order": ""
                },
                "display_name": {}
            }
        }
    }
} 

