// const db = require("../models");
// const Tutorial = db.tutorials;

const db = require("../../models");

const crate_detail_table = db.crates;

// Create and Save 
exports.create = (req, res) => {
  // Validate request
  if (!req.body) {
    res.status(400).send({ message: "Content can not be empty!" });
    return;
  }

  // Create a Tutorial
  const tutorial = new crate_detail_table({
    name: req.body.name,
    email: req.body.email,
    mobile: req.body.mobile,
    password: req.body.password,
   
    roleId: req.body.roleId,
    address: req.body.address,
  });

  // Save Tutorial in the database
  tutorial
    .save(tutorial)
    .then(data => {
      res.send(data);
    console.log(tutorial);    
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while creating the crate."
      });
    });
};

// Retrieve all 
exports.findAll = (req, res) => {
  // const title = req.query.title;
  // var condition = title ? { title: { $regex: new RegExp(title), $options: "i" } } : {};

  crate_detail_table.find({})
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving crate."
      });
    });
};

// Find a single 
exports.findOne = (req, res) => {
  const id = req.params.id;

  crate_detail_table.findById(id)
    .then(data => {
      if (!data)
        res.status(404).send({ message: "Not found crate with id " + id });
      else res.send(data);
    })
    .catch(err => {
      res
        .status(500)
        .send({ message: "Error retrieving crate with id=" + id });
    });
};

// Update a 
exports.update = (req, res) => {
  if (!req.body) {
    return res.status(400).send({
      message: "Data to update can not be empty!"
    });
  }

  const id = req.params.id;

  crate_detail_table.findByIdAndUpdate(id, req.body, { useFindAndModify: false })
    .then(data => {
      if (!data) {
        res.status(404).send({
          message: `Cannot update crate with id=${id}. Maybe crate was not found!`
        });
      } else res.send({ message: "crate was updated successfully." });
    })
    .catch(err => {
      res.status(500).send({
        message: "Error updating crate with id=" + id
      });
    });
};

// Delete a 
exports.delete = (req, res) => {
  const id = req.params.id;

  crate_detail_table.findByIdAndRemove(id, { useFindAndModify: false })
    .then(data => {
      if (!data) {
        res.status(404).send({
          message: `Cannot delete crate with id=${id}. Maybe crate was not found!`
        });
      } else {
        res.send({
          message: "crate was deleted successfully!"
        });
      }
    })
    .catch(err => {
      res.status(500).send({
        message: "Could not delete crate with id=" + id
      });
    });
};

