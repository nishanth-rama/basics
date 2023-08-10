const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const { Size, Plant } = require("./master.model");

module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      company_code: {
        type: String,
        required: true,
        default: 1000,
      },
      plant_code: {
        type: String,
        required: true,
      },
      size: {
        type: String,
        required: true,
      },
      capacity: {
        type: String,
        required: true,
      },
      color: {
        type: String,
        required: true,
      },
      note: {
        type: String,
      },
      status: {
        type: String,
        default: "In",
        enum: ["In", "Out"],
      },
      active_state: {
        type: Boolean,
        default: true,
      },
      grn_date: {
        type: String,
      },
      grn_number: {
        type: String,
      },
      user_id: {
        type: String,
      },
      user_name: {
        type: String,
      },
      date: {
        type: String,
      },
      time: {
        type: String,
      },
      bar_codes_array: [
        {
          bar_code: {
            type: String,
            required: true,
            unique: true,
          },
          weight: {
            type: String,
          },
        },
      ],
    },
    {
      timestamps: true,
    }
  );
  const crate = mongoose.model("crate_management_list", schema);
  return crate;
};
