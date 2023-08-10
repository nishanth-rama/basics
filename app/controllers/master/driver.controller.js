// const db = require("../models");
// const Tutorial = db.tutorials;

const db = require("../../models");
const plantModel = require("../../models/master/plant.model");

// const Tutorial = db.drivers;

const drivers_detail_table = db.drivers;

// Create and Save
exports.create = (req, res) => {
  // Validate request
  if (
    !(
      req.body.company_code &&
      req.body.plant_id &&
      req.body.driverId &&
      req.body.driverName &&
      req.body.driverNumber
    )
  ) {
    return res.status(400).send({
      status_code: 400,
      message: "Please fill all required fields !",
    });
  }

  const tutorial = new drivers_detail_table({
    company_code: req.body.company_code,
    company_name: req.body.plant_id,
    driverId: req.body.driverId,
    driverName: req.body.driverName,
    driverNumber: req.body.driverNumber,
  });

  tutorial
    .save(tutorial)
    .then((data) => {
      res.send({
        status_code: 200,
        message: "New driver information added successfully",
        data: data,
      });
    })
    .catch((err) => {
      res.status(500).send({
        status_code: 500,
        message:
          err.message || "Some error occurred while creating the driver.",
      });
    });
};

// Retrieve all
exports.findAll = (req, res) => {
  // const title = req.query.title;
  // var condition = title ? { title: { $regex: new RegExp(title), $options: "i" } } : {};

  const { company_code, plant_id } = req.query;

  if (!(company_code && plant_id))
    return res.status(400).send({
      status_code: 400,
      message: "company code and plant id is missing!",
    });

  drivers_detail_table
    .find({ company_code: company_code, plant_id: plant_id })
    .sort({ _id: -1 })
    .then((data) => {
      if (data.length == 0)
        res.send({
          status_code: 404,
          message: "Drivers details are not available!",
          data: data,
        });
      else
        res.send({
          status_code: 200,
          message: "Drivers details are available",
          data: data,
        });
    })
    .catch((err) => {
      res.status(500).send({
        status_code: 500,
        message: err.message || "Some error occurred while retrieving driver.",
      });
    });
};

// Retrieve all
exports.get_all_driver_master_by_company_code = (req, res) => {
  if (!req.query.company_code) {
    return res.status(400).send({
      status_code: "400",
      message: "Company code parameter is missing !",
    });
  }

  const company_code = req.query.company_code;

  drivers_detail_table
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
          message: "Driver master data is available",
          data,
        });
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while retrieving role.",
      });
    });
};

// Find
exports.findOne = (req, res) => {
  const id = req.params.id;

  drivers_detail_table
    .findById(id)
    .then((data) => {
      if (!data)
        res.status(404).send({ message: "Not found driver with id " + id });
      else res.send(data);
    })
    .catch((err) => {
      res
        .status(500)
        .send({ message: "Error retrieving driver with id=" + id });
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

  drivers_detail_table
    .findByIdAndUpdate(id, req.body, { useFindAndModify: false })
    .then((data) => {
      if (!data) {
        res.status.send({
          status_code: 404,
          message: `Cannot update driver with id=${id}. Maybe driver was not found!`,
        });
      } else
        res.send({
          status_code: 200,
          message: "driver details was updated successfully.",
        });
    })
    .catch((err) => {
      res.status(500).send({
        status_code: 500,
        message: "Error updating driver with id=" + id,
      });
    });
};

// Delete
exports.delete = (req, res) => {
  const id = req.params.id;

  drivers_detail_table
    .findByIdAndRemove(id, { useFindAndModify: false })
    .then((data) => {
      if (!data) {
        res.status.send({
          status_code: 404,
          message: `Cannot delete driver with id=${id}. Maybe driver was not found!`,
        });
      } else {
        res.send({
          status_code: 200,
          message: "driver was deleted successfully!",
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        status_code: 500,
        message: "Could not delete driver with id=" + id,
      });
    });
};

// Delete all Tutorials from the database.
// exports.deleteAll = (req, res) => {
//   Tutorial.deleteMany({})
//     .then(data => {
//       res.send({
//         message: `${data.deletedCount} driver were deleted successfully!`
//       });
//     })
//     .catch(err => {
//       res.status(500).send({
//         message:
//           err.message || "Some error occurred while removing all driver."
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
//           err.message || "Some error occurred while retrieving driver."
//       });
//     });
// };
