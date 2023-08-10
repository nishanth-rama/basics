
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
    request: {type: Object},
    response: {type: Object },
    company_code: {type: String},
    plant_id: {type: String},
    primaryData: {type: String},
    type: { type: String, enum: ['invoice', 'allocation', "Goods Receipts Note", "Stock Transfer In","Stock Transfer Out", "sto_invoice"] },
  },
  {
    timestamps: true,
  },
);

const sapLogs = mongoose.model("rapid_sap_logs", schema);
  return sapLogs;
};