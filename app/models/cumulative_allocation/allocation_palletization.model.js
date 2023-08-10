const mongoose = require("mongoose");
const Schema = mongoose.Schema;

module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      company_code: { type: String },
      plant_id: { type: String },
      delivery_date: { type: String },
      route_id: { type: String },
      pallet_barcode: { type: String },
      is_deleted: { type: Boolean, default: false },
      palletization_status: {
        type: String,
        enum: ["ASSIGNED", "STACKING", "STACKED", "DISPATCH"],
        default: "ASSIGNED",
      },
      total_stacked_weight: { type: Number },
      total_stacked_carriers: { type: Number },
      items: [
        {
          sales_order_no: { type: String },
          item_no: { type: String },
          material_code: { type: String },
          material_name: { type: String },
          uom: { type: String },
          total_allocated_qty: { type: Number },
          total_crate_weight: { type: Number },
          total_net_weight: { type: Number },
          total_gross_weight: { type: Number },
          total_carrier_count: { type: Number },
          sales_order_no: { type: String },
          carriers: [
            {
              carrier_barcode: { type: String },
              crate_weight: { type: Number },
              net_weight: { type: Number },
              gross_weight: { type: Number },
              stacked_time: { type: Date, default: new Date() },
            },
          ],
        },
      ],
      location_id: { type: String, default: "" },
      created_by: { type: String },
      updated_by: { type: String, default: "" },
    },
    {
      timestamps: true,
    }
  );

  const allocationPalletization = mongoose.model(
    "rapid_allocation_palletization",
    schema
  );
  return allocationPalletization;
};
