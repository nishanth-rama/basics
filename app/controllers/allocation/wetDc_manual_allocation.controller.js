const db = require("../../models");
const sales_order_allocation_table = db.soAllocation;
const moment_tz = require("moment-timezone");
var ObjectId = require("mongodb").ObjectId;
const stock_summary_table = db.stock_summary;

exports.get_so_list_manual_allocation = async (req, res) => {

  try {
    // customer_type = distribution_channel

    var { company_code, plant_id, delivery_date, customer_type, route_id } =
      req.query;

    if (!(company_code && plant_id && delivery_date)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    var filter = { company_code, plant_id, delivery_date };

    if (customer_type) {
      let customer_type_filter_array = customer_type.split(",");
      filter.distribution_channel = { $in: customer_type_filter_array };
    }

    if (route_id) {
      let route_filter_array = route_id.split(",");
      filter.route_id = { $in: route_filter_array };
    }

    let manual_allocated_so_list = await sales_order_allocation_table.aggregate(
      [
        {
          $match: filter,
        },
        {
          $group: {
            _id: "$sales_order_no",
            so_no: { $first: "$sales_order_no" },
            customer_name: { $first: "$customer_name" },
            customer_code: { $first: "$customer_code" },
            customer_type: { $first: "$distribution_channel" },
            customer_type_description: {
              $first: "$distribution_channel_description",
            },
            route_id: { $first: "$route_id" },
            delivery_date: { $first: "$delivery_date" },
            order_qty: { $sum: "$order_qty" },
            allocated_qty: { $sum: "$allocated_qty" },
            pending_qty: { $sum: "$pending_qty" },
            lotting_loss: { $sum: "$lotting_loss" },
            delivery_posted_qty:{$sum:"$delivery_posted_qty"}
          },
        },
        {
          $project: {
            _id: 0,
            so_no: "$so_no",
            customer_name: "$customer_name",
            customer_code: "$customer_code",
            customer_type: "$customer_type",
            customer_type_description: "$customer_type_description",
            route_id: {
              $cond: {
                if: { $eq: ["$route_id", ""] },
                then: "-",
                else: "$route_id",
              },
            },
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
            order_qty: "$order_qty",
            delivery_posted_qty:"$delivery_posted_qty",
            allocated_qty: {$trunc:["$allocated_qty",2]},
            pending_qty:{$cond:{
                if :{
                  $lt:["$pending_qty",0]
                },
                then :0,
                else :{$trunc:["$pending_qty",2]}
            }}, 
            lotting_loss:{$trunc:["$lotting_loss",2]},
            status: {
              $cond: {
                if: { $eq: ["$allocated_qty", 0] },
                then: "Pending",
                else: {
                  $cond: {
                    if: { $eq: ["$order_qty", "$allocated_qty"] },
                    then: "Completed",
                    else: "Partially Completed",
                  },
                },
              },
            },
            delivery_fulfillment : {
              $cond:{
                if:{
                  $gte :
                    ["$delivery_posted_qty","$order_qty"]
                },
                then :true,
                else :false
              }
            }
          },
        },
        {
          $sort: {
            so_no: 1,
          },
        },
      ]
    );

    if (manual_allocated_so_list.length) {
      return res.status(200).send({
        status_code: 200,
        message: "SO list",
        data: manual_allocated_so_list,
      });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "SO not available",
      });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message ||
        "Some error occurred while retrieving sales order allocation",
    });
  }
};

exports.get_route_list_manual_allocation = async (req, res) => {
  try {
    // customer_type = distribution_channel

    var { company_code, plant_id, delivery_date, customer_type } = req.query;

    if (!(company_code && plant_id && delivery_date && customer_type)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    let customer_type_array = customer_type.split(",");

    let route_list = await sales_order_allocation_table.aggregate([
      {
        $match: {
          company_code,
          plant_id,
          delivery_date,
          distribution_channel: { $in: customer_type_array },
        },
      },
      {
        $group: {
          _id: "$route_id",
          // so_no :{$first:"$sales_order_no"},
          route_id: { $first: "$route_id" },
        },
      },
      {
        $match: {
          route_id: { $ne: "" },
        },
      },
      {
        $project: {
          _id: 0,
          route_id: 1,
        },
      },
      {
        $sort: {
          route_id: 1,
        },
      },
    ]);

    if (route_list.length) {
      return res
        .status(200)
        .send({ status_code: 200, message: "Route list", data: route_list });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "Route list not available",
      });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message || "Some error occurred while retrieving Route list",
    });
  }
};

