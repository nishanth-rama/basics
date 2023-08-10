// const db = require("../models");
// const Tutorial = db.tutorials;

const db = require("../../models");

// const inwardProcess = db.inwardProcess;

const Tutorial = db.inwardProcess;
const dbConfig = require("../../config/db.config.js");
const jwt = require("jsonwebtoken");

// Create and Save a new Tutorial
exports.create = async (req, res) => {
  // Validate request
  // console.log("is_it",req.key)

  // console.log("is_itas",req.session.user)

  if (!req.body) {
    res.status(400).send({ message: "Content can not be empty!" });
    return;
  }

  // Create a Tutorial
  const tutorial = new Tutorial(req.body);

  // Save Tutorial in the database
  await tutorial
    .save(tutorial)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while creating the inwardDetail.",
      });
    });
};

// Retrieve all Tutorials from the database.

exports.findAll = async (req, res) => {
  // var condition = req.query && req.query.deliveryDate  ? { "deliveryDate":req.query.deliveryDate} : {};

  const check = [];

  // var array= [ {
  //   _id: 620f544c31e2217d7c85da74,
  //   pono: '1',
  //   orderedQty: 11,
  //   inwardQty: '11',
  //   inwardDate: 2022-02-18T00:00:00.000Z,
  //   deliveryDate: 2022-02-18T00:00:00.000Z,
  //   createdAt: 2022-02-18T08:09:48.966Z,
  //   updatedAt: 2022-02-18T08:09:48.966Z
  // },

  const created_at = req.query.created_at;

  const date = new Date(req.query.created_at);
  let sd1 = date.setHours(date.getHours() + 24);

  // dateOfDelivery: {
  //   $gte: new Date(req.query.dateOfDelivery),
  //   $lt: new Date(sd1),
  // },

  await Tutorial.aggregate([
    {
      $match: {
        created_at : {
          $gte: new Date(req.query.created_at),
          $lt: new Date(sd1),
        },
      },
    },
  ])
    .then((data) => {
      if (data.length > 0) {
        data.map((item, idx) => {
          check.push({
            _id: item._id,
            SrNo: idx + 1,
            pono: item.po_no,
            orderedQty: item.ordered_qty,
            inwardQty: "NA",
            inwardDate: "NA",
            deliveryDate: item.delivery_date,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
          });
        });
        res
          .status(200)
          .send({ message: "Inward Detail Is Available!", data: check });
      } else {
        res
          .status(200)
          .send({ message: "Inward Detail List Is Empty!", data: data });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving tutorials.",
      });
    });
};
