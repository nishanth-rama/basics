// const db = require("../models");
// const Tutorial = db.tutorials;

const { plants } = require("../../models");
const db = require("../../models");

// const Tutorial = db.plants;

const plants_detail_table = db.plants;
const city_detail_table = db.cityDetails;
const state_detail_table = db.stateDetails;
const country_detail_table = db.countryDetails;

// Create and Save
exports.create = async (req, res) => {
  // Validate request
  if (!req.body) {
    res.status(200).send({ message: "Content can not be empty!" });
    return;
  }

  const checkplantid = await plants_detail_table.findOne({
    plant_id: req.body.plant_id,
  });

  if (checkplantid) {
    return res.status(400).send({
      message: "Plant Id already exist, please try with another Plant Id!",
    });
  }

  // Create
  const tutorial = new plants_detail_table({
    company_code: req.body.company_code,
    company_name: req.body.company_name,
    plant_id: req.body.plant_id,
    plant_region: req.body.plant_region,
    plant_name: req.body.plant_name,
    country_id: req.body.country_id,
    state_id: req.body.state_id,
    city_id: req.body.city_id,
    plant_address: req.body.plant_address,
    pin_code: req.body.pin_code,
    official_mail_id: req.body.official_mail_id,
    contact_number: req.body.contact_number,
    gst_number: req.body.gst_number,
    fssai_number: req.body.fssai_number,
    cin_number: req.body.cin_number,
    active_status: req.body.active_status,
    created_by: req.body.created_by,
    updated_by: req.body.updated_by,
    plant_type: req.body.plant_type,
    dc_type: req.body.dc_type,
  });
  console.log(req.body);
  // Save
  tutorial
    .save(tutorial)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while creating the plant.",
      });
    });
};

// Retrieve all
exports.findAll = async (req, res) => {
  // const title = req.query.title;
  // var condition = title ? { title: { $regex: new RegExp(title), $options: "i" } } : {};

  // plants_detail_table.find({})
  //   .then(data => {
  //     res.send(data);
  //   })
  //   .catch(err => {
  //     res.status(500).send({
  //       message:
  //         err.message || "Some error occurred while retrieving plant."
  //     });
  //   });

  await plants_detail_table
    .aggregate([
      {
        $lookup: {
          from: "rapid_city_details",
          localField: "city_id",
          foreignField: "city_id",
          as: "city",
        },
      },
      { $unwind: "$city" },
      {
        $lookup: {
          from: "rapid_state_details",
          localField: "state_id",
          foreignField: "state_id",
          as: "state",
        },
      },
      { $unwind: "$state" },
      {
        $lookup: {
          from: "rapid_country_details",
          localField: "country_id",
          foreignField: "country_id",
          as: "country",
        },
      },
      { $unwind: "$country" },
      {
        $project: {
          company_code: 1,
          company_name: 1,
          country_name: "$country.country_name",
          state_name: "$state.state_name",
          city_name: "$city.city_name",
          country_id: 1,
          state_id: 1,
          city_id: 1,
          plant_id: 1,
          plant_region: 1,
          plant_name: 1,
          plant_address: 1,
          pin_code: 1,
          official_mail_id: 1,
          contact_number: 1,
          gst_number: 1,
          fssai_number: 1,
          cin_number: 1,
          active_status: 1,
        },
      },
    ])
    .then((data) => {
      console.log("data - ", data);
      let result = [];
      data.map((each) => {
        let resObj = {
          _id: each._id,
          company_code: each.company_code,
          company_name: each.company_name,
          country_name: each.country_name,
          state_name: each.state_name,
          city_name: each.city_name,
          country_id: each.country_id,
          state_id: each.state_id,
          city_id: each.city_id,
          plant_id: each.plant_id,
          plant_region: each.plant_region,
          plant_name: each.plant_name,
          plant_address: each.plant_address,
          pin_code: each.pin_code,
          official_mail_id: each.official_mail_id,
          contact_number: each.contact_number,
          gst_number: each.gst_number,
          fssai_number: each.fssai_number,
          cin_number: each.cin_number,
          active_status: each.active_status,
        };
        result.push(resObj);
      });
      res
        .status(200)
        .send({ status_code: "200", message: "Data is available", data: data });
    });
};

