// Default payload structure for Odoo API call
export const payload = {
    id: 14,
    jsonrpc: "2.0",
    method: "call",
    params: {
      model: "product.template",
      method: "web_search_read",
      args: [],
      kwargs: {
        specification: {
          id: {},
          product_variant_count: {},
          currency_id: { fields: { display_name: {} } },
          activity_state: {},
          categ_id: { fields: { display_name: {} } },
          write_date: {},
          name: {},
          priority: {},
          default_code: {},
          list_price: {},
          product_properties: {},
          type: {}
        },
        offset: 0,
        order: "",
        limit: 80,
        context: {
          lang: "en_US",
          tz: "Africa/Casablanca",
          uid: 447,
          allowed_company_ids: [11],
          bin_size: true,
          params: {
            action: 1635,
            model: "product.template",
            view_type: "kanban",
            cids: 11,
            menu_id: 254
          },
          sale_multi_pricelist_product_template: 1,
          current_company_id: 11
        },
        count_limit: 10001,
        domain: []
      }
    }
};