const mongoose = require("mongoose");
const autoIncrement = require("mongoose-sequence")(mongoose);

module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      country_id: {
        type: Number,
        default: 0,
        unique: true,
      },
      country_name: {
        type: String,
      },
      country_code: {
        type: String,
      },
    },
    { timestamps: true }
  );

  schema.plugin(autoIncrement, {id: "country", inc_field: 'country_id'});
  const Tutorial = mongoose.model("rapid_country_details", schema);
  return Tutorial;
};
