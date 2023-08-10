module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      company_code: {
        type: String,
      },
      plant_id: {
        type: String,
      },
      sales_order_no: {
        type: String,
      },
      sales_document_type: {
        type: String,
      },
      sales_delivery_date: {
        type: String,
      },
      customer_code: {
        type: String,
      },
      customer_name: {
        type: String,
      },

      items_detail: [
        {
          item_no:{
            type : String
          },
          item_code: {
            type: String,
          },
          item_name: {
            type: String,
          },
          order_qty: {
            type: Number,
          },
          order_qty_uom: {
            type: String,
          },
          allocated_qty: {
            type: Number,
          },
          allocated_qty_uom: {
            type: String,
          },
          allocated_date: {
            type: String,
          },
          allocated_mode: {
            type: String,
          },
          invoice_number: {
            type: String,
          },
          delivery_number: {
            type: String,
          },
          invoice_value: {
            type: Number,
          },
          invoice_currency: {
            type: String,
          },
          route_id: {
            type: String,
          },
          dispatch_date: {
            type: String,
          },
        },
      ],
      created_at: {
        type: String,
      },
    },
    { timestamps: true }
  );
  const sac_sales_order = mongoose.model("rapid_sac_salesorders", schema);
  return sac_sales_order;
};