exports.get_route_list_by_delivery_date = async (req, res) => {
  try {
    // customer_type = distribution_channel

    var { company_code, plant_id, delivery_date } = req.query;

    if (!(company_code && plant_id && delivery_date)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    let route_list = await sales_order_allocation_table.aggregate([
      {
        $match: {
          company_code,
          plant_id,
          delivery_date,
          //distribution_channel: { $in: customer_type_array },
        },
      },
      {
        $group: {
          _id: "$route_id",
          // so_no :{$first:"$sales_order_no"},
          route_id: { $first: "$route_id" },
        },
      },
      {
        $match: {
          route_id: { $ne: "" },
        },
      },
      {
        $project: {
          _id: 0,
          route_id: 1,
        },
      },
      {
        $sort: {
          route_id: 1,
        },
      },
    ]);

    if (route_list.length) {
      return res
        .status(200)
        .send({ status_code: 200, message: "Route list", data: route_list });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "Route list not available",
      });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message || "Some error occurred while retrieving Route list",
    });
  }
};


exports.get_customer_type_manual_allocation = async (req, res) => {
  try {
    var { company_code, plant_id, delivery_date } = req.query;

    if (!(company_code && plant_id && delivery_date)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    let customer_type_list = await sales_order_allocation_table.aggregate([
      {
        $match: {
          company_code,
          plant_id,
          delivery_date,
        },
      },
      {
        $group: {
          _id: "$distribution_channel",
          // so_no :{$first:"$sales_order_no"},
          distribution_channel: { $first: "$distribution_channel" },
          distribution_channel_description: {
            $first: "$distribution_channel_description",
          },
        },
      },

      {
        $project: {
          _id: 0,
          distribution_channel: "$distribution_channel",
          distribution_channel_description: "$distribution_channel_description",
        },
      },
      {
        $sort: {
          distribution_channel: 1,
        },
      },
    ]);

    if (customer_type_list.length) {
      return res.status(200).send({
        status_code: 200,
        message: "Customer type list",
        data: customer_type_list,
      });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "Customer type list not available",
      });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message || "Some error occurred while retrieving customer type",
    });
  }
};

