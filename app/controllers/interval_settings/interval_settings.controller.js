const db = require("../../models");
const intervalModel = db.intervalModel;

const updateOrCreateNew = async (req, res) => {
  console.log("Getting request for adding new invoice interval");
  let { company_code, plant_id, function_name, time_value } = req.body;
  if (!(company_code, plant_id, function_name, time_value)) {
    return res.status(400).send({
      status_code: 400,
      message:
        "Please provide company_code, plant_id, function_name and time_value.",
    });
  }

  let newData = {
    company_code: company_code,
    plant_id: plant_id,
    time_records: [],
  };
  let responseData = {};
  let newTimeRecord = {};
  let conversionArray = time_value.split(":");
  let conversion_value =
    parseInt(conversionArray[0]) * 60 * 60 +
    parseInt(conversionArray[1]) * 60 +
    parseInt(conversionArray[2]);
  newTimeRecord["function_name"] = function_name;
  newTimeRecord["time_interval"] = time_value;
  newTimeRecord["conversion_value"] = conversion_value;
  newData.time_records.push(newTimeRecord);
  try {
    await intervalModel
      .findOne({ company_code: company_code, plant_id: plant_id })
      .then(async (timeSettingRecord) => {
        if (timeSettingRecord) {
          let update_time_record = timeSettingRecord.time_records;
          let updatedObj = {};
          await newData.time_records.map((eachNew) => {
            updatedObj["function_name"] = eachNew.function_name;
            updatedObj["time_interval"] = eachNew.time_interval;
            updatedObj["conversion_value"] = eachNew.conversion_value;
            const indexOfItem = update_time_record.findIndex(
              (item) => item.function_name === updatedObj.function_name
            );
            if (indexOfItem === -1) {
              // not existing obj
              update_time_record.push(updatedObj);
            } else {
              update_time_record[indexOfItem].conversion_value =
                updatedObj.conversion_value;
              update_time_record[indexOfItem].time_interval =
                updatedObj.time_interval;
            }
          });
          timeSettingRecord["time_records"] = update_time_record;
          timeSettingRecord.save();
          responseData = timeSettingRecord;
        } else {
          responseData = new intervalModel(newData);
          await responseData.save();
        }
        return res.status(200).send({
          status_code: 200,
          data: responseData,
          message: "interval record updated successfully",
        });
      });
  } catch (err) {
    return res.status(500).send({
      status_code: 500,
      message: "Something went wrong!",
      error: err,
    });
  }
};

const getSpecific = async (req, res) => {
  console.log(
    "Getting request interval record based on company_code and plant_id"
  );
  let { company_code, plant_id } = req.query;
  if (!(company_code && plant_id)) {
    return res.status(400).send({
      status_code: 400,
      message: "Please provide company_code and plant_id",
    });
  }
  try {
    await intervalModel
      .find({ company_code: company_code, plant_id: plant_id })
      .then((data) => {
        let resMessage = "Interval record fetched succesfully!";
        if (data.length === 0) resMessage = "No record found!";
        return res.status(200).send({
          data: data,
          status_code: 200,
          message: resMessage,
        });
      });
  } catch (err) {
    return res.status(500).send({
      status_code: 500,
      message: "Something went wrong!",
      error: err,
    });
  }
};

module.exports = {
  updateOrCreateNew,
  getSpecific,
};
