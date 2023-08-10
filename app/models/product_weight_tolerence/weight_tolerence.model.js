const mongoose = require("mongoose");
const Schema = mongoose.Schema;

module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      company_code: {
        type: String,
        required: true,
      },
      company_name: {
        type: String,
        required: true,
      },
      plant_id: {
        type: String,
        required: true,
      },
      material_code: {
        type: String,
        required: true,
      },
      material_description: {
        type: String,
        required: true,
      },
      pieces_per_bin: {
        type: Number,
      },
      uom: {
        type: String,
        required: true,
      },
      brand_name: {
        type: String,
        required: true,
      },
      qty_in_kg: {
        type: Number,
        required: true,
      },
      qty_in_pack: {
        type: Number,
        required: true,
      },
      pieces_per_pack: {
        type: Number,
        required: true,
      },
      min_weight: {
        type: Number,
        required: true,
      },
      max_weight: {
        type: Number,
        required: true,
      },
      pack_min_weight: {
        type: Number
      },
      pack_max_weight: {
        type: Number
      },
      net_weight: {
        type: Number,
      },
      pallet_capacity: {
        type: Number,
        // required: true,
      },
      carrier_stock: {
        type: Number,
      },
      rack_capacity: {
        type: Number,
      },
      layer_count: {
        type: Number,
      },
      entry_by: {
        type: String,
        required: true,
      },
      updated_by: {
        type: String,
        required: true,
      },
      entry_time: {
        type: Date,
        default: new Date(),
      },
    },
    { timestamps: true }
  );

  const product_weight_model = mongoose.model(
    "rapid_products_weight_tolerence",
    schema
  );
  return product_weight_model;
};
