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
        default: "primary",
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
      // rack_barcode: {
      //   type: String,
      // },
      material_code: {
        type: String,
      },
      material_name: {
        type: String,
      },
      carrier_count: {
        type: Number,
      },
      total_stock: {
        type: Number,
      },
      uom: {
        type: String,
      },
      status: {
        type: String,
        enum: ["occupied", "unoccupied"],
        default: "unoccupied",
      },
      pallet_barcode: {
        type: String,
      },
      expiry_date: {
        type: String,
      },
    },
    { timestamps: true }
  );

  const primary_storage = mongoose.model("rapid_primary_storages", schema);
  return primary_storage;
};
