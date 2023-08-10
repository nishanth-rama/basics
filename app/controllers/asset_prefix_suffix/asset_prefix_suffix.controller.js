// const db = require("../models");
// const Tutorial = db.tutorials;
"use strict";

const e = require("express");
const db = require("../../models");

const Tutorial = db.rapid_asset_prefix_suffix_settings;

//console.log(Tutorial);
// Create and Save a new Tutorial
exports.create = (req, res) => {
  // Validate request
  if (!req.body) {
    res.status(400).send({ 
      status_code: "200",
      status_message: "Content can not be empty!."
    
    
    });
    return;
  }

  // Create a Tutorial
  const tutorial = new Tutorial({
    company_code: req.body.company_code,
    plant_id: req.body.plant_id,
    prefix: req.body.prefix,
    suffix: req.body.suffix,
    asset_type: req.body.asset_type,

 });

  // Save Tutorial in the database
  tutorial
    .save(tutorial)
    .then(data => {
      res.send({status_code: "200",
      status_message: "Record Added Successfully",data});
    })
    .catch(err => {
      res.status(500).send({
         status_code: "500",
          status_message: "Some error occurred while creating the asset.",
      });


    });
};

// Retrieve all Tutorials from the database.
exports.findAll= (req, res) => {
  // const title = req.query.title;
  // var condition = title ? { title: { $regex: new RegExp(title), $options: "i" } } : {};

  Tutorial.find({company_code:req.query.company_code})
    .then(data => {
      res.status(200).send({status_code: "200",
      status_message: "Successfully Find All Asset Data",
      data});
    })
    .catch(err => {
      res.status(500).send({
        status_code: "500",
        status_message: "Some error occurred while retrieving asset.",
       
      });
    });
};



exports.assetsdata = async (req, res) => {
  try {
    console.log(req.query);
   if (!(req.query.company_code && req.query.plant_id && req.query.asset_type)) {
  return res.status(200).send({
status_code: "200",
   message: "Missing parameter !"
   });
   }
 
  await Tutorial
   .find({
  company_code: req.query.company_code, 
  plant_id: req.query.plant_id,
  asset_type: req.query.asset_type,
 }).then((fetchdata => {

  
  
  
  if (fetchdata.length != 0) {
  
   res.status(200).send({
    status_code: "200",
    Message : "Data Available",
    Data: fetchdata
    });
   console.log(req.query);
 
  
   } else {
   return res.status(200).send({
  status_code: "400",
  message: "Data Not Available",
  Data:[]
   });
   }
  
  
  }))
  }
  catch (err) {
  res.status(500).send({
  status_code: "500",
  message:
   err.message || "Some error occurred while retrieving asset details !"
   });
   }
  };
  


// Find a single Tutorial with an id
exports.findOne = (req, res) => {
  const id = req.params.id;
  

  Tutorial.findById(id)
    .then(data => {
      if (!data)
        res.status(404).send({ 
         
          status_code: "404",
        status_message: "Not found asset with id " + id
        
        });
      else res.send({status_code: "200",
      status_message: "Successfully Find Asset Data",data});
    })
    .catch(err => {
      res
        .status(500)
        .send({
           
          status_code: "500",
          status_message: "Error retrieving asset with id=" + id 
          
          });
    });
};

// Update a Tutorial by the id in the request
exports.update = (req, res) => {
  if (!req.body) {
    return res.status(200).send({
      
      status_code: "200",
      status_message: "Data to update can not be empty!"

    });
  }

  const id = req.params.id;

  Tutorial.findByIdAndUpdate(id, req.body, { useFindAndModify: false })
    .then(data => {
      if (!data) {
        res.status(404).send({
          status_code: "404",
          status_message: `Cannot update asset with id=${id}. Maybe asset was not found!`
    
        });
      } else res.send({ 
       
      
        status_message: "asset was updated successfully."
  
      
      });
    })
    .catch(err => {
      res.status(500).send({
       
        status_code: "500",
        status_message: "Error updating asset with id=" + id
  
      });
    });
};

// Delete a Tutorial with the specified id in the request
exports.delete = (req, res) => {
  const id = req.params.id;

  Tutorial.findByIdAndRemove(id, { useFindAndModify: false })
    .then(data => {
      if (!data) {
        res.status(404).send({
         
          status_code: "404",
          status_message: `Cannot delete asset with id=${id}. Maybe asset was not found!`
    

        });
      } else {
        res.send({
         
          status_message: "asset was deleted successfully!"
        });
      }
    })
    .catch(err => {
      res.status(500).send({
       
        status_code: "500",
        status_message: "Could not delete asset with id=" + id
  
      });
    });
};

// Delete all Tutorials from the database.
exports.deleteAll = (req, res) => {
  Tutorial.deleteMany({})
    .then(data => {
      res.send({
        status_message: `${data.deletedCount} asset were deleted successfully!`


      });
    })
    .catch(err => {
      res.status(500).send({
      
          status_code: "500",
          status_message: "Some error occurred while removing all assets."
    
      });
    });
};

// Find all published crate
exports.findAllPublished = (req, res) => {
  Tutorial.find({ published: true })
    .then(data => {
      res.send({status_code: "200",
      status_message: "Successfully Find ALL Published Data ",data});
    })
    .catch(err => {
      res.status(500).send({
      
          status_code: "500",
          status_message: "Some error occurred while retrieving asset."
    
      });
    });
};
