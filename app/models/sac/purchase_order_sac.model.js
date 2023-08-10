module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      company_code: {
        type: String,
      },
      plant_id: {
        type: String,
      },
      po_delivery_date: {
        type: String,
      },
      po_number: {
        type: String,
      },
      po_document_type: {
        type: String,
      },
      vendor_code: {
        type: String,
      },
      vendor_name: {
        type: String,
      },

      item_detail: [
        {
          item_no:{
            type :String
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
          inward_qty: {
            type: Number,
          },
          inward_qty_uom: {
            type: String,
          },
          inward_date: {
            type: String,
          },
          grn_number: {
            type: String,
          },
          grn_qty: {
            type: Number,
          },
          grn_qty_uom: {
            type: String,
          },
          grn_date: {
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
  const rapid_sac_purchaseorders = mongoose.model(
    "rapid_sac_purchaseorders",
    schema
  );
  return rapid_sac_purchaseorders;
};
