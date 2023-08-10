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
      mac_id: {
        type: String,
      },
      temperature: {
        type: String,
      },
      battery_level: {
        type: String,
      },
      deviceEvent : {
        type : Number
      },
      fwRev : {
        type : Number
      },
      log_date_time : {
        type: Date,
        // default: new Date(),
      }
    },
    { timestamps: true }
  );

  const Cold_room_temparature = mongoose.model("rapid_cold_room_temperature_details", schema);
  return Cold_room_temparature;
};
