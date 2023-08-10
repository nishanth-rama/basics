"use strict";

const e = require("express");
const { type } = require("express/lib/response");
const db = require("../../models");
const axios = require("axios");
const { sap_logs_model } = require("../../models");
const config = require("../../../ecosystem1.config");
const stopo = db.purchaseOrder;
const stoDetail = db.stoDetails;
const sap_grn_creation_logs = db.sap_logs_model;
const sap_url = process.env.SAP_URL;

// get all stopo details
exports.findAll = async (req, res) => {
  console.log("calling get stopo details..");

  const { page, po_document_type, delivery_date, plant_id, company_code } =
    req.query;
  try {
    if (!(po_document_type && delivery_date && plant_id && company_code))
      return res
        .status(400)
        .send({ message: "Please provide all required parameters" });

    let filter = {};

    if (po_document_type == "ALL") {
      filter = {
        company_code: company_code,
        shiping_plant: plant_id,
        delivery_date: delivery_date,
        po_document_type: { $in: ["ZWST", "ZWSI"] },
      };
    } else {
      filter = {
        company_code: company_code,
        shiping_plant: plant_id,
        po_document_type: po_document_type,
        delivery_date: delivery_date,
      };
    }
    // else
    //   return res.status(422).send({ message: "Wrong stopo document type!" });

    const totalDataCount = await stopo.find(filter).countDocuments();

    let stopoDetails = [];
    let serialNo = 0;

    if (!!page) {
      let skipCount = page == 1 ? 0 : +page * 25 - 25;
      let dataCount = +page * 25;
      serialNo = page == 1 ? 0 : page * 25 - 25;

      stopoDetails = await stopo
        .find(filter)
        .sort({ id: -1 })
        .skip(skipCount)
        .limit(dataCount);
    } else {
      stopoDetails = await stopo.find(filter).sort({ id: -1 });
    }

    let data = [];

    const addingSerialNo = (ele) => {
      data.push({
        serial_no: ++serialNo,
        id: ele._id,
        po_number: ele.po_number,
        po_document_type: ele.po_document_type,
        company_code: ele.company_code,
        vendor_no: ele.vendor_no,
        purchase_organisation: ele.purchase_organisation,
        purchase_group: ele.purchase_group,
        document_date: ele.document_date,
        delivery_date: ele.delivery_date,
        start_of_validity_period: ele.start_of_validity_period,
        end_of_validity_period: ele.end_of_validity_period,
        referance_no: ele.referance_no,
        updated_at: ele.updated_at,
        created_at: ele.created_at,
        api_response: ele.api_response,
        plant_id: ele.supplying_plant,
        shiping_plant: ele.shiping_plant,
        vendor_name: ele.vendor_name,
        isDeleted: ele.isDeleted,
        status: ele.status,
        createdAt: ele.createdAt,
        updatedAt: ele.updatedAt,
        // item: ele.item,
      });
    };

    stopoDetails.map(addingSerialNo);
    let mssge = "STOPO data is available";

    if (data.length == 0) mssge = "STOPO data is not available!";

    return res.send({
      message: mssge,
      totalDataCount: totalDataCount,
      data: data,
    });
  } catch (err) {
    return res.status(500).send({
      message: "Some error occurred while retrieving stopo details.",
    });
  }
};

exports.stoCreate = async (req, res) => {
  console.log("Getting request for sto creation!");
  const {
    company_code,
    purchase_order_no,
    due_date,
    shiping_point,
    item,
    plant_id,
  } = req.body;
  if (
    !(
      company_code &&
      purchase_order_no &&
      due_date &&
      shiping_point &&
      item &&
      plant_id
    )
  ) {
    return res.status(400).send({
      status_code: 400,
      message: "Missing parameter",
    });
  }

  if (item && item.length !== 0) {
    let requestBody = {
      purchase_order_no: purchase_order_no,
      due_date: due_date,
      shiping_point: shiping_point,
      item: item,
    };

    var options = {
      method: "post",
      url: `${sap_url}/sto_outbound_delivery`,
      // headers: { },
      data: { request: requestBody },
    };

    await axios.request(options).then(async (response) => {
      let responseData = response.data.response;
      let sapData = {};
      sapData.request = requestBody;
      sapData.response = responseData;
      sapData.company_code = company_code;
      sapData.primaryData = purchase_order_no;
      sapData.type = "Stock Transfer Out";
      sapData.plant_id = plant_id;
      const new_sap_grn_creation_logs = new sap_grn_creation_logs(sapData);
      await new_sap_grn_creation_logs.save();
      if (responseData && responseData.flag === "S") {
        const newStoRecord = new stoDetail({
          company_code: company_code,
          plant_id: plant_id,
          sto_po: purchase_order_no,
          sto_no: responseData.outbound_delivery_no || "",
          item: item,
          shiping_point: shiping_point,
        });

        await newStoRecord
          .save(newStoRecord)
          .then((data) => {
            return res.status(200).send({
              status_code: 200,
              message: "STO successfully created.",
              data: response.data,
            });
          })
          .catch((err) => {
            return res.status(500).send({
              status_code: 500,
              message: err.message || "STO creation failed.",
            });
          });
      } else {
        return res.status(400).send({
          status_code: 400,
          message: "STO creation failed",
          data: responseData,
        });
      }
    });
  } else {
    return res.status(404).send({
      status_code: 404,
      message: "Please provide item data",
    });
  }
};

exports.stopoItemDetails = async (req, res) => {
  console.log("calling get stopo item details api");
  const id = req.params.id;
  try {
    const itemDetails = await stopo.findById(id, {
      _id: 0,
      item: 1,
      po_number: 1,
    });

    let mssge = "STOPO item list is available";
    let itemList = [];

    if (itemDetails == null || itemDetails.item.length == 0) {
      mssge = "STOPO item list is not available!";
      itemList = [];
    } else {
      let stoData = await stoDetail
        .find({ sto_po: itemDetails.po_number })
        .select({ item: 1 });
      if (stoData.length !== 0) {
        stoData.map((eachData) => {
          if (eachData.item.length !== 0) {
            let includingItems = [];
            eachData.item.map((eachItemRecord) => {
              includingItems.push(eachItemRecord.item_no);
            });
            itemDetails.item.map((each) => {
              if (!includingItems.includes(each.item_no)) {
                itemList.push(each);
              }
            });
          }
        });
      } else {
        itemList = itemDetails.item;
      }
    }

    res.status(200).send({
      status_code: 200,
      message: mssge,
      data: itemList,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting STOPO item details list",
    });
  }
};

exports.getDocumentType = async (req, res) => {
  console.log("calling get stopo document type");
  const { company_code, plant_id, delivery_date } = req.query;

  try {
    if (!(company_code && plant_id && delivery_date))
      return res
        .status(400)
        .json({ message: "Provide all required parameters" });

    const getDocType = await stopo.find(
      {
        company_code: company_code,
        shiping_plant: plant_id,
       // shiping_plant: { $nin: ["", null] },
        delivery_date: delivery_date,
      },
      { _id: 0, po_document_type: 1 }
    );

    const uniqueObjects = [
      ...new Map(
        getDocType.map((type) => [type.po_document_type, type])
      ).values(),
    ];

    let mssge = "STOPO document type list is available";

    if (uniqueObjects.length == 0)
      mssge = "STOPO document type list is not available!";

    return res.send({
      status_code: 200,
      message: mssge,
      data: uniqueObjects,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting STOPO document type list",
    });
  }
};
