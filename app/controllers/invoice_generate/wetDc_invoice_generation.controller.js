const db = require("../../models");
const axios = require("axios").default;
const sap_url = process.env.SAP_URL;
const sap_auth = process.env.SAP_AUTH;
const new_sap_url = process.env.NEW_SAP_URL;

const files_url_details_table = db.files_url_details;
const sales_order_allocation_table = db.soAllocation;
const so_allocation_generation = db.soAllocationGenerate;
const sap_logs = db.sap_logs_model;
const invoice_generation = db.invoiceGenerate;
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const html_to_pdf = require("html-pdf-node");
const moment_tz = require("moment-timezone");




// invoice overview
exports.get_invoice_overview = async (req, res) => {
  try {
    var { company_code, plant_id, delivery_date } = req.query;

    if (!(company_code && plant_id && delivery_date)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    let invoice_overview = await sales_order_allocation_table.aggregate([
      {
        $match: {
          company_code,
          plant_id,
          delivery_date,
          // allocated_qty:{$gt:0}
        },
      },
      {
        $group: {
          _id: "$sales_order_no",
          so_no: { $first: "$sales_order_no" },
        },
      },
      {
        $lookup: {
          from: "rapid_sales_order_allocation_generate",
          localField: "so_no",
          foreignField: "sales_order_no",
          pipeline: [
            {
              $project: {
                _id: 0,
                allocation_id: "$allocation_id",
                invoice_status: "$invoice_status",
              },
            },
          ],
          as: "invoice_detail",
        },
      },
      // {
      //     $addFileds:{

      //     }
      // },
      {
        $project: {
          _id: 0,
          so_no: "$so_no",
          // invoice_detail:"$invoice_detail",
          delivery_no_count: { $size: "$invoice_detail" },
          invoice_no_count: {
            $size: {
              $filter: {
                input: "$invoice_detail",
                as: "item",
                cond: {
                  $eq: ["$$item.invoice_status", "success"],
                },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          so_count: { $sum: 1 },
          delivery_count: {
            $sum: "$delivery_no_count",
          },
          invoice_count: {
            $sum: "$invoice_no_count",
          },
        },
      },
      {
        $project: {
          _id: 0,
          so_count: "$so_count",
          delivery_no_generated: "$delivery_count",
          invoice_generated: "$invoice_count",
          invoice_pending: {
            $subtract: ["$delivery_count", "$invoice_count"],
          },
        },
      },
    ]);

    if (invoice_overview.length) {
      return res.status(200).send({
        status_code: 200,
        message: "Invoice Overview!",
        data: invoice_overview[0],
      });
    } else {
      return res
        .status(400)
        .send({ status_code: 400, message: "No sales order found!" });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message ||
        "Some error occurred while retrieving sales order allocation.",
    });
  }
};

// listing customer type of sos if  allocaiton id is generated
exports.get_customer_type_list = async (req, res) => {
  try {
    var { company_code, plant_id, delivery_date } = req.query;

    if (!(company_code && plant_id && delivery_date)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    let invoice_customer_type = await sales_order_allocation_table.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          // allocated_qty:{$gt:0},
          delivery_posted_qty: { $gt: 0 },
        },
      },
      // {
      //     $group :{
      //         _id:"$sales_order_no",
      //         so_no:{$first:"$sales_order_no"},
      //         distribution_channel:{$first:"$distribution_channel"},
      //         distribution_channel_description:{$first:"$distribution_channel_description"},
      //     }
      // },
      // {
      //     $lookup :{
      //         from:"rapid_sales_order_allocation_generate",
      //         localField:"so_no",
      //         foreignField:"sales_order_no",
      //         as :"delivery_no_detail"
      //     }
      // },
      // {
      //     $match :{
      //         delivery_no_detail:{$ne:[]}
      //     }
      // },
      {
        $group: {
          _id: "$distribution_channel",
          distribution_channel: { $first: "$distribution_channel" },
          distribution_channel_description: {
            $first: "$distribution_channel_description",
          },
        },
      },
      {
        $project: {
          _id: 0,
          customer_type: "$distribution_channel_description",
          customer_type_code: "$distribution_channel",
        },
      },
      {
        $sort: {
          customer_type_code: 1,
        },
      },
    ]);

    if (invoice_customer_type.length) {
      return res.status(200).send({
        status_code: 200,
        message: "Customer type list!",
        data: invoice_customer_type,
      });
    } else {
      return res
        .status(400)
        .send({ status_code: 400, message: "Customer type not available!" });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message ||
        "Some error occurred while retrieving sales order allocation.",
    });
  }
};

exports.get_route_list = async (req, res) => {
  try {
    var { company_code, plant_id, delivery_date, customer_type } = req.query;

    if (!(company_code && plant_id && delivery_date && customer_type)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    let invoice_route_list = await sales_order_allocation_table.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          distribution_channel: customer_type,
          allocated_qty: { $gt: 0 },
          // $expr :{
          //         $gt:["$allocated_qty","$delivery_posted_qty"]
          // },
          delivery_posted_qty: { $gt: 0 },
          route_id: { $ne: "" },
        },
      },
      {
        $group: {
          _id: "$route_id",
          route_id: { $first: "$route_id" },
          // distribution_channel_description:{$first:"$distribution_channel_description"}
        },
      },
      {
        $project: {
          _id: 0,
          route_id: "$route_id",
        },
      },
      {
        $sort: {
          route_id: 1,
        },
      },
    ]);

    if (invoice_route_list.length) {
      return res.send({
        status_code: 200,
        message: "Route list!",
        data: invoice_route_list,
      });
    } else {
      return res
        .status(400)
        .send({ status_code: 400, message: "Route not available!" });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message ||
        "Some error occurred while retrieving sales order allocation.",
    });
  }
};

