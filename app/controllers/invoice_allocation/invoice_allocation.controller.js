"use strict";

// npm
const db = require("../../models");
const moment = require("moment");
const _ = require("lodash");
const axios = require("axios").default;

// database
const so_allocation_generation = db.soAllocationGenerate;
const invoice_generation = db.invoiceGenerate;
const sap_logs = db.sap_logs_model;
const sap_url = process.env.SAP_URL;
const sap_auth = process.env.SAP_AUTH;

// helpers
const { respondSuccess, respondFailure } = require("../../helpers/response");
const { customers } = require("../../models");
// const localesKeys = require('../../locale/key.json');
// const constValues = require('../../helpers/constant');

module.exports = {
  getAllPendingInvoice: async (req, res) => {
    try {
      const { delivery_date, plant_id, company_code } = req.query;
      if (!(delivery_date, plant_id, company_code)) {
        return res.status(400).send({
          status_code: "400",
          message: "Missing parameter.",
        });
      }

      const allocations = await so_allocation_generation
        .find({ delivery_date, plant_id, company_code, invoice_status: "wait" })
        .select(
          "sales_order_no plant_id delivery_date customer_code company_code invoice_id invoice_status allocation_id"
        )
        .lean();

      if (allocations.length) {
        return respondSuccess(res, "Allocations are available", allocations);
      }
      return respondSuccess(res, "Allocations not available", allocations);
    } catch (error) {
      res.status(500).send({
        message:
          error.message || "Some error occurred while retrieving allocations",
      });
    }
  },

  getAllSuccessInvoice: async (req, res) => {
    try {
      const { delivery_date, plant_id, company_code } = req.query;
      if (!(delivery_date, plant_id, company_code)) {
        return res.status(400).send({
          status_code: "400",
          message: "Missing parameter.",
        });
      }

      const allocations = await so_allocation_generation.aggregate([
        {
          $match: {
            delivery_date,
            plant_id,
            company_code,
            invoice_status: "success",
          },
        },
        {
          $lookup: {
            from: "rapid_allocation_invoice_details",
            localField: "invoice_id",
            foreignField: "_id",
            as: "invoice",
          },
        },
        {
          $unwind: {
            path: "$invoice",
          },
        },
        {
          $project: {
            sales_order_no: 1,
            plant_id: 1,
            delivery_date: 1,
            customer_code: 1,
            company_code: 1,
            invoice_no: "$invoice.invoice_no",
            invoice_status: 1,
            allocation_id: 1,
          },
        },
      ]);

      if (allocations.length) {
        return respondSuccess(res, "Allocations are available", allocations);
      }
      return respondSuccess(res, "Allocations not available", allocations);
    } catch (error) {
      res.status(500).send({
        message:
          error.message || "Some error occurred while retrieving allocations",
      });
    }
  },

  generateInvoice: async (req, res) => {
    console.log("calling get invoice details");
    try {
      const { delivery_no, create_date, plant_id, company_code } = req.query;

      if (!delivery_no || !create_date || !plant_id || !company_code) {
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
        headers: {Authorization:`${sap_auth}`},
        data: newRequest,
      };

      axios
        .request(options)
        .then(async (response) => {
          const sapData = {};
          sapData.request = request;
          sapData.primaryData = response.data.response.invoice_no;
          sapData.response = response.data.response;
          sapData.type = "invoice";
          sapData.plant_id = plant_id;
          sapData.company_code = company_code;

          const new_invoice_log = new sap_logs(sapData);
          await new_invoice_log.save();

          if (new_invoice_log.response.flag !== "S") {
            return respondFailure(res, "Invoice creation failed", {
              request: request,
              response: new_invoice_log.response,
            });
          }

          const allocation_invoice = await so_allocation_generation.findOne({
            allocation_id: delivery_no,
          });

          const pallet_details = await so_allocation_generation.aggregate([
            { $match: { allocation_id: delivery_no } },
            { $unwind: "$item_details" },
            { $unwind: "$item_details.pallet_details" },
            {
              $group: {
                _id: "$item_details.pallet_details.pallet_id",
                pallet_id: { $first: "$item_details.pallet_details.pallet_id" },
              },
            },
            { $project: { _id: 0, pallet_id: 1 } },
          ]);

          // console.log("0801683096", "pallet_details");

          console.log(allocation_invoice);
          const invoiceData = {};
          invoiceData.allocation_id = delivery_no;
          invoiceData.plant_id = allocation_invoice.plant_id;
          invoiceData.company_code = allocation_invoice.company_code;
          invoiceData.invoice_no = new_invoice_log.response.invoice_no;
          invoiceData.create_date = create_date;
          invoiceData.company_code = allocation_invoice.company_code;
          invoiceData.customer_code = allocation_invoice.customer_code;
          invoiceData.delivery_date = allocation_invoice.delivery_date;
          invoiceData.sales_order_no = allocation_invoice.sales_order_no;
          invoiceData.route_id = allocation_invoice.route_id;
          invoiceData.pallet_details = pallet_details;
          const new_invoice_generation = new invoice_generation(invoiceData);
          await new_invoice_generation.save();

          await so_allocation_generation.updateMany(
            {
              allocation_id: delivery_no,
            },
            {
              $set: {
                invoice_id: new_invoice_generation._id,
                invoice_status: "success",
              },
            }
          );

          return respondSuccess(res, "Allocation invoice saved successfully", {
            request: request,
            response: new_invoice_log.response,
          });
        })
        .catch((error) => {
          console.log(error);

          res.status(500).send({
            message:
              error.message ||
              "Some error occurred while generating invoice allocation id",
          });
        });
    } catch (error) {
      console.log(error);
      res.status(500).send({
        message:
          error.message ||
          "Some error occurred while generating invoice allocation id",
      });
    }
  },
};
