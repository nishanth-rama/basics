const db = require("../../models");
const crate_management = db.crate_management_Details;
const moment = require("moment-timezone");

exports.all_crates = async (req, res, next) => {
  try {
    // const pageNumber = parseInt(req.query.pageNumber) || 1;
    // const pageSize = parseInt(req.query.pageSize) || 10;
    // const skip = (pageNumber - 1) * pageSize;
    // const limit = pageSize;
    const { plant_code, company_code } = req.query;
    if (!(plant_code && company_code))
      return res
        .status(400)
        .send({ status_code: "400", message: "Missing parameter!" });

    // Define the aggregation pipeline
    const pipeline = [
      {
        $match: {
          plant_code: plant_code,
          company_code: company_code,
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "crate_management_master_color",
          localField: "color",
          foreignField: "color",
          as: "colorDetails",
        },
      },
      {
        $unwind: "$colorDetails",
      },
      {
        $addFields: {
          colorCode: "$colorDetails.color_code",
        },
      },
      {
        $project: {
          //   _id: 0,
          colorDetails: 0,
        },
      },
      // {
      //   $skip: skip,
      // },
      // {
      //   $limit: limit,
      // },
    ];

    // Execute the aggregation pipeline and store the result
    const result = await crate_management.aggregate(pipeline).exec();

    let updated_data = result.map((item) => {
      let updatedBarCodes = item.bar_codes_array.map((barcode) => {
        let modifiedBarCode = barcode.bar_code.replace("\r", "");
        return { ...barcode, bar_code: modifiedBarCode };
      });
      return { ...item, bar_codes_array: updatedBarCodes };
    });
    if (result.length == 0) {
      return res.status(200).send({
        status_code: "200",
        message: "crates not available",
        data: updated_data,
      });
    }
    res.status(200).send({
      status_code: 200,
      message: "list of crates",
      data: updated_data,
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

    const result = await crate_management.find(
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
        data: plant_codes,
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

exports.add_crates_detail = async (req, res, next) => {
  try {
    const crate = req.body;
    let rem_bar_code = crate.bar_codes;
    if (!req.body) {
      return res
        .status(400)
        .send({ status_code: "400", status_message: "Missing Parameter!" });
    }

    const existCrates = await crate_management.find(
      { bar_code: { $in: crate.bar_codes } },
      { _id: 0, bar_code: 1 }
    );

    // finding duplicates values
    const existingBarCodeValues = existCrates.map((item) => item.bar_code);

    // Delete existing bar codes from the input data
    rem_bar_code = rem_bar_code.filter(
      (code) => !existingBarCodeValues.includes(code)
    );

    const barCodes = rem_bar_code;
    // const crates =[];
    const crateList = barCodes.map((code) => {
      const crateData = {};
      crateData["company_code"] = crate.company_code;
      crateData["plant_code"] = crate.plant_code;
      crateData["bar_code"] = code;
      crateData["size"] = crate.size;
      crateData["capacity"] = crate.capacity;
      crateData["weight"] = crate.weight;
      crateData["color"] = crate.color;
      crateData["note"] = crate.note;
      // crates.push(crate);
      return crateData;
    });
    const result = await crate_management.insertMany(crateList);
    res.status(201).send({
      status_code: 201,
      message: `${
        result.length > 0
          ? `${result.length} crate inserted successfully! ,`
          : ""
      }${existingBarCodeValues.length} already exists!`,
      data: result,
      existing_value: existingBarCodeValues,
    });
  } catch (error) {
    res.status(500).send({ status_code: 500, message: error.message });
  }
};

exports.add_crates_bulk_list = async (req, res, next) => {
  try {
    const crate_value = req.body;
    let rem_bar_code = crate_value.bar_codes_array;
    var rem_bar_code_array = [];
    if (!req.body) {
      return res
        .status(400)
        .send({ status_code: "400", status_message: "Missing Parameter!" });
    }

    for (const barCodeObj of rem_bar_code) {
      const existingDoc = await crate_management.findOne({
        "bar_codes_array.bar_code": barCodeObj.bar_code,
      });

      if (existingDoc == null) {
        rem_bar_code_array.push(barCodeObj);
      }
    }

    crate_value.bar_codes_array = rem_bar_code_array;
    if (crate_value.bar_codes_array.length <= 0) {
      return res
        .status(400)
        .send({ message: " Barcode(s) already exist Please rescan" });
    }

    const dateFormat = "YYYY-MM-DD";
    const timeFormat = "HH:mm:ss";

    const now = moment().tz("Asia/Kolkata");
    crate_value.date = now.format(dateFormat);
    crate_value.time = now.format(timeFormat);

    const crateData = crate_management(crate_value);
    const result = await crateData.save();

    res.status(201).send({
      status_code: 201,
      message: "crate inserted successfully",
      data: result,
    });
  } catch (error) {
    res.status(500).send({ status_code: 500, message: error.message });
  }
};

exports.update_crate = async (req, res, next) => {
  try {
    let id = req.params.id;
    let data = req.body;
    const crate = await crate_management.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!crate) {
      res
        .status(400)
        .send({ status_code: 400, message: "No document found with that id" });
    } else {
      res
        .status(201)
        .send({ status_code: 200, message: "Crate updated.", data: crate });
    }
  } catch (error) {
    res.status(500).send({ status_code: 500, message: error.message });
  }
};

exports.delete_crate = async (req, res, next) => {
  try {
    let id = req.params.id;
    const crate = await crate_management.updateOne(
      { _id: id },
      { $set: { active_state: false } }
    );

    if (crate.modifiedCount === 0) {
      res
        .status(400)
        .send({ status_code: 400, message: "No document found with that id" });
    } else {
      res.status(201).send({ status_code: 200, message: "Crate deleted." });
    }
  } catch (error) {
    res.status(500).send({ status_code: 500, message: error.message });
  }
};

exports.crate_weight = async (req, res, next) => {
  try {
    let bar_code = req.body.barcode;
    let barcode = bar_code + "\r";
    if (!bar_code) {
      return res
        .status(400)
        .send({ status_code: "400", status_message: "Missing Parameter!" });
    }
    const query = { "bar_codes_array.bar_code": barcode };
    const palletDetails = await crate_management.aggregate([
      {
        $match: query,
      },
      {
        $project: {
          bar_codes_array: {
            $filter: {
              input: "$bar_codes_array",
              as: "barcode",
              cond: { $eq: ["$$barcode.bar_code", barcode] },
            },
          },
        },
      },
    ]);

    const weight = palletDetails[0]?.bar_codes_array[0]?.weight;
    if (weight == undefined || palletDetails == null) {
      return res
        .status(400)
        .send({ status_code: "400", status_message: "weight not found!" });
    }

    res.status(201).send({
      status_code: 201,
      message: "crate weight",
      crate_weight: weight,
    });
  } catch (error) {
    res.status(500).send({ status_code: 500, message: error.message });
  }
};

exports.crate_barcode = async (req, res) => {
  try {
    const { id } = req.query;

    if (!id)
      return res
        .status(400)
        .send({ status_code: "200", message: "Missing parameter!" });

    let palletDetails = await crate_management.findOne({ _id: id });

    if (!palletDetails || palletDetails.bar_codes_array.length === 0) {
      return res.status(200).send({
        status_code: "200",
        message: "crates not available",
        data: [],
      });
    }

    let updatedBarCodes = palletDetails.bar_codes_array.map(
      (item) => item._doc
    );

    updatedBarCodes = updatedBarCodes.map((barcode) => {
      let modifiedBarCode = barcode.bar_code.replace("\r", "");
      return { ...barcode, bar_code: modifiedBarCode };
    });

    return res.status(200).send({
      status_code: "200",
      message: "crate details",
      data: updatedBarCodes,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message: "Some error occurred while extracting details !",
    });
  }
};
