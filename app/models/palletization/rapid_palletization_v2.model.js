module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      company_code: {
        type: String,
      },
      plant_id: {
        type: String,
      },
      delivery_date: {
        type: String,
      },
      invoice_no: {
        type: String,
      },
      pallet_barcode_value: {
        type: String,
      },
      po_number: {
        type: String,
      },
      po_type: {
        type: String,
      },
      supplier_name: {
        type: String,
      },
      supplier_no: {
        type: String,
      },
      po_document_type: {
        type: String,
      },
      stacked_date: {
        type: String,
      },
      stacked_date_time: {
        type: String,
      },
      carrier_count: {
        type: Number,
      },
      location_id: { type: String, default: "" },
      is_deleted: {
        type: Boolean,
        default: false,
      },
      created_by: {
        type: String,
      },

      pallet_status: {
        type: String,
        enum: [
          "Assigned",
          "Stacking",
          "Stacked",
          "Primary_storage",
          "Secondary_storage",
          "Dispatch_area",
        ],
      },

      inward_item_details: [
        {
          item_code: { type: String },
          item_name: { type: String },
          item_no: { type: String },
          ordered_qty: { type: String },
          total_inwarded_qty: { type: String },
          total_pending_qty: { type: String },
          po_grn_status: { type: String },
          uom: { type: String },
          total_crates: { type: String },
          total_net_qty: { type: String },
          carrier_detail: [
            {
              carrier_barcode: { type: String },
              carrier_id: { type: String },
              carrier_type: { type: String },
              tare_weight: { type: Number },
              gross_weight: { type: Number },
              net_weight: { type: Number },
              carrier_status: {
                type: String,
                enum: ["PRESENT", "REMOVED"],
                default: "PRESENT",
              },
              is_damaged: {
                type: Boolean,
                default: false,
              },
            },
          ],
        },
      ],
      sku_qty_in_kg: { type: Number },
      sku_qty_in_pack: { type: Number },
      total_stock: { type: Number },
      expiry_date: { type: String },
    },
    { timestamps: true }
  );

  // schema.method("toJSON", function() {
  //   const { __v, _id, ...object } = this.toObject();
  //   object.id = _id;
  //   return object;
  // });

  const Tutorial = mongoose.model("rapid_palletization_3p", schema);
  return Tutorial;
};
