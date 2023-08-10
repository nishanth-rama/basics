const db = require("../../models");
const sales_order_allocation_table = db.soAllocation;
const moment_tz = require("moment-timezone");
var ObjectId = require("mongodb").ObjectId;
const stock_summary_table = db.stock_summary;
const crypto = require("crypto");

exports.get_so_list = async (req, res) => {

  try {

    var { company_code, plant_id, delivery_date, customer_type, route_id } = req.query;


    if (!(company_code && plant_id && delivery_date)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    // let filter = { company_code, plant_id, delivery_date, pending_qty: { $gt: 0 },route_id:{$ne:""} };

    let filter = { company_code, plant_id, delivery_date,route_id:{$ne:""}, 
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

    // let filter = {company_code,plant_id,delivery_date}


    if (customer_type) {
      let customer_type_array = customer_type.split(",")
      filter.distribution_channel = { $in: customer_type_array }
    }

    if (route_id) {
      let route_id_array = route_id.split(",")
      filter.route_id = { $in: route_id_array }
    }

    // console.log("filter",filter);

    let so_list_so_allocation = await sales_order_allocation_table.aggregate([
      {
        $match: filter
      },
      {
        $group: {
          _id: "$sales_order_no",
          sales_order_no: { $first: "$sales_order_no" },
          createdAt: { $first: "$createdAt" }
        }
      },
    
      {
        $project: {
          _id: 0,
          sales_order_no: 1,
          createdAt: 1,
          // so_allocation_detail:1
        }
      },
      {
        $sort: {
          sales_order_no: 1
        }
      }

    ])


    if (so_list_so_allocation.length) {
      return res.status(200).send({ status_code: 200, message: "SO ID List for so allocation", data: so_list_so_allocation })
    }
    else {
      return res.status(400).send({
        status_code: 400,
        message: "Sales Order not available!",
      });
    }


  }
  catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message || "Some error occurred while retrieving sales order allocation",
    });
  }
}

exports.get_lotting_loss_details = async (req, res) => {

  try {

    var { company_code, plant_id, delivery_date } = req.query;


    if (!(company_code && delivery_date)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    let filter = { company_code, delivery_date };
    if(plant_id) {
      filter.plant_id = plant_id;
    }
    let project = {
      _id: 0,
      sales_order_no: 1,
      customer_code: 1,
      customer_name: 1,
      distribution_channel: 1,
      distribution_channel_description: 1,
      material_name: 1,
      material_no: 1,
      order_qty: 1,
      allocated_qty: 1,
      lotting_loss: 1,
      plant_id: 1,
      company_code: 1,
      uom: 1,
      delivery_date: 1,
      //invoice_details:1
    }

    let so_list_so_allocation = await sales_order_allocation_table.aggregate([
      {
        $match: filter
      },
      { $sort: { lotting_loss: -1 } },
      {
        $lookup: {
          from: "rapid_allocation_invoice_details",
          localField: "sales_order_no",
          foreignField: "sales_order_no",
          pipeline: [{
            $limit: 1
          }],
          as: "invoice_details",
        }
      },
      { $unwind: "$invoice_details" },
      {
        $project: project
      }

    ])


    if (so_list_so_allocation.length) {
      return res.status(200).send({ status_code: 200, message: "Lotting loss Details available", data: so_list_so_allocation })
    }
    else {
      return res.status(200).send({
        status_code: 200,
        message: "Lotting Loss Data not available!",
        data: so_list_so_allocation
      });
    }


  }
  catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message || "Some error occurred while retrieving sales order allocation",
    });
  }
}


exports.get_item_list = async (req, res) => {

  try {

    var { company_code, plant_id, so_no, customer_type, route_id } = req.query;


    if (!(company_code && plant_id && so_no)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    // let filter = { company_code, plant_id, sales_order_no: so_no, pending_qty: { $gt: 0 } };

    let filter = { company_code, plant_id, sales_order_no: so_no, 
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

    // let filter = {company_code,plant_id,sales_order_no:so_no}

    // console.log("filter",filter);

    if (customer_type) {
      let customer_type_array = customer_type.split(",")
      filter.distribution_channel = { $in: customer_type_array }
    }

    if (route_id) {
      let route_id_array = route_id.split(",")
      filter.route_id = { $in: route_id_array }
    }


    let so_allocation_item_list = await sales_order_allocation_table.aggregate([
      {
        $match: filter
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
            $toInt: "100"
          },
          pending_qty:{$trunc:["$pending_qty",2]} ,
          allocated_qty: {$trunc:["$allocated_qty",2]},
          allocated_qty_percent: { $round: [{ $multiply: [{ $divide: ["$allocated_qty", "$order_qty"] }, 100] }, 0] },
          create_count: "$create_count",
          route_id: "$route_id",
          item_no: "$item_no",
          createdAt: "$createdAt"


        }
      },
      {
        $sort: {
          item_no: 1
        }
      }
      // {
      //     $group :{
      //         _id:"$material_no",
      //         material_no : {$first:"$material_no"},
      //         material_name : {$first : "$material_name"},
      //         uom : {$first : "$uom"}

      //     }
      // },
      // {
      //     $project :{
      //         _id : 0,
      //         item_name : "$material_name",
      //         item_no : "$material_no",
      //         item_uom : "$uom"
      //     }
      // },
      // {
      //     $sort : {
      //         item_name:1
      //     }
      // }

    ])


    if (so_allocation_item_list.length) {

      return res.status(200).send({ status_code: 200, message: "Sku list!", sku_count: so_allocation_item_list.length, data: so_allocation_item_list })
    }
    else {
      return res.status(400).send({
        status_code: 400,
        message: "SKU list not available!",
      });
    }


  }
  catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message || "Some error occurred while retrieving sales order allocation",
    });
  }
}


