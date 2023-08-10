const mongoose = require("mongoose");
const Schema = mongoose.Schema;

module.exports = (mongoose) => {
  var schema = mongoose.Schema({
    company_code: {
      type: String,
    },
    user_name: {
      type: String,
    },
    password: {
      type: String,
    },
  });

  const Report_email = mongoose.model("rapid_smtp_details", schema);
  return Report_email;
};
