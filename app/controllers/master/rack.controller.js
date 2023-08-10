"use strict";

const ObjectId = require("mongoose").Types.ObjectId;
const { object } = require("joi");
const { company } = require("../../models");
const db = require("../../models");
const conn = require("../../../server.js");

const rack_type_table = db.rack_type;
const racks_detail_table = db.racks;
const palletization_table = db.palletization;

exports.createRackType = async (req, res) => {
  console.log("calling create Rack type api");
  const {
    company_code,
    company_name,
    plant_id,
    plant_name,
    rack_type,
    approximate_capacity,
    created_by,
  } = req.body;
  try {
    if (
      !(
        company_code &&
        company_name &&
        plant_id &&
        plant_name &&
        rack_type &&
        approximate_capacity &&
        created_by
      )
    )
      return res
        .status(400)
        .send({ message: "Provide all required parameters" });

    const checkDuplicateRackType = await rack_type_table.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        rack_type: rack_type,
      },
      { _id: 0, rack_type: 1 }
    );

    if (checkDuplicateRackType != null)
      return res
        .status(400)
        .send({ message: `${rack_type} rack type already exits!` });

    let rackTypeDetails = req.body;
    rackTypeDetails.updated_by = created_by;

    const createRackType = await rack_type_table.create(req.body);

    let mssge = "New rack type is created successfully";
    if (createRackType == null) mssge = "Rack type creation failed!";

    return res.send({ message: mssge });
  } catch (err) {
    console.log(err.message);

    if (err._message == "rapid_rack_types validation failed")
      return res.status(400).send({ message: "Validation failure!" });

    return res
      .status(500)
      .send({ message: "Some error occurred while creating rack type!" });
  }
};

exports.getRackType = async (req, res) => {
  console.log("calling get rack type api");
  const { company_code, plant_id } = req.query;

  try {
    if (!(company_code && plant_id))
      return res
        .status(400)
        .send({ message: "Please provide company code and plant id" });

    const rackTypes = await rack_type_table.find(
      {
        company_code: company_code,
        plant_id: plant_id,
      },
      { _id: 0, rack_type: 1 }
    );
    let status = 200;
    let mssge = "Rack type is available";
    if (rackTypes.length == 0) {
      (status = 404), (mssge = "Rack type is not available!");
    }

    return res.status(status).send({
      status_code: status,
      Message: mssge,
      data: { rackType: rackTypes },
    });
  } catch (err) {
    console.log(err);

    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting rack type!",
    });
  }
};

