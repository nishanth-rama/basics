const db = require("../../models");

const Cold_room_temparature_table = db.coldRoomTemperature;

exports.add_device_temperature_detail = async (req, res) => {
  const {
    company_code,
    plant_id,
    device_id,
    mac_id,
    temperature,
    battery_level,
    deviceEvent,
    fwRev,
  } = req.body;

  if (
    !(company_code,
    plant_id,
    device_id,
    mac_id,
    temperature,
    battery_level,
    deviceEvent,
    fwRev)
  )
    return res
      .status(400)
      .send({ status_code: 400, message: "Missing parameter!" });

  try {

    req.body.log_date_time = new Date()

    // console.log(req.body)
    
    const device_deatil = new Cold_room_temparature_table(req.body);

    const check_detail = await device_deatil.save();

    // console.log("check_detail",check_detail)

    res.status(200).json({
      status_code: 200,
      message: "device temperature detail added successfully",
    });
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message || "Some error occurred while adding temperature detail",
    });
  }
};
