"use strict";

const axios = require("axios");
const { company } = require("../../models");
const base_url = process.env.BASE_URL;
const db = require("../../models");
const { findOne } = require("../master/crate.controller");
const asnDetailsColl = db.asnDetails;
const purchase_order_table = db.purchaseOrder;
const sap_url = process.env.SAP_URL;
const new_sap_url = process.env.New_SAP_URL;
const sap_auth = process.env.SAP_AUTH;




exports.save_asn_details = async (req, res) => {
  console.log("calling save asn details api");
  const { company_code, plant_id, created_date } = req.body;
  try {
    if (!(company_code && plant_id && created_date))
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    await axios
      .request({
        method: "get",
        url: `${sap_url}/inbound_delivery_get`,
        headers: { Authorization: `${sap_auth}`},
        data: JSON.stringify({
          request: {
            company_code: company_code,
            plant: plant_id,
            purchase_document: "",
            vendor: "",
            created_on: created_date,
            material: "",
          },
        }),
      })
      .then(async (result) => {
        if (result.data != "") {
          const po_no_list = result.data.response.map((no) => {
            return no.po_number;
          });

          const checkDataAlreadyInserted = await asnDetailsColl.find({
            company_code: result.data.response[0].company_code,
            po_date: result.data.response[0].po_date,
            po_number: { $in: po_no_list },
          });

          if (checkDataAlreadyInserted.length == 0) {
            //storing asn details here
            await asnDetailsColl.create(result.data.response);

            return res.send({
              status_code: 200,
              message: "asn details saved successfully",
            });
          } else {
            await asnDetailsColl.deleteMany({
              company_code: result.data.response[0].company_code,
              po_date: result.data.response[0].po_date,
              po_number: { $in: po_no_list },
            });

            await asnDetailsColl.create(result.data.response);

            return res.send({
              status_code: 200,
              message: "asn details updated successfully",
            });
          }
        } else
          return res.send({
            status_code: 404,
            message: "No data received to save!",
          });
      })
      .catch((error) => {
        console.log("--------------------------------",error.message);
        res.status(500).send({
          status_code: "500",
          message:
            "Some error occurred while receiving and saving asn details!",
        });
      });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      status_code: "500",
      message: "Some error occurred while receiving and saving asn details!",
    });
  }
};

exports.save_asn_details_v2 = async (req, res) => {
  console.log("calling save asn details api");
  const { company_code, plant_id, created_date } = req.body;
  try {
    if (!(company_code && plant_id && created_date))
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    await axios
      .request({
        method: "get",
        url: `${new_sap_url}/inbound_delivery_get`,
        headers: { },
        data: JSON.stringify({
          request: {
            company_code: company_code,
            plant: plant_id,
            purchase_document: "",
            vendor: "",
            created_on: created_date,
            material: "",
          },
        }),
      })
      .then(async (result) => {
        //console.log("result",result.data);
        if (result.data && result.data.response.length) {
          //console.log("entered");
          const po_no_list = result.data.response.map((no) => {
            return no.po_number;
          });

          const checkDataAlreadyInserted = await asnDetailsColl.find({
            company_code: result.data.response[0].company_code,
            po_date: result.data.response[0].po_date,
            po_number: { $in: po_no_list },
          });

          if (checkDataAlreadyInserted.length == 0) {
            //storing asn details here
            await asnDetailsColl.create(result.data.response);

            return res.send({
              status_code: 200,
              message: "asn details saved successfully",
            });
          } else {
            await asnDetailsColl.deleteMany({
              company_code: result.data.response[0].company_code,
              po_date: result.data.response[0].po_date,
              po_number: { $in: po_no_list },
            });

            await asnDetailsColl.create(result.data.response);

            return res.send({
              status_code: 200,
              message: "asn details updated successfully",
            });
          }
        } else
          return res.send({
            status_code: 404,
            message: "No data received to save!",
          });
      })
      .catch((error) => {
        console.log("--------------------------------",error);
        res.status(500).send({
          status_code: "500",
          message:
            error.message || "Some error occurred while receiving and saving asn details!",
        });
      });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      status_code: "500",
      message: "Some error occurred while receiving and saving asn details!",
    });
  }
};