exports.deleteRackType = async (req, res) => {
  const id = req.params.id;

  await rack_type_table
    .findByIdAndRemove(id, { useFindAndModify: false })
    .then((data) => {
      if (!data) {
        res.send({
          message: `Rack type deletion failed!`,
        });
      } else {
        res.status(200).send({
          message: "Selected Rack type deleted successfully",
        });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send({
        message: "Some error occurred while deleting rack type",
      });
    });
};

// Create and Save
exports.create = async (req, res) => {
  if (
    !(
      req.body.company_code &&
      req.body.company_name &&
      req.body.plant_id &&
      req.body.plant_name &&
      req.body.rack_type &&
      req.body.rack_id &&
      req.body.level_id &&
      req.body.column_id &&
      req.body.location_id &&
      req.body.location_name &&
      req.body.created_by &&
      req.body.updated_by
    )
  ) {
    return res.status(400).send({
      status_code: "400",
      message: "Please fill all required fields !",
    });
  }

  console.log(req.body.location_id);
  console.log(req.body.location_name);

  if (req.body.location_id == req.body.location_name) {
    racks_detail_table
      .find({
        //company_code: req.body.company_code,
        location_id: req.body.location_id,
        location_name: req.body.location_name,
      })
      .then((data) => {
        if (!data || !data.length > 0) {
          var dt = new Date();

          let sd1 = dt.setMinutes(dt.getMinutes() + 30);
          let sd2 = dt.setHours(dt.getHours() + 5);
          console.log(sd2);
          const postdata = new racks_detail_table({
            company_code: req.body.company_code,
            company_name: req.body.company_name,
            plant_id: req.body.plant_id,
            plant_name: req.body.plant_name,
            rack_type: req.body.rack_type,
            rack_id: req.body.rack_id,
            level_id: req.body.level_id,
            column_id: req.body.column_id,
            location_id: req.body.location_id,
            location_name: req.body.location_name,
            created_by: req.body.created_by,
            updated_by: req.body.updated_by,
            entry_time: new Date(sd2),
          });
          console.log(entry_time);
          console.log(postdata);
          // Save product in the database
          postdata
            .save()
            .then((data) => {
              res.status(200).send({
                status_code: "200",
                message: "rack master data added successfully",
                data,
              });
            })
            .catch((err) => {
              res.status(500).send({
                status_code: "500",
                message: "Some error occurred while adding rack master.",
              });
            });
        } else {
          res.status(200).send({
            status_code: "200",
            message: "rack location allready exist !",
          });
        }
      })

      .catch((err) => {
        res
          .status(500)
          .send({ status_code: "500", message: "Error retrieving !" });
      });
  } else {
    res.status(200).send({
      status_code: "200",
      message: "Location id and Location name should be same!",
    });
  }
};

// Retrieve all
exports.findAll_by_companycode = (req, res) => {
  if (!req.query.company_code) {
    return res.status(400).send({
      status_code: "400",
      message: "Company code parameter is missing!",
    });
  }

  const company_code = req.query.company_code;

  racks_detail_table
    .find({ company_code: company_code })
    .then((data) => {
      console.log("d", data.length);
      if (data.length == 0) {
        return res
          .status(404)
          .send({ status: "400", message: "company code not found !" });
      } else
        res.status(200).send({
          status_code: "200",
          message: "Rack master data is available",
          data,
        });
    })
    .catch((err) => {
      res.status(500).send({ message: "Error retrieving rack" });
    });
};

// Retrieve all
exports.findAll = (req, res) => {
  console.log("get all rack details api");

  const { company_code, plant_id, rack_type } = req.query;
  if (!(company_code && plant_id))
    return res
      .status(400)
      .send({ message: "Please provide company code and plant id" });

  let filter = { company_code: company_code, plant_id: plant_id };

  if (rack_type != undefined) filter.rack_type = rack_type;

  racks_detail_table
    .find(filter)
    .sort({ _id: -1 })
    .then((data) => {
      let mssge = "Rack details is available";

      if (data.length == 0) mssge = "Rack details is not available!";

      res.send({
        status_code: "200",
        message: mssge,
        data: data,
      });
    })
    .catch((err) => {
      res.status(500).send({
        status_code: "500",
        message:
          err.message || "Some error occurred while retrieving rack details",
      });
    });
};

// Find a single
exports.findOne = (req, res) => {
  const id = req.params.id;

  racks_detail_table
    .findById(id)
    .then((data) => {
      if (!data)
        res.status(400).send({
          status_code: "400",
          message: "Not found rack with id " + id,
        });
      else
        res.status(200).send({
          status_code: "200",
          message: "Successfully find rack master data",
          data,
        });
    })
    .catch((err) => {
      res.status(500).send({
        status_code: "500",
        message: "Error retrieving rack with id=" + id,
      });
    });
};

// Update

exports.update = (req, res) => {
  if (
    !(
      req.body.company_code ||
      req.body.company_name ||
      req.body.plant_id ||
      req.body.plant_name ||
      req.body.rack_type ||
      req.body.rack_id ||
      req.body.level_id ||
      req.body.column_id ||
      req.body.location_id ||
      req.body.location_name ||
      req.body.created_by ||
      req.body.updated_by
    )
  ) {
    return res
      .status(400)
      .send({ status_code: "400", message: "Please fill required fields !" });
  }

  console.log(req.body.location_id);
  console.log(req.body.location_name);

  racks_detail_table
    .findOne({
      // company_code : req.body.company_code,
      // company_name: req.body.company_name,
      // plant_id: req.body.plant_id,
      // rack_type: req.body.rack_type,
      // rack_id: req.body.rack_id,
      // level_id: req.body.level_id,
      // column_id: req.body.column_id,
      //_id :req.params.id,
      location_id: req.body.location_id,
      location_name: req.body.location_name,
    })
    .then((data) => {
      if (req.body.location_id == req.body.location_name) {
        if (req.params.id == data._id) {
          const id = req.params.id;

          racks_detail_table
            .findByIdAndUpdate(id, req.body, { useFindAndModify: false })
            .then((data) => {
              if (!data) {
                res.status(404).send({
                  status_code: "404",
                  message: `Cannot update rack with id=${id}. Maybe rack was not found!`,
                });
              } else
                res.status(200).send({
                  status_code: "200",
                  message: "rack master updated successfully.",
                });
            })
            .catch((err) => {
              res.status(500).send({
                status_code: "500",
                message: "Error updating rack with id=" + id,
              });
            });
        } else {
          res.status(200).send({
            status_code: "200",
            message: "rack location allready exist !",
          });
        }
      } else {
        console.log(req.body);
        res.status(200).send({
          status_code: "200",
          message: "Location id and Location name should be same!",
        });
      }
    })

    .catch((err) => {
      res.status(500).send({
        status_code: "500",
        message: "Error retrieving to edit rack master",
      });
    });
};

// Delete
exports.delete = async (req, res) => {
  console.log("Calling delete rack details");
  const id = req.params.id;
  try {
    const checkRackisNotLockedAndOccupied = await racks_detail_table.findOne(
      {
        _id: ObjectId(id),
        locked: false,
        status: "unoccupied",
      },
      { _id: 1, locked: 1, status: 1 }
    );

    if (checkRackisNotLockedAndOccupied != null) {
      //
      const deletedRackInfo = await racks_detail_table.findByIdAndRemove(id, {
        useFindAndModify: false,
      });

      if (!deletedRackInfo)
        res.status(409).send({
          message: `Unable to delete rack!`,
        });
      else
        res.send({
          message: "Rack was deleted successfully",
        });
    } else
      return res.status(409).send({
        message:
          "Failed to delete rack, because rack is occupied or locked to material movement!",
      });
  } catch (err) {
    console.log(err);
    res.status(500).send({
      message: "Some error occurred while deleting the rack details",
    });
  }
};

// rack auto generation:
exports.addRacks = async (req, res) => {
  console.log("calling api to add new units to storage");

  const {
    company_code,
    company_name,
    plant_id,
    plant_name,
    rack_type,
    rack_id,
    no_of_units,
    no_of_levels,
    no_of_stages,
    created_by,
  } = req.body;
  try {
    if (
      !(
        company_code &&
        company_name &&
        plant_id &&
        plant_name &&
        rack_type &&
        rack_id &&
        no_of_units != undefined &&
        no_of_levels != undefined &&
        no_of_stages != undefined &&
        created_by
      )
    )
      return res
        .status(400)
        .send({ message: "Please provide all the required parameters!" });

    if (no_of_units == 0)
      return res
        .status(400)
        .send({ message: "Number of units should not be zero!" });

    if (no_of_levels == 0)
      return res
        .status(400)
        .send({ message: "Number of levels should not be zero!" });

    if (no_of_stages == 0)
      return res
        .status(400)
        .send({ message: "Number of stages should not be zero!" });

    const rackTypes = await rack_type_table.find(
      {
        company_code: company_code,
        plant_id: plant_id,
      },
      { _id: 0, rack_type: 1 }
    );

    let flag = 0;

    if (rackTypes.length != 0) {
      for (let i = 0; i < rackTypes.length; i++) {
        if (rack_type == rackTypes[i].rack_type) flag = 1;
      }
    } else return res.send({ message: "Provided rack type is wrong!" });

    if (flag != 1) return res.send({ message: "Provided rack type is wrong!" });

    if (
      rack_id.length == 1 ||
      rack_id.substring(0, 1) != "R" ||
      !Number.isInteger(+rack_id.substring(1, rack_id.length))
    )
      return res.send({ message: "Invalid rack id!" });

    const lastInsertedUnit = await racks_detail_table
      .findOne(
        {
          company_code: company_code,
          plant_id: plant_id,
          rack_type: rack_type,
          rack_id: rack_id,
        },
        { _id: 0, unit_no: 1, column_id: 1 }
      )
      .sort({ _id: -1 })
      .limit(1);

    let last_code = 0;
    let unit_no = 0;

    if (lastInsertedUnit != null) {
      unit_no = +lastInsertedUnit.unit_no;

      last_code = +lastInsertedUnit.column_id.substring(
        1,
        lastInsertedUnit.column_id.length
      );
    }

    let rackDetails = [];
    let alphabets = [
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
      "M",
      "N",
      "O",
      "P",
      "Q",
      "R",
      "S",
      "T",
      "U",
      "V",
      "W",
      "X",
      "Y",
      "Z",
    ];
    let code = 0;

    for (let unit = 1; unit <= +no_of_units; unit++) {
      //
      for (let stage = 1; stage <= +no_of_stages; stage++) {
        code = last_code + stage;
        for (let level = 1; level <= +no_of_levels; level++) {
          //
          let rack_barcode =
            rack_id + "L" + level + alphabets[level - 1] + (last_code + stage);

          rackDetails.push({
            company_code: company_code,
            company_name: company_name,
            plant_id: plant_id,
            plant_name: plant_name,
            rack_type: rack_type,
            unit_no: unit_no + unit,
            rack_id: rack_id,
            level_id: "L" + level,
            column_id: alphabets[level - 1] + (last_code + stage),
            location_id: rack_barcode,
            location_name: rack_barcode,
            created_by: created_by,
            updated_by: created_by,
          });
        }
      }
      last_code = code;
    }

    const creatingNewUnits = await racks_detail_table.create(rackDetails);

    let mssge = "Rack auto generation is successfull";

    if (creatingNewUnits.length == 0) mssge = "Rack auto generation is failed!";

    return res.send({
      message: mssge,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message:
        "Some error occurred while adding new units to " +
        rack_type +
        " storage!",
    });
  }
};

exports.startingRackId = async (req, res) => {
  console.log("calling get starting rack id api");

  const { company_code, plant_id, rack_type, rack_id } = req.query;

  try {
    if (!(company_code && plant_id && rack_type && rack_id))
      return res
        .status(400)
        .send({ message: "Please provide all required parameters" });

    if (
      rack_id.length == 1 ||
      rack_id.substring(0, 1) != "R" ||
      !Number.isInteger(+rack_id.substring(1, rack_id.length))
    )
      return res.send({ message: "Invalid rack id!" });

    const lastRackId = await racks_detail_table
      .findOne(
        {
          company_code: company_code,
          plant_id: plant_id,
          rack_type: rack_type,
          rack_id: rack_id,
        },
        { _id: 0, column_id: 1 }
      )
      .sort({ _id: -1 })
      .limit(1);

    let starting_rack_id = rack_id + "L1" + "A";

    if (lastRackId == null) starting_rack_id += 1;
    else
      starting_rack_id +=
        +lastRackId.column_id.substring(1, lastRackId.column_id.length) + 1;

    return res.send({
      message: "Rack id is available",
      data: { starting_rack_id: starting_rack_id },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message: "Some error occurred while extracting starting rack id!",
    });
  }
};

exports.getUnitNo = async (req, res) => {
  console.log("calling get rack unit list api");
  // let rackList = [];

  const { company_code, plant_id, rack_type, rack_id } = req.query;
  try {
    if (!(company_code && plant_id && rack_type))
      return res.status(400).send({
        message: "Please provide company code, plant id and rack type",
      });

    let data = [];
    let mssge = "";
    let status = 200;

    if (!rack_id) {
      // getting racks here
      const getRackList = await db.racks.aggregate([
        {
          $match: {
            company_code: company_code,
            plant_id: plant_id,
            rack_type: rack_type,
          },
        },
        { $group: { _id: "$rack_id" } },
        { $sort: { _id: 1 } },
      ]);

      if (getRackList.length != 0) {
        for (let i = 0; i < getRackList.length; i++) {
          //getting each rack units here
          let getUnitList = await db.racks.aggregate([
            {
              $match: {
                company_code: company_code,
                plant_id: plant_id,
                rack_type: rack_type,
                rack_id: getRackList[i]._id,
              },
            },
            { $group: { _id: "$unit_no" } },
            { $sort: { _id: 1 } },
          ]);

          let unitArr = [];

          getUnitList.map((unit) => unitArr.push(unit._id));

          data.push({ rack_id: getRackList[i]._id, units: unitArr });
        }
        mssge = "Rack ids and its units are available";
      } else {
        status = 404;
        mssge = "No racks found!";
      }
    } else {
      let getUnitList = await db.racks.aggregate([
        {
          $match: {
            company_code: company_code,
            plant_id: plant_id,
            rack_type: rack_type,
            rack_id: rack_id,
          },
        },
        { $group: { _id: "$unit_no" } },
        { $sort: { _id: 1 } },
      ]);

      let unitArr = [];

      getUnitList.map((unit) => unitArr.push(unit._id));

      data = {};

      data.units = unitArr;
      mssge = "Units are available for the given rack id";
      if (unitArr.length == 0) {
        status = 404;
        mssge = "No unit available for the given rack id!";
      }
    }

    return res
      .status(status)
      .send({ status_code: status, message: mssge, data: data });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .send({ message: "Some error occurred while extracting unit no list!" });
  }
};

// rack auto generation for discrete:
exports.addRacksV2 = async (req, res) => {
  console.log("calling api to add new units to storage");

  const {
    company_code,
    company_name,
    plant_id,
    plant_name,
    rack_type,
    rack_id,
    no_of_units,
    no_of_levels,
    no_of_stages,
    data_scanner,
    decision_scanner,
    created_by,
  } = req.body;
  try {
    if (
      !(
        company_code &&
        company_name &&
        plant_id &&
        plant_name &&
        rack_type &&
        rack_id &&
        no_of_units != undefined &&
        no_of_levels != undefined &&
        no_of_stages != undefined &&
        data_scanner &&
        decision_scanner &&
        created_by
      )
    )
      return res
        .status(400)
        .send({ message: "Please provide all the required parameters!" });

    if (no_of_units == 0)
      return res
        .status(400)
        .send({ message: "Number of units should not be zero!" });

    if (no_of_levels == 0)
      return res
        .status(400)
        .send({ message: "Number of levels should not be zero!" });

    if (no_of_stages == 0)
      return res
        .status(400)
        .send({ message: "Number of stages should not be zero!" });

    const rackTypes = await rack_type_table.find(
      {
        company_code: company_code,
        plant_id: plant_id,
      },
      { _id: 0, rack_type: 1 }
    );

    let flag = 0;

    if (rackTypes.length != 0) {
      for (let i = 0; i < rackTypes.length; i++) {
        if (rack_type == rackTypes[i].rack_type) flag = 1;
      }
    } else return res.send({ message: "Provided rack type is wrong!" });
    console.log(flag);
    if (flag != 1) return res.send({ message: "Provided rack type is wrong!" });

    if (
      rack_id.length == 1 ||
      rack_id.substring(0, 1) != "R" ||
      !Number.isInteger(+rack_id.substring(1, rack_id.length))
    )
      return res.send({ message: "Invalid rack id!" });

    const lastInsertedUnit = await racks_detail_table
      .findOne(
        {
          company_code: company_code,
          plant_id: plant_id,
          rack_type: rack_type,
          rack_id: rack_id,
        },
        { _id: 0, unit_no: 1, column_id: 1 }
      )
      .sort({ _id: -1 })
      .limit(1);

    let last_code = 0;
    let unit_no = 0;

    if (lastInsertedUnit != null) {
      unit_no = +lastInsertedUnit.unit_no;

      last_code = +lastInsertedUnit.column_id.substring(
        1,
        lastInsertedUnit.column_id.length
      );
    }

    let rackDetails = [];
    let alphabets = [
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
      "M",
      "N",
      "O",
      "P",
      "Q",
      "R",
      "S",
      "T",
      "U",
      "V",
      "W",
      "X",
      "Y",
      "Z",
    ];
    let code = 0;

    for (let unit = 1; unit <= +no_of_units; unit++) {
      //
      for (let stage = 1; stage <= +no_of_stages; stage++) {
        code = last_code + stage;
        for (let level = 1; level <= +no_of_levels; level++) {
          //
          let rack_barcode =
            rack_id + "L" + level + alphabets[level - 1] + (last_code + stage);

          rackDetails.push({
            company_code: company_code,
            // company_name: company_name,
            plant_id: plant_id,
            // plant_name: plant_name,
            rack_type: rack_type,
            unit_no: unit_no + unit,
            rack_id: rack_id,
            level_id: "L" + level,
            column_id: alphabets[level - 1] + (last_code + stage),
            location_id: rack_barcode,
            rack_barcode: rack_barcode,
            decision_scanner: decision_scanner,
            data_scanner: data_scanner,
            // created_by: created_by,
            // updated_by: created_by,
          });
        }
      }
      last_code = code;
    }

    const creatingNewUnits = await db.secondary_storage.create(rackDetails);

    let mssge = "Rack auto generation is successfull";

    if (creatingNewUnits.length == 0) mssge = "Rack auto generation is failed!";

    return res.send({
      message: mssge,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message:
        "Some error occurred while adding new units to " +
        rack_type +
        " storage!",
    });
  }
};

// exports.updateRackLock = async (req, res) => {
//   console.log("calling update rack lock api");
//   const {
//     company_code,
//     plant_id,
//     rack_type,
//     location_id,
//     pallet_barcode,
//     lock,
//   } = req.body;
//   try {
//     if (
//       !(
//         company_code &&
//         plant_id &&
//         rack_type &&
//         location_id &&
//         pallet_barcode &&
//         lock
//       )
//     )
//       res.status(400).send({
//         status_code: 400,
//         message: "Provide all required parameters!",
//       });

//     if (lock == "true" || lock == "false") {
//       if (
//         (await db.racks.findOne({
//           company_code: company_code,
//           plant_id: plant_id,
//           rack_type: rack_type,
//           location_id: location_id,
//           active_status: 1,
//           status: "unoccupied",
//         })) != null
//       ) {
//         const getLockStatus = await db.racks.findOne(
//           {
//             company_code: company_code,
//             plant_id: plant_id,
//             rack_type: rack_type,
//             location_id: location_id,
//           },
//           { _id: 0, locked: 1 }
//         );
//         if (getLockStatus.locked.toString() == lock) {
//           let status = getLockStatus.locked == true ? "locked!" : "unlocked!";
//           return res
//             .status(405)
//             .send({ status_code: 405, message: "Rack is already " + status });
//         }

//         const updateRackLock = await db.racks.updateOne(
//           {
//             company_code: company_code,
//             plant_id: plant_id,
//             rack_type: rack_type,
//             location_id: location_id,
//             active_status: 1,
//             status: "unoccupied",
//           },
//           { $set: { locked: lock } }
//         );
//         //
//         if (lock == "true")
//           await db.palletization.updateOne(
//             {
//               company_code: company_code,
//               plant_id: plant_id,
//               pallet_barcode_value: pallet_barcode,
//             },
//             { $set: { location_id: location_id } }
//           );
//         else
//           await db.palletization.updateOne(
//             {
//               company_code: company_code,
//               plant_id: plant_id,
//               pallet_barcode_value: pallet_barcode,
//               location_id: location_id,
//             },
//             { $set: { location_id: "" } }
//           );

//         res.send({
//           status_code: 200,
//           message: "Updated rack lock successfully",
//         });
//       } else
//         return res.status(405).send({
//           status_code: 405,
//           message:
//             "Failed to update rack lock. May be rack is already occupied or inactive!",
//         });
//     } else
//       return res.status(400).send({
//         status_code: 400,
//         message: "Lock field can have only booleans!",
//       });
//   } catch (err) {
//     console.log(err);
//     return res.status(500).send({
//       status_code: 500,
//       message: "Some error occurred while updating rack lock!",
//     });
//   }
// };

exports.updateRackLock = async (req, res) => {
  console.log("calling update rack lock primary api");
  const {
    company_code,
    plant_id,
    pallet_barcode,
    location_id,
    lock,
    rack_type,
    locked_by,
  } = req.body;
  try {
    if (
      !(
        company_code &&
        plant_id &&
        pallet_barcode &&
        location_id &&
        lock &&
        locked_by &&
        rack_type
      )
    )
      res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    if (lock == "true" || lock == "false") {
      if (
        (await db.racks.findOne({
          company_code: company_code,
          plant_id: plant_id,
          rack_type: rack_type,
          location_id: location_id,
          active_status: 1,
          status: "unoccupied",
        })) != null
      ) {
        let getLockStatus = await db.racks.findOne(
          {
            company_code: company_code,
            plant_id: plant_id,
            rack_type: rack_type,
            location_id: location_id,
          },
          { _id: 0, locked: 1 }
        );
        if (getLockStatus.locked.toString() == lock) {
          let status = getLockStatus.locked == true ? "locked!" : "unlocked!";
          return res.status(405).send({
            status_code: 405,
            message: "Rack(" + location_id + ") is already " + status,
          });
        }

        let updateRackLock = await db.racks.updateOne(
          {
            company_code: company_code,
            plant_id: plant_id,
            rack_type: rack_type,
            location_id: location_id,
            active_status: 1,
            status: "unoccupied",
          },
          { $set: { locked: lock, locked_by: locked_by } }
        );
        //
        if (lock == "true") {
          let updateRackLock = await db.racks.updateOne(
            {
              company_code: company_code,
              plant_id: plant_id,
              rack_type: rack_type,
              location_id: location_id,
              active_status: 1,
              status: "unoccupied",
            },
            { $set: { locked: lock, locked_by: locked_by } }
          );

          await db.palletization.updateOne(
            {
              company_code: company_code,
              plant_id: plant_id,
              pallet_barcode_value: pallet_barcode,
              is_deleted: false,
            },
            { $set: { location_id: location_id } }
          );
        } else {
          let updateRackLock = await db.racks.updateOne(
            {
              company_code: company_code,
              plant_id: plant_id,
              rack_type: rack_type,
              location_id: location_id,
              active_status: 1,
              status: "unoccupied",
            },
            { $set: { locked: lock, locked_by: "" } }
          );

          await db.palletization.updateOne(
            {
              company_code: company_code,
              plant_id: plant_id,
              pallet_barcode_value: pallet_barcode,
              location_id: location_id,
              is_deleted: false,
            },
            { $set: { location_id: "" } }
          );
        }
      } else
        return res.status(405).send({
          status_code: 405,
          message:
            "Failed to update rack(" +
            location_id +
            ") lock. May be rack is already occupied or inactive!",
        });
    } else
      return res.status(400).send({
        status_code: 400,
        message: "Lock field can have only booleans!",
      });

    res.send({
      status_code: 200,
      message: "Updated rack lock successfully",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while updating rack lock!",
    });
  }
};

exports.updateSecondaryRackLock = async (req, res) => {
  console.log("calling update rack lock secondary api");
  const company_code = req.body.company_code;
  const plant_id = req.body.plant_id;
  const pallet_barcode = req.body.pallet_barcode;
  const primary_location_id = req.body.primary_location_id;
  const secondary_location_id = req.body.secondary_location_id;
  const lock_status = req.body.lock_status;
  const locked_by = req.body.locked_by;

  if (
    !(
      pallet_barcode &&
      plant_id &&
      company_code &&
      primary_location_id &&
      secondary_location_id &&
      lock_status &&
      locked_by
    )
  ) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing Parameter!" });
  }
  const session = await conn.startSession();
  try {
    session.startTransaction();
    if (lock_status == "lock") {
      let primary_flag = true;
      let secondary_flag = false;

      // console.log("lock");

      let rack_details = await racks_detail_table.find(
        {
          company_code: company_code,
          plant_id: plant_id,
          location_id: { $in: [primary_location_id, secondary_location_id] },
        },
        { locked: 1, location_id: 1, rack_type: 1, _id: 0 }
      );

      // console.log(rack_details);

      if (rack_details.length != 2) {
        return res.status(400).send({
          status_code: "400",
          status_message: "rack location is unavailable in rack master!",
        });
      } else {
        rack_details.forEach((element) => {
          if (element.rack_type == "primary") {
            if (!element.locked) {
              primary_flag = false;
            }
          } else if (element.rack_type == "secondary") {
            if (element.locked) {
              secondary_flag = true;
            }
          }
        });

        if (!primary_flag) {
          return res.status(400).send({
            status_code: "400",
            status_message:
              "primary location id " +
              primary_location_id +
              " is already unlocked!",
          });
        } else if (secondary_flag) {
          return res.status(400).send({
            status_code: "400",
            status_message:
              "secondary location id " +
              secondary_location_id +
              " is already locked!",
          });
        }
      }
      let primary_rack_details = await racks_detail_table.updateOne(
        {
          company_code: company_code,
          plant_id: plant_id,
          location_id: primary_location_id,
          active_status: 1,
          rack_type: "primary",
          locked: true,
        },
        { locked: false, locked_by: locked_by },
        { upsert: false, new: true, session }
      );

      let pallet_details = await palletization_table.updateOne(
        {
          company_code: company_code,
          plant_id: plant_id,
          pallet_barcode_value: pallet_barcode,
          is_deleted: false,
        },
        { location_id: "" },
        { upsert: false, new: true, session }
      );

      let secondary_rack_details = await racks_detail_table.updateOne(
        {
          company_code: company_code,
          plant_id: plant_id,
          location_id: secondary_location_id,
          active_status: 1,
          rack_type: "secondary",
          locked: false,
        },
        { locked: true, locked_by: locked_by },
        { upsert: false, new: true, session }
      );

      let pallet_details_updated = await palletization_table.updateOne(
        {
          company_code: company_code,
          plant_id: plant_id,
          pallet_barcode_value: pallet_barcode,
          is_deleted: false,
        },
        { location_id: secondary_location_id },
        { upsert: false, new: true, session }
      );

      if (
        primary_rack_details &&
        secondary_rack_details &&
        pallet_details &&
        pallet_details_updated
      ) {
        // console.log(primary_rack_details,pallet_details, secondary_rack_details, pallet_details_updated);
        await session.commitTransaction();
        return res.status(200).send({
          status_code: "200",
          status_message: "Locked!",
        });
      } else {
        return res.status(400).send({
          status_code: "400",
          status_message: "verify the parameters!",
        });
      }
    } else if (lock_status == "unlock") {
      // console.log("unlock");
      let primary_flag = false;
      let secondary_flag = true;

      let rack_details = await racks_detail_table.find(
        {
          company_code: company_code,
          plant_id: plant_id,
          location_id: { $in: [primary_location_id, secondary_location_id] },
        },
        { locked: 1, location_id: 1, rack_type: 1, _id: 0 }
      );

      // console.log(rack_details);

      if (rack_details.length != 2) {
        return res.status(400).send({
          status_code: "400",
          status_message: "rack location is unavailable in rack master!",
        });
      } else {
        rack_details.forEach((element) => {
          if (element.rack_type == "primary") {
            if (element.locked) {
              primary_flag = true;
            }
          } else if (element.rack_type == "secondary") {
            if (!element.locked) {
              secondary_flag = false;
            }
          }
        });

        if (primary_flag) {
          return res.status(400).send({
            status_code: "400",
            status_message:
              "primary location id " +
              primary_location_id +
              " is already locked!",
          });
        } else if (!secondary_flag) {
          return res.status(400).send({
            status_code: "400",
            status_message:
              "secondary location id " +
              secondary_location_id +
              " is already unlocked!",
          });
        }
      }

      let secondary_rack_details = await racks_detail_table.updateOne(
        {
          company_code: company_code,
          plant_id: plant_id,
          location_id: secondary_location_id,
          active_status: 1,
          rack_type: "secondary",
          locked: true,
        },
        { locked: false, locked_by: "" },
        { upsert: false, new: true, session }
      );

      let pallet_details = await palletization_table.updateOne(
        {
          company_code: company_code,
          plant_id: plant_id,
          pallet_barcode_value: pallet_barcode,
          is_deleted: false,
        },
        { location_id: "" },
        { upsert: false, new: true, session }
      );

      let primary_rack_details = await racks_detail_table.updateOne(
        {
          company_code: company_code,
          plant_id: plant_id,
          location_id: primary_location_id,
          active_status: 1,
          rack_type: "primary",
          locked: false,
        },
        { locked: true, locked_by: locked_by },
        { upsert: false, new: true, session }
      );

      let pallet_details_updated = await palletization_table.updateOne(
        {
          company_code: company_code,
          plant_id: plant_id,
          pallet_barcode_value: pallet_barcode,
          is_deleted: false,
        },
        { location_id: primary_location_id },
        { upsert: false, new: true, session }
      );

      if (
        primary_rack_details &&
        secondary_rack_details &&
        pallet_details &&
        pallet_details_updated
      ) {
        // console.log(primary_rack_details,pallet_details, secondary_rack_details, pallet_details_updated);
        await session.commitTransaction();
        return res.status(200).send({
          status_code: "200",
          status_message: "Unlocked!",
        });
      } else {
        return res.status(400).send({
          status_code: "400",
          status_message: "verify the parameters!",
        });
      }
    } else {
      console.log("unlock");
      return res.status(400).send({
        status_code: "400",
        status_message: "Please provide lock_status has lock or unlock!",
      });
    }
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some Error Occurred While Creating The Customer.",
    });
  }
};

