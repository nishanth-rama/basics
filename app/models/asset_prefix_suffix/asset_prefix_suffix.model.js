"use strict";
const mongoose = require("mongoose");
mongoose.pluralize(null);

module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      company_code: {
        type: Number,
        required: true,
      },
      plant_id: {
        type: Number,
        required: true,
      },
      prefix: {
        type: String,
        required: true,
      },
      suffix: {
        type: String,
      },
      asset_type: {
        type: String,
        required: true,
      },
    },
    { timestamps: true }
  );

  // schema.method("toJSON", function() {
  //   const { __v, _id, ...object } = this.toObject();
  //   object.id = _id;
  //   return object;
  // });

  const Tutorial = mongoose.model("rapid_asset_prefix_suffix_settings", schema);
  return Tutorial;
};
