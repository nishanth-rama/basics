const { string } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
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

      binId: {
        type: String,
      },

      status: {
        type: String,
      },

      bin_status: {
        type: Number,
      },
      job_scheduled_on: {
        type: String,
      },
    },
    { timestamps: true }
  );

  const Tutorial = mongoose.model("rapid_jobSchedulers", schema);
  return Tutorial;
};