// exports.updateRackLock = async (req, res) => {
//   console.log("calling update rack lock api");

//   const { company_code, plant_id, pallet_barcode, update_details } = req.body;
//   try {
//     if (!(company_code && plant_id && pallet_barcode && update_details))
//       res.status(400).send({
//         status_code: 400,
//         message: "Provide all required parameters!",
//       });

//     if (update_details.length != 0) {
//       for (let i = 0; i < update_details.length; i++) {
//         //
//         if (
//           update_details[i].lock == "true" ||
//           update_details[i].lock == "false"
//         ) {
//           if (
//             (await db.racks.findOne({
//               company_code: company_code,
//               plant_id: plant_id,
//               rack_type: update_details[i].rack_type,
//               location_id: update_details[i].location_id,
//               active_status: 1,
//               status: "unoccupied",
//             })) != null
//           ) {
//             let getLockStatus = await db.racks.findOne(
//               {
//                 company_code: company_code,
//                 plant_id: plant_id,
//                 rack_type: update_details[i].rack_type,
//                 location_id: update_details[i].location_id,
//               },
//               { _id: 0, locked: 1 }
//             );
//             if (getLockStatus.locked.toString() == update_details[i].lock) {
//               let status =
//                 getLockStatus.locked == true ? "locked!" : "unlocked!";
//               return res.status(405).send({
//                 status_code: 405,
//                 message:
//                   "Rack(" +
//                   update_details[i].location_id +
//                   ") is already " +
//                   status,
//               });
//             }

