const mongoose = require("mongoose");
const Schema = mongoose.Schema;

module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      sales_order_no: { type: String },
      plant_id: { type: String },
      so_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "rapid_sales_order_allocation",
      },
      invoice_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "rapid_allocation_invoice_details",
        default: null,
      },
      allocation_id: { type: String },
      invoice_no: { type: String },
      invoice_status: { type: String, default: "wait" },
      delivery_date: { type: String },
      customer_code: { type: String },
      customer_name: { type: String },
      company_code: { type: String },
      route_id: { type: String },
      item_details: [
        {
          _id: false,
          item_no: { type: String },
          quantity: { type: Number },
          so_qty: { type: Number },
          inventory_qty:{type: Number},
          material_no: { type: String },
          material_name: { type: String },
          pallet_details: [{ _id: false, pallet_id: { type: String } }],
        },
      ],
    },
    {
      timestamps: true,
    }
  );

  const soAllocation = mongoose.model(
    "rapid_sales_order_allocation_generate",
    schema
  );
  return soAllocation;
};
// module.exports = mongoose.model('So_allocation_generate', allocationGenerateSchema);
