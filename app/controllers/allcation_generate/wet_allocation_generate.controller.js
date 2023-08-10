const db = require("../../models");
const axios = require("axios").default;
const sap_url = process.env.SAP_URL;
const sap_auth = process.env.SAP_AUTH;
const moment = require("moment");
const new_sap_url = process.env.NEW_SAP_URL;
// database

const so_allocation_detail_table = db.soAllocation;
const so_allocation_generation = db.soAllocationGenerate;
const sap_logs = db.sap_logs_model;
const invoice_generation = db.invoiceGenerate;

//helpers
const { respondSuccess, respondFailure } = require("../../helpers/response");

async function get_so_details(filter) {
  //console.log("filter", filter);
  const salesItems = await so_allocation_detail_table
    .find(filter)
    .select(
      "entry_time sales_order_no item_no material_name material_no allocated_qty so_qty delivery_date plant_id customer_code customer_name sales_document_type uom sales_order_no order_qty plant_id delivery_posted_qty inventory_delivery_posted_qty inventory_allocated_qty company_code route_id isSOCancelled"
    )
    .sort({ item_no: 1 })
    .lean();
  //console.log("salesItems",salesItems);
  let so_details_array = [];
  const newSales = salesItems.map(async (data) => {
    //console.log("data",data);

    let cancelled_so = false;
    if (data.isSOCancelled) cancelled_so = true;

    data.ap_qty = data.delivery_posted_qty.toFixed(2);
    data.ap_pending_qty =
      data.allocated_qty.toFixed(2) - data.delivery_posted_qty.toFixed(2);
    data.inventory_pending_qty =
      data.inventory_allocated_qty.toFixed(2) -
      data.inventory_delivery_posted_qty.toFixed(2);
    data.quantity =
      data.allocated_qty.toFixed(2) - data.delivery_posted_qty.toFixed(2);

    if ((data.quantity > 0) && !(cancelled_so))
      so_details_array.push(data);
  });
  const sales_items = await Promise.all(newSales);
  //console.log("sales_items",so_details_array);
  return so_details_array[0] ? so_details_array : [];
}