exports.get_so_list = async (req, res) => {
  
  try {
    var {
      type,
      company_code,
      plant_id,
      delivery_date,
      customer_type,
      route_id,
    } = req.query;

    if (
      !(
        type &&
        company_code &&
        plant_id &&
        delivery_date &&
        customer_type &&
        route_id
      )
    ) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    if (type == "completed") {
      var status_array = ["Completed", "Synch IRN"];
    } else {
      var status_array = ["Pending", "Failed"];
    }

    console.log("type", type);

    let invoice_so_list = await sales_order_allocation_table.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          // allocated_qty:{$gt:0},
          distribution_channel: customer_type,
          route_id: route_id,
          delivery_posted_qty: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: "$sales_order_no",
          so_no: { $first: "$sales_order_no" },
          customer_name: { $first: "$customer_name" },
          route_id: { $first: "$route_id" },
          delivery_date: { $first: "$delivery_date" },
          distribution_channel_description: {
            $first: "$distribution_channel_description",
          },
        },
      },
      {
        $lookup: {
          from: "rapid_sales_order_allocation_generate",
          localField: "so_no",
          foreignField: "sales_order_no",
          let: {
            customer_name: "$customer_name",
            route_id: "$route_id",
            distribution_channel_description:
              "$distribution_channel_description",
          },
          pipeline: [
            {
              $lookup: {
                from: "rapid_allocation_invoice_details",
                localField: "invoice_id",
                foreignField: "_id",
                // let:{invoice_num:"$invoice_no"},
                pipeline: [
                  {
                    $lookup: {
                      from: "invoicemasters",
                      localField: "invoice_no",
                      foreignField: "invoiceDetails.invoiceNo",
                      pipeline: [
                        {
                          $addFields: {
                            payer_id: {
                              $convert: {
                                input: "$invoiceDetails.payer",
                                to: "double",
                                onError: "",
                              },
                            },
                            // payer_id: { $toInt: "$invoiceDetails.payer" },
                          },
                        },
                        {
                          $lookup: {
                            from: "customers",
                            localField: "payer_id",
                            // localField: "0001000024",
                            foreignField: "goFrugalId",
                            pipeline: [
                              {
                                $project: {
                                  goFrugalId: 1,
                                  sap_customer_no: 1,
                                  gstNumber: 1,
                                },
                              },
                            ],
                            as: "payer_detail",
                          },
                        },
                        {
                          $project: {
                            invoice_no: "$invoiceDetails.invoiceNo",
                            irn_no: "$invoiceDetails.irn_no",
                            signed_qrcode: "$invoiceDetails.signed_qrcode",
                            gstNumber: {
                              $arrayElemAt: ["$payer_detail.gstNumber", 0],
                            },
                            gst_sum: {
                              $reduce: {
                                input: {
                                  $map: {
                                    input: "$itemSupplied",
                                    as: "item",
                                    in: {
                                      $sum: [
                                        "$$item.cgst_value",
                                        "$$item.sgst_value",
                                        "$$item.igst_value",
                                        "$$item.ugst_value",
                                      ],
                                    },
                                  },
                                },
                                initialValue: 0,
                                in: {
                                  $add: ["$$value", "$$this"],
                                },
                              },
                            },
                            // gst_sum :{$sum :["$itemSupplied.cgst_value","$itemSupplied.sgst_value","$itemSupplied.igst_value","$itemSupplied.ugst_value"]},
                            // totalFirstTableGst :{
                            //   $cond :{
                            //     if :{

                            //     }
                            //   }
                            // },
                            // invoiceDetails:"$invoiceDetails",
                            // itemSupplied:"$itemSupplied",
                            // payerDetails:"$payerDetails",
                          },
                        },
                      ],
                      as: "irn_detail",
                    },
                  },
                  {
                    $unwind: {
                      path: "$irn_detail",
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                ],
                as: "invoice_detail",
              },
            },
            // sap log for invoice do not have primaryData as sales order number
            // in succes ahve invoice number do not have anything in failure
            {
              $lookup: {
                from: "rapid_sap_logs",
                localField: "allocation_id",
                foreignField: "primaryData",
                pipeline: [
                  {
                    $match: {
                      "response.flag": "E",
                      type: "invoice",
                    },
                  },
                ],
                as: "sap_invoice_detail_old",
              },
            },

            //lookup to get sap failed flag for delivery number 

            {
              $lookup :{
                from :"rapid_sap_logs",
                localField:"allocation_id",
                foreignField:"response.delivery_no",
                pipeline :[
                  {
                    $match:{
                      "response.flag": "I",
                    }
                  },
                  // {
                  //   $project :{
                  //     _id:0,
                  //     remark : "$response.remarks",
                  //   }
                  // }
                ],
                as :"sap_I_flag_detail"
              }
            },

            // added field to get irn detail at object level
            {
              $addFields: {
                irn_detail: { $arrayElemAt: ["$invoice_detail.irn_detail", 0] },
                // remark1 : "$sap_invoice_detail_old.response",
                remark1 : {$cond :{
                  if:{
                    $anyElementTrue: ["$sap_I_flag_detail"]
                  },
                  then :"$sap_I_flag_detail.response",
                  else :"$sap_invoice_detail_old.response"
                }},
                sap_invoice_detail :{$cond :{
                  if:{
                    $anyElementTrue: ["$sap_I_flag_detail"]
                  },
                  then : "$sap_I_flag_detail",
                  else :"$sap_invoice_detail_old"
                }}
              },
            },

            {
              $project: {
                // sap_invoice_detail:1,
                // invoice_detail: "$invoice_detail",
                // invoice_detail: 1,
                // irn_detail :"$invoice_detail.irn_detail",
                // irn_detail :{ $arrayElemAt: ["$invoice_detail.irn_detail", 0] },
                // irn_detail:"$irn_detail",
                _id: 0,
                // sap_I_flag_detail :1,
                sales_order_no: "$sales_order_no",
                customer_type: "$$distribution_channel_description",
                customer_name: "$$customer_name",
                route_id: "$$route_id",
                delivery_no: "$allocation_id",
                invoice_no: {
                  $ifNull: [
                    { $arrayElemAt: ["$invoice_detail.invoice_no", 0] },
                    "-",
                  ],
                },
                irn_no: {
                  $ifNull: [
                    { $arrayElemAt: ["$invoice_detail.irn_detail.irn_no", 0] },
                    "-",
                  ],
                },
                print_option: {
                  $cond: {
                    if: {
                      $or: [
                        {
                          $and: [
                            { $ne: ["$irn_detail.gstNumber", ""] },
                            { $ne: ["$irn_detail.gst_sum", 0] },
                            { $eq: ["irn_detail.signed_qrcode", ""] },
                            { $ne: ["$irn_detail.irn_no", ""] },
                          ],
                        },
                        {
                          $and: [
                            { $ne: ["$irn_detail.gstNumber", ""] },
                            { $eq: ["$irn_detail.gst_sum", 0] },
                            {
                              $or: [
                                { $ne: ["irn_detail.signed_qrcode", ""] },
                                { $eq: ["irn_detail.signed_qrcode", ""] },
                              ],
                            },
                            {
                              $or: [
                                { $ne: ["$irn_detail.irn_no", ""] },
                                { $eq: ["$irn_detail.irn_no", ""] },
                              ],
                            },
                          ],
                        },
                        {
                          $and: [
                            { $eq: ["$irn_detail.gstNumber", ""] },
                            { $ne: ["$irn_detail.gst_sum", 0] },
                            {
                              $or: [
                                { $ne: ["irn_detail.signed_qrcode", ""] },
                                { $eq: ["irn_detail.signed_qrcode", ""] },
                              ],
                            },
                            {
                              $or: [
                                { $ne: ["$irn_detail.irn_no", ""] },
                                { $eq: ["$irn_detail.irn_no", ""] },
                              ],
                            },
                          ],
                        },
                        {
                          $and: [
                            { $eq: ["$irn_detail.gstNumber", ""] },
                            { $eq: ["$irn_detail.gst_sum", 0] },
                            {
                              $or: [
                                { $ne: ["irn_detail.signed_qrcode", ""] },
                                { $eq: ["irn_detail.signed_qrcode", ""] },
                              ],
                            },
                            {
                              $or: [
                                { $ne: ["$irn_detail.irn_no", ""] },
                                { $eq: ["$irn_detail.irn_no", ""] },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    then: true,
                    else: false,
                  },
                },
                status: {
                  $cond: {
                    if: {
                      $anyElementTrue: ["$invoice_detail"],
                      // $eq :[
                      //     {$ifNull:[{$arrayElemAt: [ "$invoice_detail.invoice_no", 0 ]},null]},
                      //     null
                      // ]
                    },
                    then: {
                      $cond: {
                        if: {
                          $or: [
                            {
                              $and: [
                                { $ne: ["$irn_detail.gstNumber", ""] },
                                { $ne: ["$irn_detail.gst_sum", 0] },
                                { $eq: ["irn_detail.signed_qrcode", ""] },
                                { $ne: ["$irn_detail.irn_no", ""] },
                              ],
                            },
                            {
                              $and: [
                                { $ne: ["$irn_detail.gstNumber", ""] },
                                { $ne: ["$irn_detail.gst_sum", 0] },
                                { $ne: ["irn_detail.signed_qrcode", ""] },
                                { $eq: ["$irn_detail.irn_no", ""] },
                              ],
                            },
                            {
                              $and: [
                                { $ne: ["$irn_detail.gstNumber", ""] },
                                { $ne: ["$irn_detail.gst_sum", 0] },
                                { $eq: ["irn_detail.signed_qrcode", ""] },
                                { $eq: ["$irn_detail.irn_no", ""] },
                              ],
                            },
                          ],
                        },
                        then: "Synch IRN",
                        else: "Completed",
                      },
                    },
                    // then :"completed",
                    else: {
                      $cond: {
                        if: {
                          $anyElementTrue: ["$sap_invoice_detail"],
                        },
                        then: "Failed",
                        else: "Pending",
                      },
                    },
                  },
                },
             
                remark:{$arrayElemAt:["$remark1.remarks",0]}
              },
            },
          ],
          as: "delivery_number_detail",
        },
      },


      {
        $addFields: {
          delivery_num_to_invoice_detail: {
            $filter: {
              input: {
                $filter: {
                  input: "$delivery_number_detail",
                  as: "item",
                  cond: {
                    $in: [
                      "$$item.status",
                      status_array,
                      // {$eq:["$$item.status","Completed"]},
                      // {$eq:["$$item.status","Synch IRN"]}
                    ],
                  },
                },
              },
              as: "item",
              cond: {
                $eq: ["$$item.invoice_no", "-"],
              },
            },
          },
          delivery_number_detail1: {
            $filter: {
              input: "$delivery_number_detail",
              as: "item",
              cond: {
                $in: [
                  "$$item.status",
                  status_array,
                  // {$eq:["$$item.status","Completed"]},
                  // {$eq:["$$item.status","Synch IRN"]}
                ],
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          so_no: "$so_no",
          delivery_date: {
            $dateToString: {
              date: {
                $dateFromString: {
                  dateString: "$delivery_date",
                },
              },
              format: "%d-%m-%Y",
              onNull: "",
            },
          },


          // not using anywhere in fe
          check_box_status: {
            $cond: {
              if: {
                $eq: [{ $size: "$delivery_num_to_invoice_detail" }, 0],
              },
              then: false,
              else: true,
            },
          },

          delivery_num: "$delivery_num_to_invoice_detail.delivery_no",
          invoice_num: {
            $map: {
              input: {
                $filter: {
                  input: "$delivery_number_detail1",
                  as: "item",
                  cond: { $eq: ["$$item.print_option", true] },
                }
              },
              as: "line",
              in: '$$line.invoice_no'
            }
          },

          delivery_number_detail: "$delivery_number_detail1",
        },
      },

      {
        $match: {
          delivery_number_detail: { $ne: [] },
        },
      },
      {
        $sort: {
          so_no: 1,
        },
      },
    ]);

    if (invoice_so_list.length) {
      return res.status(200).send({
        status_code: 200,
        message: "Sales Order list!",
        data: invoice_so_list,
      });
    } else {
      return res
        .status(400)
        .send({ status_code: 400, message: "Sales Order not available!" });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message ||
        "Some error occurred while retrieving sales order allocation.",
    });
  }
};

async function sync_invoice_master(invoice_no) {
  let sap_url = `${new_sap_url}/invoice_sto_get_specific/${invoice_no}`;
  console.log("sap_url",sap_url);
  var options = {
    method: "get",
    url: sap_url,
    headers: { },
    data: {
      // page_no: 1,
      // request: {
      //   //"material_number": "WC0101000001461150",
      //   //"distr_channel": "55"
      //   //"distrubition_centre": ""
      //   //"purchasing_org": "1000"
      //   "updated_on": today_date
      // },
    },
  };
  let data = await axios.request(options);
  //console.log("data",data);
}

async function create_invoice_id(
  delivery_number,
  plant_id,
  company_code,
  delivery_date
) {
  // console.log(
  //   "create_invoice_id",
  //   delivery_number,
  //   plant_id,
  //   company_code,
  //   delivery_date
  // );
  const allocation_invoice = await so_allocation_generation.findOne({
    allocation_id: delivery_number,
    delivery_date: delivery_date,
    plant_id: plant_id,
    company_code: company_code,
  });
  if (!allocation_invoice)
    return {
      message: "Please check the data",
    };
  else if (allocation_invoice.invoice_status != "wait") {
    console.log(
      "allocation_invoice.invoice_status",
      allocation_invoice.invoice_status
    );
    return {
      message: "Invoice Already created for the allocation id",
    };
  } else {
    const ref_no = Math.floor(Math.random() * 1000000000);
    const request = {
      delivery_no: delivery_number,
      reference_key: ref_no,
    };
    const newRequest = {};
    newRequest.request = request;

    // old option
    // var options = {
    //   method: "get",
    //   url: `${sap_url}/invoice_sto_create`,
    //   headers: { Authorization: `${sap_auth}` },
    //   data: newRequest,
    // };


    // new option

    var options = {
      method: "post",
      url: `${new_sap_url}/depot_invoice_creation`,
      headers: { },
      data: newRequest,
    };
  
    // console.log("options",options);

    let final_response = await axios
      .request(options)
      .then(async (response) => {
        // console.log("response", response);
        const sapData = {};
        sapData.request = request;
        sapData.primaryData = delivery_number;
        sapData.response = response.data.response;
        sapData.type = "invoice";
        sapData.plant_id = plant_id;
        sapData.company_code = company_code;

        const new_invoice_log = new sap_logs(sapData);
        await new_invoice_log.save();

        if(!(new_invoice_log.response && new_invoice_log.response.flag)){
          return { message: "Invoice creation Initiated" };
        }

        if (new_invoice_log.response.flag !== "S") {
          return { message: "Invoice creation failed" };
        }

        // console.log(allocation_invoice);
        const invoiceData = {};
        invoiceData.allocation_id = delivery_number;
        invoiceData.plant_id = allocation_invoice.plant_id;
        invoiceData.company_code = allocation_invoice.company_code;
        invoiceData.invoice_no = new_invoice_log.response.invoice_no;
        invoiceData.create_date = delivery_date;
        invoiceData.company_code = allocation_invoice.company_code;
        invoiceData.customer_code = allocation_invoice.customer_code;
        invoiceData.delivery_date = allocation_invoice.delivery_date;
        invoiceData.sales_order_no = allocation_invoice.sales_order_no;
        invoiceData.route_id = allocation_invoice.route_id;
        //invoiceData.pallet_details = pallet_details;
        const new_invoice_generation = new invoice_generation(invoiceData);
        await new_invoice_generation.save();

        await so_allocation_generation.updateMany(
          {
            allocation_id: delivery_number,
            delivery_date: delivery_date,
            plant_id: plant_id,
            company_code: company_code,
          },
          {
            $set: {
              invoice_id: new_invoice_generation._id,
              invoice_status: "success",
            },
          }
        );

        let update_stock_summary = allocation_invoice.item_details.map(
          async (item_details) => {
            await db.stock_summary.updateOne(
              {
                material_no: item_details.material_no,
                plant_id: plant_id,
                company_code: company_code,
              },
              {
                $inc: {
                  inventory_invoice_posted_qty: item_details.inventory_qty,
                  inventory_stock_qty: -item_details.inventory_qty,
                },
              }
            );
          }
        );
        await Promise.all(update_stock_summary);

        if (invoiceData.invoice_no)
          await sync_invoice_master(invoiceData.invoice_no);

        return { message: "Invoice Id Created" };
      })
      .catch(function (error) {
        console.error(error);
        return {
          message:
            error.message ||
            "Some error occurred while generating allocation id",
        };
      });
    return final_response;
  }
}

exports.generate_invoice_id = async (req, res) => {
  console.log("generate_invoice_id");
  const delivery_number = req.body.delivery_number;
  const plant_id = req.body.plant_id;
  const company_code = req.body.company_code;
  const delivery_date = req.body.delivery_date;

  if (!(delivery_number && plant_id && company_code && delivery_date)) {
    return res.status(400).send({
      status_code: 400,
      message: "Missing Parameters!",
    });
  }

  try {
    // var result_array = await Promise.all(
    //   delivery_number.map(async (delivery_number, idx) => {
    //     console.log(
    //       "map",
    //       delivery_number,
    //       plant_id,
    //       company_code,
    //       delivery_date
    //     );
    //     let x = await create_invoice_id(
    //       delivery_number,
    //       plant_id,
    //       company_code,
    //       delivery_date
    //     );
    //     //console.log("x",x);
    //     return x;
    //   })
    // );
    let result_array = [];

    for (let i = 0; i < delivery_number.length; i++) {
      // console.log(
      //   "for loop",
      //   delivery_number[i],
      //   plant_id,
      //   company_code,
      //   delivery_date
      // );
      let x = await create_invoice_id(
        delivery_number[i],
        plant_id,
        company_code,
        delivery_date
      );
      //console.log("x",x);
      result_array.push(x);
    }
    return res.status(200).send({
      status_code: 200,
      message: "Data updated successfully",
      data: result_array,
    });
  } catch (error) {
    return res.status(400).send({
      status_code: 400,
      message: error.message || "Some error occurred ",
    });
  }
};

exports.auto_generate_invoice_id = async (req, res) => {
  const plant_id = req.body.plant_id;
  const company_code = req.body.company_code;
  const delivery_date = req.body.delivery_date;
  try {
    let delivery_number_array = [];
    let so_generation_data = await so_allocation_generation.find(
      {
        delivery_date: delivery_date,
        plant_id: plant_id,
        company_code: company_code,
        invoice_status: "wait",
      },
      { _id: 0, allocation_id: 1 }
    );

    console.log("so_generation_data", so_generation_data);
    so_generation_data.forEach((element) => {
      delivery_number_array.push(element.allocation_id);
    });
    console.log("delivery_number_array", delivery_number_array);
    //res.send({delivery_number_array:delivery_number_array});

    var result_array = [];
    for (let i = 0; i < delivery_number_array.length; i++) {
      console.log(
        "map",
        delivery_number_array[i],
        plant_id,
        company_code,
        delivery_date
      );

      let sap_log_count = await sap_logs
        .findOne({
          primaryData: delivery_number_array[i],
          "response.flag": "E",
        })
        .count();
      if (sap_log_count == 0) {
        let invoice_creation_response = await create_invoice_id(
          delivery_number_array[i],
          plant_id,
          company_code,
          delivery_date
        );
        result_array.push(invoice_creation_response);
      }
    }
    return res.status(200).send({
      status_code: 200,
      message: "Data updated successfully",
      data: result_array,
    });
  } catch (error) {
    return res.status(400).send({
      status_code: 400,
      message: error.message || "Some error occurred ",
    });
  }
};

module.exports.get_so_item_list = async (req, res) => {
  try {
    var { company_code, plant_id, so_no, delivery_no } = req.query;

    if (!(company_code && plant_id && so_no && delivery_no)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    let so_item_list = await sales_order_allocation_table.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          sales_order_no: so_no,
          delivery_posted_qty: { $gt: 0 },
        },
      },
      // lookup for se
      // {
      //     $lookup :{
      //         from: "rapid_sap_logs",
      //         localField: "sales_order_no",
      //         foreignField: "primaryData",
      //         let: { material_number: "$material_no" },
      //         pipeline :[
      //             {
      //                 $match :{
      //                     "response.flag": "SE",
      //                      type:"allocation",
      //                 }
      //             },
      //             {
      //                 $unwind :{
      //                     path :"$remarks"
      //                 }
      //             },
      //                    {
      //       $match :{
      //           $expr :{
      //             $eq :["$$item_idd","$remarks.material_no"]
      //           }
      //       }
      //     },
      //     {
      //       $project: {
      //         _id: 1,
      //         message :"$remarks.material_no.",
      //         flag: "$response.flag",
      //       },
      //     },
      //         ]
      //     }
      // },
      {
        $lookup: {
          from: "rapid_sales_order_allocation_generate",
          localField: "sales_order_no",
          foreignField: "sales_order_no",
          let: { material_noo: "$material_no" },
          pipeline: [
            {
              $match: {
                allocation_id: delivery_no,
              },
            },
            {
              $unwind: "$item_details",
            },
            {
              $match: {
                $expr: {
                  $eq: ["$item_details.material_no", "$$material_noo"],
                },
              },
            },
          ],
          as: "delivery_number_detail",
        },
      },
      {
        // $unwind:"$delivery_number_detail"
        $unwind: {
          path: "$delivery_number_detail",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          // delivery_number_detail:1,
          sales_order_no: "$sales_order_no",
          material_name: "$material_name",
          material_no: "$material_no",
          route_id: "$route_id",
          customer_name: "$customer_name",
          distribution_channel_description: "$distribution_channel_description",
          item_number: "$item_no",
          order_qty: "$order_qty",
          allocated_qty: "$allocated_qty",
          delivery_posted_qty: "$delivery_number_detail.item_details.quantity",
          invoice_status: "$delivery_number_detail.invoice_status",
          allocation_id: "$delivery_number_detail.allocation_id",
          material_no_allo: "$delivery_number_detail.material_no",
          sales_order_no_allo: "$delivery_number_detail.sales_order_no",
          status: {
            $cond: {
              if: {
                $eq: ["$delivery_number_detail.invoice_status", "success"],
              },
              then: "Completed",
              else: "Pending",
            },
          },
        },
      },
      {
        $sort: {
          delivery_posted_qty: -1
        }
      },
      {
        $group: {
          _id: "$sales_order_no",
          so_no: { $first: "$sales_order_no" },
          route_id: { $first: "$route_id" },
          customer_name: { $first: "$customer_name" },
          customer_type: { $first: "$distribution_channel_description" },
          delivery_number: { $first: "$allocation_id" },
          invoice_status: { $first: "$invoice_status" },
          item_count: { $sum: 1 },
          status_count: {
            $push: "$status",
          },
          // delivery_number:{$push :{delivery_no:"delivery_number_detail.$allocation_id"}},
          item_detail: {
            $push: {
              material_name: "$material_name",
              material_no: "$material_no",
              item_number: "$item_number",
              order_qty: "$order_qty",
              allocated_qty: "$allocated_qty",
              delivery_posted_qty: "$delivery_posted_qty",
              status: "$status",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          so_no: "$so_no",
          customer_name: "$customer_name",
          customer_type: "$customer_type",
          route_id: "$route_id",
          item_count: "$item_count",
          invoice_status: "$invoice_status",
          header_status: {
            $cond: {
              if: {
                $eq: [
                  "$item_count",
                  {
                    $size: {
                      $filter: {
                        input: "$status_count",
                        as: "item",
                        cond: {
                          $eq: ["$$item", "Completed"],
                        },
                      },
                    },
                  },
                ],
              },
              then: "Completed",
              else: {
                $cond: {
                  if: {
                    $eq: [
                      {
                        $size: {
                          $filter: {
                            input: "$status_count",
                            as: "item",
                            cond: {
                              $eq: ["$$item", "Completed"],
                            },
                          },
                        },
                      },
                      0,
                    ],
                  },
                  then: "Pending",
                  else: "Partially Completed",
                },
              },
            },
          },
          // completed_item_count: {
          //   $size: {
          //     $filter: {
          //       input: "$status_count",
          //       as: "item",
          //       cond: {
          //         $eq: ["$$item", "Completed"],
          //       },
          //     },
          //   },
          // },
          delivery_number: "$delivery_number",
          // item_detail: "$item_detail",
          completed_item_count: {
            $size: {
              $filter: {
                input: "$item_detail",
                as: "item",
                cond: {
                  $ne: [{ $ifNull: ["$$item.delivery_posted_qty", false] }, false]
                }
              }
            }
          },

          item_detail: {
            $filter: {
              input: "$item_detail",
              as: "item",
              cond: {
                $ne: [{ $ifNull: ["$$item.delivery_posted_qty", false] }, false]
              }
            }
          }
        },
      },
    ]);

    if (so_item_list.length) {
      return res.send({
        status_code: 200,
        message: "Item list!",
        data: so_item_list,
      });
    } else {
      return res
        .status(400)
        .send({ status_code: 400, message: "Item not available!" });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message ||
        "Some error occurred while retrieving sales order allocation.",
    });
  }
};



// exports.download_invoice_by_number = async (req, res) => {
//   // Create a browser instance
//   // Create a browser instance

//   try {

//     // let chrome_path = path.join(__dirname, "../../../node_modules/chromium/lib/chromium/chrome-linux/chrome");
//     // let chrome_path = path.join(__dirname, "../../../node_modules/chromium/lib/chromium/chrome-win/chrome.exe");

//     // console.log("chrome_path", chrome_path);

//     const browser = await puppeteer.launch({
//       headless: false,
//       timeout: 100000,
//       ignoreDefaultArgs: ['--disable-extensions'],
//       // executablePath: chrome_path,
//       // args: ["--no-sandbox",
//       //   "--disable-setuid-sandbox"],
//     });

//     // Create a new page
//     const page = await browser.newPage();

//     // Website URL to export as pdf
//     const website_url = 'https://uat-rapid.censanext.com/invoice/detail/0901293808';

//     // Open URL in current page
//     await page.goto(website_url, { waitUntil: 'networkidle0' });

//     //To reflect CSS used for screens instead of print
//     // await page.emulateMediaType('screen');

//     // Downlaod the PDF
//     const pdf = await page.pdf({
//       path: 'invoice1.pdf',
//       margin: { top: '10px', right: '19px', bottom: '10px', left: '19px' },
//       printBackground: false,
//       format: 'A4',
//     });

//     // Close the browser instance
//     await browser.close();

//     const filePath = path.join(__dirname, "../../../invoice1.pdf")
//     console.log("filePath", filePath);
//     var data = fs.readFileSync(filePath);
//     res.contentType("application/pdf");

//     const rmv_file = fs.unlink(filePath, function (res) {
//       console.log("File removed!");
//     });

//     return res.send(data);
//   } catch (err) {
//     return res.send({ message: err.message });
//   }
// }

exports.download_invoice_by_number = async (req, res) => {
  // Create a browser instance
  // Create a browser instance

  try {
    const browser = await puppeteer.launch();

    // Create a new page

    const page = await browser.newPage();

    // Website URL to export as pdf

    const website_url =
      "https://uat-rapid.censanext.com/invoice/detail/0901293808";

    // Open URL in current page

    await page.goto(website_url, { waitUntil: "networkidle0" });

    //To reflect CSS used for screens instead of print

    await page.emulateMediaType("screen");

    //  await page.setViewport({

    //   width: "100px",

    //   height: "100px",

    //   deviceScaleFactor: 1,

    // });

    // Downlaod the PDF

    const pdf = await page.pdf({
      path: "invoice1.pdf",

      margin: { top: "10px", right: "19px", bottom: "19px", left: "10px" },

      printBackground: false,

      format: "A4",
    });

    await browser.close();

    const filePath = path.join(__dirname, "../../../invoice1.pdf");
    console.log("filePath", filePath);
    var data = fs.readFileSync(filePath);
    res.contentType("application/pdf");

    const rmv_file = fs.unlink(filePath, function (res) {
      console.log("File removed!");
    });

    return res.send(data);
  } catch (err) {
    return res.send({ message: err.message });
  }
};

exports.download_invoice_by_number_v3 = async (req, res) => {
  // Create a browser instance
  // Create a browser instance

  try {
    let options = {
      margin: { top: "10px", right: "19px", bottom: "10px", left: "19px" },
      printBackground: false,
      format: "A4",
    };

    // console.log("__dirname", __dirname);
    const asdfwe34 = path.join(__dirname, "./invoice_detail.html");


    console.log("asdfwe34", asdfwe34);


    var pdf_data = fs.readFileSync(asdfwe34);

    let file = { content: pdf_data };
    // let file = asdfwe34
    let buffer_data = await html_to_pdf
      .generatePdf(file, options)
      .then((pdfBuffer) => {
        // console.log("PDF Buffer:-", pdfBuffer);
        fs.writeFileSync("invoice1.pdf", pdfBuffer);
      });

    const filePath = path.join(__dirname, "../../../invoice1.pdf");
    console.log("filePath", filePath);
    var data = fs.readFileSync(filePath);
    res.contentType("application/pdf");

    // const rmv_file = fs.unlink(filePath, function (res) {
    //   console.log("File removed!");
    // });

    return res.send(data);
  } catch (err) {
    return res.send({ message: err.message });
  }
};

function base64Encode(file) {
  var bitmap = fs.readFileSync(file);
  return new Buffer(bitmap).toString("base64");
}

exports.download_invoice_by_number_v2 = async (req, res) => {
  // Create a browser instance

  try {
    console.log("download_invoice_by_number_v2");
    //D:\nishanth\git\motherdc_mern\node_modules\chromium\lib\chromium\chrome-win
    /*let chrome_path = path.join(
      __dirname,
      "../../../node_modules/chromium/lib/chromium/chrome-win/chrome.exe"
    );*/
    // console.log("chrome_path", chrome_path);
    const browser = await puppeteer.launch({
      headless: false,
      timeout: 100000,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      //executablePath: chrome_path,
    });

    const page = await browser.newPage();

    const url = "https://uat-rapid.censanext.com/invoice/detail/0901293808";

    await page.goto(url, {
      waitUntil: "networkidle2",
    });

    // await page.waitFor(500);

    await page.screenshot({ path: "result.png", fullPage: true });
    const image_path = "data:image/png;base64," + base64Encode("result.png");
    await page.goto(image_path, {
      waitUntil: "networkidle0",
    });

    //await page.pdf({path: 'result.pdf', format: 'A4'});

    await page.pdf({
      path: "result.pdf",
      margin: { top: "10px", right: "5px", bottom: "10px", left: "5px" },
      //printBackground: true,
      format: "A4",
    });

    browser.close();
    //const filepath = 'D:\nishanth\git\motherdc_mern\result.pdf';
    return res.sendFile("result.pdf", { root: path.join(__dirname, "../") });
  } catch (err) {
    return res.send(err.message);
  }
};

exports.download_invoice_by_number_v4 = async (req, res) => {

  try {
    const browser = await puppeteer.launch({
      executablePath: '/datadrive1/BE/motherdc_BE/.cache/puppeteer/chrome/linux-1108766/chrome-linux/chrome',
      // headless: true,
      // args: ['--disable-setuid-sandbox', '--use-gl=egl']
      args: ['--disable-setuid-sandbox', '--no-sandbox']
    });

    // Create a new page
    const page = await browser.newPage();

    console.log("__dirname", __dirname);
    const asdfwe34 = path.join(__dirname, "./invoice_detail.html");
    console.log("asdfwe34", asdfwe34);

    // Open URL in current page
    await page.goto(`file://${asdfwe34}`, { waitUntil: "networkidle0" });

    // console.log("prasad");

    //To reflect CSS used for screens instead of print
    await page.emulateMediaType("screen");

    // Downlaod the PDF
    const pdf = await page.pdf({
      path: "invoice1.pdf",
      margin: { top: "10px", right: "19px", bottom: "10px", left: "19px" },
      printBackground: false,
      format: "A4",
    });

    // Close the browser instance
    await browser.close();

    const filePath = path.join(__dirname, "../../../invoice1.pdf");
    console.log("filePath", filePath);
    var data = fs.readFileSync(filePath);
    res.contentType("application/pdf");

    const rmv_file = fs.unlink(filePath, function (res) {
      console.log("File removed!");
    });

    return res.send(data);
  } catch (err) {
    return res.send({ message: err.message });
  }
};


exports.download_invoice_by_number_v5 = async (req, res) => {
  // Create a browser instance
  // Create a browser instance

  try {

    var {
      invoice_no
    } = req.query;

    if (
      !(invoice_no)
    ) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }


    console.log("invoice_no", invoice_no);

    let options = {
      margin: { top: "10px", right: "19px", bottom: "10px", left: "19px" },
      printBackground: false,
      format: "A4",
    };

    // old_web_url = https://uat-rapid.censanext.com/invoice/detail/0901293808 

    let file = { url: `https://uat-rapid.censanext.com/invoice/detail/${invoice_no}/android` };

    let buffer_data = await html_to_pdf
      .generatePdf(file, options)
      .then((pdfBuffer) => {
        // console.log("PDF Buffer:-", pdfBuffer);


        if (Buffer.byteLength(pdfBuffer) > 0) {
          fs.writeFileSync(`${invoice_no}.pdf`, pdfBuffer);
          return res.send({ status_code: 200, message: "Invoice pdf created!" })
        }
        else {
          return res.status(400).send({ status_code: 400, message: "Invoice pdf creation failed!" })
        }
      });



    // const filePath = path.join(__dirname, "../../../invoice1.pdf");
    // console.log("filePath", filePath);
    // var data = fs.readFileSync(filePath);
    // res.contentType("application/pdf");
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};


exports.upload_invoice = async (req, res) => {

  
  try {
    var  {company_code,plant_id,po_number,po_type,po_creation_date,vendor_name,asn_number,invoice_no,invoice_date} = req.body

    // console.log(req.file, company_code, plant_id, po_number, po_type , vendor_name, asn_number, invoice_no);

    if (!(req.file && company_code && plant_id && po_number && po_type && po_creation_date && vendor_name && asn_number && invoice_no && invoice_date))
      return res.status(400).send({
        status_code: 400,
        // message: "Please provide invoice receipt image",
         message: "Missing Paramter!",
      });


      let file_object = {
        company_code, 
        plant_id,
        po_number,
        po_type,
        po_creation_date:moment_tz(po_creation_date,'DD-MM-YYYY').format('YYYY-MM-DD'),
        vendor_name,
        asn_number,
        invoice_no,
        invoice_date:moment_tz(invoice_date,'DD-MM-YYYY').format('YYYY-MM-DD'),
        invoice_url:req.file.url
      }
 
   let save_file = await files_url_details_table.create(file_object)

    if(save_file){
      res.send({
        status_code: 200,
        message: "Successfully uploaded invoice receipt!",
        // data: { uploadedImageURL: req.file.url },
      });
    }
    else {
      res.send({
        status_code: 400,
        message: "Failed while saving invoice detail!",
      });
    }


  } catch (err) {
    console.log(err);
    res.status(500).send({
      status_code: 500,
      message:
      err.message  ||   "Some error occurred while uplaoding invoice receipt to azure storage!",
    });
  }
};



