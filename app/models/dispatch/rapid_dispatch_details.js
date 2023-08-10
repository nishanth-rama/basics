const mongoose = require("mongoose");
const Schema = mongoose.Schema;

module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      plant_id: { type: String },
      company_code: { type: String },
      customer_name: { type: String },
      customer_code: { type: String },
      delivery_date: { type: String },
      route_id: { type: String },
      sales_order_no: { type: String },
      invoice_no: { type: String },
      dispatch_date: { type: String },
      material_no: { type: String },
      material_name: { type: String },
      item_no: { type: String },
      uom: { type: String },
      so_order_qty: { type: Number },
      invoice_qty: { type: Number },
      total_net_weight: { type: Number },
      total_gross_weight: { type: Number },
      total_tare_weight: { type: Number },
      crate_count: { type: Number },
      crate_details: [
        {
          _id: false,
          crate_barcode_value: { type: String },
          gross_weight: { type: Number },
          net_weight: { type: Number },
          tare_weight: { type: Number },
          outward_time: { type: String },
          pallet_barcode:{type: String},
        },
      ],
    },
    {
      timestamps: true,
    }
  );

  const dispatchDetails = mongoose.model("rapid_outward_details", schema);
  return dispatchDetails;
};
