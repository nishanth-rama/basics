const db = require("../../models");
const plc_logs_table = db.plc_logs;
const moment_ts = require("moment-timezone");

exports.add_plc_logs = async (req, res) => {
  // res.send("add_plc_logs");

  console.log("add_plc_logs");

  const company_code = req.body.company_code;
  const plant_id = req.body.plant_id;
  const device_id = req.body.device_id;
  const command_log = req.body.command_log;
  const command_type = req.body.command_type;

  // console.log("req.body",req.body);
  // console.log("parameter",device_id,plant_id,company_code,command_logs,command_type);

  if (!(device_id && plant_id && company_code && command_log && command_type)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Parameters are missing!" });
  }

  try {
    // res.send("add_plc_logs");
    let add_plc_log = {};
    add_plc_log.company_code = company_code;
    add_plc_log.plant_id = plant_id;
    add_plc_log.device_id = device_id;
    add_plc_log.command_log = command_log;
    let format = "YYYY-MM-DD HH:mm:ss";
    let command_received_time = moment_ts(new Date(), format)
      .tz("Asia/Kolkata")
      .format(format);

    add_plc_log.command_received_time = command_received_time;
    if (
      command_type == "sender" ||
      command_type == "receiver" ||
      command_type == "api"
    ) {
      add_plc_log.command_type = command_type;
    } else {
      return res.status(400).send({
        status_code: "400",
        status_message: "command_type should be sender or receiver!",
      });
    }

    console.log("add_plc_log", add_plc_log);
    const plc_logs = new plc_logs_table(add_plc_log);
    let plc_logs_data = await plc_logs.save(plc_logs);

    return res.status(200).send({
      status_code: "200",
      status_message: "logs added",
    });
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

exports.get_all_plc_logs = async (req, res) => {
  console.log("get_all_plc_logs");

  const company_code = req.query.company_code;
  const plant_id = req.query.plant_id;
  const page_no = req.query.page_no;

  if (!(plant_id && company_code && page_no)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Parameters are missing!" });
  }

  condition = {};
  condition.company_code = company_code;
  condition.plant_id = plant_id;

  if (req.query.device_id) {
    condition.device_id = req.query.device_id;
  }

  if (req.query.logged_on) {
    condition.command_received_time = { $regex: req.query.logged_on };
  }

  if (req.query.search) {
    condition["$or"] = [
      { device_id: { $regex: req.query.search,$options:"i" } },
      { command_log: { $regex: req.query.search, $options:"i" } },
      { command_received_time: { $regex: req.query.search, $options:"i" } },
      { command_type: { $regex: req.query.search, $options:"i" } },
    ];
  }

  try {
    let total_plc_logs = await plc_logs_table.find(condition);
    let status_message =
      total_plc_logs.length > 0 ? "Listing the logs" : "No Logs are present";
    let page_size = req.query.page_size ? parseInt(req.query.page_size) : 25;
    let skip_count = page_no == 1 ? 0 : +page_no * page_size - page_size;

    let plc_logs = await plc_logs_table
      .find(condition)
      .sort({ _id: -1 })
      .skip(skip_count)
      .limit(page_size);

    // console.log(plc_logs.length);
    return res.status(200).send({
      status_code: "200",
      status_message: status_message,
      total_data_count: total_plc_logs.length,
      data: plc_logs,
    });
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};