exports.get_sku_allocation_overview = async (req, res) => {
  try {
    var { company_code, plant_id, delivery_date } = req.query;

    if (!(company_code && plant_id && delivery_date)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    let ans_obj = {
      total_sos: 0,
      partially_completed: 0,
      pending: 0,
      completed: 0,
      total_qty: 0,
      allocated_qty: 0,
    };

    let allocation_overview = await sales_order_allocation_table.aggregate([
      {
        $match: {
          company_code,
          plant_id,
          delivery_date,
          route_id: { $ne: "" }
        },
      },
      {
        $group: {
          _id: "$sales_order_no",
          so_no: { $first: "$sales_order_no" },
          total_qty: { $sum: "$order_qty" },
          allocated_qty: { $sum: "$allocated_qty" },
        },
      },

      // {
      //     $project :{
      //         completed : {
      //             $cond :{
      //                 if :{

      //                 }
      //             }
      //         }
      //     }
      // }
    ]);

    if (allocation_overview.length) {
      for (let i = 0; i < allocation_overview.length; i++) {
        ans_obj.total_sos += 1;
        ans_obj.total_qty += allocation_overview[i].total_qty;
        ans_obj.allocated_qty += allocation_overview[i].allocated_qty;

        if (
          allocation_overview[i].allocated_qty > 0 &&
          allocation_overview[i].allocated_qty !=
          allocation_overview[i].total_qty
        ) {
          ans_obj.partially_completed += 1;
        }
        if (allocation_overview[i].allocated_qty == 0) {
          ans_obj.pending += 1;
        }
        if (
          allocation_overview[i].allocated_qty ==
          allocation_overview[i].total_qty
        ) {
          ans_obj.completed += 1;
        }
      }

      ans_obj.allocated_qty = Number(ans_obj.allocated_qty.toFixed(2))

      return res.status(200).send({
        status_code: 200,
        message: "Allocation Overview",
        data: ans_obj,
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
        "Some error occurred while retrieving sales order allocation",
    });
  }
};

exports.get_so_allocation_overview = async (req, res) => {
  try {
    var { company_code, plant_id, delivery_date } = req.query;

    if (!(company_code && plant_id && delivery_date)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    let ans_obj = {
      total_sos: 0,
      partially_completed: 0,
      pending: 0,
      completed: 0,
      total_qty: 0,
      allocated_qty: 0,
    };

    let allocation_overview = await sales_order_allocation_table.aggregate([
      {
        $match: {
          company_code,
          plant_id,
          delivery_date,
        },
      },
      {
        $group: {
          _id: "$sales_order_no",
          so_no: { $first: "$sales_order_no" },
          total_qty: { $sum: "$order_qty" },
          allocated_qty: { $sum: "$allocated_qty" },
        },
      },

      // {
      //     $project :{
      //         completed : {
      //             $cond :{
      //                 if :{

      //                 }
      //             }
      //         }
      //     }
      // }
    ]);

    if (allocation_overview.length) {
      for (let i = 0; i < allocation_overview.length; i++) {
        ans_obj.total_sos += 1;
        ans_obj.total_qty += allocation_overview[i].total_qty;
        ans_obj.allocated_qty += allocation_overview[i].allocated_qty;

        if (
          allocation_overview[i].allocated_qty > 0 &&
          allocation_overview[i].allocated_qty !=
          allocation_overview[i].total_qty
        ) {
          ans_obj.partially_completed += 1;
        }
        if (allocation_overview[i].allocated_qty == 0) {
          ans_obj.pending += 1;
        }
        if (
          allocation_overview[i].allocated_qty ==
          allocation_overview[i].total_qty
        ) {
          ans_obj.completed += 1;
        }
      }


      ans_obj.allocated_qty = Number(ans_obj.allocated_qty.toFixed(2))


      return res.status(200).send({
        status_code: 200,
        message: "Allocation Overview",
        data: ans_obj,
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
        "Some error occurred while retrieving sales order allocation",
    });
  }
};

exports.get_sku_item_list = async (req, res) => {
  try {
    var { company_code, plant_id, delivery_date, customer_type, route_id } =
      req.query;

    if (!(company_code && plant_id && delivery_date)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    let filter = {
      company_code,
      plant_id,
      delivery_date,
      // pending_qty: { $gt: 0 },
      route_id: { $ne: "" },
      $expr:{
        $or :[
          {$not:{
            $eq:["$pending_qty",0]
          }},
          {$not:{
            $gte:["$delivery_posted_qty","$order_qty"]
          }}
        ]
      }
    };

    if (customer_type) {
      let customer_type_array = customer_type.split(",");
      filter.distribution_channel = { $in: customer_type_array };
    }

    if (route_id) {
      let route_id_array = route_id.split(",");
      filter.route_id = { $in: route_id_array };
    }

    let sku_item_list = await sales_order_allocation_table.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: "$material_no",
          material_no: { $first: "$material_no" },
          material_name: { $first: "$material_name" },
          uom: { $first: "$uom" },
        },
      },
      {
        $project: {
          _id: 0,
          item_name: "$material_name",
          item_no: "$material_no",
          item_uom: "$uom",
        },
      },
      {
        $sort: {
          item_name: 1,
        },
      },
    ]);

    if (sku_item_list.length) {
      return res
        .status(200)
        .send({ status_code: 200, message: "Sku list!", data: sku_item_list });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "Sku list not available!",
      });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message ||
        "Some error occurred while retrieving sales order allocation",
    });
  }
};

exports.get_sku_stock_detail = async (req, res) => {
  try {
    var {
      company_code,
      plant_id,
      material_no,
      delivery_date,
      customer_type,
      route_id,
    } = req.query;

    if (!(company_code && plant_id && delivery_date && material_no)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    let filter = { company_code, plant_id, delivery_date, material_no };

    if (customer_type) {
      let customer_type_filter_array = customer_type.split(",");
      filter.distribution_channel = { $in: customer_type_filter_array };
    }

    if (route_id) {
      let route_filter_array = route_id.split(",");
      filter.route_id = { $in: route_filter_array };
    }

    let sku_stock_item_list = await sales_order_allocation_table.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: "$material_no",
          count: { $sum: 1 },
          material_no: { $first: "$material_no" },
          material_name: { $first: "$material_name" },
          total_order_qty: { $sum: "$order_qty" },
          customer_array: {
            $addToSet: {
              customer_no: "$customer_code",
            },
          },
        },
      },
      {
        $lookup: {
          from: "rapid_stock_summary",
          localField: "_id",
          foreignField: "material_no",
          as: "stock_detail",
        },
      },
      {
        $project: {
          material_no: "$material_no",
          material_name: "$material_name",
          total_order_qty: "$total_order_qty",
          no_of_customer: { $size: "$customer_array" },
          // stah :{
          //     $cond :{
          //       if:{
          //         $eq : ["$stock_detail",null]
          //       },
          //       then :0,
          //       else :{
          //         $arrayElemAt :["$stock_detail.opening_stock",0]
          //     }
          //     }
          // },
          stock_qty:{$trunc:[  {
            $ifNull: [
              {
                $arrayElemAt: ["$stock_detail.inventory_stock_qty", 0],
              },
              0,
            ],
          },2]}
         
        },
      },
    ]);

    if (sku_stock_item_list.length) {
      return res.status(200).send({
        status_code: 200,
        message: "Sku Stock Detail",
        data: sku_stock_item_list[0],
      });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "Sku_stock_detail not available!",
      });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message ||
        "Some error occurred while retrieving sales order allocation",
    });
  }
};