async function generate_sap_allocation_id(so_details) {
  //console.log("so_details", so_details);
  const newRequest = {};
  let so_number = so_details[0].sales_order_no;
  let delivery_date = so_details[0].delivery_date;
  let shipping_point = so_details[0].plant_id;
  let company_code = so_details[0].company_code;
  let customer_name = so_details[0].customer_name;
  let customer_code = so_details[0].customer_code;
  let route_id = so_details[0].route_id;
  const request = {
    sales_order_no: so_number,
    delivery_date: delivery_date,
    shipping_point: shipping_point,
    item: [],
  };

  so_details.forEach((element) => {
    request.item.push({
      sales_order_item_no: element.item_no,
      delivery_quantity: element.quantity,
      //inventory_delivery_quantity: element.inventory_pending_qty,
      uom: element.uom,
    });
  });

  newRequest.request = request;

  // old request
  // var options = {
  //   method: "post",
  //   url: `${sap_url}/Picking_Allocation_Creation`,
  //   headers: { Authorization: `${sap_auth}`},
  //   data: newRequest,
  // };

  // new request
  var options = {
    method: "post",
    url: `${new_sap_url}/depot_picking_allocation_creation`,
    headers: { },
    data: newRequest,
  };



  let final_response = await axios
    .request(options)
    .then(async (response) => {
      const sapData = {};
      sapData.request = request;
      sapData.response = response.data.response;
      sapData.primaryData = so_number;
      sapData.company_code = company_code;
      sapData.type = "allocation";
      sapData.plant_id = shipping_point;
      const new_sap_allocation_logs = new sap_logs(sapData);
      await new_sap_allocation_logs.save();

      let data = {};

      if (new_sap_allocation_logs.response.flag == "E") {
        return { message: "Delivery Number Generation Failed "};
      }

      console.log(new_sap_allocation_logs.response);
      const salesItem = await so_allocation_detail_table.findOne({
        sales_order_no: so_number,
      });
      if (!salesItem) {
        return { message: "Sales Item Not Available" };
      }

      data.sales_order_no = so_number;
      data.allocation_id = new_sap_allocation_logs.response.delivery_no;
      data.so_id = salesItem._id;
      data.plant_id = salesItem.plant_id;
      data.delivery_date = delivery_date;
      data.company_code = company_code;
      data.customer_code = customer_code;
      data.customer_name = customer_name;
      data.route_id = route_id;
      const new_so_allocation_generation = new so_allocation_generation(data);
      await new_so_allocation_generation.save();

      // let ap_qty = 0;
      // let ap_pending_qty = 0;

      //request.item.map(async (insertItem) => {
        //console.log("----------=", insertItem);
        so_details.map(async (insertItem) => {

        const allocation_data = await so_allocation_generation.find({
          sales_order_no: so_number,
          item_no: insertItem.item_no,
        });
        const salesItemQty = await so_allocation_detail_table.findOne({
          sales_order_no: so_number,
          item_no: insertItem.item_no,
        });
        //console.log("-----", salesItemQty);

        // console.log(salesItemQty.allocated_qty, ap_pending_qty)
        const item_details = {
          item_no: insertItem.item_no,
          quantity: insertItem.quantity,
          inventory_qty: insertItem.inventory_pending_qty,
          so_qty: salesItemQty.order_qty,
          material_no: salesItemQty.material_no,
          material_name: salesItemQty.material_name,
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
        //console.log(salesItemQty.allocation_detail);

        await so_allocation_detail_table.updateOne(
          {
            sales_order_no: so_number,
            item_no: insertItem.item_no,
          },
          {
            $inc: {
              delivery_posted_qty: insertItem.quantity,
              inventory_delivery_posted_qty:
                insertItem.inventory_pending_qty,
            },
          }
        );
        salesItemQty.allocation_detail.map(async (newData) => {
          //console.log(newData._id);
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

      return { message: "Delivery Number Has Been Generated"};
    })
    .catch(function (error) {
      console.error(error);
      return {
        message:
          error.message || "Some error occurred while generating allocation id",
      };
    });
  return final_response;
}

async function create_allocation_id(filter) {
  let so_details = await get_so_details(filter);
  // console.log("so_details", so_details);

  if (so_details.length) {
    let sap_generate_allocation_id = await generate_sap_allocation_id(
      so_details
    );
    return sap_generate_allocation_id;
  } else {
    return { message: "Delivery number already generated for the SO" };
  }
}

module.exports = {
  generate_allocation_id: async (req, res) => {
    console.log("generate_allocation_id");
    try {
      let request = req.body.request;
      //console.log("request.length",request);

      if (!(request && request.length)) {
        return res
          .status(400)
          .send({ status_code: "400", message: "Missing parameter." });
      }

      const allocation_generate_request = request.map(async (element) => {
        //console.log(element);
        let filter = {};
        //if (element.customer_code) filter.customer_code = element.customer_code;
        if (element.sales_order_no)
          filter.sales_order_no = element.sales_order_no;
        if (element.delivery_date) filter.delivery_date = element.delivery_date;
        if (element.route_id) filter.route_id = element.route_id;
        if (element.plant_id) filter.plant_id = element.plant_id;
        if (element.company_code) filter.company_code = element.company_code;
        let so_details = await create_allocation_id(filter);
        //console.log("so_details", so_details);
        return so_details;
      });
      const response_data = await Promise.all(allocation_generate_request);
      if (response_data.length) {
        return res.status(200).send({
          status_code: 200,
          message: "Allocation Results",
          data: response_data,
        });
      }
      return res.status(200).send({
        status_code: 200,
        message: "No Records available",
        data: [],
      });
    } catch (error) {
      return res.status(400).send({
        status_code: 400,
        message:
          error.message || "Some error occurred ",
      });
    }
  },


  generate_allocation_id_v2: async (req, res) => {
    console.log("generate_allocation_id");
    try {
      let request = req.body.request;
      //console.log("request.length",request);

      if (!(request && request.length)) {
        return res
          .status(400)
          .send({ status_code: "400", message: "Missing parameter." });
      }
      var result_array = [];
      for (let i = 0; i < request.length; i++) {
        // const allocation_generate_request = request.map(async (element) => {
        //console.log(element);
        let filter = {};
        //if (element.customer_code) filter.customer_code = element.customer_code;
        if (request[i].sales_order_no)
          filter.sales_order_no = request[i].sales_order_no;
        if (request[i].delivery_date) filter.delivery_date = request[i].delivery_date;
        if (request[i].route_id) filter.route_id = request[i].route_id;
        if (request[i].plant_id) filter.plant_id = request[i].plant_id;
        if (request[i].company_code) filter.company_code = request[i].company_code;
        let so_details = await create_allocation_id(filter);
        //console.log("so_details", so_details);
        // return so_details;
        result_array.push(so_details);
      };
      //const response_data = await Promise.all(allocation_generate_request);
      if (result_array.length) {
        return res.status(200).send({
          status_code: 200,
          message: "Allocation Results",
          data: result_array,
        });
      }
      return res.status(200).send({
        status_code: 200,
        message: "Delivery number already generated for the SO",
        data: [],
      });
    } catch (error) {
      return res.status(400).send({
        status_code: 400,
        message:
          error.message || "Some error occurred ",
      });
    }
  },
  auto_generate_allocation_id: async (params) => {
    try {
      //console.log("auto_generate_allocation_id",req);
      let plant_id = params.plant_id;
      let company_code = params.company_code;
      let delivery_date = params.delivery_date;
      //console.log("plant_id",plant_id,company_code,delivery_date);

      let so_list = await so_allocation_detail_table.aggregate([
        {
          $match: {
            is_ready_for_invoice: true,
            route_id: { $ne: "" },
            delivery_date: delivery_date,
            allocation_detail: {
              $elemMatch: {
                allocation_status: "wait",
              },
              plant_id: plant_id,
              company_code: company_code,
            },
          },
        },
        {
          $group: {
            _id: "$sales_order_no",
            delivery_date: { $first: "$delivery_date" },
            route_id: { $first: "$route_id" },
            plant_id: { $first: "$plant_id" },
            company_code: { $first: "$company_code" },
          },
        },
      ]);

      console.log("so_list", so_list.length);
      if (so_list.length) {
        const allocation_generate_request = so_list.map(async (element) => {
          //console.log(element);
          let filter = {};
          //if (element.customer_code) filter.customer_code = element.customer_code;
          if (element._id) filter.sales_order_no = element._id;
          if (element.delivery_date)
            filter.delivery_date = element.delivery_date;
          if (element.route_id) filter.route_id = element.route_id;
          if (element.plant_id) filter.plant_id = element.plant_id;
          if (element.company_code) filter.company_code = element.company_code;
          let so_details = await create_allocation_id(filter);
          //console.log("so_details", so_details);
          return so_details;
        });
        const response_data = await Promise.all(allocation_generate_request);
        if (response_data.length) {
          return "Allocation Results updated";
        }
        return "No Records available";
      } else {
        return "No Records available";
      }
    } catch (error) {
      res.status(500).send({
        message:
          error.message || "Some error occurred while retrieving customer_list",
      });
    }
  },
  auto_generate_allocation_id_v2: async (req, res) => {
    try {
      //console.log("auto_generate_allocation_id",req);
      // let plant_id = params.plant_id;
      // let company_code = params.company_code;
      // let delivery_date = params.delivery_date;
      // //console.log("plant_id",plant_id,company_code,delivery_date);

      let plant_id = req.body.plant_id;
      let company_code = req.body.company_code;
      let delivery_date = req.body.delivery_date;
      // console.log("plant_id", plant_id);


      let so_list = await so_allocation_detail_table.aggregate([
        {
          $match: {
            is_ready_for_invoice: true,
            route_id: { $ne: "" },
            delivery_date: delivery_date,
            allocation_detail: {
              $elemMatch: {
                allocation_status: "wait",
              }
            },
            plant_id: plant_id,
            company_code: company_code,
          },
        },
        {
          $group: {
            _id: "$sales_order_no",
            delivery_date: { $first: "$delivery_date" },
            route_id: { $first: "$route_id" },
            plant_id: { $first: "$plant_id" },
            company_code: { $first: "$company_code" },
            pending_qty: { $sum: "$pending_qty" }
          },
        },
      ]);

      console.log("so_list", so_list.length);
      let response_array = [];
      if (so_list.length) {
        for (let i = 0; i < so_list.length; i++) {
          //console.log(element);
          let sap_data_count = await sap_logs.findOne({ primaryData: so_list[i], "response.flag": "E" }).count();
          if (sap_data_count == 0) {
            if (so_list[i].pending_qty <= 0) {
              let filter = {};
              //if (element.customer_code) filter.customer_code = element.customer_code;
              if (so_list[i]._id) filter.sales_order_no = so_list[i]._id;
              if (so_list[i].delivery_date)
                filter.delivery_date = so_list[i].delivery_date;
              if (so_list[i].route_id) filter.route_id = so_list[i].route_id;
              if (so_list[i].plant_id) filter.plant_id = so_list[i].plant_id;
              if (so_list[i].company_code) filter.company_code = so_list[i].company_code;
              let so_details = await create_allocation_id(filter);
              response_array.push(so_details);
              //console.log("so_details", so_details);
            }
          }
        };
        //await Promise.all(allocation_generate_request);

        if (response_array.length) {
          //console.log("response_data", response_array.length)
          return res.send({ data: response_array });
          //return "Allocation Results updated";
        }
        return res.send({ message: "No records found" });
        //return "No Records available";
      } else {
        return res.send({ message: "No records found" });
        //return "No Records available";
      }
    } catch (error) {
      res.status(500).send({
        message:
          error.message || "Some error occurred while retrieving customer_list",
      });
    }
  },
};

// getting so list of delivery number pending
module.exports.get_so_list = async (req, res) => {
  try {
    var { company_code, plant_id, delivery_date, customer_type, route_id } =
      req.query;

    if (
      !(company_code && plant_id && delivery_date && customer_type && route_id)
    ) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    let invoice_so_list = await so_allocation_detail_table.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          distribution_channel: customer_type,
          route_id: route_id,
          allocated_qty: { $gt: 0 },
          //   $expr :{
          //           $gt:["$allocated_qty","$delivery_posted_qty"]
          //   }
        },
      },

      {
        $addFields: {
          posted_check: {
            $cond: {
              if: {
                $gte: ["$delivery_posted_qty", "$allocated_qty"],
              },
              then: "yes",
              else: "no",
            },
          },
        },
      },
      {
        $group: {
          _id: "$sales_order_no",
          so_no: { $first: "$sales_order_no" },
          customer_name: { $first: "$customer_name" },
          customer_code: { $first: "$customer_code" },
          customer_type: { $first: "$distribution_channel_description" },
          item_count: { $sum: 1 },
          allocation_check: { $push: "$posted_check" },
          allocated_qty_sum: { $sum: "$allocated_qty" },
          order_qty_sum: { $sum: "$order_qty" },
          pending_qty_sum: { $sum: "$pending_qty" },
          delivery_posted_qty_sum: { $sum: "$delivery_posted_qty" },
          route_id: { $first: "$route_id" },
          // status : "Partially Completed"
        },
      },
      {
        $lookup: {
          from: "rapid_sap_logs",
          localField: "so_no",
          foreignField: "primaryData",
          pipeline: [
            {
              $match: {
                "response.flag": "E",
                type: "allocation",
              },
            },
          ],
          as: "sap_log",
        },
      },

      {
        $project: {
          _id: 0,
          so_no: "$so_no",
          route_id: "$route_id",
          customer_name: "$customer_name",
          customer_code: "$customer_code",
          customer_type: "$customer_type",
          item_count: "$item_count",
          allocated_item_count: {
            $size: {
              $filter: {
                input: "$allocation_check",
                as: "item",
                cond: { $eq: ["$$item", "yes"] },
              },
            },
          },
          allocated_qty_sum: {$trunc:["$allocated_qty_sum",2]},
          order_qty_sum: "$order_qty_sum",
          pending_qty_sum:{$trunc:["$pending_qty_sum",2]},
          delivery_posted_qty_sum: "$delivery_posted_qty_sum",
          sap_status: {
            $cond: {
              if: {
                $anyElementTrue: ["$sap_log"],
              },
              then: "failed",
              else: "pending",
            },
          },
        },
      },
      // match avoiding so having all allocted item
      {
        $match: {
          $expr: {
            $ne: ["$item_count", "$allocated_item_count"],
          },
        },
      },

      {
        $sort: {
          so_no: 1,
        },
      },
    ]);

    if (invoice_so_list.length) {
      return res.send({
        status_code: 200,
        message: "Sales Order list!",
        data: invoice_so_list,
      });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "Sales Order not available!",
      });
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

module.exports.get_customer_type_list = async (req, res) => {
  try {
    var { company_code, plant_id, delivery_date } = req.query;

    if (!(company_code && plant_id && delivery_date)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    let invoice_customer_type = await so_allocation_detail_table.aggregate([
      // $cond: {
      //   if: {
      //     $and: [
      //       { $gte: ["$delivery_posted_qty", "$allocated_qty"] },
      //       { $eq: ["$allocation_status", "SUCCESS"] },
      //     ],
      //   },
      //   then: "yes",
      //   else: "no",
      // },
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          allocated_qty: { $gt: 0 },
          $expr: {
            $gt: ["$allocated_qty", "$delivery_posted_qty"],
          },
        },
      },
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
          customer_type_code: "$distribution_channel",
          customer_type: "$distribution_channel_description",
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

module.exports.get_route_list = async (req, res) => {
  try {
    var { company_code, plant_id, delivery_date, customer_type } = req.query;

    if (!(company_code && plant_id && delivery_date && customer_type)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    let invoice_route_list = await so_allocation_detail_table.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          distribution_channel: customer_type,
          allocated_qty: { $gt: 0 },
          $expr: {
            $gt: ["$allocated_qty", "$delivery_posted_qty"],
          },
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

module.exports.get_so_item_list = async (req, res) => {
  try {
    var { company_code, plant_id, so_no } = req.query;

    if (!(company_code && plant_id && so_no)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    let so_item_list = await so_allocation_detail_table.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          sales_order_no: so_no,
          allocated_qty: { $gt: 0 },
        },
      },

      // new lookup to refer for se flag
      // {
      //   $lookup: {
      //     from: "rapid_sap_logs",
      //     localField: "sales_order_no",
      //     foreignField: "primaryData",
      //     // check with material number
      //     let: { item_idd: "$item_no", material_id: "$material_no" },
      //     pipeline: [
      //       // {

      //       // },
      //       // {
      //       //   $project :{
      //       //     delivery_nn : "$response.delivery_no",
      //       //     flag :"$response.flag",

      //       //   }
      //       // },
      //       {
      //         $unwind: {
      //           path: "$response.remarks",
      //         },
      //       },
      //       {
      //         $project: {
      //           request: "$request",
      //           delivery_num: "$response.delivery_no",
      //           flag: "$response.flag",
      //           remarks: "$response.remarks",
      //           type: "$type",
      //         },
      //       },
      //       {
      //         $match: {
      //           $expr: {
      //             $eq: ["$$material_id", "$remarks.material"],
      //           },
      //           flag: "S",
      //           type: "allocation",
      //         },
      //       },

      //       // {
      //       //   $unwind:{
      //       //     path :"$remarks"
      //       //   }
      //       // },
      //       // {
      //       //   $match :{
      //       //       $expr :{
      //       //         $eq :["$$item_idd","$remarks.material_no"]
      //       //       }
      //       //   }
      //       // },
      //       // {
      //       //   $project: {
      //       //     _id: 1,
      //       //     message :"$remarks.material_no.",
      //       //     flag: "$response.flag",
      //       //   },
      //       // },
      //     ],
      //     as: "sap_log",
      //   },
      // },

      // for sap status
      // not clear becz not getting material no in response
      // do not have sap response for a specific material
      // not using lookup for now
      // {
      //   $lookup: {
      //     from: "rapid_sap_logs",
      //     localField: "sales_order_no",
      //     foreignField: "primaryData",
      //     let: { item_idd: "$item_no" },
      //     pipeline: [
      //       {
      //         $match: {
      //           $expr: {
      //             $in: ["$$item_idd", "$request.item.sales_order_item_no"],
      //           },
      //           "response.flag": "E",
      //           type:"allocation"
      //         },
      //       },
      //       {
      //         $project: {
      //           _id: 1,
      //           flag: "$response.flag",
      //         },
      //       },
      //     ],
      //     as: "sap_log",
      //   },
      // },
      {
        $addFields: {
          posted_check: {
            $cond: {
              if: {
                $gte: ["$delivery_posted_qty", "$allocated_qty"]
              },
              then: "Completed",
              else: "Pending",
            },
          },
        },
      },
      {
        $group: {
          _id: "$sales_order_no",
          so_no: { $first: "$sales_order_no" },
          route_id: { $first: "$route_id" },
          customer_name: { $first: "$customer_name" },
          customer_type: { $first: "$distribution_channel_description" },
          delivery_date: { $first: "$delivery_date" },
          item_count: { $sum: 1 },
          status_count: {
            $push: "$posted_check"
          },
          item_detail: {
            $push: {
              material_name: "$material_name",
              material_no: "$material_no",
              item_number: "$item_no",
              order_qty: "$order_qty",
              allocated_qty: {$trunc:["$allocated_qty",2]},
              // delivery_posted_qty: "$delivery_posted_qty",
              delivery_posted_qty: { $ifNull: ["$delivery_posted_qty", 0] },
              lotting_loss:{ $ifNull: [{$trunc:["$lotting_loss",2]}, 0] },
              // lotting_loss: "$lotting_loss",
              status: "$posted_check"
            }
          }

        }
      },
      {
        $project: {
          _id: 0,
          so_no: "$so_no",
          route_id: { $ifNull: ["$route_id", "-"] },
          customer_name: "$customer_name",
          customer_type: "$customer_type",
          delivery_date: "$delivery_date",
          item_count: "$item_count",
          header_status: {
            $cond: {
              if: {
                $eq: ["$item_count", {
                  $size: {
                    $filter: {
                      input: "$status_count",
                      as: "item",
                      cond: {
                        $eq: ["$$item", "Completed"]
                      }
                    }
                  }
                }]
              },
              then: "Completed",
              else: {
                $cond: {
                  if: {
                    $eq: [{
                      $size: {
                        $filter: {
                          input: "$status_count",
                          as: "item",
                          cond: {
                            $eq: ["$$item", "Completed"]
                          }
                        }
                      }
                    }, 0]
                  },
                  then: "Pending",
                  else: "Partially Completed"
                }
              }
            }
          },
          completed_item_count: {
            $size: {
              $filter: {
                input: "$status_count",
                as: "item",
                cond: {
                  $eq: ["$$item", "Completed"]
                }
              }
            }
          },
          item_detail: "$item_detail"
        }
      }
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
