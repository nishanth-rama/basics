const mongoose = require("mongoose");
const Schema = mongoose.Schema;

module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      crate_barcode: {
        type: String,
        unique: true,
      },
    },
    {
      timestamps: true,
    }
  );
  const crate = mongoose.model("crate_barcode_list", schema);
  return crate;
};
