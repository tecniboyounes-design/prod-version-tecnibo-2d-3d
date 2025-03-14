
/**
 * Function to create an order payload for Odoo
 * @param {Array} items - Array of product items to include in the order
 * @param {string} orderName - The name of the order
 * @param {Object} userData - User data object
 * @returns {Object} - Constructed payload for the Odoo API, or `null` if validation fails
 */

export function createOrderPayload(items, orderName, userData) {
  console.log("items:", items);
  console.log("orderName:", orderName);
  console.log("userData.", userData.user_companies.current_company);

  // Check if any of the required properties are missing and log a warning
  if (!items || items.length === 0) {
    console.warn("Warning: items array is empty or undefined.");
    return null; // Stop the process and return null
  }

  if (!orderName || orderName.trim() === "") {
    console.warn("Warning: orderName is empty or undefined.");
    return null; // Stop the process and return null
  }

  if (
    !userData ||
    !userData.user_companies ||
    !userData.user_companies.current_company
  ) {
    console.warn(
      "Warning: userData.user_companies.current_company is missing or undefined."
    );
    return null; // Stop the process and return null
  }

  const current_company = userData?.user_companies?.current_company || 11;

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

  const now = new Date();
  const options = {
    timeZone: "Africa/Casablanca",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };


  const dateNowString = new Intl.DateTimeFormat("en-GB", options).format(now);
  const [datePart, timePart] = dateNowString.split(", ");

  const [day, month, year] = datePart.split("/");
  const [hours, minutes, seconds] = timePart.split(":");

  const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

  const CreateOrderPayload = {
    id: 41,
    jsonrpc: "2.0",
    method: "call",
    params: {
      model: "sale.order",
      method: "web_save",
      args: [
        [],
        {
          locked: false,
          name: orderName,
          partner_id: 17085,
          recompute_delivery_price: false,
          probability: 0,
          number: 20,
          analytic_account_id: false,
          partner_invoice_id: 17085,
          partner_shipping_id: 17085,
          opportunity_id: false,
          request_invoice: false,
          route_id: false,
          validity_date: "2025-03-13",
          intermediary_sale: false,
          devis_ok: false,
          expected_confirmation_date: false,
          project_start_date: false,
          date_order: formattedDate,
          show_update_pricelist: false,
          pricelist_id: 7,
          custom_seq: false,
          system_seq: false,
          company_id: current_company,
          payment_term_id: false,
          relatedproject_id: false,
          phase_id: false,
          lost_reason: false,
          order_line: orderLine,
          sale_order_option_ids: [],
          user_id: false,
          tecnibo_pm: false,
          team_id: 7,
          cart_recovery_email_sent: false,
          require_signature: false,
          require_payment: true,
          prepayment_percent: 1,
          client_order_ref: false,
          tag_ids: [],
          show_update_fpos: false,
          fiscal_position_id: false,
          project_id: false,
          warehouse_id: 13,
          incoterm: false,
          incoterm_location: false,
          picking_policy: "direct",
          commitment_date: false,
          origin: false,
          campaign_id: false,
          medium_id: false,
          source_id: false,
          ticket_ids: [],
          important_note: false,
          note: false,
          timesheet_ids: [],
        },
      ],
      kwargs: {
        context: {
          lang: "en_US",
          tz: "Africa/Casablanca",
          uid: userData?.uid,
          allowed_company_ids: [current_company],
          params: {
            cids: 11,
            menu_id: 944,
            action: 381,
            model: "sale.order",
            view_type: "form",
          },
        },
        specification: {
          locked: {},
          authorized_transaction_ids: {},
          state: {},
          partner_credit_warning: {},
          show_task_button: {},
          show_project_button: {},
          show_create_project_button: {},
          project_ids: {},
          is_product_milestone: {},
          project_count: {},
          milestone_count: {},
          tasks_count: {},
          ticket_count: {},
          timesheet_count: {},
          show_hours_recorded_button: {},
          timesheet_total_duration: {},
          timesheet_encode_uom_id: {
            fields: {
              display_name: {},
            },
          },
          expense_count: {},
          total_budget: {},
          id: {},
          planning_first_sale_line_id: {
            fields: {},
          },
          planning_initial_date: {},
          planning_hours_to_plan: {},
          planning_hours_planned: {},
          invoice_count: {},
          crm_lead_request_count: {},
          purchase_order_count: {},
          name: {},
          partner_id: {
            fields: {
              display_name: {},
            },
            context: {
              display_website: true,
              res_partner_search_mode: "customer",
              show_address: 1,
              show_vat: true,
            },
          },
          delivery_set: {},
          is_all_service: {},
          recompute_delivery_price: {},
          probability: {},
          number: {},
          analytic_account_id: {
            fields: {
              display_name: {},
            },
          },
          partner_invoice_id: {
            fields: {
              display_name: {},
            },
            context: {
              default_type: "invoice",
              show_address: false,
              show_vat: false,
            },
          },
          partner_shipping_id: {
            fields: {
              display_name: {},
            },
            context: {
              default_type: "delivery",
              show_address: false,
              show_vat: false,
            },
          },
          budgetised: {},
          amount_progress_invoiced: {},
          amount_progress_to_invoice: {},
          opportunity_id: {
            fields: {
              display_name: {},
            },
          },
          current_user: {},
          sols_discount: {},
          request_invoice: {},
          route_id: {
            fields: {
              display_name: {},
            },
          },
          validity_date: {},
          intermediary_sale: {
            fields: {
              display_name: {},
            },
          },
          devis_ok: {},
          project_so: {},
          expected_confirmation_date: {},
          project_start_date: {},
          project_end_date: {},
          from_budget_calc: {},
          date_order: {},
          has_active_pricelist: {},
          show_update_pricelist: {},
          pricelist_id: {
            fields: {
              display_name: {},
            },
          },
          custom_seq: {},
          system_seq: {},
          country_code: {},
          company_id: {
            fields: {
              display_name: {},
            },
          },
          sub_so: {},
          currency_id: {
            fields: {},
          },
          tax_country_id: {
            fields: {},
          },
          tax_calculation_rounding_method: {},
          payment_term_id: {
            fields: {
              display_name: {},
            },
          },
          relatedproject_id: {
            fields: {
              display_name: {},
            },
          },
          phase_id: {
            fields: {
              display_name: {},
            },
          },
          lost_reason: {
            fields: {
              display_name: {},
            },
          },
          order_line: {
            fields: {
              sequence: {},
              cr_id: {
                fields: {
                  display_name: {},
                },
              },
              display_type: {},
              product_uom_category_id: {
                fields: {},
              },
              product_type: {},
              product_updatable: {},
              is_downpayment: {},
              product_id: {
                fields: {
                  display_name: {},
                },
              },
              product_template_id: {
                fields: {
                  display_name: {},
                },
              },
              product_template_attribute_value_ids: {},
              product_custom_attribute_value_ids: {},
              product_no_variant_attribute_value_ids: {},
              is_configurable_product: {},
              name: {},
              analytic_line_type_id: {
                fields: {
                  display_name: {},
                },
              },
              analytic_distribution: {},
              analytic_precision: {},
              route_id: {
                fields: {
                  display_name: {},
                },
              },
              product_packaging_id: {
                fields: {
                  display_name: {},
                },
                context: {
                  tree_view_ref: "product.product_packaging_tree_view",
                  form_view_ref: "product.product_packaging_form_view",
                },
              },
              product_uom_qty: {},
              qty_delivered: {},
              virtual_available_at_date: {},
              qty_available_today: {},
              free_qty_today: {},
              scheduled_date: {},
              forecast_expected_date: {},
              warehouse_id: {
                fields: {},
              },
              move_ids: {},
              qty_to_deliver: {},
              is_mto: {},
              display_qty_widget: {},
              qty_delivered_method: {},
              qty_invoiced: {},
              qty_to_invoice: {},
              product_uom_readonly: {},
              product_uom: {
                fields: {
                  display_name: {},
                },
              },
              customer_lead: {},
              product_packaging_qty: {},
              recompute_delivery_price: {},
              is_delivery: {},
              price_unit: {},
              price_subtotal: {},
              purchase_price: {},
              margin: {},
              margin_percent: {},
              tax_id: {
                fields: {
                  display_name: {},
                },
                context: {
                  active_test: true,
                },
              },
              discount: {},
              price_total: {},
              tax_calculation_rounding_method: {},
              state: {},
              invoice_status: {},
              currency_id: {
                fields: {},
              },
              price_tax: {},
              price_unitre: {},
              company_id: {
                fields: {},
              },
              project_so: {},
              computed_progress_perc: {},
              manual_progress_perc: {},
              advance_payment_pct: {},
              section_product_id: {
                fields: {},
              },
              phase_id: {
                fields: {},
              },
              qty_to_phase: {},
              section_id: {
                fields: {},
              },
            },
            limit: 200,
            order: "sequence ASC, id ASC",
          },
          amount_untaxed_subtotal_general: {},
          amount_untaxed_subtotal_wall: {},
          amount_untaxed_subtotal_mobile_wall: {},
          amount_untaxed_subtotal_cabinet: {},
          amount_untaxed_subtotal_door: {},
          amount_untaxed_subtotal_costs: {},
          tax_totals: {},
          amount_advance_payment: {},
          margin: {},
          amount_untaxed: {},
          margin_percent: {},
          marge_brut: {},
          marge_marque: {},
          montant_marge_commer: {},
          marge_commer: {},
          sale_order_option_ids: {
            fields: {
              sequence: {},
              product_id: {
                fields: {
                  display_name: {},
                },
              },
              name: {},
              quantity: {},
              uom_id: {
                fields: {
                  display_name: {},
                },
              },
              product_uom_category_id: {
                fields: {},
              },
              price_unit: {},
              discount: {},
              is_present: {},
              cr_id: {
                fields: {
                  display_name: {},
                },
              },
              display_type: {},
            },
            limit: 40,
            order: "sequence ASC, id ASC",
          },
          user_id: {
            fields: {
              display_name: {},
            },
          },
          tecnibo_pm: {
            fields: {
              display_name: {},
            },
          },
          team_id: {
            fields: {
              display_name: {},
            },
            context: {
              kanban_view_ref: "sales_team.crm_team_view_kanban",
            },
          },
          website_id: {
            fields: {
              display_name: {},
            },
          },
          is_abandoned_cart: {},
          cart_recovery_email_sent: {},
          require_signature: {},
          require_payment: {},
          prepayment_percent: {},
          reference: {},
          po_reference: {},
          client_order_ref: {},
          tag_ids: {
            fields: {
              display_name: {},
              color: {},
            },
          },
          show_update_fpos: {},
          fiscal_position_id: {
            fields: {
              display_name: {},
            },
          },
          visible_project: {},
          project_id: {
            fields: {
              display_name: {},
            },
          },
          invoice_status: {},
          warehouse_id: {
            fields: {
              display_name: {},
            },
          },
          incoterm: {
            fields: {
              display_name: {},
            },
          },
          incoterm_location: {},
          picking_policy: {},
          shipping_weight: {},
          commitment_date: {},
          expected_date: {},
          show_json_popover: {},
          json_popover: {},
          effective_date: {},
          delivery_status: {},
          origin: {},
          campaign_id: {
            fields: {
              display_name: {},
            },
          },
          medium_id: {
            fields: {
              display_name: {},
            },
          },
          source_id: {
            fields: {
              display_name: {},
            },
          },
          ticket_ids: {
            fields: {
              name: {},
              partner_id: {
                fields: {
                  display_name: {},
                },
              },
              user_id: {
                fields: {
                  display_name: {},
                },
              },
              priority: {},
              stage_id: {
                fields: {
                  display_name: {},
                },
              },
            },
            limit: 40,
            order: "",
          },
          important_note: {},
          note: {},
          timesheet_ids: {
            fields: {
              lead_id: {
                fields: {},
              },
              commercial_partner_id: {
                fields: {},
              },
              date: {},
              employee_id: {
                fields: {
                  display_name: {},
                },
                context: {
                  active_test: false,
                },
              },
              // Additional fields can be added here as needed
            },
          },
        },
      },
    },
  };

  return JSON.stringify(CreateOrderPayload);
}

