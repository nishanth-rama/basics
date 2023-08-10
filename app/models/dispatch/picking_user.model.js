const mongoose = require("mongoose");
const Schema = mongoose.Schema;

module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      company_code: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 100,
      },
      plant_id: { type: String, required: true, minlength: 1, maxlength: 100 },
      delivery_date: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 100,
      },
      route_id: { type: String, required: true, minlength: 1, maxlength: 100 },
      material_code: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 100,
      },
      user_name: { type: String, required: true, minlength: 1, maxlength: 100 },

      user_name_list: [
        { type: String, required: true, minlength: 1, maxlength: 100 },
      ],

      status: {
        type: String,
        default: "ACTIVE",
        enum: ["ACTIVE", "INACTIVE"],
      },
    },
    {
      timestamps: true,
    }
  );

  const dispatchDetails = mongoose.model(
    "rapid_cumulative_picking_sku_lock",
    schema
  );
  return dispatchDetails;
};
