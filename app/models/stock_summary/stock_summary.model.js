const mongoose = require("mongoose");
const Schema = mongoose.Schema;

module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      material_no: {
        type: String,
        required: true,
      },
      material_name: {
        type: String,
        required: true,
      },
      uom:{
        type: String,
      },
      company_code: {
        type: String,
        required: true,
      },
      plant_id: {
        type: String,
        required: true,
      },
      inwarded_qty: {
        type: Number,
        required: true,
      },
      auto_allocated_qty:{
        type: Number,
        required: true,
      },
      manual_allocated_qty:{
        type: Number,
      },
      total_stock_qty:{
        type: Number,
        required: true,
      },
      opening_stock: {
        type: Number,
        required: true,
      },
      inventory_stock_qty:{
        type: Number,
      },
      inventory_grn_posted_qty:{
        type: Number,
        required: true,
      },
      inventory_invoice_posted_qty:{
        type: Number,
        required: true,
      }
    },
    { timestamps: true }
  );

  const stock_summary = mongoose.model("rapid_stock_summary", schema);
  return stock_summary;
};