// Find a single
exports.findOne = (req, res) => {
  const id = req.params.id;

  plants_detail_table
    .findById(id)
    .then((data) => {
      if (!data)
        res.status(200).send({ message: "Not found plant with id " + id });
      else res.send(data);
    })
    .catch((err) => {
      res.status(500).send({ message: "Error retrieving plant with id=" + id });
    });
};

// Find a single
exports.get_all_plant_by_company_code = async (req, res) => {
  if (!req.query.company_code) {
    return res.status(200).send({
      status_code: "200",
      message: "Company code parameter is missing !",
    });
  }
  const company_code = req.query.company_code;
  await plants_detail_table
    .aggregate([
      {
        $match: { company_code },
      },
      {
        $lookup: {
          from: "rapid_city_details",
          localField: "city_id",
          foreignField: "city_id",
          as: "city",
        },
      },
      { $unwind: "$city" },
      {
        $lookup: {
          from: "rapid_state_details",
          localField: "state_id",
          foreignField: "state_id",
          as: "state",
        },
      },
      { $unwind: "$state" },
      {
        $lookup: {
          from: "rapid_country_details",
          localField: "country_id",
          foreignField: "country_id",
          as: "country",
        },
      },
      { $unwind: "$country" },
      {
        $project: {
          company_code: 1,
          company_name: 1,
          country_name: "$country.country_name",
          state_name: "$state.state_name",
          city_name: "$city.city_name",
          country_id: 1,
          state_id: 1,
          city_id: 1,
          plant_id: 1,
          plant_region: 1,
          plant_name: 1,
          plant_address: 1,
          pin_code: 1,
          official_mail_id: 1,
          contact_number: 1,
          gst_number: 1,
          fssai_number: 1,
          cin_number: 1,
          active_status: 1,
        },
      },
    ])
    .then((data) => {
      let result = [];
      data.map((each) => {
        let resObj = {
          _id: each._id,
          company_code: each.company_code,
          company_name: each.company_name,
          country_name: each.country_name,
          state_name: each.state_name,
          city_name: each.city_name,
          country_id: each.country_id,
          state_id: each.state_id,
          city_id: each.city_id,
          plant_id: each.plant_id,
          plant_region: each.plant_region,
          plant_name: each.plant_name,
          plant_address: each.plant_address,
          pin_code: each.pin_code,
          official_mail_id: each.official_mail_id,
          contact_number: each.contact_number,
          gst_number: each.gst_number,
          fssai_number: each.fssai_number,
          cin_number: each.cin_number,
          active_status: each.active_status,
        };
        result.push(resObj);
      });
      res
        .status(200)
        .send({ status_code: "200", message: "Data is available", data: data });
    });
};

// Update
exports.update = (req, res) => {
  if (!req.body) {
    return res.status(400).send({
      message: "Data to update can not be empty!",
    });
  }

  const id = req.params.id;

  plants_detail_table
    .findByIdAndUpdate(id, req.body, { useFindAndModify: false })
    .then((data) => {
      if (!data) {
        res.status(404).send({
          message: `Cannot update plant with id=${id}. Maybe plant was not found!`,
        });
      } else res.send({ message: "Plant updated successfully." });
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error updating plant with id=" + id,
      });
    });
};

// Delete
exports.delete = (req, res) => {
  const id = req.params.id;

  plants_detail_table
    .findByIdAndRemove(id, { useFindAndModify: false })
    .then((data) => {
      if (!data) {
        res.status(404).send({
          message: `Cannot delete plant with id=${id}. Maybe plant was not found!`,
        });
      } else {
        res.send({
          message: "Plant deleted successfully!",
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Could not delete plant with id=" + id,
      });
    });
};

// Delete all plants from the database.
// exports.deleteAll = (req, res) => {
//   Tutorial.deleteMany({})
//     .then(data => {
//       res.send({
//         message: `${data.deletedCount} plant were deleted successfully!`
//       });
//     })
//     .catch(err => {
//       res.status(500).send({
//         message:
//           err.message || "Some error occurred while removing all plant."
//       });
//     });
// };

// // Find all published Tutorials
// exports.findAllPublished = (req, res) => {
//   Tutorial.find({ published: true })
//     .then(data => {
//       res.send(data);
//     })
//     .catch(err => {
//       res.status(500).send({
//         message:
//           err.message || "Some error occurred while retrieving plant."
//       });
//     });
// };