exports.get_progress_bar_detail = async (req, res) => {

  try {

    var { company_code, plant_id, so_no, material_no, customer_type, route_id } = req.query;


    if (!(company_code && plant_id && so_no && material_no)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    // let filter = {company_code,plant_id,sales_order_no:so_no,pending_qty:{$gt:0}}

    let filter = { company_code, plant_id, material_no, sales_order_no: so_no }

    if (customer_type) {
      let customer_type_array = customer_type.split(",")
      filter.distribution_channel = { $in: customer_type_array }
    }

    if (route_id) {
      let route_id_array = route_id.split(",")
      filter.route_id = { $in: route_id_array }
    }


    let so_allocation_item_list = await sales_order_allocation_table.aggregate([
      {
        $match: filter
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
            $toInt: "100"
          },
          pending_qty: {$trunc:["$pending_qty",2]},
          allocated_qty: {$trunc:["$allocated_qty",2]},
          allocated_qty_percent: { $round: [{ $multiply: [{ $divide: ["$allocated_qty", "$order_qty"] }, 100] }, 0] },
          create_count: "$create_count",
          // route_id:"$route_id",
          // createdAt:"$createdAt"


        }
      },
      // {
      //   $sort:{
      //     createdAt:1
      //   }
      // }
      // {
      //     $group :{
      //         _id:"$material_no",
      //         material_no : {$first:"$material_no"},
      //         material_name : {$first : "$material_name"},
      //         uom : {$first : "$uom"}

      //     }
      // },
      // {
      //     $project :{
      //         _id : 0,
      //         item_name : "$material_name",
      //         item_no : "$material_no",
      //         item_uom : "$uom"
      //     }
      // },
      // {
      //     $sort : {
      //         item_name:1
      //     }
      // }

    ])


    if (so_allocation_item_list.length) {

      return res.status(200).send({ status_code: 200, message: "Sku progress bar detail!", data: so_allocation_item_list[0] })
    }
    else {
      return res.status(400).send({
        status_code: 400,
        message: "Sku progress bar detail not available!",
      });
    }


  }
  catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message || "Some error occurred while retrieving sales order allocation",
    });
  }
}

exports.update_allocated_qty = async(req,res) =>{
  console.log("update_allocated qty api");
  try {

    const ordersToUpdate = req.body; 

  if (!Array.isArray(ordersToUpdate)) {
    return res.status(400).json({status_code:400, message: 'Invalid payload format. Expected an array of sales order updates.' });
  }

  const hasInvalidOrder = ordersToUpdate.some(order => {
    console.log('orddd',order);
    return !(
      order.company_code &&
      order.plant_id &&
      order.sales_order_no &&
      order.material_no &&
      order.user_name &&
      order.quantity
    );
  });



  if (hasInvalidOrder) {
    return res.status(400).json({ error: 'Invalid payload format. Each object must have the company_code,plant_id,sales_order_no,material_no,user_name and quantity field.' });
  }

    // let qty_check = await sales_order_allocation_table.findOne({company_code,plant_id,sales_order_no,material_no})


    // if(qty_check && qty_check.pending_qty < quantity){
    //   return res.send({status_code:400,message:"Quantity should not be greater than pending qty"})
    // }

    const bulkWriteOperations = ordersToUpdate.map((order) => {
          
    const randomBytes = crypto.randomBytes(3); 
    const randomValue = randomBytes.readUIntBE(0, 3);
    const sixDigitNumber = randomValue % 1000000; 
    const paddedNumber = sixDigitNumber.toString().padStart(6, '0');

   let allocation_object = {
      entry_time: new Date(),
      allocation_status: "wait",
      user_name: order.user_name,
      crate_barcode: paddedNumber,
      tare_weight: 0,
      gross_weight: order.quantity,
      net_weight: order.quantity,
      crate_type:"Others",  
      mode: "manual",
        }

    
    return   sales_order_allocation_table.updateOne(
      {company_code:order.company_code,plant_id:order.plant_id,sales_order_no:order.sales_order_no,material_no:order.material_no},
      {
        $inc:{
          allocated_qty:order.quantity,
          pending_qty: -order.quantity,
          create_count:+1
        },
        $push :{
          allocation_detail : allocation_object
        }
      }
      )

    });

    let final_result = await Promise.all(bulkWriteOperations)

    return res.send({status_code:200,message:"Allocated qty updated!"})


      // if(update_allocated_qtys){
      //     return res.send({status_code:200,message:"Allocated qty updated!"})
      // }
      // else {
      //     return res.send({status_code:400,message:"Allocated qty update failed!"})
      // }

  }
  catch(error){
    return res.status(500).send({
      status_code: 500,
      message:
        error.message || "Some error occurred while updating allocated qty in SO allocation",
    });
  }
}