//             let updateRackLock = await db.racks.updateOne(
//               {
//                 company_code: company_code,
//                 plant_id: plant_id,
//                 rack_type: update_details[i].rack_type,
//                 location_id: update_details[i].location_id,
//                 active_status: 1,
//                 status: "unoccupied",
//               },
//               { $set: { locked: update_details[i].lock } }
//             );
//             //
//             if (update_details[i].lock == "true")
//               await db.palletization.updateOne(
//                 {
//                   company_code: company_code,
//                   plant_id: plant_id,
//                   pallet_barcode_value: pallet_barcode,
//                 },
//                 { $set: { location_id: update_details[i].location_id } }
//               );
//             else
//               await db.palletization.updateOne(
//                 {
//                   company_code: company_code,
//                   plant_id: plant_id,
//                   pallet_barcode_value: pallet_barcode,
//                   location_id: update_details[i].location_id,
//                 },
//                 { $set: { location_id: "" } }
//               );
//           } else
//             return res.status(405).send({
//               status_code: 405,
//               message:
//                 "Failed to update rack(" +
//                 update_details[i].location_id +
//                 ") lock. May be rack is already occupied or inactive!",
//             });
//         } else
//           return res.status(400).send({
//             status_code: 400,
//             message: "Lock field can have only booleans!",
//           });
//       }

//       res.send({
//         status_code: 200,
//         message: "Updated rack lock successfully",
//       });
//     } else
//       return res.status(400).send({
//         status_code: 400,
//         message: "Provide all required parameters!",
//       });
//   } catch (err) {
//     console.log(err);
//     return res.status(500).send({
//       status_code: 500,
//       message: "Some error occurred while updating rack lock!",
//     });
//   }
// };
