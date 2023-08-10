"use strict";

const { filter } = require("lodash");
const { countryDetails } = require("../../models");
const db = require("../../models");

var ObjectId = require("mongodb").ObjectId;

const carrierCount = db.discrete_item;

exports.create = async (req, res) => {
  console.log("calling create carrier count api");
  const {
    company_code,
    plant_id,
    item_code,
    item_name,
    brand,
    carrier_type,
    carrier_count,
    rack_capacity,
    created_by,
  } = req.body;
  try {
    if (
      !(
        company_code &&
        plant_id &&
        item_code &&
        item_name &&
        brand &&
        carrier_type &&
        carrier_count != undefined &&
        rack_capacity != undefined &&
        created_by
      )
    )
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    if (
      await carrierCount.findOne({
        company_code: company_code,
        plant_id: plant_id,
        item_code: item_code,
        carrier_type: carrier_type,
      })
    )
      return res.status(409).send({
        status_code: 409,
        message:
          "Already data recorded for the selected carrier type and item code!",
      });

    if (carrier_count == 0 || rack_capacity == 0) {
      let str =
        carrier_count == 0 && rack_capacity == 0
          ? "Carrier count and rack capacity"
          : carrier_count == 0
          ? "Carrier count"
          : "Rack capacity";

      return res
        .status(400)
        .send({ status_code: 400, message: str + " should not be 'zero'!" });
    }

    const carrierCountDetails = {
      company_code: company_code,
      plant_id: plant_id,
      item_code: item_code,
      item_name: item_name,
      brand: brand,
      carrier_count: carrier_count,
      carrier_type: carrier_type,
      rack_capacity: rack_capacity,
      created_by: created_by,
      updated_by: created_by,
    };

    const saveCarrierCount = await carrierCount.create(carrierCountDetails);

    let status = 200;
    let mssge = "Saved new carrier count details successfully";

    if (saveCarrierCount == null) {
      mssge = "Save new carrier count details failed!";
      status = 422;
    }
    return res.status(status).send({ status_code: status, message: mssge });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        "Some error occcurred while saving products carrier count details!",
    });
  }
};

exports.update = async (req, res) => {
  console.log("calling update carrier count api");

  const id = req.params.id;
  const {
    company_code,
    plant_id,
    item_code,
    item_name,
    brand,
    carrier_count,
    carrier_type,
    rack_capacity,
    updated_by,
  } = req.body;
  try {
    if (company_code || plant_id || item_code || carrier_type) {
      let str =
        company_code != undefined
          ? "company code"
          : plant_id != undefined
          ? "plant id"
          : item_code != undefined
          ? "item code"
          : carrier_type != undefined
          ? "carrier type"
          : "";

      return res.status(400).send({
        status_code: 400,
        message: "Not allowed to update " + str + "!",
      });
    }

    if (
      !(
        item_name ||
        brand ||
        carrier_count != undefined ||
        rack_capacity != undefined
      )
    )
      return res.status(400).send({
        status_code: 400,
        message: "Provide some parameters to update!",
      });

    if (!updated_by)
      return res.status(400).send({
        status_code: 400,
        message:
          "Provide user name,the one who is updating the carrier count details",
      });

    let carrierCountInfo = req.body;

    //restricted to update
    delete carrierCountInfo.company_code;
    delete carrierCountInfo.plant_id;
    delete carrierCountInfo.item_code;
    delete carrierCountInfo.carrier_type;

    if (carrier_count == 0 || rack_capacity == 0) {
      let str =
        carrier_count == 0 && rack_capacity == 0
          ? "Carrier count and rack capacity"
          : carrier_count == 0
          ? "Carrier count"
          : "Rack capacity";

      return res
        .status(400)
        .send({ status_code: 400, message: str + " should not be 'zero'!" });
    }

    let filter = carrierCountInfo;
    filter._id = ObjectId(id);

    const checkSameInfoOrNot = await carrierCount.findOne(filter);

    if (checkSameInfoOrNot != null)
      return res.status(400).send({
        status_code: 400,
        message: "Please provide new information to update!",
      });

    const updateCarrierCount = await carrierCount.findByIdAndUpdate(
      id,
      carrierCountInfo,
      { useFindAndModify: false }
    );

    let status = 200;
    let mssge = "Updated carrier count details successfully";

    if (updateCarrierCount == null) {
      status = 422;
      mssge = "Update carrier count details failed!";
    }
    return res.status(status).send({ status_code: status, message: mssge });
    //
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        "Some error occcurred while saving products carrier count details!",
    });
  }
};

exports.getById = (req, res) => {
  console.log("calling selected carrier count details api");
  const id = req.params.id;

  carrierCount
    .findById(id)
    .then((data) => {
      if (!data)
        return res.status(404).send({
          status_code: 404,
          message: "Selected carrier count details is not available!",
          data: {},
        });
      else
        return res.send({
          status_code: 200,
          message: "Selected carrier count details is available",
          data: data,
        });
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).send({
        message:
          "Error occurred while retrieving selected carrier count details!",
      });
    });
};

exports.list = (req, res) => {
  console.log("calling selected carrier count details api");
  const { company_code, plant_id } = req.query;

  if (!(company_code && plant_id))
    return res.status(400).send({
      status_code: 400,
      message: "Provide company code and plant id to proceed!",
    });
  carrierCount
    .find({ company_code: company_code, plant_id: plant_id })
    .sort({ _id: -1 })
    .then((data) => {
      if (data.length == 0)
        return res.status(404).send({
          status_code: 404,
          message: "Carrier count details list is not available!",
          data: [],
        });
      else
        return res.send({
          status_code: 200,
          message: "Carrier count details list is available",
          data: data,
        });
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).send({
        message:
          "Error occurred while retrieving selected carrier count details!",
      });
    });
};

exports.delete = async (req, res) => {
  console.log("calling carrier count details delete api");
  const id = req.params.id;

  await carrierCount
    .findByIdAndRemove(id, { useFindAndModify: false })
    .then((data) => {
      if (!data)
        res.status(422).send({
          status_code: 422,
          message: "Unable to delete selected carrier count details!",
        });
      else
        res.send({
          status_code: 200,
          message: "Selected carrier count details deleted successfully",
        });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send({
        message: "Error occurred to delete selected carrier count details!",
      });
    });
};
