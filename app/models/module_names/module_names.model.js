const mongoose = require("mongoose");

module.exports = (mongoose) => {
  var schema = mongoose.Schema({
    company_code: {
      type: String,
    },
    plant_id: {
      type: String,
    },
    module_name: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
  );

  const moduleName = mongoose.model("rapid_module_names", schema);
  return moduleName;
};

