const db = require("../../models");
const moment = require("moment-timezone");
const machine_monitoring = db.machine_monitoring_system;

exports.add_machine_monitoring = async (req, res) => {
  try {
    const {
      company_code,
      plant_code,
      humidity,
      temp,
      status,
      off_time,
      on_time,
    } = req.body;

    if (
      !(
        company_code &&
        plant_code &&
        humidity &&
        temp &&
        status &&
        off_time &&
        on_time
      )
    ) {
      return res
        .status(400)
        .send({ status_code: "400", status_message: "Missing Parameter!" });
    }

    const dateFormat = "YYYY-MM-DD";
    const timeFormat = "HH:mm:ss";

    const now = moment().tz("Asia/Kolkata");
    const date = now.format(dateFormat);
    const time = now.format(timeFormat);

    const machine_date = {
      company_code: company_code,
      plant_code: plant_code,
      humidity: humidity,
      temp: temp,
      status: status,
      off_time: off_time,
      on_time: on_time,
      date: date,
      time: time,
    };

    const result = await machine_monitoring.create(machine_date);
    res.status(200).send({
      status_code: 200,
      message: "Humidity and temperature added successfully.",
    });
  } catch (error) {
    res.status(500).send({ status_code: 500, message: error.message });
  }
};

exports.get_all = async (req, res) => {
  try {
    const { company_code, plant_code, date } = req.query;

    // const page_no = parseInt(req.query.page_no) || 1;
    // const page_limit = parseInt(req.query.page_limit) || 1;
    // const skip = (page_no - 1) * page_limit;
    // const limit = page_limit;

    if (!(company_code && plant_code)) {
      return res
        .status(400)
        .send({ status_code: "400", status_message: "Missing Parameter!" });
    }

    const pipeline = [
      {
        $match: {
          plant_code: plant_code,
          company_code: company_code,
        },
      },
      { $sort: { createdAt: -1 } },
      // { $skip: skip },
      // { $limit: limit },
    ];

    if (date) {
      pipeline[0].$match.date = { $eq: date };
    }
    const result = await machine_monitoring.aggregate(pipeline).exec();

    if (result.length == 0 || result == null) {
      return res.status(200).send({
        status_code: "200",
        message: "data not available",
        data: [],
      });
    }

    res.status(200).send({
      status_code: 200,
      message: "machine monitoring system details.",
      data: result,
    });
  } catch (error) {
    res.status(500).send({ status_code: 500, message: error.message });
  }
};

exports.get_plants = async (req, res, next) => {
  try {
    const company_code = req.query.company_code;

    if (!company_code) {
      return res
        .status(400)
        .send({ status_code: "400", status_message: "Needs company code!" });
    }

    const result = await machine_monitoring.find(
      { company_code: company_code },
      { plant_code: 1 }
    );
    const plant_codes = Array.from(
      new Set(result.map((item) => item.plant_code))
    );

    if (result.length == 0) {
      return res.status(200).send({
        status_code: "200",
        message: "plants not available",
        data: [],
      });
    }
    res.status(200).send({
      status_code: 200,
      message: "list of plants",
      data: plant_codes,
    });
  } catch (error) {
    res.status(500).send({ status_code: 500, message: error.message });
  }
};
