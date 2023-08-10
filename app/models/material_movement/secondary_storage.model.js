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
        enum: ["secondary", "secondary_discrete"],
      },
      decision_scanner: {
        type: String,
      },
      data_scanner: {
        type: String,
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
      rack_barcode: {
        type: String,
      },
      material_code: {
        type: String,
        default: "",
      },
      material_name: {
        type: String,
        default: "",
      },
      carrier_count: {
        type: Number,
      },
      total_stock: {
        type: Number,
      },
      uom: {
        type: String,
        default: "",
      },
      status: {
        type: String,
        enum: ["occupied", "unoccupied"],
        default: "unoccupied",
      },
      pallet_barcode: {
        type: String,
        default: "",
      },
    },
    { timestamps: true }
  );

  const secondary_storage = mongoose.model("rapid_secondary_storages", schema);
  return secondary_storage;
};
