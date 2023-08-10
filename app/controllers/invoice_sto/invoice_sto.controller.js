"use strict";

// npm
const db = require("../../models");
const moment = require("moment");
const _ = require("lodash");
const axios = require("axios").default;
const { respondSuccess, respondFailure } = require("../../helpers/response");
const req = require("express/lib/request");
const { date } = require("joi");
const { startingRackId } = require("../master/rack.controller");
const { find } = require("lodash");

const invoice_generation = db.invoiceGenerate;
const sap_logs = db.sap_logs_model;
const Tutorial = db.stoDetails;
const sap_url = process.env.SAP_URL;

exports.invoice_sto = (req, res) => {
  if (!(req.query.company_code && req.query.plant_id && req.query.createdAt)) {
    return res.status(400).send({ message: "Missing parameter." });
  }
  const invoiceSto = [];

  // const date = new Date(req.query.createdAt);
  // let sd1 = date.setHours(date.getHours() + 24);

  Tutorial.find({
    company_code: req.query.company_code,
    shiping_point: req.query.plant_id,
    createdAt: {
      $gte: new Date(req.query.createdAt + "T00:00:00.000"),
      $lte: new Date(req.query.createdAt + "T23:59:59.999"),
    },
    invoice_no: { $exists: false}
  })
    .then((data) => {
      if (data != 0)
        data.map((item, index) => {
          const finddata = {};
          (finddata.sto_no = item.sto_no),
            (finddata.sto_po = item.sto_po),
            invoiceSto.push(finddata);
        });
      //   res.status(404).send({ message: "Invoice Sto not found " });
      res
        .status(200)
        .send({ message: "invoiceSto Is Available!", data: invoiceSto });
    })
    .catch((err) => {
      res.status(500).send({ message: "Error retrieving invoice" });
    });
};

exports.sto_invoice_creation = async (req, res) => {
  try {
    const { delivery_no, company_code, plant_id, createdAt } = req.query;
    console.log("sto_invoice_creation");
    if (!(delivery_no && company_code && plant_id && createdAt)) {
      return res.status(400).send({
        status_code: "400",
        message: "Missing parameter.",
      });
    }

    const ref_no = Math.floor(Math.random() * 1000000000);
    const request = {
      delivery_no: delivery_no,
      reference_key: ref_no,
    };
    const newRequest = {};
    newRequest.request = request;

    var options = {
      method: "get",
      url: `${sap_url}/invoice_sto_create`,
      data: newRequest,
    };

    axios
      .request(options)
      .then(async (response) => {
        console.log("------", response);
        const sapData = {};
        sapData.request = request;
        sapData.primaryData = response.data.response.invoice_no;
        sapData.response = response.data.response;
        sapData.type = "sto_invoice";
        sapData.plant_id = plant_id;
        const new_invoice_log = new sap_logs(sapData);
        await new_invoice_log.save();
        if (new_invoice_log.response.flag !== "S") {
          return respondFailure(res, "sto invoice creation failed", {
            request: request,
            response: new_invoice_log.response,
          });
        }

        await Tutorial.updateMany(
          {
            sto_no: delivery_no,
          },
          {
            $set: {
              invoice_no: new_invoice_log.response.invoice_no
            },
          }
        );

        return respondSuccess(res, "sto invoice saved successfully", {
          request: request,
          response: new_invoice_log.response,
        });
      })
      .catch((error) => {
        res.status(500).send({
          message: error.message || "Some error occurred while generating id",
        });
      });
  } catch (error) {
    console.log("catch data");
    res.status(500).send({
      message: error.message || "Some error occurred while generating id",
    });
  }
};

exports.sapStoInvoiceList = async (req, res) => {
  console.log("Calling get sap sto invoice list");
  const { company_code, plant_id, invoice_date, invoice_no } = req.query;
  try {
    if (!(company_code && plant_id && invoice_date) && !invoice_no)
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    let filter = {};

    if (!invoice_no)
      filter = {
        "invoiceDetails.company_code": +company_code,
        plant_id: plant_id,
        "invoiceDetails.invoiceDate": invoice_date,
      };
    else
      filter = {
        "invoiceDetails.invoiceNo": invoice_no,
      };

    const getSapStoInv = await db.sapStoInvoice.find(filter).sort({ _id: -1 });

    let data;

    if (!invoice_no) data = getSapStoInv;
    else {
      if (getSapStoInv.length == 0) data = {};
      else data = getSapStoInv[0];
    }
    const mssge = getSapStoInv.length == 0 ? "not " : "";

    return res.send({
      status_code: 200,
      message: "SAP STO Invoice data is " + mssge + "available",
      data: data,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting SAP STO Invoice list",
    });
  }
};

exports.getSapLogs = async (req, res) => {
  console.log("Calling get sap logs list");
  const { company_code, plant_id, date } = req.query;
  try {
    if (!(company_code && plant_id && date))
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    const start_date = new Date(date);
    const end_date = start_date.setHours(start_date.getHours() + 24);

    const getSapLogs = await db.sap_logs_model
      .find({
        company_code: company_code,
        plant_id: plant_id,
        $and: [
          { createdAt: { $gte: new Date(date) } },
          { createdAt: { $lt: new Date(end_date) } },
        ],
      })
      .sort({ _id: 1 });

    const mssge = getSapLogs.length == 0 ? "not " : "";

    return res.send({
      status_code: 200,
      message: "SAP logs list is " + mssge + "available",
      data: getSapLogs,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while fetching sap logs list",
    });
  }
};
