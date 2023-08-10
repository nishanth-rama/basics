const db = require("../../models");


const article_master_table = db.articleMaster;

// Create and Save
exports.create = async(req, res) => {
  // Validate request
  if (!(req.body.company_code && req.body.plant_id && req.body.brand && req.body.sub_brand && req.body.material_name && req.body.material_code && req.body.uom && req.body.price)) {

    return res.status(400).send({ status_code: "400",
      message: "Please fill all required fields !"
    });
  }
  const checkcodeid = await article_master_table.findOne({
    material_code: req.body.material_code,
  });

  if (checkcodeid) {
    return res.status(400).send({
      message: "Material Code already exist.",
    });
  }


  // Create 
  const tutorial = new article_master_table({

    company_code: req.body.company_code,
    plant_id: req.body.plant_id,
    brand: req.body.brand,
    sub_brand: req.body.sub_brand,
    material_name: req.body.material_name,
    material_code: req.body.material_code,
    max_stock: req.body.max_stock,
    uom: req.body.uom,
    price:req.body.price
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
          err.message || "Some error occurred while creating the Article."
      });
    });
};

// Retrieve all 
exports.findAll = (req, res) => {

  const company_code = req.query.company_code;
  const plant_id = req.query.plant_id;

  article_master_table.find({ company_code: company_code, plant_id: plant_id})
    .then(data => {
      return res.status(200).send({
        status_code: 200,
        message: "Article details are Avalable.",
        data:data
      });

      
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving article."
      });
    });
};



// Retrieve all 
exports.get_all_articles_by_company_code = (req, res) => {
  console.log('get_all_articles_by_company_code');
  if (!req.query.company_code) {
    return res.status(400).send({ status_code: "400",
      message: "Company code parameter is missing !"
    });
  }
  const company_code = req.query.company_code;

  article_master_table.find({ company_code: company_code,
   })
    .then(data => {
      console.log("d", data.length)
      if (data.length == 0) {
        return res.status(404).send({ status: "400", message: "company code not found !" });
      }

      else res.status(200).send({ status_code: "200",
        message: "Article master data is available", data: data
      });
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving article."
      });
    });
};

// Find a single
exports.findOne = (req, res) => {
  const id = req.params.id;

  article_master_table.findById(id)
    .then(data => {
      if (!data)
        res.status(404).send({ message: "Not found article with id " + id });
      else {
        return res.status(200).send({
          status_code: 200,
          message: "Article data Available.",
          data: data
        });
      }
    })
    .catch(err => {
      res
        .status(500)
        .send({ message: "Error retrieving article with id=" + id });
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

  article_master_table.findByIdAndUpdate(id, req.body, { useFindAndModify: false })
    .then(data => {
      if (!data) {
        res.status(404).send({
          message: `Cannot update articl with id=${id}. Maybe article was not found!`
        });
      } else res.send({ status_code: "200",message: "Article Master updated successfully." });
    })
    .catch(err => {
      res.status(500).send({
        message: "Error updating article with id=" + id
      });
    });
};

// Delete 
exports.delete = (req, res) => {
  const id = req.params.id;

  article_master_table.findByIdAndRemove(id, { useFindAndModify: false })
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
