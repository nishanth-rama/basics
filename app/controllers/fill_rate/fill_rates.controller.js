"use strict";

const db = require("../../models");
const moment = require("moment");
const purchesOrders = db.purchaseOrder;


exports.findAllFillRate = async (req, res) => {
  console.log("getting all fill rates from puchaseorders");

  try {
    let deliveryDate = req.query.delivery_date;
    let company_code = req.query.company_code;
    let plant_id = req.query.plant_id;
    let pageNo = parseInt(req.query.pageNo);
    let size = parseInt(req.query.size);
    if (!(deliveryDate && company_code && plant_id))
      return res.status(400).send({ message: "Missing Parameters" });
    let deliveryDateFormat = moment(new Date(deliveryDate)).format("YYYY-MM-DD");
    if (pageNo < 0 || pageNo === 0) {
      response = {
        error: true,
        message: "invalid page number, should start with 1",
      };
      return res.json(response);
    }
    let skip = size * (pageNo - 1);
    let limit = size;

    await purchesOrders
      .aggregate([
        {
          $match: {
            delivery_date: deliveryDateFormat,
            company_code: company_code,
            supplying_plant: plant_id
          },
        },
        {
          $lookup: {
            from: "rapid_grns",
            localField: "po_number",
            foreignField: "po_number",
            as: "grn",
          },
        },
        { $unwind: "$grn" },
        {
          $lookup: {
            from: "rapid_grn_items",
            localField: "po_number",
            foreignField: "purchase_order",
            as: "grn_info",
          },
        },
        {
          $project: {
            po_number: 1,
            vendor_no: 1,
            vendor_name: 1,
            "grn_info.quantity": 1,
            item: 1,
            "grn_info.material_no": 1,
            "grn.material_document_no": 1,
          },
        },
        {
          $facet: {
            metadata: [{ $count: "total" }],
            data: [{ $skip: skip }, { $limit: limit }],
          },
        },
      ])
      .then((result) => {
        console.log
        let formatResult = [];
        result[0].data.map((eachObject) => {
          if (eachObject.item.length !== 0 && eachObject.grn_info.length !== 0) {
            eachObject.item.map((eachItem) => {
              var fillRateObj = {},
                grn_quantity = "",
                grn_number = eachObject.grn.material_document_no || "";
              eachObject.grn_info.map((eachGrn) => {
                if (eachItem.material_no === eachGrn.material_no) {
                  grn_quantity = eachGrn.quantity;
                }
              });
              // calculating fill rate
              let fill_rate = (parseInt(grn_quantity) / parseInt(eachItem.quantity)) * 100;

              fillRateObj["vendor_code"] = eachObject.vendor_no;
              fillRateObj["vendor_name"] = eachObject.vendor_name;
              fillRateObj["po_number"] = eachObject.po_number;
              fillRateObj["grn_number"] = grn_number || "";
              fillRateObj["material_code"] = eachItem.material_no;
              fillRateObj["material_name"] = eachItem.material_description || "";
              fillRateObj["uom"] = eachItem.uom || "";
              fillRateObj["po_qty"] = (eachItem.quantity === "" ? "0" : eachItem.quantity);
              fillRateObj["grn_qty"] = (grn_quantity === "" ? "0" : grn_quantity);
              fillRateObj["fill_rate"] = (fill_rate.toFixed(1) === "NaN" ? 0 : fill_rate.toFixed(1)) + "%";
              formatResult.push(fillRateObj);
            });
          }
        });
        res.json({ message: "fill rate details", data: formatResult });
      })
      .catch((error) => {
        console.log(error);
      });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message: "Some error occurred while retrieving fill rate data.",
    });
  }
};
