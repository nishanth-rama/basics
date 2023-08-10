module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      is_deleted: {
        type: Boolean,
      },
      company_code: {
        type: String,
      },
      plant_id: {
        type: String,
      },
      po_number: {
        type: String,
      },
      po_document_type: {
        type: String,
      },
      item_no: {
        type: String,
      },
      item_code: {
        type: String,
      },
      item_name: {
        type: String,
      },
      uom: {
        type: String,
      },
      pallet_barcode_value: {
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
      carrier_count: {
        type: Number,
      },

      location_id: { type: String, default: "" },

      created_by: {
        type: String,
      },
      stacked_date: {
        type: String,
      },
      stacked_date_time: {
        type: String,
      },
      location_id: {
        type: String,
      },
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

  const Tutorial = mongoose.model("rapid_palletization", schema);
  return Tutorial;
};
