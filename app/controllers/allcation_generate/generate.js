"use strict";

// npm
const db = require("../../models");
const _ = require("lodash");
const axios = require("axios").default;
const sap_url = process.env.SAP_URL;
const sap_auth = process.env.SAP_AUTH;


// database
const so_allocation_detail_table = db.soAllocation;
const so_allocation_generation = db.soAllocationGenerate;
const sap_logs = db.sap_logs_model;

// helpers
const { respondSuccess, respondFailure } = require("../../helpers/response");
// const localesKeys = require('../../locale/key.json');
// const constValues = require('../../helpers/constant');

module.exports = {
  getAllCustomer: async (req, res) => {
    try {
      const { company_code, delivery_date, plant_id } = req.query;
      if (!(company_code, delivery_date, plant_id)) {
        return res
          .status(400)
          .send({ status_code: "400", message: "Missing parameter." });
      }

      const customers = await so_allocation_detail_table
        .find({ plant_id, company_code, delivery_date })
        .select("customer_name customer_code -_id")
        .sort("customer_name");
      console.log("customers", customers);

      const newCustomerList = _.uniqBy(customers, "customer_code");

      if (newCustomerList.length) {
        return respondSuccess(res, "Customers available", newCustomerList);
        // return respondSuccess(res, req.__(localesKeys.generate.CUSTOMER_AVAILABLE, 'en'), constValues.StatusCode.OK, newCustomerList);
      }
      return respondSuccess(res, "Customers not available", newCustomerList);
      // console.log('data', (localesKeys.generate.CUSTOMER_AVAILABLE, 'en'), constValues.StatusCode.OK, newCustomerList);
      // return respondSuccess(res, req.__(localesKeys.generate.CUSTOyMER_AVAILABLE, 'en'), constValues.StatusCode.OK, newCustomerList);
    } catch (error) {
      res.status(500).send({
        message:
          error.message || "Some error occurred while retrieving customer_list",
      });
    }
  },

  getCustomerSalesOrder: async (req, res) => {
    try {
      const { plant_id, company_code, delivery_date, customer_code } =
        req.query;

      if (!(plant_id, company_code, delivery_date, customer_code)) {
        return res
          .status(400)
          .send({ status_code: "400", message: "Missing parameter." });
      }

      const salesOrders = await so_allocation_detail_table.aggregate([
        {
          $match: {
            company_code: company_code,
            customer_code: customer_code,
            delivery_date: delivery_date,
            plant_id: plant_id,
          },
        },
        {
          $group: {
            _id: "$customer_code",
            customer_name: { $first: "$customer_name" },
            sales_order: { $push: { sales_order_no: "$sales_order_no" } },
          },
        },
      ]);

      if (salesOrders.length) {
        const salesOrder = _.uniqBy(
          salesOrders[0].sales_order,
          "sales_order_no"
        );
        const updatedSalesOrder = {
          customer_code: salesOrders[0]._id,
          customer_name: salesOrders[0].customer_name,
          company_code: company_code,
          sales_order: salesOrder,
        };
        return respondSuccess(res, "Sales order available", updatedSalesOrder);
      }
      return respondSuccess(res, "Sales order not available", salesOrders[0]);
    } catch (error) {
      res.status(500).send({
        message:
          error.message || "Some error occurred while retrieving sales orders",
      });
    }
  },

  getCustomerSalesItems: async (req, res) => {
    try {
      const {
        plant_id,
        delivery_date,
        customer_code,
        sales_order_no,
        company_code,
      } = req.query;
      if (
        !(plant_id, company_code, delivery_date, customer_code, sales_order_no)
      ) {
        return res
          .status(400)
          .send({ status_code: "400", message: "Missing parameter." });
      }

      const salesItems = await so_allocation_detail_table
        .find({
          customer_code,
          sales_order_no,
          plant_id,
          delivery_date,
        })
        .select(
          "entry_time sales_order_no item_no material_name material_no allocated_qty so_qty delivery_date plant_id customer_code customer_name sales_document_type uom sales_order_no order_qty plant_id"
        )
        .sort({ item_no: 1 })
        .lean();

      const newSales = salesItems.map(async (data) => {
        // const allocation_data = await so_allocation_generation.find({
        //     sales_order_no,
        //     'item_details.item_no': data.item_no,
        // });
        // console.log('hhhhh', allocation_data)

        const pallet_details = await so_allocation_detail_table.aggregate([
          { $match: { sales_order_no, item_no: data.item_no } },
          {$unwind: "$allocation_detail"},
          {$match: {"allocation_detail.allocation_status": "wait"}},
          {$group: {_id: "$allocation_detail.pallet_barcode",pallet_id: {$first: "$allocation_detail.pallet_barcode"}}},
          {$project: {_id:0,pallet_id:1}}
        ]);
        const salesItemQty = await so_allocation_detail_table.findOne({
          sales_order_no,
          item_no: data.item_no,
        });
        const salesItem = await so_allocation_detail_table.aggregate([
          {
            $unwind: {
              path: "$allocation_detail",
            },
          },
          {
            $match: {
              sales_order_no,
              item_no: data.item_no,
              "allocation_detail.allocation_status": "wait",
            },
          },
          {
            $group: {
              _id: {
                sales_order_no,
                item_no: data.item_no,
                // 'allocation_detail.allocation_status': 'wait',
              },
              // allocated_qty: 1,
              total_qty: {
                $sum: "$allocation_detail.net_weight",
              },
            },
          },
        ]);
        const salesItemSuccess = await so_allocation_detail_table.aggregate([
          {
            $unwind: {
              path: "$allocation_detail",
            },
          },
          {
            $match: {
              sales_order_no,
              item_no: data.item_no,
              "allocation_detail.allocation_status": "success",
            },
          },
          {
            $group: {
              _id: {
                sales_order_no,
                item_no: data.item_no,
                // 'allocation_detail.allocation_status': 'success',
              },
              // allocated_qty: 1,
              total_qty: {
                $sum: "$allocation_detail.net_weight",
              },
            },
          },
        ]);
        console.log("newData", salesItem, salesItemSuccess);
        // const allocation_data = await so_allocation_generation.find({
        //     sales_order_no, item_no: data.item_no,
        // });
        let ap_qty = 0;
        let ap_pending_qty = 0;
        console.log("----------", salesItemQty.allocation_detail.length);
        if (salesItemQty.allocation_detail.length) {
          console.log("checked");
          if (salesItemSuccess.length) {
            ap_qty = salesItemSuccess[0].total_qty;
          }
          if (salesItem.length) {
            ap_pending_qty = salesItem[0].total_qty;
          }
        }
        data.pallet_details = pallet_details;
        data.ap_qty = +ap_qty.toFixed(2);
        data.ap_pending_qty = +ap_pending_qty.toFixed(2);
        data.quantity = +ap_pending_qty.toFixed(2);

        console.log("data", data);
        return data;
      });
      const sales_items = await Promise.all(newSales);

      if (sales_items.length) {
        return respondSuccess(res, "Sales items available", sales_items);
      }
      return respondSuccess(res, "Sales items not available", []);
    } catch (error) {
      res.status(500).send({
        message:
          error.message ||
          "Some error occurred while retrieving sales orders details",
      });
    }
  },

  // {
  //     "request": {
  //         "sales_order_no": "0002000251",
  //         "delivery_date": "2021-03-12",
  //         "shipping_point": "200",
  //         "item": [
  //             {
  //                 "sales_order_item_no": "10",
  //                 "delivery_quantity": "10",
  //                 "uom": "EA"
  //             },
  //             {
  //                 "sales_order_item_no": "20",
  //                 "delivery_quantity": "5",
  //                 "uom": "PAC"
  //             }
  //         ]
  //     }
  // }
  generateAllocationId: async (req, res) => {
    try {
      const {
        delivery_date,
        shipping_point,
        sales_order_no,
        itemDetails,
        plant_id,
        company_code,
      } = req.query;
      if (
        !delivery_date ||
        !shipping_point ||
        !sales_order_no ||
        !itemDetails ||
        !plant_id ||
        !company_code
      ) {
        return res.status(400).send({
          status_code: "400",
          message: "Missing parameter.",
        });
      }

      if (!itemDetails.length) {
        return respondSuccess(
          res,
          "No items available for allocation creation"
        );
      }
      const salesOrders = await so_allocation_detail_table.findOne({
        sales_order_no: sales_order_no,
      });
      // console.log(salesOrders);
      const newRequest = {};
      const request = {
        sales_order_no: sales_order_no,
        delivery_date: delivery_date,
        shipping_point: shipping_point,
        item: [],
      };
      const newBarcode = [];
      // var data = "10_20_KG__20_40_KG";
      // var trimArr = itemDetails.trim("__");
      // console.log(trimArr)
      var myNewArr = itemDetails.split("__");
      console.log(myNewArr);
      for (let i = 0; i < myNewArr.length; i++) {
        var singleArr = myNewArr[i].split("_");
        console.log(singleArr);
        if (
          singleArr[0] !== "" ||
          singleArr[1] !== undefined ||
          singleArr[2] !== undefined
        ) {
          if (Number(singleArr[1]) !== 0) {
            const newData = {
              sales_order_item_no: singleArr[0],
              delivery_quantity: singleArr[1],
              uom: singleArr[2],
            };
            request.item.push(newData);
          }
        }
      }
      console.log(request);
      if (!request.item.length) {
        return respondSuccess(
          res,
          "No items available for allocation creation"
        );
      }
      newRequest.request = request;
      var options = {
        method: "post",
        url: `${sap_url}/Picking_Allocation_Creation`,
        headers: {Authorization:`${sap_auth}`},
        // url: 'https://www.google.com/',
        data: newRequest,
      };

      axios
        .request(options)
        .then(async (response) => {
          const sapData = {};
          sapData.request = request;
          sapData.response = response.data.response;
          // sapData.response = {
          //     allocation_id: alloc_id,
          // };
          sapData.primaryData = sales_order_no;
          sapData.company_code = company_code;
          sapData.type = "allocation";
          sapData.plant_id = plant_id;
          const new_sap_allocation_logs = new sap_logs(sapData);
          await new_sap_allocation_logs.save();

          let data = {};

          if (new_sap_allocation_logs.response.flag !== "S") {
            return respondFailure(
              res,
              "Allocation creation failed",
              response.data.response
            );
          }

          console.log(new_sap_allocation_logs.response);
          const salesItem = await so_allocation_detail_table.findOne({
            sales_order_no,
            // item_no: insertItem.sales_order_item_no,
          });
          if (!salesItem) {
            res.status(404).send({
              message: "Not found",
            });
          }

          data.sales_order_no = sales_order_no;
          data.allocation_id = new_sap_allocation_logs.response.delivery_no;
          data.so_id = salesItem._id;
          data.plant_id = salesItem.plant_id;
          data.delivery_date = delivery_date;
          data.company_code = salesOrders.company_code;
          data.customer_code = salesOrders.customer_code;
          data.customer_name = salesOrders.customer_name;
          data.route_id = salesOrders.route_id;
          const new_so_allocation_generation = new so_allocation_generation(
            data
          );
          await new_so_allocation_generation.save();

          // let ap_qty = 0;
          // let ap_pending_qty = 0;

          request.item.map(async (insertItem) => {
            console.log("----------=", insertItem);

            const pallet_details = await so_allocation_detail_table.aggregate([
              { $match: { sales_order_no, item_no: insertItem.sales_order_item_no } },
              {$unwind: "$allocation_detail"},
              {$match: {"allocation_detail.allocation_status": "wait"}},
              {$group: {_id: "$allocation_detail.pallet_barcode",pallet_id: {$first: "$allocation_detail.pallet_barcode"}}},
              {$project: {_id:0,pallet_id:1}}
            ]);

            const allocation_data = await so_allocation_generation.find({
              sales_order_no,
              item_no: insertItem.sales_order_item_no,
            });
            const salesItemQty = await so_allocation_detail_table.findOne({
              sales_order_no,
              item_no: insertItem.sales_order_item_no,
            });
            console.log("-----", salesItemQty);

            // console.log(salesItemQty.allocated_qty, ap_pending_qty)
            const item_details = {
              item_no: insertItem.sales_order_item_no,
              quantity: insertItem.delivery_quantity,
              so_qty: salesItemQty.order_qty,
              material_no: salesItemQty.material_no,
              material_name: salesItemQty.material_name,
              pallet_details: pallet_details
            };

            await so_allocation_generation.updateOne(
              {
                _id: new_so_allocation_generation._id,
              },
              {
                $push: { item_details: item_details },
              }
            );

            // await so_allocation_detail_table.updateOne({
            //     _id: salesItemQty._id,
            // }, {
            //     $set: { 'allocation_detail.allocation_status': item_details },
            // })
            console.log(salesItemQty.allocation_detail);
            salesItemQty.allocation_detail.map(async (newData) => {
              console.log(newData._id);
              await so_allocation_detail_table.updateOne(
                {
                  "allocation_detail._id": newData._id,
                },
                {
                  $set: { "allocation_detail.$.allocation_status": "success" },
                }
              );
              return newData;
            });

            return insertItem;
          });

          return respondSuccess(res, "Allocation id generated successfully");
          // {
          //     request: request, response: new_sap_allocation_logs.response
          // });
        })
        .catch(function (error) {
          console.error(error);
          res.status(500).send({
            message:
              error.message ||
              "Some error occurred while generating allocation id",
          });
        });
    } catch (error) {
      res.status(500).send({
        message:
          error.message || "Some error occurred while generating allocation id",
      });
    }
  },

  getAllocationsByDate: async (req, res) => {
    try {
      const { delivery_date, plant_id, company_code } = req.query;
      if (!(delivery_date, plant_id, company_code)) {
        return res.status(400).send({
          status_code: "400",
          message: "Missing parameter.",
        });
      }

      const allocations = await so_allocation_generation
        .find({ delivery_date, plant_id, company_code })
        .select(
          "sales_order_no plant_id delivery_date customer_code customer_name company_code invoice_id invoice_status allocation_id"
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

  getAllocationItemDetails: async (req, res) => {
    console.log("calling get allocation item details api");
    try {
      const { delivery_date, plant_id, company_code, id } = req.query;
      if (!(delivery_date, plant_id, company_code, id)) {
        return res.status(400).send({
          status_code: "400",
          message: "Missing parameter.",
        });
      }

      const allocation_items = await so_allocation_generation
        .findOne({ _id: id, delivery_date, plant_id, company_code })
        .select("item_details")
        .lean();

      if (allocation_items.item_details.length) {
        // console.log(allocation_items);

        return respondSuccess(
          res,
          "Allocation items are available",
          allocation_items
        );
      }

      return respondSuccess(
        res,
        "Allocation items are not available",
        allocation_items
      );
    } catch (error) {
      res.status(500).send({
        message:
          error.message || "Some error occurred while retrieving allocations",
      });
    }
  },
};
