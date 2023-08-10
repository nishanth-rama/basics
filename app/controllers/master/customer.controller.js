// const db = require("../models");
// const Tutorial = db.tutorials;

const db = require("../../models");

// const Tutorial = db.customers;

const customer_detail_table = db.customers;


// Create and Save
exports.create = (req, res) => {
  // Validate request
  if (!req.body) {
    res.status(400).send({ message: "Content can not be empty!" });
    return;
  }

 
  const tutorial = new customer_detail_table({
    name: req.body.name,
    email: req.body.email,
    mobile: req.body.mobile,
    password: req.body.password,
    roleId: req.body.roleId,
    address: req.body.address,
  });


  tutorial
    .save(tutorial)
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while creating the customer."
      });
    });
};

// Retrieve all
exports.findAll = (req, res) => {
  // const title = req.query.title;
  // var condition = title ? { title: { $regex: new RegExp(title), $options: "i" } } : {};

  customer_detail_table.find({})
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving customer."
      });
    });
};

// Find a single
exports.findOne = (req, res) => {
  const id = req.params.id;

  customer_detail_table.findById(id)
    .then(data => {
      if (!data)
        res.status(404).send({ message: "Not found customer with id " + id });
      else res.send(data);
    })
    .catch(err => {
      res
        .status(500)
        .send({ message: "Error retrieving customer with id=" + id });
    });
};

// Update 
exports.update = (req, res) => {
  if (!req.body) {
    return res.status(400).send({
      message: "Data to update can not be empty!"
    });
  }

  const id = req.params.id;

  customer_detail_table.findByIdAndUpdate(id, req.body, { useFindAndModify: false })
    .then(data => {
      if (!data) {
        res.status(404).send({
          message: `Cannot update customer with id=${id}. Maybe customer was not found!`
        });
      } else res.send({ message: "customer was updated successfully." });
    })
    .catch(err => {
      res.status(500).send({
        message: "Error updating customer with id=" + id
      });
    });
};

// Delete 
exports.delete = (req, res) => {
  const id = req.params.id;

  customer_detail_table.findByIdAndRemove(id, { useFindAndModify: false })
    .then(data => {
      if (!data) {
        res.status(404).send({
          message: `Cannot delete customers with id=${id}. Maybe customers was not found!`
        });
      } else {
        res.send({
          message: "customers was deleted successfully!"
        });
      }
    })
    .catch(err => {
      res.status(500).send({
        message: "Could not delete customers with id=" + id
      });
    });
};

// // Delete all Tutorials from the database.
// exports.deleteAll = (req, res) => {
//   Tutorial.deleteMany({})
//     .then(data => {
//       res.send({
//         message: `${data.deletedCount} customers were deleted successfully!`
//       });
//     })
//     .catch(err => {
//       res.status(500).send({
//         message:
//           err.message || "Some error occurred while removing all customers."
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
//           err.message || "Some error occurred while retrieving customers."
//       });
//     });
// };
