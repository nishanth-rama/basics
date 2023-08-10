const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcript = require("bcryptjs");
const dbConfig = require("../../config/db.config.js");
const { string } = require("joi");

module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      company_code: {
        type: String,
        minlength: 1,
        maxlength: 44,
      },
      plant_id: {
        type: String,
        minlength: 1,
        maxlength: 44,
      },

      email: {
        type: String,
        minlength: 10,
        maxlength: 44,
        lowercase: true,
        validate: [
          /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
          "please provide a valid email",
        ],
        required: true,
      },
      module_name: {
        type: String,
        minlength: 1,
        maxlength: 44,
      },
      device_id: {
        type: String,
      },
      device_name: {
        type: String,
        minlength: 1,
        maxlength: 44,
      },
      device_location : {
        type :String,
      },
      ip_address: {
        type: String,
        default: null,
        maxlength: 44,
      },
      printer_ip_address: {
        type: String,
        default: null,
        maxlength: 44,
      },
      
      mac_address: {
        type: String,
        default: null,
        maxlength: 44,
      },
      mode_of_access: {
        type: String,
        minlength: 1,
        maxlength: 44,
      },
      port_address: {
        type: String,
        minlength: 1,
        maxlength: 44,
      },
      printer_port_address: {
        type: String,
        minlength: 1,
        maxlength: 44,
      },
      connection_type: { type: String, minlength: 1, maxlength: 44 },
      created_by: { type: String, minlength: 1, maxlength: 44 },
      updated_by: { type: String, minlength: 1, maxlength: 44 },
    },
    { timestamps: true }
  );

  const Tutorial = mongoose.model("rapid_user_module_mapping", schema);
  return Tutorial;
};