exports.get_so_list_sku = async (req, res) => {

  
  try {
    var {
      company_code,
      plant_id,
      material_no,
      delivery_date,
      customer_type,
      route_id,
    } = req.query;

    if (!(company_code && plant_id && delivery_date && material_no)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    // let filter = {
    //   company_code,
    //   plant_id,
    //   delivery_date,
    //   material_no,
    //   pending_qty: { $gt: 0 },
    // };

    let filter = {
      company_code,
      plant_id,
      delivery_date,
      material_no,
      $expr:{
        $or :[
          {$not:{
            $eq:["$pending_qty",0]
          }},
          {$not:{
            $gte:["$delivery_posted_qty","$order_qty"]
          }}
        ]
      } 
    };

    if (customer_type) {
      let customer_type_filter_array = customer_type.split(",");
      filter.distribution_channel = { $in: customer_type_filter_array };
    }

    if (route_id) {
      let route_id_filter_array = route_id.split(",");
      filter.route_id = { $in: route_id_filter_array };
    }

    let sku_so_list = await sales_order_allocation_table.aggregate([
      {
        $match: filter,
      },

      {
        $project: {
          sales_order_no: "$sales_order_no",
          customer_code: "$customer_code",
          customer_name: "$customer_name",
          material_no: "$material_no",
          material_name: "$material_name",
          uom: "$uom",
          order_qty: "$order_qty",
          order_qty_percent: {
            $toInt: "100",
          },
          pending_qty: {$trunc:["$pending_qty",2]},
          allocated_qty: {$trunc:["$allocated_qty",2]},
          allocated_qty_percent: {
            $round: [
              {
                $multiply: [{ $divide: ["$allocated_qty", "$order_qty"] }, 100],
              },
              0,
            ],
          },
          create_count: "$create_count",
          route_id: "$route_id",
          createdAt: "$createdAt",
        },
      },
      {
        $sort: {
          sales_order_no: 1,
        },
      },
    ]);

    if (sku_so_list.length) {
      return res.status(200).send({
        status_code: 200,
        message: "SO ID List",
        so_count: sku_so_list.length,
        data: sku_so_list,
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
        "Some error occurred while retrieving sales order allocation",
    });
  }
};

exports.get_sku_crate_detail = async (req, res) => {
  try {
    var { company_code, plant_id, material_no, so_no, crate_index } = req.query;

    if (!(company_code && plant_id && material_no && so_no && crate_index)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    if (crate_index < 1) {
      return res.send({
        status_code: 400,
        message: "Please provide valid crate index!",
      });
    }

    let filter = { company_code, plant_id, material_no, sales_order_no: so_no };

    //   if(customer_type){
    //       filter.distribution_channel = customer_type
    //   }

    //   if(route_id){
    //     filter.route_id = route_id
    // }

    let crate_detail = await sales_order_allocation_table.aggregate([
      {
        $match: filter,
      },
      {
        $project: {
          sales_order_no: "$sales_order_no",
          customer_name: "$customer_name",
          material_no: "$material_no",
          order_qty: "$order_qty",
          allocated_qty: "$allocated_qty",
          pending_qty: "$pending_qty",
          crate_detail: {
            $arrayElemAt: ["$allocation_detail", { $toInt: crate_index - 1 }],
          },
        },
      },
      {
        $project: {
          _id: 0,
          sales_order_no: "$sales_order_no",
          customer_name: "$customer_name",
          material_no: "$material_no",
          crate_id: "$crate_detail._id",
          crate_barcode: "$crate_detail.crate_barcode",
          gross_weight: "$crate_detail.gross_weight",
          net_weight: "$crate_detail.net_weight",
          tare_weight: "$crate_detail.tare_weight",
          allocation_status:"$crate_detail.allocation_status",
          crate_type: { $ifNull: ["$crate_detail.crate_type", "NA"] },
          mode: { $ifNull: ["$crate_detail.mode", "NA"] },
          lotting_loss: {
            $cond: {
              if: {
                $gte: ["$allocated_qty", "$order_qty"],
              },
              then: "$pending_qty",
              else: 0,
            },
          },
        },
      },
    ]);

    if (crate_detail.length) {
      return res.status(200).send({
        status_code: 200,
        message: "Crate Detail!",
        data: crate_detail[0],
      });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "Crate detail not available!",
      });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message || "Some error occurred while retrieving Crate Detail",
    });
  }
};

