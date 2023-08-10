const { string } = require("joi");
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
      device_id: {
        type: String,
      },
      command_log : {
        type : String
      },
      command_type : {
        type : String,
        enum : ["sender","receiver","api"]
      },
      command_received_time : {
        type : String
      }
    },
    { timestamps: true }
  );

  const Tutorial = mongoose.model("rapid_plc_logs", schema);
  return Tutorial;
};
