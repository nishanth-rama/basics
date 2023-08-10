const db = require("../../models");
const crate_counter_system = db.crate_counter_system;
const crate_counter = db.crate_counter;
const moment_ts = require("moment-timezone");

// save crate counter system barcode
exports.add_crate_counter = async (req, res) => {
  let barcode = req.body.crate_barcode;

  if (!barcode) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing Parameter!" });
  }

  try {
    const crateCounter = {
      crate_barcode: barcode,
    };

    let crate_barcode = await crate_counter_system.create(crateCounter);

    return res.status(200).send({
      status_code: "200",
      status_message: "crate barcode data",
      data: crate_barcode,
    });
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some Error Occurred While Update the data!",
    });
  }
};
exports.add_count = async (req, res) => {
  let clearValue = req.body.clear;
  // let date = req.body.date;

  try {
    clearValue = req.body.clear;

    let updateQuery = {};

    if (clearValue === "0") {
      updateQuery = { $set: { int: 0 } };
    } else {
      updateQuery = { $inc: { int: 1 } };
    }

    const updatedCounter = await crate_counter.findOneAndUpdate(
      {},
      updateQuery,
      { new: true, upsert: true }
    );

    return res.status(200).send({
      status_code: "200",
      status_message: "crate count",
      data: updatedCounter,
    });
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some Error Occurred While Update the data!",
    });
  }
};