exports.add_allocation_crates = async (req, res) => {
  console.log("add_allocation_crates");
  let id = req.params.id;
  let gross_weight = req.body.gross_weight.toFixed(2);
  let tare_weight = req.body.tare_weight.toFixed(2);
  let user_name = req.body.user_name;
  let crate_barcode = req.body.crate_barcode;
  let crate_type = req.body.crate_type;

  try {
    if (
      !(
        gross_weight != null &&
        tare_weight != null &&
        user_name &&
        crate_barcode &&
        crate_type
      )
    ) {
      return res
        .status(400)
        .send({ status_code: "400", message: "Missing parameter." });
    }

    let diff = Number(gross_weight) - Number(tare_weight)

    if(diff<=0){
      return res.status(400).send({
        status_code :"400",
        message:"Please add some weight to crate!"
      })
    }

    let so_data = await sales_order_allocation_table.findById(id);
    let so_delivery_date = so_data.delivery_date;

    if (!so_data.route_id || so_data.route_id == "") {
      return res.status(400).send({
        status_code: "400",
        message: "Please update the route!",
      });
    }

    let duplicate_crate_barcode_data = await sales_order_allocation_table.findOne({
      "allocation_detail.crate_barcode": crate_barcode,
      delivery_date: so_delivery_date
    });

    if (duplicate_crate_barcode_data) {
      return res.status(400).send({
        status_code: "400",
        message: "Crate assigned to another sale order",
      });
    }

    if (so_data.pending_qty <= 0) {
      return res.status(400).send({
        status_code: "400",
        message: "Already allocated Maximum Quantity!",
      });
    }
    if (so_data.uom != "KG" && so_data.uom != "kg") {
      return res.status(400).send({
        status_code: "400",
        message: "Manual allocation can be done for only KG materials!",
      });
    }

    let opening_stock_data = await stock_summary_table.findOne(
      {
        material_no: so_data.material_no,
        company_code: so_data.company_code,
        plant_id: so_data.plant_id,
      },
      { total_stock_qty: 1,manual_allocated_qty:1 }
    );
    // let opening_stock = opening_stock_data ? opening_stock_data.opening_stock : 0;
    // if(!(opening_stock))
    // {
    //   return res.status(400).send({
    //     status_code: "400",
    //     message: "Stock Unable for the sku!",
    //   });
    // }

    let push_data = {};
    let net_weight = +(gross_weight - tare_weight).toFixed(2);
    push_data.user_name = user_name;
    push_data.crate_barcode = crate_barcode;
    push_data.tare_weight = parseFloat(tare_weight);
    push_data.gross_weight = parseFloat(gross_weight);
    push_data.net_weight = parseFloat(net_weight);
    push_data.crate_type = crate_type;
    push_data.mode = "manual";
    // console.log("push_data", push_data);

    let so_pending_qty = so_data.pending_qty;
    let so_order_qty = so_data.order_qty;
    let updated_pending_qty = so_pending_qty - net_weight;
    let temp_net_weight = net_weight;
    let lotting_loss = 0;
    let is_ready_for_invoice_flag = false;
    if (updated_pending_qty < 0) {
      // 1 - 3 = -2
      let x = Math.abs(updated_pending_qty);
      lotting_loss += x;
      temp_net_weight -= x;
      is_ready_for_invoice_flag = true;
    }
    else if (updated_pending_qty == 0)
      is_ready_for_invoice_flag = true;


    //console.log("temp_net_weight",temp_net_weight,lotting_loss,push_data,is_ready_for_invoice_flag,net_weight,updated_pending_qty)

    //updating to fixed decimal
    let updating_allocated_qty = +(so_data.allocated_qty + temp_net_weight).toFixed(2);
    let updating_inventory_allocated_qty = +(so_data.inventory_allocated_qty + temp_net_weight).toFixed(2);
    let updating_pending_qty = +(so_data.pending_qty - temp_net_weight).toFixed(2);
    let updating_lotting_loss = +(so_data.lotting_loss + lotting_loss).toFixed(2);
    //console.log("updating_allocated_qty", updating_allocated_qty, updating_inventory_allocated_qty, updating_pending_qty, updating_lotting_loss);

    await sales_order_allocation_table.updateOne(
      { _id: new ObjectId(id) },
      {
        $inc: {
          create_count: 1
        },
        $push: {
          allocation_detail: push_data,
        },
        $set: {
          is_ready_for_invoice: is_ready_for_invoice_flag,
          allocated_qty: updating_allocated_qty,
          inventory_allocated_qty: updating_inventory_allocated_qty,
          pending_qty: updating_pending_qty,
          lotting_loss: updating_lotting_loss
        }
      },
      { upsert: false }
    );

    if (opening_stock_data) {
      console.log("entered");
      let updating_total_stock_qty = +(opening_stock_data.total_stock_qty - net_weight).toFixed(2);
      let updating_manual_allocated_qty = +(opening_stock_data.manual_allocated_qty + net_weight).toFixed(2);
      console.log("updating_total_stock_qty",updating_total_stock_qty,updating_manual_allocated_qty, typeof updating_total_stock_qty,typeof updating_manual_allocated_qty);


      // let updating_allocated_qty = +(so_data.allocated_qty + temp_net_weight).toFixed(2);
      await stock_summary_table.updateOne(
        { _id: new ObjectId(opening_stock_data._id) },
        { $set: { total_stock_qty: updating_total_stock_qty, manual_allocated_qty: updating_manual_allocated_qty } },
        { upsert: false }
      );
    } else {
      let insert_data = {};
      insert_data.material_no = so_data.material_no;
      insert_data.material_name = so_data.material_name;
      insert_data.uom = so_data.uom;
      insert_data.company_code = so_data.company_code;
      insert_data.plant_id = so_data.plant_id;
      insert_data.inwarded_qty = 0;
      insert_data.auto_allocated_qty = 0;
      insert_data.manual_allocated_qty = net_weight;
      insert_data.total_stock_qty = -net_weight;
      insert_data.opening_stock = 0;
      insert_data.inventory_stock_qty = 0;
      insert_data.inventory_grn_posted_qty = 0;
      insert_data.inventory_invoice_posted_qty = 0;
      const new_stock_entry = new stock_summary_table(insert_data);
      let previous_stock = await new_stock_entry.save(new_stock_entry);
    }
    return res.status(200).send({
      status_code: 200,
      message: "Data Updated Successfully",
    });
  } catch (err) {
    res.status(500).send({
      status_code: "500",
      message:
        err.message ||
        "Some error occurred while retrieving allocation details.",
    });
  }
};

