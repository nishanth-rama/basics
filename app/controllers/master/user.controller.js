// const db = require("../models");
// const Tutorial = db.tutorials;

const db = require("../../models");

// const Tutorial = db.users;

const users_detail_table = db.users;
const employeesColl = db.employeeDetail;

// Create and Save
exports.create = (req, res) => {
  // Validate request
  if (!req.body) {
    res.status(400).send({ message: "Content can not be empty!" });
    return;
  }

  // Create
  const tutorial = new users_detail_table({
    name: req.body.name,
    email: req.body.email,
    mobile: req.body.mobile,
    address: req.body.address,
    role: req.body.role,
    password: req.body.password,
  });

  tutorial
    .save(tutorial)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while creating the user.",
      });
    });
};

// Retrieve all
exports.findAll = (req, res) => {
  // const title = req.query.title;
  // var condition = title ? { title: { $regex: new RegExp(title), $options: "i" } } : {};

  users_detail_table
    .find({})
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while retrieving user.",
      });
    });
};

// Find a single
exports.findOne = (req, res) => {
  const id = req.params.id;

  users_detail_table
    .findById(id)
    .then((data) => {
      if (!data)
        res.status(404).send({ message: "Not found Tutorial with id " + id });
      else res.send(data);
    })
    .catch((err) => {
      res.status(500).send({ message: "Error retrieving user with id=" + id });
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

  users_detail_table
    .findByIdAndUpdate(id, req.body, { useFindAndModify: false })
    .then((data) => {
      if (!data) {
        res.status(404).send({
          message: `Cannot update users_detail_table with id=${id}. Maybe user was not found!`,
        });
      } else res.send({ message: "user was updated successfully." });
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error updating user with id=" + id,
      });
    });
};

// Delete
exports.delete = (req, res) => {
  const id = req.params.id;

  users_detail_table
    .findByIdAndRemove(id, { useFindAndModify: false })
    .then((data) => {
      if (!data) {
        res.status(404).send({
          message: `Cannot delete user with id=${id}. Maybe user was not found!`,
        });
      } else {
        res.send({
          message: "user was deleted successfully!",
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Could not delete user with id=" + id,
      });
    });
};

// Delete all Tutorials from the database.
// exports.deleteAll = (req, res) => {
//   Tutorial.deleteMany({})
//     .then(data => {
//       res.send({
//         message: `${data.deletedCount} user were deleted successfully!`
//       });
//     })
//     .catch(err => {
//       res.status(500).send({
//         message:
//           err.message || "Some error occurred while removing all user."
//       });
//     });
// };

// // Find all published user
// exports.findAllPublished = (req, res) => {
//   Tutorial.find({ published: true })
//     .then(data => {
//       res.send(data);
//     })
//     .catch(err => {
//       res.status(500).send({
//         message:
//           err.message || "Some error occurred while retrieving user."
//       });
//     });
// };

exports.getEmployeeEmails = async (req, res) => {
  console.log("calling get employee email list api");
  const company_code = req.query.company_code;

  try {
    if (!company_code)
      return res.status(400).send({
        status_code: 400,
        message: "Please provide company code to proceed",
      });

    const emails = (
      await employeesColl
        .find(
          { email: { $ne: "" }, "officeDetails.employmentstatus": "Active" },
          { _id: 0, email: 1 }
        )
        .sort({ email: 1 })
    ).map((id) => {
      return id.email;
    });

    let status = 200;
    let mssge = "Employee email list is available";
    if (emails.length == 0) {
      status = 404;
      mssge = "Employee email list not found!";
    }

    return res
      .status(status)
      .send({ status_code: status, mesage: mssge, data: emails });
    //
  } catch (err) {
    res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting employee email ids!",
    });
  }
};

exports.getEmployeeDetails = async (req, res) => {
  console.log("calling get email based employee details api");
  const { company_code, email_id } = req.query;

  try {
    if (!(company_code && email_id))
      return res.status(400).send({
        status_code: 400,
        message: "Please provide both company code and email id to proceed",
      });

    let details = await employeesColl.findOne(
      { email: email_id, "officeDetails.employmentstatus": "Active" },
      {
        _id: 0,
        email: 1,
        mobile: 1,
        employeeid: 1,
        employeecode: 1,
        employeename: 1,
      }
    );

    let status = 200;
    let mssge = "Employee details is available";
    if (details == null) {
      status = 404;
      mssge = "Employee details not found or Inactive!";
      details = {};
    }

    return res
      .status(status)
      .send({ status_code: status, mesage: mssge, data: details });
    //
  } catch (err) {
    res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting employee email ids!",
    });
  }
};
