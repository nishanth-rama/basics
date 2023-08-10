const { string } = require("joi");
const mongoose = require("mongoose");
const autoIncrement = require("mongoose-sequence")(mongoose);

module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      command_id: {
        type: Number,
      },
      company_code: {
        type: String,
      },
      plant_id: {
        type: String,
      },
      device_id: {
        type: String,
      },
      type : {
        type : String
      },
      command_line: {
        type: String,
      }
    },
    { timestamps: true }
  );

  schema.plugin(autoIncrement, { inc_field: "command_id" });

  const Conveyor_command = mongoose.model("rapid_conveyor_commands", schema);
  return Conveyor_command;
};
