"use strict";
const { create } = require("lodash");
const db = require("../../models");

const crateTypeColl = db.crateTypes;
const crate_detail_table = db.crate_management_Details;

exports.getCrateTypes = async (req, res) => {
  console.log("calling get all crate types api");
  const { company_code, plant_id } = req.query;
  try {
    if (!(company_code && plant_id))
      return res.status(400).send({
        status_code: 400,
        message: "Please provide company code and plant id!",
      });

    const details = await crateTypeColl.find(
      {
        company_code: company_code,
        plant_id: plant_id,
      },
      {
        _id: 0,
        status: 1,
        // company_code: 1,
        // plant_id: 1,
        crate_type: 1,
        tare_weight: 1,
        created_by: 1,
        updated_by: 1,
      }
    );

    let mssge = "Crate types list available!";
    let status = 200;

    if (details.length == 0) {
      mssge = "Crate type details not found!";
      status = 404;
    }

    return res
      .status(200)
      .send({ status_code: 200, message: mssge, data: details });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting crate type list!",
    });
  }
};

async function crate_master_findOne(company_code, crate_barcode_value) {

  return await crate_detail_table.aggregate([
    {
      $match: {
        company_code: company_code,
      }
    },
    {
      $unwind: "$bar_codes_array"
    },
    {
      $match: {
        "bar_codes_array.bar_code": crate_barcode_value
      }
    },
    {
      $limit: 1
    },
    {
      $project: {
        _id: 0,
        "crate_type": "$color",
        "crate_barcode_value": "$bar_codes_array.bar_code",
        "tare_weight": "$bar_codes_array.weight",
      }
    }
  ])
}
exports.getCrateTypesV2 = async (req, res) => {
  console.log("calling get all crate types api");
  const { company_code, crate_barcode_value } = req.query;
  try {
    if (!(company_code && crate_barcode_value))
      return res.status(400).send({
        status_code: 400,
        message: "Please provide crate_barcode_value and company code!",
      });

    // let final_response = [];

    let crate_master_details = await crate_master_findOne(company_code, crate_barcode_value);
    console.log("crate_master_details",crate_master_details);
    // if (crate_master_details.length) {
    //   final_response.push(crate_master_details[0]);
    // }
    
    let mssge = "Crate types list available!";
    let status = 200;

    if (!(crate_master_details.length)) {
      mssge = "Please enter crate tare weight!";
      status = 404;
    }
    return res
      .status(status)
      .send({ status_code: status, message: mssge, data: crate_master_details[0] });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting crate type list!",
    });
  }
};


exports.addCrateType = async (req, res) => {
  console.log("calling add crate type api");
  const { company_code, plant_id, crate_type, tare_weight, created_by } =
    req.body;
  try {
    if (!(company_code && plant_id && crate_type && tare_weight && created_by))
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    const checkAlreadyExists = await crateTypeColl.find(
      {
        company_code: company_code,
        plant_id: plant_id,
      },
      { _id: 0, crate_type: 1 }
    );

    let duplicate = false;

    for (let i = 0; i < checkAlreadyExists.length; i++) {
      if (
        checkAlreadyExists[i].crate_type.toLowerCase() ==
        crate_type.toLowerCase()
      ) {
        duplicate = true;

        break;
      }
    }

    if (duplicate)
      return res.send({
        status_code: 400,
        message:
          "Already crate type : '" + crate_type.toLowerCase() + "' exists!",
      });

    await crateTypeColl.create({
      company_code: company_code,
      plant_id: plant_id,
      crate_type: crate_type,
      tare_weight: tare_weight,
      created_by: created_by,
      updated_by: created_by,
    });

    return res.send({
      status_code: 200,
      message: " New crate type added successfully",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while saving new crate type!",
    });
  }
};

exports.update = async (req, res) => {
  console.log("calling update crate type api");
  const { company_code, plant_id, crate_type, tare_weight, updated_by } =
    req.body;
  try {
    if (!(company_code && plant_id && crate_type && tare_weight && updated_by))
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    const updateTare = await crateTypeColl.findOneAndUpdate(
      {
        company_code: company_code,
        plant_id: plant_id,
        crate_type: crate_type,
      },
      { tare_weight: tare_weight, updated_by: updated_by }
    );
    let status = 200;
    let mssge = "crate tare updated successfully";

    if (updateTare == null) {
      status = 404;
      mssge = "Failed to update crate tare or given crate type not found!";
    }

    return res.status(status).send({
      status_code: status,
      message: mssge,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while updating crate tare!",
    });
  }
};

exports.delete = async (req, res) => {
  console.log("calling delete crate type api");
  const { company_code, plant_id, crate_type } = req.query;
  try {
    if (!(company_code && plant_id && crate_type))
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    const deleteCrateType = await crateTypeColl.findOneAndDelete({
      company_code: company_code,
      plant_id: plant_id,
      crate_type: crate_type,
    });

    let status = 200;
    let mssge = "crate type deleted successfully";

    if (deleteCrateType == null) {
      status = 404;
      mssge = "Failed to delete crate type or given crate type not found!";
    }

    return res.status(status).send({
      status_code: status,
      message: mssge,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while deleting crate type!",
    });
  }
};
