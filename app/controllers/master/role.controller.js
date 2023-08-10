const db = require("../../models");

// const Tutorial = db.roles;

const roles_detail_table = db.roles;

// Create and Save
// exports.create = (req, res) => {
//   // Validate request
//   if(!(req.body.company_code && req.body.company_name && req.body.role_name && req.body.module_name)) {

//       return res.status(400).send({ status_code : "400",
//           message: "Please fill all required fields !"
//       });
//   }

//   // Create
//   const tutorial = new roles_detail_table({
//     company_code: req.body.company_code,
//     company_name: req.body.company_name,
//     role_name: req.body.role_name,
//     module_name: req.body.module_name,
//   });

//   // Save
//   tutorial
//     .save()
//     .then(data => {
//       res.send(data);
//     })
//     .catch(err => {
//       res.status(500).send({
//         message:
//           err.message || "Some error occurred while creating the Role."
//       });
//     });
// };

exports.create = async (req, res) => {
  try {
    const { company_code, company_name, role_name, module_name } = req.body;

    if (!(company_code && company_name && role_name && module_name)) {
      return res.status(400).send({
        status_code: 400,
        message: "Please provide all data",
      });
    }
    const existingRole = await roles_detail_table.findOne({
      role_name: role_name,
    });

    if (existingRole) {
      if (existingRole.module_name.includes(module_name)) {
        return res.status(400).send({
          status_code: 400,
          message: "Module name already exists for this role.",
        });
      }

      existingRole.module_name.push(module_name);
      await existingRole.save();

      return res.status(200).send({
        status_code: 200,
        message: "Successfully added new role",
      });
    } else {
      const roleData = new roles_detail_table({
        company_code: company_code,
        company_name: company_name,
        role_name: role_name,
        module_name: [module_name], // Create a new array for a new role
      });

      await roleData.save();

      return res.status(200).send({
        status_code: 200,
        message: "Successfully added new role.",
      });
    }
  } catch (err) {
    return res.status(500).send({
      status_code: 500,
      message: err.message || "Error while inserting/updating role data",
    });
  }
};

// Retrieve all
exports.findAll = async (req, res) => {
  // const title = req.query.title;
  // var condition = title ? { title: { $regex: new RegExp(title), $options: "i" } } : {};

  // console.log("class",condition)
  try {
    const company_code = req.query.company_code;
    const data = await roles_detail_table.find({ company_code: company_code });
    // console.log(data);
    // const modifiedData = data.reduce((result, item) => {
    //   const existingItem = result.find((el) => el.role_name === item.role_name);
    //   console.log(existingItem);

    //   if (existingItem) {
    //     existingItem.module_name.push(item.module_name);
    //   } else {
    //     result.push({
    //       ...item,
    //       module_name: [item.module_name],
    //     });
    //   }

    //   return result;
    // }, []);

    return res.status(200).send({
      status_code: 200,
      data: data,
    });
  } catch (err) {
    return res.status(500).send({
      status_code: 500,
      message: err.message || "Some error occurred while retrieving role",
    });
  }

  // .then(data => {

  //   res.send(data);
  // })
  // .catch(err => {
  //   res.status(500).send({
  //     message:
  //       err.message || "Some error occurred while retrieving role."
  //   });
  // });
};

// Retrieve all
exports.get_all_rolemaster_by_company_code = (req, res) => {
  if (!req.query.company_code) {
    return res.status(400).send({
      status_code: "400",
      message: "Company code parameter is missing !",
    });
  }

  const company_code = req.query.company_code;

  roles_detail_table
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
          message: "Role master data is available",
          data,
        });
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while retrieving role.",
      });
    });
};

// Find a single
exports.findOne = (req, res) => {
  const id = req.params.id;

  roles_detail_table
    .findById(id)
    .then((data) => {
      if (!data)
        res.status(404).send({ message: "Not found role with id " + id });
      else res.send(data);
    })
    .catch((err) => {
      res.status(500).send({ message: "Error retrieving role with id=" + id });
    });
};

// Update
exports.update = async (req, res) => {
  const reqBody = req.body;
  if (!reqBody) {
    return res.status(400).send({
      message: "Data to update can not be empty!",
    });
  }

  const id = req.params.id;
  if (!(reqBody.role_name && reqBody.module_name)) {
    return res.status(400).send({
      status_code: 400,
      message: "Please provide role name and module name",
    });
  }
  await roles_detail_table
    .find({
      module_name: { $regex: new RegExp(reqBody.module_name, "i") },
      role_name: reqBody.role_name,
    })
    .then(async (result) => {
      if (result.length !== 0) {
        return res.status(400).send({
          status_code: 400,
          message: "Module name exist for this role.",
        });
      } else {
        roles_detail_table
          .findByIdAndUpdate(id, req.body, { useFindAndModify: false })
          .then((data) => {
            if (!data) {
              res.status(404).send({
                message: `Cannot update role with id=${id}. Maybe role was not found!`,
              });
            } else res.send({ message: "role was updated successfully." });
          })
          .catch((err) => {
            res.status(500).send({
              message: "Error updating role with id=" + id,
            });
          });
      }
    })
    .catch((err) => {
      return res.status(500).send({
        status_code: 500,
        message: err.message || "Error while inserting role data",
      });
    });
};

// Delete
exports.delete = (req, res) => {
  const id = req.params.id;

  roles_detail_table
    .findByIdAndRemove(id, { useFindAndModify: false })
    .then((data) => {
      if (!data) {
        res.status(404).send({
          message: `Cannot delete role with id=${id}. Maybe role was not found!`,
        });
      } else {
        res.send({
          message: "role was deleted successfully!",
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Could not delete role with id=" + id,
      });
    });
};

// Delete all Tutorials from the database.
// exports.deleteAll = (req, res) => {
//   Tutorial.deleteMany({})
//     .then(data => {
//       res.send({
//         message: `${data.deletedCount} role were deleted successfully!`
//       });
//     })
//     .catch(err => {
//       res.status(500).send({
//         message:
//           err.message || "Some error occurred while removing all role."
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
//           err.message || "Some error occurred while retrieving role."
//       });
//     });
// };
