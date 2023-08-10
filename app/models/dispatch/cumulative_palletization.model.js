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
        enum: ["ASSIGNED", "STACKING", "STACKED"],
        default: "ASSIGNED",
      },
      total_stacked_weight: { type: Number },
      total_stacked_carriers: { type: Number },
      items: [
        {
          material_code: { type: String },
          material_name: { type: String },
          uom: { type: String },
          total_crate_weight: { type: Number },
          total_net_weight: { type: Number },
          total_gross_weight: { type: Number },
          total_carrier_count: { type: Number },
          sku_qty_in_kg: { type: Number },
          sku_qty_in_pack: { type: Number },
          carriers: [
            {
              carrier_barcode: { type: String },
              crate_weight: { type: Number },
              net_weight: { type: Number },
              gross_weight: { type: Number },
              stacked_time: { type: Date, default: new Date() },
              picked_location: { type: String },
              carrier_status: {
                type: String,
                default: "PRESENT",
                enum: ["PRESENT", "REMOVED"],
              },
              storage: {
                type: String,
                enum: ["Primary_storage", "Secondary_storage"],
              },
            },
          ],
        },
      ],
      created_by: { type: String },
      updated_by: { type: String, default: "" },
    },
    {
      timestamps: true,
    }
  );

  const cumulativePalletization = mongoose.model(
    "rapid_cumulative_palletization",
    schema
  );
  return cumulativePalletization;
};
