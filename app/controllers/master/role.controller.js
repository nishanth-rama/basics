const db = require("../../models");

// const Tutorial = db.roles;

const roles_detail_table = db.roles;

// Create and Save
exports.create = (req, res) => {
  // Validate request
  if(!(req.body.company_code && req.body.company_name && req.body.role_name)) {

      return res.status(400).send({ status_code : "400",
          message: "Please fill all required fields !"
      });
  }

  // Create 
  const tutorial = new roles_detail_table({
    company_code: req.body.company_code,
    company_name: req.body.company_name,
    role_name: req.body.role_name,
 
  });
  

  // Save 
  tutorial
    .save()
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while creating the Role."
      });
    });
};

// Retrieve all 
exports.findAll = (req, res) => {
  // const title = req.query.title;
  // var condition = title ? { title: { $regex: new RegExp(title), $options: "i" } } : {};

  // console.log("class",condition)

  const company_code = req.query.company_code;

  roles_detail_table.find({company_code: company_code})
    .then(data => {
   
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving role."
      });
    });
};



// Retrieve all 
exports.get_all_rolemaster_by_company_code = (req, res) => {
  if(!req.query.company_code ) {

    return res.status(400).send({ status_code : "400",
        message: "Company code parameter is missing !"
    });
}

const company_code = req.query.company_code;

  roles_detail_table.find({ company_code: company_code})
    .then(data => {
      console.log("d", data.length)
      if (data.length == 0 ){
        return res.status(404).send({status:"400", message: "company code not found !"});
      }
       
      else res.status(200).send({ status_code : "200",
      message: "Role master data is available",data
  });
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving role."
      });
    });
};

// Find a single
exports.findOne = (req, res) => {
  const id = req.params.id;

  roles_detail_table.findById(id)
    .then(data => {
      if (!data)
        res.status(404).send({ message: "Not found role with id " + id });
      else res.send(data);
    })
    .catch(err => {
      res
        .status(500)
        .send({ message: "Error retrieving role with id=" + id });
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

  roles_detail_table.findByIdAndUpdate(id, req.body, { useFindAndModify: false })
    .then(data => {
      if (!data) {
        res.status(404).send({
          message: `Cannot update role with id=${id}. Maybe role was not found!`
        });
      } else res.send({ message: "role was updated successfully." });
    })
    .catch(err => {
      res.status(500).send({
        message: "Error updating role with id=" + id
      });
    });
};

// Delete 
exports.delete = (req, res) => {
  const id = req.params.id;

  roles_detail_table.findByIdAndRemove(id, { useFindAndModify: false })
    .then(data => {
      if (!data) {
        res.status(404).send({
          message: `Cannot delete role with id=${id}. Maybe role was not found!`
        });
      } else {
        res.send({
          message: "role was deleted successfully!"
        });
      }
    })
    .catch(err => {
      res.status(500).send({
        message: "Could not delete role with id=" + id
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
