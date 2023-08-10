const db = require("../../models");
const secondary_storage_table = db.secondary_storage;
const job_scheduler_table = db.JobScheduler;
const job_scheduler_v2_table = db.rapid_job_scheduler_v2;
const sales_order_table = db.salesOrder;
const so_allocation_table = db.soAllocation;
const conn = require("../../../server.js");
const { product_weight_model } = require("../../models");

exports.get_pick_to_light_rack_route = async (req, res) => {
  let bin_id = req.query.bin_id;
  let company_code = req.query.company_code;
  let plant_id = req.query.plant_id;
  let decision_scanner = req.query.decision_scanner;
  let job_scheduled_on = req.query.job_scheduled_on;

  if (
    !(
      bin_id &&
      company_code &&
      plant_id &&
      decision_scanner &&
      job_scheduled_on
    )
  ) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }

  try {
    var sales_order_no = await job_scheduler_table.findOne(
      {
        binId: bin_id,
        plant_id: plant_id,
        company_code: company_code,
        job_scheduled_on: job_scheduled_on,
      },
      { _id: 0, sales_order_no: 1 }
    );
    if (!sales_order_no) {
      return res.status(400).send({
        status_code: "400",
        status_message: "Sales Order No is unavailable for given bin_id",
      });
    }

    var material_no = await so_allocation_table.find(
      {
        sales_order_no: sales_order_no.sales_order_no,
        plant_id: plant_id,
        company_code: company_code,
        pending_qty: { $gt: 0 },
      },
      { _id: 0, material_no: 1, pending_qty: 1 }
    );

    if (!material_no.length) {
      return res.status(400).send({
        status_code: "400",
        status_message: "No material no is available",
      });
    }

    let material_no_array = [];
    material_no.forEach((element) => {
      material_no_array.push(element.material_no);
    });

    let condition = {};
    condition.rack_type = "secondary_discrete";
    condition.material_code = { $in: material_no_array };
    condition.decision_scanner = decision_scanner;
    condition.current_stock = { $gt: 0 };

    let rack_id = await secondary_storage_table.aggregate([
      { $match: condition },
      { $group: { _id: "$material_code", rack_id: { $first: "$rack_id" } } },
      { $group: { _id: "$rack_id" } },
      { $sort: { _id: 1 } },
    ]);

    return res.status(200).send({
      status_code: "200",
      status_message: "Listing the Rack_id",
      data: rack_id,
    });
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

exports.get_pick_to_light_rack_route_v2 = async (req, res) => {
  let bin_id = req.query.bin_id;
  let company_code = req.query.company_code;
  let plant_id = req.query.plant_id;
  let decision_scanner = req.query.decision_scanner;
  let job_scheduled_on = req.query.job_scheduled_on;

  if (
    !(
      bin_id &&
      company_code &&
      plant_id &&
      decision_scanner &&
      job_scheduled_on
    )
  ) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }

  try {
    var sales_order_no_assigned = await job_scheduler_v2_table.aggregate([
      {
        $match: {
          bin_id: bin_id,
          plant_id: plant_id,
          company_code: company_code,
          job_scheduled_on: job_scheduled_on,
          is_deleted: false,
        },
      },
    ]);

    if (!sales_order_no_assigned.length) {
      return res.status(400).send({
        status_code: "400",
        status_message: "Bin not assigned to Sale Order",
      });
    }
    var sales_order_no = await job_scheduler_v2_table.aggregate([
      {
        $match: {
          bin_id: bin_id,
          plant_id: plant_id,
          company_code: company_code,
          job_scheduled_on: job_scheduled_on,
          is_deleted: false,
        },
      },
      { $unwind: "$bin_detail" },
      { $match: { "bin_detail.pending_qty": { $gt: 0 } } },
      { $project: { _id: 0, sales_order_no: 1, bin_detail: 1 } },
    ]);
    if (!sales_order_no.length) {
      return res.status(400).send({
        status_code: "400",
        status_message: "pending quantity is zero for the bin",
      });
    }

    // res.send(sales_order_no);

    // var material_no = await so_allocation_table.find(
    //   {
    //     sales_order_no: sales_order_no.sales_order_no,
    //     plant_id: plant_id,
    //     company_code: company_code,
    //     pending_qty: { $gt: 0 },
    //   },
    //   { _id: 0, material_no: 1, pending_qty: 1 }
    // );

    // if (!material_no.length) {
    //   return res.status(400).send({
    //     status_code: "400",
    //     status_message: "No material no is available",
    //   });
    // }

    let material_no_array = [];
    sales_order_no.forEach((element) => {
      material_no_array.push(element.bin_detail.material_no);
    });

    let condition = {};
    condition.rack_type = "secondary_discrete";
    condition.material_code = { $in: material_no_array };
    condition.decision_scanner = decision_scanner;
    condition.current_stock = { $gt: 0 };

    let rack_id = await secondary_storage_table.aggregate([
      { $match: condition },
      { $group: { _id: "$material_code", rack_id: { $first: "$rack_id" } } },
      { $group: { _id: "$rack_id" } },
      { $sort: { _id: 1 } },
    ]);

    return res.status(200).send({
      status_code: "200",
      status_message: "Listing the Rack_id",
      data: rack_id,
    });
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

// exports.get_pick_to_light_rack_route_v2 = async (req, res) => {
//   let bin_id = req.query.bin_id;
//   let company_code = req.query.company_code;
//   let plant_id = req.query.plant_id;
//   let decision_scanner = req.query.decision_scanner;
//   let job_scheduled_on = req.query.job_scheduled_on;

//   if (
//     !(
//       bin_id &&
//       company_code &&
//       plant_id &&
//       decision_scanner &&
//       job_scheduled_on
//     )
//   ) {
//     return res
//       .status(400)
//       .send({ status_code: "400", status_message: "Missing parameter." });
//   }

//   try {
//     var sales_order_no = await job_scheduler_v2_table.aggregate([
//       {
//         $match: {
//           plant_id: plant_id,
//           company_code: company_code,
//           job_scheduled_on: job_scheduled_on,
//         },
//       },
//       { $unwind: "$bin_detail" },
//       {
//         $match: {
//           $and: [
//             { "bin_detail.bin_full": false },
//             { "bin_detail.bin_id": bin_id },
//           ],
//         },
//       },
//       { $project: { _id: 0, sales_order_no: 1 } },
//     ]);

//     if (!sales_order_no.length) {
//       return res.status(400).send({
//         status_code: "400",
//         status_message: "Sales Order No is unavailable for given bin_id",
//       });
//     }

//     var material_no = await so_allocation_table.find(
//       {
//         sales_order_no: sales_order_no[0].sales_order_no,
//         plant_id: plant_id,
//         company_code: company_code,
//         pending_qty: { $gt: 0 },
//       },
//       { _id: 0, material_no: 1, pending_qty: 1 }
//     );

//     if (!material_no.length) {
//       return res.status(400).send({
//         status_code: "400",
//         status_message: "No material no is available",
//       });
//     }

//     let material_no_array = [];
//     material_no.forEach((element) => {
//       material_no_array.push(element.material_no);
//     });

//     let condition = {};
//     condition.rack_type = "secondary_discrete";
//     condition.material_code = { $in: material_no_array };
//     condition.decision_scanner = decision_scanner;
//     condition.total_stock = { $gt: 0 };

//     let rack_id = await secondary_storage_table.aggregate([
//       { $match: condition },
//       { $group: { _id: "$material_code", rack_id: { $first: "$rack_id" } } },
//       { $group: { _id: "$rack_id" } },
//       { $sort: { _id: 1 } },
//     ]);

//     return res.status(200).send({
//       status_code: "200",
//       status_message: "Listing the Rack_id",
//       data: rack_id,
//     });
//   } catch (err) {
//     return res.status(400).send({
//       status_code: "400",
//       status_message:
//         err.message || "Some error occurred while creating the customer.",
//     });
//   }
// };

exports.get_pick_to_light_items_rack = async (req, res) => {
  let bin_id = req.query.bin_id;
  let company_code = req.query.company_code;
  let plant_id = req.query.plant_id;
  let data_scanner = req.query.data_scanner;
  let job_scheduled_on = req.query.job_scheduled_on;

  if (
    !(bin_id && company_code && plant_id && data_scanner && job_scheduled_on)
  ) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }

  try {
    let sales_order_no = await job_scheduler_table.findOne(
      {
        binId: bin_id,
        plant_id: plant_id,
        company_code: company_code,
        job_scheduled_on: job_scheduled_on,
      },
      { _id: 0, sales_order_no: 1 }
    );

    if (!sales_order_no) {
      return res.status(400).send({
        status_code: "400",
        status_message: "Sales Order No is unavailable for given bin_id",
      });
    }

    var sales_order_details = await so_allocation_table.find(
      {
        sales_order_no: sales_order_no.sales_order_no,
        plant_id: plant_id,
        company_code: company_code,
        pending_qty: { $gt: 0 },
      },
      { _id: 0, material_no: 1, pending_qty: 1 }
    );

    if (!sales_order_details.length) {
      return res.status(400).send({
        status_code: "400",
        status_message: "material no is unavailable",
      });
    }

    let material_no_array = [];
    sales_order_details.forEach((element) => {
      material_no_array.push(element.material_no);
    });

    let condition = {};
    condition.rack_type = "secondary_discrete";
    condition.material_code = { $in: material_no_array };
    condition.data_scanner = data_scanner;
    condition.current_stock = { $gt: 0 };

    let material_code_secondary = await secondary_storage_table.find(
      condition,
      {
        _id: 0,
        material_code: 1,
        location_id: 1,
        current_stock: 1,
        column_id: 1,
      }
    );

    let response_data = [];

    sales_order_details.forEach((so_details) => {
      let pending_qty = so_details.pending_qty;
      material_code_secondary.forEach((secondary_discrete) => {
        if (secondary_discrete.material_code == so_details.material_no) {
          if (secondary_discrete.current_stock >= pending_qty) {
            let temp_obj = {
              material_code: so_details.material_no,
              location_id: secondary_discrete.location_id,
              column_id: secondary_discrete.column_id,
              total_stock: secondary_discrete.current_stock,
              pick_qty: pending_qty,
            };
            response_data.push(temp_obj);
            pending_qty = pending_qty - pending_qty;
          } else {
            let temp_obj = {
              material_code: so_details.material_no,
              location_id: secondary_discrete.location_id,
              column_id: secondary_discrete.column_id,
              total_stock: secondary_discrete.current_stock,
              pick_qty: secondary_discrete.current_stock,
            };
            response_data.push(temp_obj);
            pending_qty = pending_qty - secondary_discrete.current_stock;
          }
        }
      });
    });

    let final_response_data = [];

    response_data.forEach((element) => {
      if (element.pick_qty) {
        final_response_data.push(element);
      }
    });

    console.log("final_response_data", final_response_data);

    return res.status(200).send({
      status_code: "200",
      status_message: "location_id and their qty",
      data: final_response_data,
    });
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

exports.get_pick_to_light_items_rack_v2 = async (req, res) => {
  let bin_id = req.query.bin_id;
  let company_code = req.query.company_code;
  let plant_id = req.query.plant_id;
  let data_scanner = req.query.data_scanner;
  let job_scheduled_on = req.query.job_scheduled_on;

  if (
    !(bin_id && company_code && plant_id && data_scanner && job_scheduled_on)
  ) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }

  try {
    var sales_order_no_assigned = await job_scheduler_v2_table.aggregate([
      {
        $match: {
          bin_id: bin_id,
          plant_id: plant_id,
          company_code: company_code,
          job_scheduled_on: job_scheduled_on,
          is_deleted: false,
        },
      },
    ]);

    if (!sales_order_no_assigned.length) {
      return res.status(400).send({
        status_code: "400",
        status_message: "Bin not assigned to Sale Order",
      });
    }

    // console.log("sales_order_no_assigned",sales_order_no_assigned);
    var sales_order_no = await job_scheduler_v2_table.aggregate([
      {
        $match: {
          bin_id: bin_id,
          plant_id: plant_id,
          company_code: company_code,
          job_scheduled_on: job_scheduled_on,
          is_deleted: false,
        },
      },
      { $unwind: "$bin_detail" },
      { $match: { "bin_detail.pending_qty": { $gt: 0 } } },
      { $project: { _id: 0, sales_order_no: 1, bin_detail: 1 } },
    ]);
    // console.log("sales_order_no", sales_order_no);

    // console.log("sales_order_no", sales_order_no[0].sales_order_no);
    // let sales_order_no = await job_scheduler_table.findOne(
    //   {
    //     binId: bin_id,
    //     plant_id: plant_id,
    //     company_code: company_code,
    //     job_scheduled_on: job_scheduled_on,
    //   },
    //   { _id: 0, sales_order_no: 1 }
    // );

    if (!sales_order_no.length) {
      return res.status(400).send({
        status_code: "400",
        status_message: "Sales Order No is unavailable for given bin_id",
      });
    }

    // var sales_order_details = await so_allocation_table.find(
    //   {
    //     sales_order_no: sales_order_no.sales_order_no,
    //     plant_id: plant_id,
    //     company_code: company_code,
    //     pending_qty: { $gt: 0 },
    //   },
    //   { _id: 0, material_no: 1, pending_qty: 1 }
    // );

    // if (!sales_order_details.length) {
    //   return res.status(400).send({
    //     status_code: "400",
    //     status_message: "material no is unavailable",
    //   });
    // }

    let material_no_array = [];
    sales_order_no.forEach((element) => {
      material_no_array.push(element.bin_detail.material_no);
    });
    // sales_order_details.forEach((element) => {
    //   material_no_array.push(element.material_no);
    // });

    let condition = {};
    condition.rack_type = "secondary_discrete";
    condition.material_code = { $in: material_no_array };
    condition.data_scanner = data_scanner;
    condition.current_stock = { $gt: 0 };

    let material_code_secondary = await secondary_storage_table.find(
      condition,
      {
        _id: 0,
        material_code: 1,
        location_id: 1,
        current_stock: 1,
        column_id: 1,
      }
    );

    let response_data = [];

    sales_order_no.forEach((so_details) => {
      let pending_qty = so_details.bin_detail.pending_qty;
      material_code_secondary.forEach((secondary_discrete) => {
        if (
          secondary_discrete.material_code == so_details.bin_detail.material_no
        ) {
          if (secondary_discrete.current_stock >= pending_qty) {
            let temp_obj = {
              material_code: so_details.bin_detail.material_no,
              location_id: secondary_discrete.location_id,
              column_id: secondary_discrete.column_id,
              total_stock: secondary_discrete.current_stock,
              pick_qty: pending_qty,
            };
            response_data.push(temp_obj);
            pending_qty = pending_qty - pending_qty;
          } else {
            let temp_obj = {
              material_code: so_details.bin_detail.material_no,
              location_id: secondary_discrete.location_id,
              column_id: secondary_discrete.column_id,
              total_stock: secondary_discrete.current_stock,
              pick_qty: secondary_discrete.current_stock,
            };
            response_data.push(temp_obj);
            pending_qty = pending_qty - secondary_discrete.current_stock;
          }
        }
      });
    });

    let final_response_data = [];

    response_data.forEach((element) => {
      if (element.pick_qty) {
        final_response_data.push(element);
      }
    });

    // console.log("final_response_data", final_response_data);

    return res.status(200).send({
      status_code: "200",
      status_message: "location_id and their qty",
      data: final_response_data,
    });
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

// exports.get_pick_to_light_items_rack_v2 = async (req, res) => {
//   let bin_id = req.query.bin_id;
//   let company_code = req.query.company_code;
//   let plant_id = req.query.plant_id;
//   let data_scanner = req.query.data_scanner;
//   let job_scheduled_on = req.query.job_scheduled_on;
//   let bin_capacity = 5;

//   if (
//     !(bin_id && company_code && plant_id && data_scanner && job_scheduled_on)
//   ) {
//     return res
//       .status(400)
//       .send({ status_code: "400", status_message: "Missing parameter." });
//   }

//   try {
//     let sales_order_no = await job_scheduler_v2_table.findOne(
//       {
//         "bin_detail.bin_id": bin_id,
//         plant_id: plant_id,
//         company_code: company_code,
//         job_scheduled_on: job_scheduled_on,
//       },
//       { _id: 1, sales_order_no: 1 }
//     );

//     if (!sales_order_no) {
//       return res.status(400).send({
//         status_code: "400",
//         status_message: "Sales Order No is unavailable for given bin_id",
//       });
//     }

//     var sales_order_details = await so_allocation_table.find(
//       {
//         sales_order_no: sales_order_no.sales_order_no,
//         plant_id: plant_id,
//         company_code: company_code,
//         pending_qty: { $gt: 0 },
//       },
//       { _id: 0, material_no: 1, pending_qty: 1 }
//     );

//     if (!sales_order_details.length) {
//       return res.status(400).send({
//         status_code: "400",
//         status_message: "material no is unavailable",
//       });
//     }

//     let material_no_array = [];
//     sales_order_details.forEach((element) => {
//       material_no_array.push(element.material_no);
//     });

//     var sales_order_allocated_details = await so_allocation_table.aggregate([
//       {
//         $match: {
//           sales_order_no: sales_order_no.sales_order_no,
//           plant_id: plant_id,
//           company_code: company_code,
//           allocated_qty: { $gt: 0 },
//         },
//       },
//       {
//         $project: {
//           allocated_qty: 1,
//           material_no: 1,
//           _id: 0,
//           allocation_detail: 1,
//         },
//       },
//       { $unwind: "$allocation_detail" },
//       { $match: { "allocation_detail.crate_barcode": bin_id } },
//     ]);

//     console.log("sales_order_allocated_details", sales_order_allocated_details);

//     if (sales_order_allocated_details.length) {
//       let allocated_so_far = 0;
//       let material_no_allocated_array = [];
//       sales_order_allocated_details.forEach((element) => {
//         material_no_allocated_array.push(element.material_no);
//       });

//       let weight_allocated = await product_weight_model.find(
//         {
//           plant_id: plant_id,
//           company_code: company_code,
//           material_code: { $in: material_no_allocated_array },
//         },
//         { _id: 0, material_code: 1, qty_in_kg: 1 }
//       );

//       console.log("weight_allocated", weight_allocated);

//       sales_order_allocated_details.forEach((element) => {
//         weight_allocated.forEach((weight_data) => {
//           if (element.material_no == weight_data.material_code) {
//             let total_material_weight =
//               weight_data.qty_in_kg * element.allocated_qty;
//             console.log(
//               "total_material_weight",
//               weight_data.material_code,
//               total_material_weight
//             );
//             allocated_so_far += total_material_weight;
//             console.log("allocated_so_far", allocated_so_far);
//           }
//         });
//       });

//       bin_capacity -= allocated_so_far;
//     }

//     console.log("bin_capacity", bin_capacity);
//     let condition = {};
//     condition.rack_type = "secondary_discrete";
//     condition.material_code = { $in: material_no_array };
//     condition.data_scanner = data_scanner;
//     condition.total_stock = { $gt: 0 };

//     let material_code_secondary = await secondary_storage_table.find(
//       condition,
//       { _id: 0, material_code: 1, location_id: 1, total_stock: 1, column_id: 1 }
//     );

//     let response_data = [];

//     sales_order_details.forEach((so_details) => {
//       let pending_qty = so_details.pending_qty;
//       material_code_secondary.forEach((secondary_discrete) => {
//         if (secondary_discrete.material_code == so_details.material_no) {
//           if (secondary_discrete.total_stock >= pending_qty) {
//             let temp_obj = {
//               material_code: so_details.material_no,
//               location_id: secondary_discrete.location_id,
//               column_id: secondary_discrete.column_id,
//               total_stock: secondary_discrete.total_stock,
//               pick_qty: pending_qty,
//             };
//             response_data.push(temp_obj);
//             pending_qty = pending_qty - pending_qty;
//           } else {
//             let temp_obj = {
//               material_code: so_details.material_no,
//               location_id: secondary_discrete.location_id,
//               column_id: secondary_discrete.column_id,
//               total_stock: secondary_discrete.total_stock,
//               pick_qty: secondary_discrete.total_stock,
//             };
//             response_data.push(temp_obj);
//             pending_qty = pending_qty - secondary_discrete.total_stock;
//           }
//         }
//       });
//     });

//     console.log("response_data", response_data);

//     final_response_data = [];

//     response_data.forEach((element) => {
//       if (element.pick_qty) {
//         final_response_data.push(element);
//       }
//     });

//     console.log("final_response_data", final_response_data);

//     let material_no_new_allocate_array = [];
//     final_response_data.forEach((element) => {
//       material_no_new_allocate_array.push(element.material_code);
//     });

//     let weight_to_allocated = await product_weight_model.find(
//       {
//         plant_id: plant_id,
//         company_code: company_code,
//         material_code: { $in: material_no_new_allocate_array },
//       },
//       { _id: 0, material_code: 1, qty_in_kg: 1 }
//     );

//     console.log("weight_to_allocate", weight_to_allocated);
//     // console.log("current_bin_capacity",bin_capacity);

//     final_response_data.forEach((element) => {
//       weight_to_allocated.forEach((weight_to_allocate) => {
//         if (element.material_code == weight_to_allocate.material_code) {
//           let each_element_weight = weight_to_allocate.qty_in_kg;
//           let element_weight = element.pick_qty * weight_to_allocate.qty_in_kg;
//           console.log(
//             "current_bin_capacity",
//             bin_capacity,
//             each_element_weight,
//             element_weight
//           );
//           if (element_weight > bin_capacity) {
//             let element_pick_qty = Math.trunc(
//               bin_capacity / each_element_weight
//             );
//             let weight_picked = element_pick_qty * weight_to_allocate.qty_in_kg;
//             bin_capacity -= weight_picked;
//             element.pick_qty = element_pick_qty;
//             console.log("new_bin_capacity", element_pick_qty, weight_picked);
//           } else {
//             let weight_picked = element_weight * weight_to_allocate.qty_in_kg;
//             bin_capacity -= weight_picked;
//           }
//         }
//       });
//     });

//     final_response_data_updated = [];
//     final_response_data.forEach((element) => {
//       if (element.pick_qty) {
//         final_response_data_updated.push(element);
//       }
//     });

//     // if (bin_capacity < 0.1) {
//     //   console.log("bin_capacity less than 0.1");
//     //   let updated_job_scheduler = await job_scheduler_v2_table.updateOne(
//     //     { _id: sales_order_no._id, "bin_detail.bin_id": bin_id },
//     //     { $set: { "bin_detail.$.bin_full": true } },
//     //     { upsert: false, new: true }
//     //   );

//     //   console.log(updated_job_scheduler);
//     // }

//     return res.status(200).send({
//       status_code: "200",
//       status_message: "location_id and their qty",
//       data: final_response_data_updated,
//     });
//   } catch (err) {
//     return res.status(400).send({
//       status_code: "400",
//       status_message:
//         err.message || "Some error occurred while creating the customer.",
//     });
//   }
// };

exports.update_total_Stock_secondary_discrete = async (req, res) => {
  let plant_id = req.body.plant_id;
  let company_code = req.body.company_code;
  let column_id = req.body.column_id;
  let pick_qty = -Math.abs(parseFloat(req.body.pick_qty));
  let bin_id = req.body.bin_id;
  let data_scanner = req.body.data_scanner;
  let job_scheduled_on = req.body.job_scheduled_on;

  if (
    !(
      column_id &&
      company_code &&
      plant_id &&
      pick_qty &&
      bin_id &&
      data_scanner &&
      job_scheduled_on
    )
  ) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }

  let condition = {};
  condition.company_code = company_code;
  condition.plant_id = plant_id;
  condition.rack_type = "secondary_discrete";
  condition.column_id = column_id;
  condition.data_scanner = data_scanner;
  const session = await conn.startSession();

  try {
    session.startTransaction();
    var sales_order_no = await job_scheduler_table.findOne(
      {
        binId: bin_id,
        plant_id: plant_id,
        company_code: company_code,
        job_scheduled_on: job_scheduled_on,
      },
      { _id: 0, sales_order_no: 1 }
    );

    if (!sales_order_no) {
      return res.status(400).send({
        status_code: "400",
        status_message: "Sales Order No is unavailable for given bin_id",
      });
    }

    let updated_secondary_storage =
      await secondary_storage_table.findOneAndUpdate(
        condition,
        {
          $inc: {
            current_stock: pick_qty,
            fillable_stock: parseFloat(req.body.pick_qty),
          },
        },
        { useFindAndModify: false, new: true }
      );

    let rapid_sales_order_allocations_details =
      await so_allocation_table.findOne({
        sales_order_no: sales_order_no.sales_order_no,
        material_no: updated_secondary_storage.material_code,
        plant_id: plant_id,
        company_code: company_code,
      });

    if (!rapid_sales_order_allocations_details) {
      return res.status(400).send({
        status_code: "400",
        status_message: "Invalid Conditions received",
      });
    }

    if (
      parseFloat(rapid_sales_order_allocations_details.order_qty) <
      parseFloat(rapid_sales_order_allocations_details.allocated_qty) +
        parseFloat(req.body.pick_qty)
    ) {
      return res.status(400).send({
        status_code: "400",
        status_message: "Could Not Allocate More than the Ordered Quantity",
      });
    }

    let allocation_id = rapid_sales_order_allocations_details._id;
    let update_data = {};
    update_data.allocated_qty =
      parseFloat(rapid_sales_order_allocations_details.allocated_qty) +
      parseFloat(req.body.pick_qty);
    update_data.pending_qty =
      parseFloat(rapid_sales_order_allocations_details.pending_qty) -
      parseFloat(req.body.pick_qty);
    update_data.create_count =
      rapid_sales_order_allocations_details.create_count + 1;
    update_data.allocation_detail =
      rapid_sales_order_allocations_details.allocation_detail;
    // update_data.mode = "ptl";

    push_data = {};
    push_data.crate_barcode = bin_id;
    push_data.gross_weight = parseFloat(req.body.pick_qty);
    push_data.tare_weight = 0;
    push_data.net_weight = parseFloat(req.body.pick_qty);
    push_data.entry_time = new Date();
    push_data.data_scanner = data_scanner;
    push_data.mode = "ptl";
    push_data.location = updated_secondary_storage.location_id;
    update_data.allocation_detail.push(push_data);

    let updated_data = await so_allocation_table.findByIdAndUpdate(
      { _id: allocation_id },
      update_data,
      { useFindAndModify: false, new: true }
    );
    await session.commitTransaction();

    return res.status(200).send({
      status_code: "200",
      status_message: "data updated successfully",
    });
  } catch (err) {
    await session.abortTransaction();
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

exports.update_total_Stock_secondary_discrete_v2 = async (req, res) => {
  let plant_id = req.body.plant_id;
  let company_code = req.body.company_code;
  let column_id = req.body.column_id;
  let pick_qty = -Math.abs(parseFloat(req.body.pick_qty));
  let bin_id = req.body.bin_id;
  let data_scanner = req.body.data_scanner;
  let job_scheduled_on = req.body.job_scheduled_on;
  // console.log("update_total_Stock_secondary_discrete_v2");
  if (
    !(
      column_id &&
      company_code &&
      plant_id &&
      pick_qty &&
      bin_id &&
      data_scanner &&
      job_scheduled_on
    )
  ) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }

  let condition = {};
  condition.company_code = company_code;
  condition.plant_id = plant_id;
  condition.rack_type = "secondary_discrete";
  condition.column_id = column_id;
  condition.data_scanner = data_scanner;
  const session = await conn.startSession();

  try {
    var sales_order_no_assigned = await job_scheduler_v2_table.aggregate([
      {
        $match: {
          bin_id: bin_id,
          plant_id: plant_id,
          company_code: company_code,
          job_scheduled_on: job_scheduled_on,
          is_deleted: false,
        },
      },
    ]);

    if (!sales_order_no_assigned.length) {
      return res.status(400).send({
        status_code: "400",
        status_message: "Bin not assigned to Sale Order",
      });
    }

    var sales_order_no = await job_scheduler_v2_table.aggregate([
      {
        $match: {
          bin_id: bin_id,
          plant_id: plant_id,
          company_code: company_code,
          job_scheduled_on: job_scheduled_on,
          is_deleted: false,
        },
      },
      { $unwind: "$bin_detail" },
      { $match: { "bin_detail.pending_qty": { $gt: 0 } } },
      { $project: { _id: 1, sales_order_no: 1, bin_detail: 1 } },
    ]);

    // var sales_order_no = await job_scheduler_table.findOne(
    //   {
    //     binId: bin_id,
    //     plant_id: plant_id,
    //     company_code: company_code,
    //     job_scheduled_on: job_scheduled_on,
    //   },
    //   { _id: 0, sales_order_no: 1 }
    // );

    if (!sales_order_no.length) {
      return res.status(400).send({
        status_code: "400",
        status_message: "Sales Order No is unavailable for given bin_id",
      });
    }

    let verify_secondary_length = await secondary_storage_table.find(
      condition,
      {
        material_code: 1,
        location_id: 1,
      }
    );

    if (verify_secondary_length.length != 1) {
      return res.status(400).send({
        status_code: "400",
        status_message: "more than one record present in secondary storage",
      });
    }

    // console.log("sales_order_no",sales_order_no);

    let find_material_code = await secondary_storage_table.findOne(condition, {
      material_code: 1,
      location_id: 1,
    });
    if (!find_material_code) {
      return res.status(400).send({
        status_code: "400",
        status_message: "material code not available in secondary storage",
      });
    }

    let rapid_sales_order_allocations_details =
      await so_allocation_table.findOne({
        sales_order_no: sales_order_no[0].sales_order_no,
        material_no: find_material_code.material_code,
        plant_id: plant_id,
        company_code: company_code,
        pending_qty: { $gte: parseInt(req.body.pick_qty) },
      });

    if (!rapid_sales_order_allocations_details) {
      return res.status(400).send({
        status_code: "400",
        status_message: "Invalid Conditions received",
      });
    }

    if (
      parseFloat(rapid_sales_order_allocations_details.order_qty) <
      parseFloat(rapid_sales_order_allocations_details.allocated_qty) +
        parseFloat(req.body.pick_qty)
    ) {
      return res.status(400).send({
        status_code: "400",
        status_message: "Could Not Allocate More than the Ordered Quantity",
      });
    }

    let allocation_id = rapid_sales_order_allocations_details._id;
    let job_scheduler_id = sales_order_no[0]._id;
    let update_data = {};
    update_data.allocated_qty =
      parseFloat(rapid_sales_order_allocations_details.allocated_qty) +
      parseFloat(req.body.pick_qty);
    update_data.pending_qty =
      parseFloat(rapid_sales_order_allocations_details.pending_qty) -
      parseFloat(req.body.pick_qty);
    update_data.create_count =
      rapid_sales_order_allocations_details.create_count + 1;
    update_data.allocation_detail =
      rapid_sales_order_allocations_details.allocation_detail;
    //update_data.mode = "ptl";

    push_data = {};
    push_data.crate_barcode = bin_id;
    push_data.gross_weight = parseFloat(req.body.pick_qty);
    push_data.tare_weight = 0;
    push_data.net_weight = parseFloat(req.body.pick_qty);
    push_data.entry_time = new Date();
    push_data.data_scanner = data_scanner;
    push_data.mode = "ptl";
    push_data.location = find_material_code.location_id;
    update_data.allocation_detail.push(push_data);

    session.startTransaction();

    let updated_secondary_storage = await secondary_storage_table.updateOne(
      condition,
      {
        $inc: {
          current_stock: pick_qty,
          fillable_stock: parseFloat(req.body.pick_qty),
        },
      },
      { useFindAndModify: false, new: true, session }
    );

    let updated_data = await so_allocation_table.updateOne(
      { _id: allocation_id },
      update_data,
      { useFindAndModify: false, new: true, session }
    );

    let updated_data_jobscheduler = await job_scheduler_v2_table.updateOne(
      {
        _id: job_scheduler_id,
        "bin_detail.material_no": find_material_code.material_code,
      },
      { $inc: { "bin_detail.$.pending_qty": pick_qty } },
      { upsert: false, useFindAndModify: false, new: true, session }
    );

    await session.commitTransaction();

    return res.status(200).send({
      status_code: "200",
      status_message: "Allocation Quantity Updated Successfully",
    });
  } catch (err) {
    await session.abortTransaction();
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

// exports.update_total_Stock_secondary_discrete_v2 = async (req, res) => {
//   let plant_id = req.body.plant_id;
//   let company_code = req.body.company_code;
//   let column_id = req.body.column_id;
//   let pick_qty = -Math.abs(parseFloat(req.body.pick_qty));
//   let bin_id = req.body.bin_id;
//   let data_scanner = req.body.data_scanner;
//   let job_scheduled_on = req.body.job_scheduled_on;
//   let bin_capacity = 5;

//   if (
//     !(
//       column_id &&
//       company_code &&
//       plant_id &&
//       pick_qty &&
//       bin_id &&
//       data_scanner &&
//       job_scheduled_on
//     )
//   ) {
//     return res
//       .status(400)
//       .send({ status_code: "400", status_message: "Missing parameter." });
//   }

//   let condition = {};
//   condition.company_code = company_code;
//   condition.plant_id = plant_id;
//   condition.rack_type = "secondary_discrete";
//   condition.column_id = column_id;
//   condition.data_scanner = data_scanner;

//   const session = await conn.startSession();

//   try {
//     session.startTransaction();
//     var sales_order_no = await job_scheduler_v2_table.findOne(
//       {
//         "bin_detail.bin_id": bin_id,
//         plant_id: plant_id,
//         company_code: company_code,
//         job_scheduled_on: job_scheduled_on,
//       },
//       { _id: 1, sales_order_no: 1 }
//     );

//     if (!sales_order_no) {
//       return res.status(400).send({
//         status_code: "400",
//         status_message: "Sales Order No is unavailable for given bin_id",
//       });
//     }

//     console.log("sales_order_no", sales_order_no);

//     let so_allocated_so_far = await so_allocation_table.aggregate([
//       {
//         $match: {
//           sales_order_no: sales_order_no.sales_order_no,
//           allocated_qty: { $gt: 0 },
//         },
//       },
//       { $unwind: "$allocation_detail" },
//       { $match: { "allocation_detail.crate_barcode": bin_id } },
//     ]);

//     let material_code_allocated_array = [];
//     so_allocated_so_far.forEach((element) => {
//       material_code_allocated_array.push(element.material_no);
//     });

//     console.log("weight_allocated", material_code_allocated_array);

//     let weight_allocated = await product_weight_model.find(
//       {
//         plant_id: plant_id,
//         company_code: company_code,
//         material_code: { $in: material_code_allocated_array },
//       },
//       { _id: 0, material_code: 1, qty_in_kg: 1 }
//     );

//     console.log("weight_allocated", weight_allocated);

//     so_allocated_so_far.forEach((element) => {
//       weight_allocated.forEach((weight) => {
//         if (element.material_no == weight.material_code) {
//           console.log("element.material_no", element.material_no);
//           let weight_for_element =
//             parseInt(element.allocation_detail.net_weight) * weight.qty_in_kg;
//           bin_capacity -= weight_for_element;
//           console.log("weight_for_element", weight_for_element, bin_capacity);
//         }
//       });
//     });

//     let updated_secondary_storage =
//       await secondary_storage_table.findOneAndUpdate(
//         condition,
//         { $inc: { total_stock: pick_qty } },
//         { useFindAndModify: false, new: true }
//       );

//     let rapid_sales_order_allocations_details =
//       await so_allocation_table.findOne({
//         sales_order_no: sales_order_no.sales_order_no,
//         material_no: updated_secondary_storage.material_code,
//         plant_id: plant_id,
//         company_code: company_code,
//       });

//     if (!rapid_sales_order_allocations_details) {
//       await session.abortTransaction();
//       return res.status(400).send({
//         status_code: "400",
//         status_message: "Invalid Conditions received",
//       });
//     }

//     let weight_allocated_now = await product_weight_model.findOne(
//       {
//         plant_id: plant_id,
//         company_code: company_code,
//         material_code: updated_secondary_storage.material_code,
//       },
//       { _id: 0, material_code: 1, qty_in_kg: 1 }
//     );

//     let latest_allocated_material =
//       weight_allocated_now.qty_in_kg * parseFloat(req.body.pick_qty);
//     bin_capacity -= latest_allocated_material;
//     console.log(
//       "latest_allocated_material",
//       latest_allocated_material,
//       bin_capacity
//     );

//     if (bin_capacity < 0.1) {
//       console.log("bin_capacity less than 0.1");
//       let updated_job_scheduler = await job_scheduler_v2_table.updateOne(
//         { _id: sales_order_no._id, "bin_detail.bin_id": bin_id },
//         { $set: { "bin_detail.$.bin_full": true } },
//         { upsert: false, new: true }
//       );
//     }

//     // let updated_secondary_storage =
//     //   await secondary_storage_table.findOneAndUpdate(
//     //     condition,
//     //     { $inc: { total_stock: pick_qty } },
//     //     { useFindAndModify: false, new: true }
//     //   );

//     if (
//       parseFloat(rapid_sales_order_allocations_details.order_qty) <
//       parseFloat(rapid_sales_order_allocations_details.allocated_qty) +
//         parseFloat(req.body.pick_qty)
//     ) {
//       return res.status(400).send({
//         status_code: "400",
//         status_message: "Could Not Allocate More than the Ordered Quantity",
//       });
//     }

//     let allocation_id = rapid_sales_order_allocations_details._id;
//     let update_data = {};
//     update_data.allocated_qty =
//       parseFloat(rapid_sales_order_allocations_details.allocated_qty) +
//       parseFloat(req.body.pick_qty);
//     update_data.pending_qty =
//       parseFloat(rapid_sales_order_allocations_details.pending_qty) -
//       parseFloat(req.body.pick_qty);
//     update_data.create_count =
//       rapid_sales_order_allocations_details.create_count + 1;
//     update_data.allocation_detail =
//       rapid_sales_order_allocations_details.allocation_detail;

//     push_data = {};
//     push_data.crate_barcode = bin_id;
//     push_data.gross_weight = parseFloat(req.body.pick_qty);
//     push_data.tare_weight = 0;
//     push_data.net_weight = parseFloat(req.body.pick_qty);
//     push_data.entry_time = new Date();
//     update_data.allocation_detail.push(push_data);

//     let updated_data = await so_allocation_table.findByIdAndUpdate(
//       { _id: allocation_id },
//       update_data,
//       { useFindAndModify: false, new: true }
//     );
//     await session.commitTransaction();

//     return res.status(200).send({
//       status_code: "200",
//       status_message: "data updated successfully",
//     });
//   } catch (err) {
//     await session.abortTransaction();
//     return res.status(400).send({
//       status_code: "400",
//       status_message:
//         err.message || "Some error occurred while creating the customer.",
//     });
//   }
// };

exports.verify_so_weight = async (req, res) => {
  const company_code = req.query.company_code;
  const plant_id = req.query.plant_id;
  const bin_id = req.query.bin_id;
  const job_scheduled_on = req.query.job_scheduled_on;
  const weight_from_plc = req.query.weight_from_plc;

  if (!(company_code && plant_id && bin_id && job_scheduled_on)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }

  try {
    let sales_order_no = await job_scheduler_table.findOne(
      {
        binId: bin_id,
        plant_id: plant_id,
        company_code: company_code,
        job_scheduled_on: job_scheduled_on,
      },
      { _id: 0, sales_order_no: 1 }
    );

    if (!sales_order_no) {
      return res.status(400).send({
        status_code: "400",
        status_message: "sales order no is unavailable for the given bin!",
      });
    }
    // console.log(sales_order_no);

    let sales_order_details = await so_allocation_table.find(
      {
        sales_order_no: sales_order_no.sales_order_no,
        plant_id: plant_id,
        company_code: company_code,
      },
      { _id: 0, material_no: 1, allocated_qty: 1 }
    );

    if (!sales_order_details.length) {
      return res.status(400).send({
        status_code: "400",
        status_message: "sales order details is empty!",
      });
    }
    // console.log(sales_order_details);
    let material_no_array = [];
    sales_order_details.forEach((element) => {
      if (element.allocated_qty) material_no_array.push(element.material_no);
    });

    // console.log(material_no_array);

    let weight = await product_weight_model.find(
      {
        plant_id: plant_id,
        company_code: company_code,
        material_code: { $in: material_no_array },
      },
      { _id: 0, material_code: 1, qty_in_kg: 1, min_weight: 1, max_weight: 1 }
    );

    if (!weight.length) {
      return res.status(400).send({
        status_code: "400",
        status_message: "product weight tolerance is empty!",
      });
    }

    var min_weight = 2.64;
    var max_weight = 2.64;

    sales_order_details.forEach((sales_order_allocated) => {
      weight.forEach((weight_ele) => {
        if (sales_order_allocated.material_no == weight_ele.material_code) {
          min_weight +=
            sales_order_allocated.allocated_qty * weight_ele.min_weight;
          // console.log(
          //   "min_weight",
          //   sales_order_allocated.material_no,
          //   sales_order_allocated.allocated_qty,
          //   weight_ele.min_weight,
          //   min_weight
          // );
          max_weight +=
            sales_order_allocated.allocated_qty * weight_ele.max_weight;
          // console.log(
          //   "max_weight",
          //   sales_order_allocated.material_no,
          //   sales_order_allocated.allocated_qty,
          //   weight_ele.max_weight,
          //   max_weight
          // );
        }
      });
    });

    console.log("weight_from_plc", weight_from_plc);
    console.log("total_min_weight", min_weight);
    console.log("total_max_weight", max_weight);

    console.log("material_no_array", material_no_array);
    if (weight_from_plc >= min_weight && weight_from_plc <= max_weight) {
      console.log("yes ready_for_invoice");
      await so_allocation_table.updateMany(
        {
          sales_order_no: sales_order_no.sales_order_no,
          plant_id: plant_id,
          company_code: company_code,
        },
        { $set: { is_ready_for_invoice: true } },
        { upsert: false, new: true }
      );
      return res.status(200).send({
        status_code: "200",
        status_message: "Weight accepted!",
        data: {
          status: "yes",
          total_min_weight: min_weight,
          total_max_weight: max_weight,
        },
      });
    } else {
      return res.status(200).send({
        status_code: "200",
        status_message: "Weight rejected!",
        data: {
          status: "no",
          total_min_weight: min_weight,
          total_max_weight: max_weight,
        },
      });
    }
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

exports.verify_bin_weight_v2 = async (req, res) => {
  const company_code = req.body.company_code;
  const plant_id = req.body.plant_id;
  const bin_id = req.body.bin_id;
  const job_scheduled_on = req.body.job_scheduled_on;
  const weight_from_plc = req.body.weight_from_plc;
  // console.log("weight_from_plc", weight_from_plc,weight_from_plc != null);

  if (
    !(
      company_code &&
      plant_id &&
      bin_id &&
      job_scheduled_on &&
      weight_from_plc != null
    )
  ) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }

  try {
    let sales_order_no = await job_scheduler_v2_table.findOne(
      {
        bin_id: bin_id,
        plant_id: plant_id,
        company_code: company_code,
        job_scheduled_on: job_scheduled_on,
        is_deleted: false,
      },
      { _id: 1, sales_order_no: 1 }
    );

    if (!sales_order_no) {
      return res.status(400).send({
        status_code: "400",
        status_message: "Bin not assigned to Sale Order",
      });
    }
    // console.log(sales_order_no);

    let sales_order_details = await so_allocation_table.aggregate([
      {
        $match: {
          sales_order_no: sales_order_no.sales_order_no,
          plant_id: plant_id,
          company_code: company_code,
        },
      },
      { $unwind: "$allocation_detail" },
      {
        $match: { "allocation_detail.crate_barcode": bin_id },
      },
      {
        $project: { allocation_detail: 1, material_no: 1 },
      },
    ]);

    if (!sales_order_details.length) {
      return res.status(400).send({
        status_code: "400",
        status_message: "sales order details is empty!",
      });
    }
    // console.log(sales_order_details);
    // res.send(sales_order_details);
    let material_no_array = [];
    sales_order_details.forEach((element) => {
      material_no_array.push(element.material_no);
    });

    // console.log(material_no_array);

    let weight = await product_weight_model.find(
      {
        plant_id: plant_id,
        company_code: company_code,
        material_code: { $in: material_no_array },
      },
      {
        _id: 0,
        material_code: 1,
        qty_in_kg: 1,
        pack_max_weight: 1,
        pack_min_weight: 1,
      }
    );

    console.log("weight", weight);

    // if (!weight.length) {
    //   return res.status(400).send({
    //     status_code: "400",
    //     status_message: "product weight tolerance is empty!",
    //   });
    // }

    var min_weight = 2.64;
    var max_weight = 2.64;

    sales_order_details.forEach((sales_order_allocated) => {
      weight.forEach((weight_ele) => {
        if (sales_order_allocated.material_no == weight_ele.material_code) {
          min_weight +=
            sales_order_allocated.allocation_detail.net_weight *
            weight_ele.pack_min_weight;
          // console.log(
          //   "min_weight",
          //   sales_order_allocated.material_no,
          //   sales_order_allocated.allocation_detail.net_weight,
          //   weight_ele.min_weight,
          //   min_weight
          // );
          max_weight +=
            sales_order_allocated.allocation_detail.net_weight *
            weight_ele.pack_max_weight;
          // console.log(
          //   "max_weight",
          //   sales_order_allocated.material_no,
          //   sales_order_allocated.allocation_detail.net_weight,
          //   weight_ele.max_weight,
          //   max_weight
          // );
        }
      });
    });

    console.log("weight_from_plc", weight_from_plc);
    console.log("total_min_weight", min_weight);
    console.log("total_max_weight", max_weight);

    // res.send(sales_order_details);

    // console.log("material_no_array", material_no_array);
    if (weight_from_plc >= min_weight && weight_from_plc <= max_weight) {
      console.log("yes ready_for_invoice");
      await job_scheduler_v2_table.updateOne(
        {
          _id: sales_order_no._id,
        },
        { $set: { bin_weight_status: "yes", status: "picked" } },
        { upsert: false, new: true }
      );
      return res.status(200).send({
        status_code: "200",
        status_message: "Weight accepted!",
        data: {
          status: "yes",
          total_min_weight: min_weight.toFixed(3),
          total_max_weight: max_weight.toFixed(3),
        },
      });
    } else {
      await job_scheduler_v2_table.updateOne(
        {
          _id: sales_order_no._id,
        },
        { $set: { bin_weight_status: "no", status: "picked" } },
        { upsert: false, new: true }
      );
      return res.status(200).send({
        status_code: "200",
        status_message: "Weight rejected!",
        data: {
          status: "no",
          total_min_weight: min_weight.toFixed(3),
          total_max_weight: max_weight.toFixed(3),
        },
      });
    }
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

exports.show_route_v2 = async (req, res) => {
  // console.log("show_route");
  const company_code = req.query.company_code;
  const plant_id = req.query.plant_id;
  const bin_id = req.query.bin_id;
  const job_scheduled_on = req.query.job_scheduled_on;
  console.log("company_code", company_code, plant_id, bin_id, job_scheduled_on);

  if (!(company_code && plant_id && bin_id && job_scheduled_on)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }

  try {
    let sales_order_no = await job_scheduler_v2_table.findOne(
      {
        bin_id: bin_id,
        plant_id: plant_id,
        company_code: company_code,
        job_scheduled_on: job_scheduled_on,
        is_deleted: false,
      },
      { _id: 1, sales_order_no: 1 }
    );

    if (!sales_order_no) {
      return res.status(400).send({
        status_code: "400",
        status_message: "Bin not assigned to Sale Order",
      });
    }
    // console.log(sales_order_no);
    let sales_order_details = await so_allocation_table.findOne(
      {
        sales_order_no: sales_order_no.sales_order_no,
        plant_id: plant_id,
        company_code: company_code,
      },
      { route_id: 1 }
    );
    if (!sales_order_details) {
      return res.status(400).send({
        status_code: "400",
        status_message: "sales order details is empty!",
      });
    }
    let route =
      sales_order_details.route_id != "" ? sales_order_details.route_id : "0";
    // console.log(sales_order_details);
    return res.status(200).send({
      status_code: "200",
      status_message: "Bin Route!",
      data: route,
    });
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

exports.show_route = async (req, res) => {
  // console.log("show_route");
  const company_code = req.query.company_code;
  const plant_id = req.query.plant_id;
  const bin_id = req.query.bin_id;
  const job_scheduled_on = req.query.job_scheduled_on;
  console.log("company_code", company_code, plant_id, bin_id, job_scheduled_on);

  if (!(company_code && plant_id && bin_id && job_scheduled_on)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }

  try {
    let sales_order_no = await job_scheduler_table.findOne(
      {
        binId: bin_id,
        plant_id: plant_id,
        company_code: company_code,
        job_scheduled_on: job_scheduled_on,
      },
      { _id: 1, sales_order_no: 1 }
    );

    if (!sales_order_no) {
      return res.status(400).send({
        status_code: "400",
        status_message: "sales order no is unavailable for the given bin!",
      });
    }
    // console.log(sales_order_no);
    let sales_order_details = await so_allocation_table.findOne(
      {
        sales_order_no: sales_order_no.sales_order_no,
        plant_id: plant_id,
        company_code: company_code,
      },
      { route_id: 1 }
    );
    if (!sales_order_details) {
      return res.status(400).send({
        status_code: "400",
        status_message: "sales order details is empty!",
      });
    }
    let route =
      sales_order_details.route_id != "" ? sales_order_details.route_id : "0";
    // console.log(sales_order_details);
    return res.status(200).send({
      status_code: "200",
      status_message: "Bin Route!",
      data: route,
    });
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

exports.delete_bin = async (req, res) => {
  const company_code = req.body.company_code;
  const plant_id = req.body.plant_id;
  const bin_id = req.body.bin_id;
  const job_scheduled_on = req.body.job_scheduled_on;

  if (!(company_code && plant_id && bin_id && job_scheduled_on)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }
  try {
    let bin_details = await job_scheduler_v2_table.findOne(
      {
        bin_id: bin_id,
        plant_id: plant_id,
        company_code: company_code,
        job_scheduled_on: job_scheduled_on,
        is_deleted: false,
      },
      { _id: 1, sales_order_no: 1 }
    );

    if (!bin_details) {
      return res.status(400).send({
        status_code: "400",
        status_message: "Bin isn't scheduled!",
      });
    }

    await job_scheduler_v2_table.updateOne(
      { _id: bin_details._id },
      { $set: { is_deleted: true } },
      { upsert: false }
    );

    return res.status(200).send({
      status_code: "200",
      status_message: "Bin deleted Successfully",
    });
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

exports.delete_bin_v2 = async (req, res) => {
  const company_code = req.body.company_code;
  const plant_id = req.body.plant_id;
  const bin_id = req.body.bin_id;
  const job_scheduled_on = req.body.job_scheduled_on;

  if (!(company_code && plant_id && bin_id && job_scheduled_on)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }
  try {
    await job_scheduler_v2_table.updateMany(
      {
        bin_id: {$in: bin_id},
        plant_id: plant_id,
        company_code: company_code,
        job_scheduled_on: job_scheduled_on,
        is_deleted: false,
      },
      { $set: { is_deleted: true } },
      { upsert: false }
    ).then(data=>{
      console.log(data.n);
      if(data.n)
      return res.status(200).send({
        status_code: "200",
        status_message: "Bin deleted Successfully",
      });  
      else
      return res.status(200).send({
        status_code: "200",
        status_message: "List of Bin's aren't scheduled",
      });
    })
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

// exports.verify_so_weight = async (req, res) => {
//   const company_code = req.query.company_code;
//   const plant_id = req.query.plant_id;
//   const bin_id = req.query.bin_id;
//   const job_scheduled_on = req.query.job_scheduled_on;

//   if (!(company_code && plant_id && bin_id && job_scheduled_on)) {
//     return res
//       .status(400)
//       .send({ status_code: "400", status_message: "Missing parameter." });
//   }
//   try {
//         let sales_order_no = await job_scheduler_table.findOne(
//           {
//             binId: bin_id,
//             plant_id: plant_id,
//             company_code: company_code,
//             job_scheduled_on: job_scheduled_on,
//           },
//           { _id: 0, sales_order_no: 1 }
//         );

//       console.log("sales_order_no",sales_order_no);
//       if(sales_order_no.sales_order_no == "03014977998" || sales_order_no.sales_order_no == "03014978998")
//       {
//         return res.status(200).send({
//                   status_code: "200",
//                   status_message: "Weight accepted!",
//                   data: {
//                     status: "no",
//                     total_min_weight: 5.08,
//                     total_max_weight: 5.25,
//                   },
//                 });
//       }
//       else
//       {
//         return res.status(200).send({
//           status_code: "200",
//           status_message: "Weight accepted!",
//           data: {
//             status: "yes",
//             total_min_weight: 5.08,
//             total_max_weight: 5.25,
//           },
//         });
//       }
//       } catch (err) {
//             return res.status(400).send({
//               status_code: "400",
//               status_message:
//                 err.message || "Some error occurred while creating the customer.",
//             });
//           }

// };
