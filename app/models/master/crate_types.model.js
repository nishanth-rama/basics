"use strict";

module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      company_code: {
        type: String,
        minlength: 1,
        maxlength: 100,
        required: true,
      },

      plant_id: {
        type: String,
        minlength: 1,
        maxlength: 100,
        required: true,
      },

      crate_type: {
        type: String,
        minlength: 1,
        maxlength: 100,
        required: true,
        //unique: true,
      },

      tare_weight: {
        type: Number,
        min: 0,
        max: 100,
        required: true,
      },

      created_by: {
        type: String,
        minlength: 1,
        maxlength: 100,
        required: true,
      },

      updated_by: {
        type: String,
        minlength: 1,
        maxlength: 100,
        required: true,
      },

      status: {
        type: String,
        enum: ["ACTIVE", "INACTIVE"],
        default: "ACTIVE",
        required: true,
      },
    },
    { timestamps: true }
  );

  const crateTypes = mongoose.model("rapid_crate_types", schema);
  return crateTypes;
};
