const db = require("../../models");


const brandDetails = db.brandDetails;

// Create and Save
exports.create = (req, res) => {
  

    // Validate request
    if (!(req.body.company_code && req.body.brand && req.body.company_name)) {

        return res.status(400).send({
            status_code: "400",
            message: "Please fill all required fields !"
        });
    }

    // Create 
    const tutorial = new brandDetails({
        company_code: req.body.company_code,
        company_name: req.body.company_name,
        brand: req.body.brand
    });

    // Save 
    tutorial
        .save()
        .then(data => {

            return res.status(200).send({
                status_code: "200",
                status_message: "Data Added Successfully",
                data: data,
            });
        })
        .catch(err => {
            res.status(500).send({
                message:
                    err.message || "Some error occurred while creating the Brand."
            });
        });
};


exports.findone = (req, res) => {
  brandDetails.find({ _id: req.query.id })
    .then(data => {
      return res.status(200).send({
        status_code: 200,
        message: "Brand master details are Avalable.",
        data: data
      });
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving article."
      });
    });
};


exports.findAll = (req, res) => {
  brandDetails.find({})
    .then(data => {

      return res.status(200).send({
        status_code: 200,
        message: "Brand master details are Avalable.",
        data: data
      });
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving article."
      });
    });
};

exports.delete = (req, res) => {
    const id = req.params.id;
  
    brandDetails.findByIdAndRemove(id, { useFindAndModify: false })
      .then(data => {
        if (!data) {
          res.status(404).send({
            message: `Cannot delete article with id=${id}. Maybe article was not found!`
          });
        } else {
          res.send({status_code: "200",
            message: "Article  deleted successfully!"
          });
        }
      })
      .catch(err => {
        res.status(500).send({
          message: "Could not delete article with id=" + id
        });
      });
  };


exports.update = (req, res) => {
    console.log(Object.keys(req.body).length);
    if(!Object.keys(req.body).length) {
      return res.status(400).send({
        message: "Data to update can not be empty!"
      });
    }
    const id = req.params.id;
    brandDetails.findByIdAndUpdate(id, req.body, { useFindAndModify: false })
      .then(data => {
        if (!data) {
          res.status(404).send({
            message: `Cannot update articl with id=${id}. Maybe article was not found!`
          });
        } else res.send({ status_code: "200",message: "Brand Master updated successfully." });
      })
      .catch(err => {
        res.status(500).send({
          message: "Error updating article with id=" + id
        });
      });
  };
  