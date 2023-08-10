const { number } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      company_code: { type: String },
      plant_id: { type: String },
      delivery_date: { type: String },
      route_id: { type: String },
      material_code: { type: String },
      material_name: { type: String },
      uom: { type: String },
      ordered_qty: { type: Number },
      picked_qty: { type: Number },
      pending_qty: { type: Number },
      is_deleted: { type: Boolean, default: false },
      created_by: { type: String },
      updated_by: { type: String },
    },
    {
      timestamps: true,
    }
  );

  const cumulativePickingDetails = mongoose.model(
    "rapid_cumulative_picking_details",
    schema
  );
  return cumulativePickingDetails;
};
