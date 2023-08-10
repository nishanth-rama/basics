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
      email_adddress: [
        {
          type: String,
        },
      ],
    },
    { timestamps: true }
  );

  const Report_email = mongoose.model("rapid_daily_report_emails", schema);
  return Report_email;
};