exports.remove_allocated_crate = async (req, res) => {
  try {
    var { so_no, crate_id, net_weight, material_no, mode } = req.body;

    if (!(so_no && crate_id && net_weight && material_no && mode)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }


    var update_summary = {
      $inc: {
        total_stock_qty: +net_weight,
        auto_allocated_qty: +net_weight
      }
    };

    if (mode == "manual") {
      update_summary = {
        $inc: {
          total_stock_qty: +net_weight,
          manual_allocated_qty: +net_weight
        }
      }
    }


    let remove_crate = await sales_order_allocation_table.updateOne(
      { sales_order_no: so_no, "allocation_detail._id": ObjectId(crate_id) },
      {
        $inc: {
          create_count: -1,
          pending_qty: +net_weight,
          allocated_qty: -net_weight,
        },
        $pull: { allocation_detail: { _id: ObjectId(crate_id) } },
      }
    );

    if (remove_crate && remove_crate.nModified) {
      await stock_summary_table.updateOne(
        { material_no: material_no },
        update_summary
      );

      return res
        .status(200)
        .send({ status_code: 200, message: "Crate removed successfully!" });
    } else {
      return res
        .status(400)
        .send({ status_code: 400, message: "Crate not found!" });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message: error.message || "Some error occurred while removing crate",
    });
  }
};
