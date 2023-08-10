
const { date } = require("joi");
const db = require("../../models");

const moment_tz = require("moment-timezone");

const Tutorial = db.JobScheduler;

// Create and Save a new Tutorial
exports.create = (req, res) => {
  // Validate request

  if (!req.body) {
    res.status(400).send({ message: "Content can not be empty!" });
    return;
  }

  // Create a Tutorial
  const tutorial = new Tutorial(req.body);

  // Save Tutorial in the database
  tutorial
    .save(tutorial)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while creating the jobScheduler.",
      });
    });
};

// Retrieve all Tutorials from the database.
exports.findAll = (req, res) => {
  // const title = req.query.title;
  var condition =
    req.query && req.query.deliveryDate
      ? { deliveryDate: req.query.deliveryDate }
      : {};

  // console.log("backend", condition);

  Tutorial.find(condition)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message ||
          "Some error occurred while retrieving jobScheduler customer.",
      });
    });
};

exports.findOne = (req, res) => {
  const id = req.params.id;

  Tutorial.findById(id)
    .then((data) => {
      if (!data)
        res
          .status(404)
          .send({ message: "Not found jobScheduler customer with id " + id });
      else res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error retrieving jobScheduler customer with id=" + id,
      });
    });
};

exports.update = async (req, res) => {

  if (
    !(
      req.body.binId &&
      req.body.company_code &&
      req.body.plant_id &&
      req.params.sales_order_no
    )
  ) {
    return res.status(400).send({
      message:
        "Please provide all required fields like company_code, plant_id, sales_order_no, binId!",
    });
  }
  
  const job_scheduled_time = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD");


    // console.log("lastInwardedTime",job_scheduled_time,typeof(job_scheduled_time))  


  const sales_order_no = req.params.sales_order_no;

  const filter = { sales_order_no: sales_order_no };

  var update_parameter = { ...req.body };

  // console.log("update1", update_parameter);

  //"status":"assgined",
  // "bin_status": 1

  const check_job = await db.JobScheduler.findOne(filter);

  if(check_job && check_job.status === "completed"){
    return res.send({ message: "job is already completed for provided sales order." });
  }

  const check_job_on_bin = await db.JobScheduler.findOne({binId:req.body.binId,job_scheduled_on
    :
    job_scheduled_time});


  if(check_job_on_bin && check_job_on_bin.job_scheduled_on == job_scheduled_time) {
    return res.send({ message: `Bin with id ${req.body.binId} already assisgned for Today` });
  }

  

  if(!check_job){
    update_parameter["status"] = "completed";

    update_parameter["bin_status"] = 1;
   
    update_parameter["job_scheduled_on"] = job_scheduled_time;

  }



  // console.log("update2", update_parameter);

  Tutorial.updateOne(filter, update_parameter, {
    upsert: true,
    new: true,
  })
    .then((data) => {
      // console.log("prlase",data)
      if (!data) {
        res.status(404).send({
          message: `Cannot update jobScheduler with sales_order_no=${sales_order_no}.`,
        });
      } else {
        res.send({ message: "jobScheduler updated successfully." });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message:
         err.message || "Error updating jobScheduler with sales_order_no=" + sales_order_no,
      });
    });
};

// Delete a Tutorial with the specified id in the request
exports.delete = (req, res) => {
  const id = req.params.id;

  Tutorial.findByIdAndRemove(id, { useFindAndModify: false })
    .then((data) => {
      if (!data) {
        res.status(404).send({
          message: `Cannot delete jobScheduler customer with id=${id}. Maybe jobScheduler customer was not found!`,
        });
      } else {
        res.send({
          message: "jobScheduler customer was deleted successfully!",
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Could not delete jobScheduler customer with id=" + id,
      });
    });
};
