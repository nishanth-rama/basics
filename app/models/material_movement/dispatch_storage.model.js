module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      company_code: {
        type: String,
      },
      plant_id: {
        type: String,
      },
      rack_type: {
        type: String,
        default: "dispatch",
      },
      status: {
        type: String,
        enum: ["occupied", "unoccupied"],
        // default: "unoccupied",
      },
      unit_no: {
        type: Number,
      },
      rack_id: {
        type: String,
      },
      level_id: {
        type: String,
      },
      column_id: {
        type: String,
      },
      location_id: {
        type: String,
      },

      pallet_barcode: { type: String },

      delivery_date: { type: String },

      route_id: {
        type: String,
      },

      in_floor: { type: Boolean, default: false },

      items: [
        {
          sales_order_no: { type: String },
          invoice_no: { type: String, require: true },
          material_code: {
            type: String,
            require: true,
          },
          material_name: {
            type: String,
            require: true,
          },
          uom: { type: String, require: true },
          customer_code: { type: String, require: true },
          customer_name: { type: String, require: true },
          order_qty: { type: Number, require: true },
          allocated_qty: { type: Number, require: true },
          total_carriers: { type: Number, require: true },
        },
      ],
      created_by: { type: String },
      updated_by: { type: String },
    },

    { timestamps: true }
  );

  const dispatch_storage = mongoose.model("rapid_dispatch_storage", schema);
  return dispatch_storage;
};
