"use strict";

//npm
const db = require("../../models");
const _ = require("lodash");
const axios = require("axios").default;
const sap_url = process.env.SAP_URL;
const moment = require("moment");

// database
const so_allocation_detail_table = db.soAllocation;
const so_allocation_generation = db.soAllocationGenerate;
const sap_logs = db.sap_logs_model;
const invoice_generation = db.invoiceGenerate;

const { respondSuccess, respondFailure } = require("../../helpers/response");
const conn = require("../../../server.js");

const getListOfSo = async (req, res) => {
  console.log("Getting request for SO lists");
  let { company_code, plant_id, delivery_date } = req.query;
  if (!(plant_id && company_code && delivery_date))
    return respondFailure(
      res,
      "Please provide delivery_date company_code and plant_id"
    );
  let resMessage = "Sales order list found!";
  delivery_date = moment(delivery_date).format("YYYY-MM-DD");
  const query = {
    is_ready_for_invoice: true,
    plant_id: plant_id,
    delivery_date: delivery_date,
    allocation_detail: {
      $elemMatch: {
        allocation_status: "wait",
      },
    },
  };

  await so_allocation_detail_table
    .find(query)
    .select({ sales_order_no: 1 })
    .then(async (allocationData) => {
      if (_.isEmpty(allocationData))
        resMessage = "Sales order are not ready to invoice";
      let uniqueData = _.unionBy(allocationData, (each) => {
        return each.sales_order_no;
      });
      return res.status(200).send({
        status_code: 200,
        data: uniqueData,
        message: resMessage,
      });
    });
};

