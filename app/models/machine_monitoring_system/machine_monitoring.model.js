module.exports = (mongoose) => {
  var mongoose = require("mongoose");

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
      humidity: {
        type: String,
      },
      temp: {
        type: String,
      },
      status: {
        type: String,
      },
      off_time: {
        type: String,
      },
      on_time: {
        type: String,
      },
      date: {
        type: String,
      },
      time: {
        type: String,
      },
    },
    {
      timestamps: true,
    }
  );
  const machine_monitoring = mongoose.model(
    "rapid_machine_monitoring_system",
    schema
  );
  return machine_monitoring;
};
