const mongoose = require("mongoose");
const Schema = mongoose.Schema;

module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      int: {
        type: Number,
        unique: true,
      },
    },
    {
      timestamps: true,
    }
  );
  const crate = mongoose.model("crate_count", schema);
  return crate;
};
