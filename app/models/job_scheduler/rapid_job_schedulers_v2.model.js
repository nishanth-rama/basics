const { string } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      is_deleted: {
        type: Boolean,
        default: false,
      },
      company_code: {
        type: String,
      },
      plant_id: {
        type: String,
      },
      sales_order_no: {
        type: String,
        required: true,
      },
      bin_id: {
        type: String,
      },
      status: {
        type: String,
      },
      bin_status: {
        type: Number,
      },
      bin_weight_status: {
        type: String,
      },
      job_scheduled_on: {
        type: String,
      },
      bin_detail: [
        {
          material_no: {
            type: String,
          },
          material_name: {
            type: String,
          },
          item_no: {
            type: String,
          },
          assigned_qty: {
            type: Number,
          },
          pending_qty: {
            type: Number,
          },
          qty_in_kg: {
            type: Number,
          },
        },
      ],
    },
    { timestamps: true }
  );

  const Tutorial = mongoose.model("rapid_job_schedulers_v2s", schema);
  return Tutorial;
};
