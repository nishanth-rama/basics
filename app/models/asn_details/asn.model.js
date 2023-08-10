const { string } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      po_number: { type: String },
      po_date: { type: String },
      po_type: { type: String },
      company_code: { type: String },
      vendor_code: { type: String },
      po_release_status: { type: String },
      vendor_acceptance_status: { type: String },
      item: [
        {
          po_item: { type: String },
          material: { type: String },
          material_description: { type: String },
          po_qty: { type: Number },
          plant: { type: String },
          confirmation_control_key: { type: String },
          inbound_delivery_number: { type: String },
          inbound_delivery_item_no: { type: String },
          inbound_delivery_qty: { type: Number },
          inbound_delivery_date: { type: String },
          inbound_delivery_time: { type: String },
          grb_qty: { type: Number },
          grn_date: { type: String },
        },
      ],
    },
    {
      timestamps: true,
    }
  );
  const asnDetails = mongoose.model("rapid_wdc_asn_details", schema);
  return asnDetails;
};
