// const db = require("../models");
// const Tutorial = db.tutorials;

const db = require("../../models");

const Tutorial = db.electric_stackers;

const electric_stackers_detail_table = db.electric_stackers;


// Create and Save 
exports.create = (req, res) => {
  if(!(req.body.company_code,
  req.body.plant_id,
  req.body.company_name,
   req.body.stackerId,
   req.body.stackerName))
  // Validate request
  if (!req.body) {
    res.status(400).send({ message: "Please provide all required parameters!" });
    return;
  }

  // Create a Tutorial
  const tutorial = new electric_stackers_detail_table({
    company_code:req.body.company_code,
    company_name:req.body.company_name,
    plant_id:req.body.plant_id,
    stackerId: req.body.stackerId,
    stackerName: req.body.stackerName,
 
  });

  // Save 
  tutorial
    .save(tutorial)
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while creating the electric_stacker."
      });
    });
};

// Retrieve all 
exports.findAll = async (req, res) => {
  const {company_code, plant_id} = req.query;
  // const title = req.query.title;
  // var condition = title ? { title: { $regex: new RegExp(title), $options: "i" } } : {};

  if(!(company_code && plant_id)) res.status(400).send({status_code:400,message:"Please provide company code and plant id to proceed!"});

  await electric_stackers_detail_table.find({company_code :company_code,plant_id:plant_id}).sort({_id:-1})
      .then(data => {
        let resMessage = "Electric stacker data is available";
        let status = 200;
        if(data.length === 0) {
           resMessage = "Electric stacker data is not available!"; 
           status = 404;
        } 
        return res.send({ 
            status_code:status,
            message: resMessage,
            data:data
          });
      })
      .catch(err => {
        return res.status(500).send({
          status_code: 500,
          message: err.message || "Some error occurred while retrieving countries data."
        });
      });
};


// Retrieve all 
exports.get_all_electric_stacker_data_by_company_code = (req, res) => {
  if(!req.query.company_code ) {

    return res.status(200).send({ status_code : "200",
        message: "Company code parameter is missing !"
    });
}

const company_code = req.query.company_code;

electric_stackers_detail_table.find({ company_code: company_code}).sort({_id:-1})
    .then(data => {
      console.log("d", data.length)
      if (data.length == 0 ){
        return res.status(200).send({status:"200", message: "company code not found !"});
      }
       
      else res.status(200).send({ status_code : "200",
      message: "Electric Stacker data is available",data
  });
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving role."
      });
    });
};


// Find a
exports.findOne = (req, res) => {
  const id = req.params.id;

  electric_stackers_detail_table.findById(id)
    .then(data => {
      if (!data)
        res.status(200).send({ message: "Not found electric stacker with id " + id });
      else res.send(data);
    })
    .catch(err => {
      res
        .status(500)
        .send({ message: "Error retrieving electric stacker with id=" + id });
    });
};

// Update
exports.update = (req, res) => {
  if (!req.body) {
    return res.status(200).send({
      message: "Data to update can not be empty!"
    });
  }

  const id = req.params.id;

  electric_stackers_detail_table.findByIdAndUpdate(id, req.body, { useFindAndModify: false })
    .then(data => {
      if (!data) {
        res.status(200).send({
          message: `Cannot update electric_stacker with id=${id}. Maybe electric stacker was not found!`
        });
      } else res.send({ message: "Electric stacker updated successfully." });
    })
    .catch(err => {
      res.status(500).send({
        message: "Error updating electric stacker with id=" + id
      });
    });
};

// Delete 
exports.delete = (req, res) => {
  const id = req.params.id;

  electric_stackers_detail_table.findByIdAndRemove(id, { useFindAndModify: false })
    .then(data => {
      if (!data) {
        res.status(200).send({
          message: `Cannot delete electric stacker with id=${id}. Maybe electric stacker was not found!`
        });
      } else {
        res.send({
          message: "Electric stacker deleted successfully!"
        });
      }
    })
    .catch(err => {
      res.status(500).send({
        message: "Could not delete electric stacker with id=" + id
      });
    });
};

// Delete all Tutorials from the database.
// exports.deleteAll = (req, res) => {
//   Tutorial.deleteMany({})
//     .then(data => {
//       res.send({
//         message: `${data.deletedCount} electric_stacker were deleted successfully!`
//       });
//     })
//     .catch(err => {
//       res.status(500).send({
//         message:
//           err.message || "Some error occurred while removing all electric_stacker."
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
//           err.message || "Some error occurred while retrieving electric_stacker."
//       });
//     });
// };
