const mongoose = require("mongoose");

const sizeSchema = new mongoose.Schema({
  size: {
    type: String,
    required: true,
    unique: true,
  },
});

const colorSchema = new mongoose.Schema({
  color: {
    type: String,
    required: true,
    unique: true,
  },
  color_code: {
    type: String,
    required: true,
  },
});

const capacitySchema = new mongoose.Schema({
  capacity: {
    type: Number,
    required: true,
    unique: true,
  },
});

const ipSchema = new mongoose.Schema({
  ip_address: {
    type: String,
    required: true,
    unique: true,
  },
});

const Color = mongoose.model("crate_management_master_color", colorSchema);
const Size = mongoose.model("crate_management_master_size", sizeSchema);
// const Plant = mongoose.model("crate_management_master_color", plantsSchema);
const Capacity = mongoose.model(
  "crate_management_master_capacity",
  capacitySchema
);
const Ip = mongoose.model("crate_management_master_ip_address", ipSchema);

module.exports = { Color, Size, Capacity, Ip };