const autoInvoiceGenerate = async (req, res) => {
  console.log("Getting request for auto generate invoice");
  const session = await conn.startSession();
  try {
    session.startTransaction();
    const { sales_order_no, plant_id, company_code } = req.query;
    if (!(sales_order_no && plant_id && company_code))
      return respondFailure(res, "Please provide sales_order_number in params");
    let customer_code = "",
      delivery_date = "", id= "";
    await so_allocation_detail_table
      .find({ sales_order_no: sales_order_no })
      .then(async (allocationData) => {
        if (!allocationData) {
          return res.status(200).send({
            status_code: 200,
            message: "No ready to invoice generate record found!",
          });
        } else {
          let invoicesRequest = [];
          await allocationData.map((eachData) => {
            let so_data = {};
            customer_code = eachData.customer_code;
            delivery_date = eachData.delivery_date;
            so_data["sales_order_no"] = eachData.sales_order_no;
            so_data["delivery_date"] = eachData.delivery_date;
            so_data["shipping_point"] = plant_id;
            so_data["item"] = [];
            const indexOfItem = invoicesRequest.findIndex(
              (item) => item.sales_order_no === eachData.sales_order_no
            );
            const newData = {
              sales_order_item_no: eachData.item_no,
              delivery_quantity: 0,
              uom: eachData.uom,
            };
            if (indexOfItem === -1) {
              // not existing
              if (
                eachData.allocation_detail &&
                eachData.allocation_detail.length > 0
              ) {
                eachData.allocation_detail.map((eachAllocation) => {
                  console.log(eachAllocation);
                  if (eachAllocation.allocation_status === "wait") {
                    console.log(newData.delivery_quantity);
                    newData.delivery_quantity += eachAllocation.net_weight;
                  }
                });
                so_data.item.push(newData);
              }
              invoicesRequest.push(so_data);
            } else {
              if (
                eachData.allocation_detail &&
                eachData.allocation_detail.length > 0
              ) {
                eachData.allocation_detail.map((eachAllocation) => {
                  if (eachAllocation.allocation_status === "wait") {
                    newData.delivery_quantity += eachAllocation.net_weight;
                  }
                });
                invoicesRequest[indexOfItem].item.push(newData);
              }
            }
          });

          if (!_.isEmpty(invoicesRequest)) {
            let failed_item_no = [], success_item_no = [];
            let eachRequest = invoicesRequest[0];
              let newRequest = {};
              console.log(eachRequest);
              if (!eachRequest.item.length) {
                return respondSuccess(
                  res,
                  "No items available for allocation creation"
                );
              }
              newRequest.request = eachRequest;
              var options = {
                method: "post",
                url: `${sap_url}/Picking_Allocation_Creation`,
                data: newRequest,
              };

              await axios
                .request(options)
                .then(async (response) => {
                  const sapData = {};
                  sapData.request = eachRequest;
                  sapData.response = response.data.response;
                  sapData.primaryData = eachRequest.sales_order_no;
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

                  const salesItem = await so_allocation_detail_table.findOne({
                    sales_order_no: eachRequest.sales_order_no,
                  });
                  if (!salesItem) {
                    return res.status(404).send({
                      message: "Not found",
                    });
                  }
                  let delivery_no = new_sap_allocation_logs.response.delivery_no;
                  data.sales_order_no = salesItem.sales_order_no;
                  data.allocation_id = delivery_no;
                  data.so_id = salesItem._id;
                  data.plant_id = salesItem.plant_id;
                  data.delivery_date = salesItem.delivery_date;
                  data.company_code = salesItem.company_code;
                  data.customer_code = salesItem.customer_code;
                  data.customer_name = salesItem.customer_name;
                  data.route_id = salesItem.route_id;
                  const new_so_allocation_generation = new so_allocation_generation(data);
                  await new_so_allocation_generation.save();
                  eachRequest.item.map(async (insertItem) => {
                    const salesItemQty = await so_allocation_detail_table.findOne(
                      {
                        sales_order_no: eachRequest.sales_order_no,
                        item_no: insertItem.sales_order_item_no,
                      }
                    );

                    const item_details = {
                      item_no: insertItem.sales_order_item_no,
                      quantity: insertItem.delivery_quantity,
                      so_qty: salesItemQty.order_qty,
                      material_no: salesItemQty.material_no,
                      material_name: salesItemQty.material_name,
                    };

                    id = new_so_allocation_generation._id;

                    await so_allocation_generation.updateOne(
                      {
                        _id: new_so_allocation_generation._id,
                      },
                      {
                        $push: { item_details: item_details },
                      },
                      {
                        session,
                      }
                    );

                    await salesItemQty.allocation_detail.map(async (newData) => {
                      await so_allocation_detail_table.updateOne(
                        {
                          "allocation_detail._id": newData._id,
                        },
                        {
                          $set: {
                            "allocation_detail.$.allocation_status": "success",
                          },
                        }
                      );
                    });
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
                    await axios
                      .request(options)
                      .then(async (response) => {
                        console.log(response);
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
                          return respondFailure(
                            res,
                            "Invoice creation failed",
                            {
                              request: request,
                              response: new_invoice_log.response,
                            }
                          );
                        }

                        const allocation_invoice = await so_allocation_generation.findOne({ allocation_id: delivery_no });
                        console.log(allocation_invoice);
                        const invoiceData = {};
                        invoiceData.allocation_id = delivery_no;
                        invoiceData.plant_id = allocation_invoice.plant_id;
                        invoiceData.company_code = allocation_invoice.company_code;
                        invoiceData.invoice_no = new_invoice_log.response.invoice_no;
                        invoiceData.create_date = Date.now();
                        invoiceData.company_code = allocation_invoice.company_code;
                        invoiceData.customer_code = allocation_invoice.customer_code;
                        invoiceData.delivery_date = allocation_invoice.delivery_date;
                        invoiceData.sales_order_no = allocation_invoice.sales_order_no;
                        invoiceData.route_id = allocation_invoice.route_id;
                        const new_invoice_generation = new invoice_generation(invoiceData);
                        await new_invoice_generation.save();

                        await so_allocation_generation
                          .findOne({ allocation_id: delivery_no })
                          .then(async (data) => {
                            console.log(data);
                            if (data) {
                              console.log(data);
                              await so_allocation_generation.updateMany(
                                {
                                  allocation_id: delivery_no,
                                },
                                {
                                  $set: {
                                    invoice_id: id,
                                    invoice_no: new_invoice_log.response.invoice_no,
                                    invoice_status: "success",
                                  },
                                }
                              );
                            }
                          });
                          success_item_no.push(insertItem.sales_order_item_no);
                      })
                      .catch((error) => {
                        failed_item_no.push(insertItem.sales_order_item_no);
                        console.log(
                          `error while doing invoice creation for allocation id ${delivery_no} with ${error}`
                        );
                      });
                  });
                  await session.commitTransaction();
                  return respondSuccess(
                    res,
                    "Allocation invoice saved successfully"
                  );
                })
                .catch(async function (error) {
                  console.error(error);
                  await session.abortTransaction();
                  res.status(500).send({
                    message:
                      error.message ||
                      "Some error occurred while generating allocation id",
                  });
                });
          } else {
            res.status(200).send({
              status_code: 200,
              message: "No so is in ready for invoice status!",
            });
          }
        }
      });
  } catch (err) {
    return respondFailure(res, err || "Something went wrong");
  }
};

module.exports = {
  autoInvoiceGenerate,
  getListOfSo,
};
