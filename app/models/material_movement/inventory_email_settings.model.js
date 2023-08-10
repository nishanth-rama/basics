module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      email: {
        type: String,
      },
      plant_id: {
        type: String,
      },
      report_name: {
        type: String,
      },
      status: {
        type: String,
        enum: ["yes", "no"],
      },
    },

    { timestamps: true }
  );

  const email_settings = mongoose.model(
    "rapid_inventory_email_settings",
    schema
  );
  return email_settings;
};