exports.getAsnDetailsBasedOnPoNo = async (req, res) => {
  console.log("calling get po based asn details api");
  const { company_code, po_number } = req.query;
  try {
    if (!(company_code && po_number))
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    const getDetails = await asnDetailsColl.aggregate([
      {
        $match: {
          company_code: company_code,
          po_number: po_number,
        },
      },
      { $unwind: "$item" },
      {
        $project: {
          _id: 0,
          "item.inbound_delivery_number": 1,
          "item.inbound_delivery_item_no": 1,
          "item.inbound_delivery_qty": 1,
          "item.inbound_delivery_date": 1,
          "item.inbound_delivery_time": 1,
        },
      },
    ]);

    let mssge = "asn details available";
    let status = 200;
    let data = [];

    if (getDetails.length == 0) {
      mssge = "asn details not available!";
      status = 404;
    } else
      data = getDetails.map((data) => {
        return {
          inbound_delivery_number: data.item.inbound_delivery_number,
          inbound_delivery_item_no: data.item.inbound_delivery_item_no,
          inbound_delivery_qty: data.item.inbound_delivery_qty,
          inbound_delivery_date: data.item.inbound_delivery_date,
          inbound_delivery_time: data.item.inbound_delivery_time,
        };
      });

    return res.send({ status_code: status, message: mssge, data: data });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting po based asn details!",
    });
  }
};

exports.getAsnDetailsBasedOnPoNoV2 = async (req, res) => {
  console.log("calling get po based asn details api");
  const { company_code, po_number, asn_number } = req.query;
  try {
    if (!(company_code && po_number && asn_number))
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    const getDetails = await asnDetailsColl.aggregate([
      {
        $match: {
          company_code: company_code,
          po_number: po_number,
        },
      },
      { $unwind: "$item" },
      {
        $match: {
          "item.inbound_delivery_number": asn_number
        }
      },
      {
        $project: {
          _id: 0,
          // "item.inbound_delivery_number": 1,
          // "item.inbound_delivery_item_no": 1,
          // "item.inbound_delivery_qty": 1,
          // "item.inbound_delivery_date": 1,
          // "item.inbound_delivery_time": 1,
          item: 1
        },
      },
    ]);

    let mssge = "asn details available";
    let status = 200;
    let final_data = [];

    if (getDetails.length == 0) {
      mssge = "asn details not available!";
      status = 404;
    } else {
      var temp_data = getDetails.map(async (data) => {
        let po_details = await purchase_order_table.aggregate([
          {
            $match: {
              po_number: po_number,
              company_code: company_code
            }

          },
          {
            $unwind: "$item"
          },
          {
            $match: {
              "item.item_no": data.item.po_item
            }
          }
        ])

        // console.log("data", data, po_details);
        final_data.push({
          inbound_delivery_number: data.item.inbound_delivery_number,
          inbound_delivery_item_no: data.item.inbound_delivery_item_no,
          inbound_item_code: data.item.material,
          inbound_item_description: data.item.material_description,
          inbound_delivery_qty: data.item.inbound_delivery_qty,
          inbound_delivery_date: data.item.inbound_delivery_date,
          inbound_delivery_time: data.item.inbound_delivery_time,
          uom: po_details[0].item.uom,
          purchase_group: po_details[0].purchase_group,
          po_item_no: data.item.po_item,
          po_order_qty: po_details[0].item.quantity
        });
      });

      await Promise.all(temp_data);
    }
    return res.send({ status_code: status, message: mssge, data: final_data });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting po based asn details!",
    });
  }
};

exports.getAsnNumBasedOnPo = async (req, res) => {
  console.log("calling get po based asn num api");
  const { company_code, po_number } = req.query;
  try {
    if (!(company_code && po_number))
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    const getDetails = await asnDetailsColl.aggregate([
      {
        $match: {
          company_code: company_code,
          po_number: po_number
        },
      },
      { $unwind: "$item" },
      { $match: { "item.inbound_delivery_number": { $exists: true } } },
      {
        $group: {
          _id: "$item.inbound_delivery_number",
        },
      },
      { $sort: { _id: 1 } },
    ]);

    let mssge = "ASN number list is available";
    let status = 200;
    let data = [];
    // console.log("getDetails",getDetails);

    if (getDetails.length == 0) {
      mssge = "ASN number list not found!";
      status = 404;
    } else
      data = getDetails.map((no) => {
        return {
          inbound_delivery_number: no._id,
        };
      });

    return res
      .status(status)
      .send({ status_code: status, message: mssge, data: data });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting po based asn number list!",
    });
  }
};
