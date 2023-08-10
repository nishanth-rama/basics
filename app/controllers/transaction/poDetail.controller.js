// const db = require("../models");
// const Tutorial = db.tutorials;

const db = require("../../models");
const Tutorial = db.purchaseOrder;

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
        message: err.message,
      });
    });
};

// Retrieve all Tutorials from the database.
exports.get_purchase_order = async (req, res) => {
  // const{ plant_id,delivery_date,company_code} = req.query;

  const { plant_id, delivery_date, company_code } = req.query;

  // console.log("purr",plant_id)

  if (!(delivery_date && plant_id && company_code))
    return res.status(400).send({
      message:
        "Please provide all parameters inludes Company Code, Plant Id and Deliver Date ",
    });

  await Tutorial.find({
    supplying_plant: plant_id,
    delivery_date: delivery_date,
    company_code: company_code,
  })
    .then((data) => {
      if (data.length > 0) {
        data.forEach((element) => {
          if (element.vendor_no == "" && element.vendor_name == "") {
            element.vendor_no = element.supplying_plant;
            element.vendor_name = element.supplying_plant + " - Own Brand";
          }
        });

        res.status(200).send({
          status_code: "200",
          totalCount: data.length,
          message: "Purchase Order detail is available!",
          data: data,
        });
      } else {
        res.status(200).send({
          status_code: "200",
          message: "Purchase Order detail is not available!",
          data: data,
        });
      }
      // res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message ||
          "Some error occurred while retrieving Purchase Order detail.",
      });
    });
};


// Retrieve all Tutorials from the database.
exports.get_purchase_order_new = async (req, res) => {
  // const{ plant_id,document_date,company_code} = req.query;

  const { plant_id, document_date, company_code } = req.query;

  // console.log("purr",plant_id)

  if (!(document_date && plant_id && company_code))
    return res.status(400).send({
      message:
        "Please provide all parameters inludes Company Code, Plant Id and Document Date ",
    });

  await Tutorial.find({
    supplying_plant: plant_id,
    document_date: document_date,
    company_code: company_code,
  })
    .then((data) => {
      if (data.length > 0) {
        data.forEach((element) => {
          if (element.vendor_no == "" && element.vendor_name == "") {
            element.vendor_no = element.supplying_plant;
            element.vendor_name = element.supplying_plant + " - Own Brand";
          }
        });

        res.status(200).send({
          status_code: "200",
          totalCount: data.length,
          message: "Purchase Order detail is available!",
          data: data,
        });
      } else {
        res.status(200).send({
          status_code: "200",
          message: "Purchase Order detail is not available!",
          data: data,
        });
      }
      // res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message ||
          "Some error occurred while retrieving Purchase Order detail.",
      });
    });
};

