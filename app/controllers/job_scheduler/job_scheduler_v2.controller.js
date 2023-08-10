// const db = require("../models");
// const Tutorial = db.tutorials;

const { date } = require("joi");
const db = require("../../models");
const so_allocation_table = db.soAllocation;
const { product_weight_model } = require("../../models");
const moment_tz = require("moment-timezone");

exports.get_no_of_bins = async (req, res) => {
  const sales_order_no = req.query.sales_order_no;
  let plant_id = req.query.plant_id;
  let company_code = req.query.company_code;
  // let bin_capacity = 5;
  // let counter = 1;
  console.log("get_no_of_bins");
  if (!(company_code && plant_id)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }

  try {
    let so_details = await so_allocation_table.find(
      {
        sales_order_no: sales_order_no,
        plant_id: plant_id,
        company_code: company_code,
      },
      { _id: 0, material_no: 1, pending_qty: 1, item_no: 1, material_name: 1 }
    );

    if (!so_details.length) {
      return res.status(400).send({
        status_code: "400",
        status_message: "Please provide valid so number",
      });
    }

    let material_code_array = [];
    so_details.forEach((element) => {
      material_code_array.push(element.material_no);
    });

    let unique_material_code_array = [];
    material_code_array.forEach((element) => {
      // console.log('unique_material_code_array',material_code_array,unique_material_code_array,element);
      // console.log(unique_material_code_array.includes(element));
      if (!unique_material_code_array.includes(element)) {
        unique_material_code_array.push(element);
      }
    });
    // console.log("material_code_array",material_code_array);

    // console.log("unique_material_code_array",unique_material_code_array,material_code_array);
    let product_weight_data = await product_weight_model
      .find(
        {
          plant_id: plant_id,
          company_code: company_code,
          material_code: { $in: material_code_array },
        },
        { _id: 0, material_code: 1, qty_in_kg: 1, pieces_per_bin: 1 }
      )
      .sort({ qty_in_kg: -1 });
    // console.log("product_weight_data.length",product_weight_data.length,so_details.length);
    if (!(product_weight_data.length == unique_material_code_array.length)) {
      return res.status(400).send({
        status_code: "400",
        status_message:
          "Material code not available in product weight tolerance collection",
      });
    }

    // let min_bin_capacity = product_weight_data[0].qty_in_kg;
    // let bin_capacity = product_weight_data[0].pieces_per_bin;
    // if (!bin_capacity) {
    //   return res.send("Bulk So Selected");
    // }
    // console.log("min_bin_capacity", min_bin_capacity, bin_capacity, counter);

    let response_array = [];
    let pending_bin_percentage;
    let previous_bin_percentage = 0;

    let counter = 1;

    // console.log('product_weight_data',product_weight_data);
    // console.log('so_details',so_details);

    so_details.forEach((element) => {
      product_weight_data.forEach((weight_data) => {
        if (weight_data.pieces_per_bin) {
          // console.log("pieces_per_bin");
          if (element.material_no == weight_data.material_code) {
            let ordered_qty = element.pending_qty;
            let sku_peices_per_bin = weight_data.pieces_per_bin;
            if (ordered_qty % sku_peices_per_bin == 0) {
              // console.log("true",element.material_no);
              let sku_counter = ordered_qty / sku_peices_per_bin;
              // console.log("sku_counter",sku_counter);
              while (sku_counter) {
                response_array.push({
                  counter: counter,
                  material_no: element.material_no,
                  material_name: element.material_name,
                  item_no: element.item_no,
                  assigned_qty: weight_data.pieces_per_bin,
                  pending_qty: weight_data.pieces_per_bin,
                  qty_in_kg: weight_data.qty_in_kg,
                });
                counter++;
                sku_counter--;
              }
              element.pending_qty = 0;
            }
          }
        }
      });
    });

    // console.log('so_details',so_details);

    so_details.forEach((element) => {
      product_weight_data.forEach((weight_data) => {
        // to check whether the material is discrete
        if (weight_data.pieces_per_bin && element.pending_qty) {
          console.log("pieces_per_bin");
          if (element.material_no == weight_data.material_code) {
            console.log("element.material_no", element.material_no);
            pending_bin_percentage = 100 - previous_bin_percentage;
            console.log(
              "pending_bin_percentage",
              pending_bin_percentage,
              weight_data.pieces_per_bin
            );
            let temp_sku_allowed_limit = Math.floor(
              (weight_data.pieces_per_bin / 100) * pending_bin_percentage
            );
            console.log("temp_sku_allowed_limit", temp_sku_allowed_limit);
            if (element.pending_qty < temp_sku_allowed_limit) {
              response_array.push({
                counter: counter,
                material_no: element.material_no,
                material_name: element.material_name,
                item_no: element.item_no,
                assigned_qty: element.pending_qty,
                pending_qty: element.pending_qty,
                qty_in_kg: weight_data.qty_in_kg,
              });
              let temp_previous_bin_percentage = Math.floor(
                (element.pending_qty / weight_data.pieces_per_bin) * 100
              );
              previous_bin_percentage += temp_previous_bin_percentage;
              element.pending_qty = 0;
              console.log(
                "temp_previous_bin_percentage",
                temp_previous_bin_percentage,
                previous_bin_percentage
              );
            } else {
              response_array.push({
                counter: counter,
                material_no: element.material_no,
                material_name: element.material_name,
                item_no: element.item_no,
                assigned_qty: temp_sku_allowed_limit,
                pending_qty: temp_sku_allowed_limit,
                qty_in_kg: weight_data.qty_in_kg,
              });
              element.pending_qty =
                element.pending_qty - temp_sku_allowed_limit;
              counter++;
              previous_bin_percentage = 0;
              while (element.pending_qty > 0) {
                pending_bin_percentage = 100 - previous_bin_percentage;
                let temp_sku_allowed_limit = Math.floor(
                  (weight_data.pieces_per_bin / 100) * pending_bin_percentage
                );
                if (element.pending_qty < temp_sku_allowed_limit) {
                  response_array.push({
                    counter: counter,
                    material_no: element.material_no,
                    material_name: element.material_name,
                    item_no: element.item_no,
                    assigned_qty: element.pending_qty,
                    pending_qty: element.pending_qty,
                    qty_in_kg: weight_data.qty_in_kg,
                  });
                  let temp_previous_bin_percentage = Math.floor(
                    (element.pending_qty / weight_data.pieces_per_bin) * 100
                  );
                  previous_bin_percentage += temp_previous_bin_percentage;
                  element.pending_qty = 0;
                  console.log(
                    "temp_previous_bin_percentage",
                    temp_previous_bin_percentage,
                    previous_bin_percentage
                  );
                } else {
                  response_array.push({
                    counter: counter,
                    material_no: element.material_no,
                    material_name: element.material_name,
                    item_no: element.item_no,
                    assigned_qty: temp_sku_allowed_limit,
                    pending_qty: temp_sku_allowed_limit,
                    qty_in_kg: weight_data.qty_in_kg,
                  });
                  element.pending_qty =
                    element.pending_qty - temp_sku_allowed_limit;
                  counter++;
                  previous_bin_percentage = 0;
                }
              }
            }
          }
        }
      });
    });

    let final_response = {};
    let final_response_array = [];

    for (let i = 1; i <= counter; i++) {
      let array = [];
      response_array.forEach((element) => {
        if (i == element.counter) {
          array.push({
            material_no: element.material_no,
            material_name: element.material_name,
            item_no: element.item_no,
            assigned_qty: element.assigned_qty,
            pending_qty: element.pending_qty,
            qty_in_kg: element.qty_in_kg,
          });
        }
      });
      if (array.length) {
        final_response_array.push({
          counter: i,
          details: array,
        });
      }
    }

    final_response.bin_count = final_response_array.length;
    // final_response.min_bin_capacity = min_bin_capacity;
    final_response.bin_details = final_response_array;
    if (final_response_array.length) {
      return res.status(200).send({
        status_code: "200",
        status_message: "Bin count is available!",
        data: final_response,
      });
    } else {
      return res.status(400).send({
        status_code: "400",
        status_message: "Bins are not required for the so",
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

exports.get_no_of_bins_v3 = async (req, res) => {
  const sales_order_no = req.query.sales_order_no;
  let plant_id = req.query.plant_id;
  let company_code = req.query.company_code;
  // let bin_capacity = 5;
  // let counter = 1;
  console.log("get_no_of_bins");
  if (!(company_code && plant_id)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }

  try {
    let so_details = await so_allocation_table
      .find(
        {
          sales_order_no: sales_order_no,
          plant_id: plant_id,
          company_code: company_code,
        },
        { _id: 0, material_no: 1, pending_qty: 1, item_no: 1, material_name: 1 }
      )
      .sort({ material_no: 1 });

    if (!so_details.length) {
      return res.status(400).send({
        status_code: "400",
        status_message: "Please provide valid so number",
      });
    }

    let material_code_array = [];
    so_details.forEach((element) => {
      material_code_array.push(element.material_no);
    });

    let unique_material_code_array = [];
    material_code_array.forEach((element) => {
      // console.log('unique_material_code_array',material_code_array,unique_material_code_array,element);
      // console.log(unique_material_code_array.includes(element));
      if (!unique_material_code_array.includes(element)) {
        unique_material_code_array.push(element);
      }
    });
    // console.log("material_code_array",material_code_array);

    // console.log("unique_material_code_array",unique_material_code_array,material_code_array);
    let product_weight_data = await product_weight_model
      .find(
        {
          plant_id: plant_id,
          company_code: company_code,
          material_code: { $in: material_code_array },
        },
        {
          _id: 0,
          material_code: 1,
          qty_in_kg: 1,
          pieces_per_bin: 1,
          qty_in_pack: 1,
          pieces_per_pack: 1,
        }
      )
      .sort({ qty_in_kg: -1 });
    // console.log("product_weight_data.length",product_weight_data.length,so_details.length);
    if (!(product_weight_data.length == unique_material_code_array.length)) {
      return res.status(400).send({
        status_code: "400",
        status_message:
          "Material code not available in product weight tolerance collection",
      });
    }

    // console.log("so_details",so_details,product_weight_data);
    so_details.forEach((so) => {
      product_weight_data.forEach((sku) => {
        if (so.material_no == sku.material_code) {
          if (
            so.pending_qty >= sku.qty_in_pack &&
            Math.floor(sku.qty_in_pack)
          ) {
            let x = Math.floor(
              Math.floor(so.pending_qty) / Math.floor(sku.qty_in_pack)
            );
            let y = Math.floor(Math.floor(sku.qty_in_pack) * x);
            so.pending_qty -= y;
          }
        }
      });
    });
    //console.log("so_details",so_details);

    let allocated_so_details = await so_allocation_table.aggregate([
      {
        $match: {
          sales_order_no: sales_order_no,
          plant_id: plant_id,
          company_code: company_code,
        },
      },
      { $unwind: "$allocation_detail" },
      { $match: { "allocation_detail.mode": "ptl" } },
      {
        $group: {
          _id: "$material_no",
          material_no: { $first: "$material_no" },
          allocated_qty: { $sum: "$allocation_detail.net_weight" },
        },
      },
    ]);

    if (allocated_so_details.length) {
      allocated_so_details.forEach((allocated_so) => {
        so_details.forEach((so) => {
          if (allocated_so.material_no == so.material_no) {
            so.pending_qty += allocated_so.allocated_qty;
          }
        });
      });
    }

    // let min_bin_capacity = product_weight_data[0].qty_in_kg;
    // let bin_capacity = product_weight_data[0].pieces_per_bin;
    // if (!bin_capacity) {
    //   return res.send("Bulk So Selected");
    // }
    // console.log("min_bin_capacity", min_bin_capacity, bin_capacity, counter);

    let response_array = [];
    let pending_bin_percentage;
    let previous_bin_percentage = 0;

    let counter = 1;

    // console.log('product_weight_data',product_weight_data);
    // console.log('so_details',so_details);

    so_details.forEach((element) => {
      product_weight_data.forEach((weight_data) => {
        if (weight_data.pieces_per_bin) {
          // console.log("pieces_per_bin");
          if (element.material_no == weight_data.material_code) {
            let ordered_qty = element.pending_qty;
            let sku_peices_per_bin = weight_data.pieces_per_bin;
            if (ordered_qty % sku_peices_per_bin == 0) {
              // console.log("true",element.material_no);
              let sku_counter = ordered_qty / sku_peices_per_bin;
              // console.log("sku_counter",sku_counter);
              while (sku_counter) {
                response_array.push({
                  counter: counter,
                  material_no: element.material_no,
                  material_name: element.material_name,
                  item_no: element.item_no,
                  assigned_qty: weight_data.pieces_per_bin,
                  pending_qty: weight_data.pieces_per_bin,
                  qty_in_kg: weight_data.qty_in_kg,
                });
                counter++;
                sku_counter--;
              }
              element.pending_qty = 0;
            }
          }
        }
      });
    });

    // console.log('so_details',so_details);

    so_details.forEach((element) => {
      product_weight_data.forEach((weight_data) => {
        // to check whether the material is discrete
        if (weight_data.pieces_per_bin && element.pending_qty) {
          // console.log("pieces_per_bin");
          if (element.material_no == weight_data.material_code) {
            // console.log("element.material_no", element.material_no);
            // pending_bin_percentage = 100 - previous_bin_percentage;
            // console.log(
            //   "pending_bin_percentage",
            //   pending_bin_percentage,
            //   weight_data.pieces_per_bin
            // );
            while (element.pending_qty > 0) {
              pending_bin_percentage = 100 - previous_bin_percentage;
              let temp_sku_allowed_limit = Math.floor(
                (weight_data.pieces_per_bin / 100) * pending_bin_percentage
              );
              // console.log(
              //   "temp_sku_allowed_limit",
              //   temp_sku_allowed_limit,
              //   weight_data.pieces_per_pack
              // );
              if (element.pending_qty < temp_sku_allowed_limit) {
                response_array.push({
                  counter: counter,
                  material_no: element.material_no,
                  material_name: element.material_name,
                  item_no: element.item_no,
                  assigned_qty: element.pending_qty,
                  pending_qty: element.pending_qty,
                  qty_in_kg: weight_data.qty_in_kg,
                });
                let temp_previous_bin_percentage = Math.floor(
                  (element.pending_qty / weight_data.pieces_per_bin) * 100
                );
                previous_bin_percentage += temp_previous_bin_percentage;
                element.pending_qty = 0;
                // console.log(
                //   "temp_previous_bin_percentage",
                //   temp_previous_bin_percentage,
                //   previous_bin_percentage
                // );
              } else if (
                weight_data.pieces_per_pack &&
                temp_sku_allowed_limit > weight_data.pieces_per_pack
              ) {
                // console.log("else if");
                let x = Math.floor(
                  temp_sku_allowed_limit / weight_data.pieces_per_pack
                );
                let y = weight_data.pieces_per_pack * x;
                // console.log(
                //   "else if",
                //   x,
                //   y,
                //   element.pending_qty,
                //   temp_sku_allowed_limit,
                //   weight_data.pieces_per_pack
                // );
                response_array.push({
                  counter: counter,
                  material_no: element.material_no,
                  material_name: element.material_name,
                  item_no: element.item_no,
                  assigned_qty: y,
                  pending_qty: y,
                  qty_in_kg: weight_data.qty_in_kg,
                });
                element.pending_qty = element.pending_qty - y;
                counter++;
                // console.log("else if", counter, element.pending_qty);
                previous_bin_percentage = 0;
              } else {
                response_array.push({
                  counter: counter,
                  material_no: element.material_no,
                  material_name: element.material_name,
                  item_no: element.item_no,
                  assigned_qty: temp_sku_allowed_limit,
                  pending_qty: temp_sku_allowed_limit,
                  qty_in_kg: weight_data.qty_in_kg,
                });
                element.pending_qty =
                  element.pending_qty - temp_sku_allowed_limit;
                counter++;
                previous_bin_percentage = 0;
              }
            }
            // while (element.pending_qty > 0) {
            //   pending_bin_percentage = 100 - previous_bin_percentage;
            //   let temp_sku_allowed_limit = Math.floor(
            //     (weight_data.pieces_per_bin / 100) * pending_bin_percentage
            //   );
            //   if (element.pending_qty < temp_sku_allowed_limit) {
            //     response_array.push({
            //       counter: counter,
            //       material_no: element.material_no,
            //       material_name: element.material_name,
            //       item_no: element.item_no,
            //       assigned_qty: element.pending_qty,
            //       pending_qty: element.pending_qty,
            //       qty_in_kg: weight_data.qty_in_kg,
            //     });
            //     let temp_previous_bin_percentage = Math.floor(
            //       (element.pending_qty / weight_data.pieces_per_bin) * 100
            //     );
            //     previous_bin_percentage += temp_previous_bin_percentage;
            //     element.pending_qty = 0;
            //     // console.log(
            //     //   "temp_previous_bin_percentage",
            //     //   temp_previous_bin_percentage,
            //     //   previous_bin_percentage
            //     // );
            //   } else {
            //     response_array.push({
            //       counter: counter,
            //       material_no: element.material_no,
            //       material_name: element.material_name,
            //       item_no: element.item_no,
            //       assigned_qty: temp_sku_allowed_limit,
            //       pending_qty: temp_sku_allowed_limit,
            //       qty_in_kg: weight_data.qty_in_kg,
            //     });
            //     element.pending_qty =
            //       element.pending_qty - temp_sku_allowed_limit;
            //     counter++;
            //     previous_bin_percentage = 0;
            //   }
            // }
            //}
          }
        }
      });
    });

    let final_response = {};
    let final_response_array = [];

    for (let i = 1; i <= counter; i++) {
      let array = [];
      response_array.forEach((element) => {
        if (i == element.counter) {
          array.push({
            material_no: element.material_no,
            material_name: element.material_name,
            item_no: element.item_no,
            assigned_qty: element.assigned_qty,
            pending_qty: element.pending_qty,
            qty_in_kg: element.qty_in_kg,
          });
        }
      });
      if (array.length) {
        final_response_array.push({
          counter: i,
          details: array,
        });
      }
    }

    final_response.bin_count = final_response_array.length;
    // final_response.min_bin_capacity = min_bin_capacity;
    final_response.bin_details = final_response_array;
    if (final_response_array.length) {
      return res.status(200).send({
        status_code: "200",
        status_message: "Bin count is available!",
        data: final_response,
      });
    } else {
      return res.status(400).send({
        status_code: "400",
        status_message: "Bins are not required for the so",
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

exports.get_no_of_bins_v4 = async (req, res) => {
  const sales_order_no = req.query.sales_order_no;
  let plant_id = req.query.plant_id;
  let company_code = req.query.company_code;
  console.log("get_no_of_bins");

  if (!(company_code && plant_id)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }

  try {
    //get the so details for the selected so
    let so_details = await so_allocation_table
      .find(
        {
          sales_order_no: sales_order_no,
          plant_id: plant_id,
          company_code: company_code,
        },
        { _id: 0, material_no: 1, pending_qty: 1, item_no: 1, material_name: 1 }
      )
      .sort({ material_no: 1 });

    if (!so_details.length) {
      return res.status(400).send({
        status_code: "400",
        status_message: "Please provide valid so number",
      });
    }

    let material_code_array = [];
    so_details.forEach((element) => {
      element.pending_qty = Math.round(element.pending_qty);
      material_code_array.push(element.material_no);
    });

    let unique_material_code_array = [];
    material_code_array.forEach((element) => {
      if (!unique_material_code_array.includes(element)) {
        unique_material_code_array.push(element);
      }
    });

    let product_weight_data = await product_weight_model
      .find(
        {
          plant_id: plant_id,
          company_code: company_code,
          material_code: { $in: material_code_array },
        },
        {
          _id: 0,
          material_code: 1,
          qty_in_kg: 1,
          pieces_per_bin: 1,
          qty_in_pack: 1,
          pieces_per_pack: 1,
        }
      )
      .sort({ qty_in_kg: -1 });

    if (!(product_weight_data.length == unique_material_code_array.length)) {
      return res.status(400).send({
        status_code: "400",
        status_message:
          "Material code not available in product weight tolerance collection",
      });
    }

    so_details.forEach((so) => {
      product_weight_data.forEach((sku) => {
        if (so.material_no == sku.material_code) {
          if (
            so.pending_qty >= sku.qty_in_pack &&
            Math.floor(sku.qty_in_pack)
          ) {
            let x = Math.floor(
              Math.floor(so.pending_qty) / Math.floor(sku.qty_in_pack)
            );
            let y = Math.floor(Math.floor(sku.qty_in_pack) * x);
            so.pending_qty -= y;
          }
        }
      });
    });

    let allocated_so_details = await so_allocation_table.aggregate([
      {
        $match: {
          sales_order_no: sales_order_no,
          plant_id: plant_id,
          company_code: company_code,
        },
      },
      { $unwind: "$allocation_detail" },
      { $match: { "allocation_detail.mode": "ptl" } },
      {
        $group: {
          _id: "$material_no",
          material_no: { $first: "$material_no" },
          allocated_qty: { $sum: "$allocation_detail.net_weight" },
        },
      },
    ]);

    if (allocated_so_details.length) {
      allocated_so_details.forEach((allocated_so) => {
        so_details.forEach((so) => {
          if (allocated_so.material_no == so.material_no) {
            so.pending_qty += allocated_so.allocated_qty;
          }
        });
      });
    }

    let response_array = [];
    let pending_bin_percentage;
    let previous_bin_percentage = 0;

    let counter = 1;

    so_details.forEach((element) => {
      product_weight_data.forEach((weight_data) => {
        if (weight_data.pieces_per_bin) {
          // console.log("pieces_per_bin");
          if (element.material_no == weight_data.material_code) {
            let ordered_qty = element.pending_qty;
            let sku_peices_per_bin = weight_data.pieces_per_bin;
            if (ordered_qty % sku_peices_per_bin == 0) {
              // console.log("true",element.material_no);
              let sku_counter = ordered_qty / sku_peices_per_bin;
              // console.log("sku_counter",sku_counter);
              while (sku_counter) {
                response_array.push({
                  counter: counter,
                  material_no: element.material_no,
                  material_name: element.material_name,
                  item_no: element.item_no,
                  assigned_qty: weight_data.pieces_per_bin,
                  pending_qty: weight_data.pieces_per_bin,
                  qty_in_kg: weight_data.qty_in_kg,
                });
                counter++;
                sku_counter--;
              }
              element.pending_qty = 0;
            }
          }
        }
      });
    });

    so_details.forEach((element) => {
      product_weight_data.forEach((weight_data) => {
        // to check whether the material is discrete
        if (weight_data.pieces_per_bin && element.pending_qty) {
          // console.log("pieces_per_bin");
          if (element.material_no == weight_data.material_code) {
            // console.log("element.material_no", element.material_no);
            // pending_bin_percentage = 100 - previous_bin_percentage;
            // console.log(
            //   "pending_bin_percentage",
            //   pending_bin_percentage,
            //   weight_data.pieces_per_bin
            // );
            while (element.pending_qty > 0) {
              pending_bin_percentage = 100 - previous_bin_percentage;
              let temp_sku_allowed_limit = Math.floor(
                (weight_data.pieces_per_bin / 100) * pending_bin_percentage
              );
              // console.log(
              //   "temp_sku_allowed_limit",
              //   temp_sku_allowed_limit,
              //   weight_data.pieces_per_pack
              // );
              if (element.pending_qty < temp_sku_allowed_limit) {
                response_array.push({
                  counter: counter,
                  material_no: element.material_no,
                  material_name: element.material_name,
                  item_no: element.item_no,
                  assigned_qty: element.pending_qty,
                  pending_qty: element.pending_qty,
                  qty_in_kg: weight_data.qty_in_kg,
                });
                let temp_previous_bin_percentage = Math.floor(
                  (element.pending_qty / weight_data.pieces_per_bin) * 100
                );
                previous_bin_percentage += temp_previous_bin_percentage;
                element.pending_qty = 0;
                // console.log(
                //   "temp_previous_bin_percentage",
                //   temp_previous_bin_percentage,
                //   previous_bin_percentage
                // );
              } else if (
                weight_data.pieces_per_pack &&
                temp_sku_allowed_limit > weight_data.pieces_per_pack
              ) {
                // console.log("else if");
                let x = Math.floor(
                  temp_sku_allowed_limit / weight_data.pieces_per_pack
                );
                let y = weight_data.pieces_per_pack * x;
                // console.log(
                //   "else if",
                //   x,
                //   y,
                //   element.pending_qty,
                //   temp_sku_allowed_limit,
                //   weight_data.pieces_per_pack
                // );
                response_array.push({
                  counter: counter,
                  material_no: element.material_no,
                  material_name: element.material_name,
                  item_no: element.item_no,
                  assigned_qty: y,
                  pending_qty: y,
                  qty_in_kg: weight_data.qty_in_kg,
                });
                element.pending_qty = element.pending_qty - y;
                counter++;
                // console.log("else if", counter, element.pending_qty);
                previous_bin_percentage = 0;
              }
              else if (weight_data.pieces_per_pack &&
                temp_sku_allowed_limit < weight_data.pieces_per_pack) {
                counter++;
                previous_bin_percentage = 0;
              } else {
                response_array.push({
                  counter: counter,
                  material_no: element.material_no,
                  material_name: element.material_name,
                  item_no: element.item_no,
                  assigned_qty: temp_sku_allowed_limit,
                  pending_qty: temp_sku_allowed_limit,
                  qty_in_kg: weight_data.qty_in_kg,
                });
                element.pending_qty =
                  element.pending_qty - temp_sku_allowed_limit;
                counter++;
                previous_bin_percentage = 0;
              }
            }
            // while (element.pending_qty > 0) {
            //   pending_bin_percentage = 100 - previous_bin_percentage;
            //   let temp_sku_allowed_limit = Math.floor(
            //     (weight_data.pieces_per_bin / 100) * pending_bin_percentage
            //   );
            //   if (element.pending_qty < temp_sku_allowed_limit) {
            //     response_array.push({
            //       counter: counter,
            //       material_no: element.material_no,
            //       material_name: element.material_name,
            //       item_no: element.item_no,
            //       assigned_qty: element.pending_qty,
            //       pending_qty: element.pending_qty,
            //       qty_in_kg: weight_data.qty_in_kg,
            //     });
            //     let temp_previous_bin_percentage = Math.floor(
            //       (element.pending_qty / weight_data.pieces_per_bin) * 100
            //     );
            //     previous_bin_percentage += temp_previous_bin_percentage;
            //     element.pending_qty = 0;
            //     // console.log(
            //     //   "temp_previous_bin_percentage",
            //     //   temp_previous_bin_percentage,
            //     //   previous_bin_percentage
            //     // );
            //   } else {
            //     response_array.push({
            //       counter: counter,
            //       material_no: element.material_no,
            //       material_name: element.material_name,
            //       item_no: element.item_no,
            //       assigned_qty: temp_sku_allowed_limit,
            //       pending_qty: temp_sku_allowed_limit,
            //       qty_in_kg: weight_data.qty_in_kg,
            //     });
            //     element.pending_qty =
            //       element.pending_qty - temp_sku_allowed_limit;
            //     counter++;
            //     previous_bin_percentage = 0;
            //   }
            // }
            //}
          }
        }
      });
    });

    let final_response = {};
    let final_response_array = [];

    for (let i = 1; i <= counter; i++) {
      let array = [];
      response_array.forEach((element) => {
        if (i == element.counter) {
          array.push({
            material_no: element.material_no,
            material_name: element.material_name,
            item_no: element.item_no,
            assigned_qty: element.assigned_qty,
            pending_qty: element.pending_qty,
            qty_in_kg: element.qty_in_kg,
          });
        }
      });
      if (array.length) {
        final_response_array.push({
          counter: i,
          details: array,
        });
      }
    }

    final_response.bin_count = final_response_array.length;
    final_response.bin_details = final_response_array;
    if (final_response_array.length) {
      return res.status(200).send({
        status_code: "200",
        status_message: "Bin count is available!",
        data: final_response,
      });
    } else {
      return res.status(400).send({
        status_code: "400",
        status_message: "Bins are not required for the so",
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

// exports.get_no_of_bins = async (req, res) => {
//   const sales_order_no = req.query.sales_order_no;
//   let plant_id = req.query.plant_id;
//   let company_code = req.query.company_code;
//   // let bin_capacity = 5;
//   // let counter = 1;
//   console.log("get_no_of_bins");
//   if (!(company_code && plant_id)) {
//     return res
//       .status(400)
//       .send({ status_code: "400", status_message: "Missing parameter." });
//   }

//   try {
//     let so_details = await so_allocation_table.find(
//       {
//         sales_order_no: sales_order_no,
//         plant_id: plant_id,
//         company_code: company_code
//       },
//       { _id: 0, material_no: 1, order_qty: 1, item_no: 1 }
//     );

//     if (!so_details.length) {
//       return res.status(400).send({
//         status_code: "400",
//         status_message: "Please provide valid so number",
//       });
//     }

//     let material_code_array = [];
//     so_details.forEach((element) => {
//       material_code_array.push(element.material_no);
//     });

//     let unique_material_code_array = [];
//     material_code_array.forEach((element) => {
//       // console.log('unique_material_code_array',material_code_array,unique_material_code_array,element);
//       // console.log(unique_material_code_array.includes(element));
//       if (!unique_material_code_array.includes(element)) {
//         unique_material_code_array.push(element);
//       }
//     });
//     // console.log("material_code_array",material_code_array);

//     // console.log("unique_material_code_array",unique_material_code_array,material_code_array);
//     let product_weight_data = await product_weight_model
//       .find(
//         {
//           plant_id: plant_id,
//           company_code: company_code,
//           material_code: { $in: material_code_array },
//         },
//         { _id: 0, material_code: 1, qty_in_kg: 1, pieces_per_bin: 1 }
//       )
//       .sort({ qty_in_kg: -1 });
//     // console.log("product_weight_data.length",product_weight_data.length,so_details.length);
//     if (!(product_weight_data.length == unique_material_code_array.length)) {
//       return res.status(400).send({
//         status_code: "400",
//         status_message:
//           "Material code not available in product weight tolerance collection",
//       });
//     }

//     // let min_bin_capacity = product_weight_data[0].qty_in_kg;
//     // let bin_capacity = product_weight_data[0].pieces_per_bin;
//     // if (!bin_capacity) {
//     //   return res.send("Bulk So Selected");
//     // }
//     // console.log("min_bin_capacity", min_bin_capacity, bin_capacity, counter);

//     let response_array = [];
//     let pending_bin_percentage;
//     let previous_bin_percentage = 0;

//     let counter = 1;

//     // console.log('product_weight_data',product_weight_data);
//     // console.log('so_details',so_details);

//     so_details.forEach((element) => {
//       product_weight_data.forEach((weight_data) => {
//         // to check whether the material is discrete
//         if (weight_data.pieces_per_bin) {
//           console.log("pieces_per_bin");
//           if (element.material_no == weight_data.material_code) {
//             console.log("element.material_no", element.material_no);
//             pending_bin_percentage = 100 - previous_bin_percentage;
//             console.log(
//               "pending_bin_percentage",
//               pending_bin_percentage,
//               weight_data.pieces_per_bin
//             );
//             let temp_sku_allowed_limit = Math.floor(
//               (weight_data.pieces_per_bin / 100) * pending_bin_percentage
//             );
//             console.log("temp_sku_allowed_limit", temp_sku_allowed_limit);
//             if (element.order_qty < temp_sku_allowed_limit) {
//               response_array.push({
//                 counter: counter,
//                 material_no: element.material_no,
//                 item_no: element.item_no,
//                 pending_qty: element.order_qty,
//                 qty_in_kg: weight_data.qty_in_kg,
//               });
//               let temp_previous_bin_percentage = Math.floor(
//                 (element.order_qty / weight_data.pieces_per_bin) * 100
//               );
//               previous_bin_percentage += temp_previous_bin_percentage;
//               element.order_qty = 0;
//               console.log(
//                 "temp_previous_bin_percentage",
//                 temp_previous_bin_percentage,
//                 previous_bin_percentage
//               );
//             } else {
//               response_array.push({
//                 counter: counter,
//                 material_no: element.material_no,
//                 item_no: element.item_no,
//                 pending_qty: temp_sku_allowed_limit,
//                 qty_in_kg: weight_data.qty_in_kg,
//               });
//               element.order_qty =
//                 element.order_qty - temp_sku_allowed_limit;
//               counter++;
//               previous_bin_percentage = 0;
//               while (element.order_qty > 0) {
//                 pending_bin_percentage = 100 - previous_bin_percentage;
//                 let temp_sku_allowed_limit = Math.floor(
//                   (weight_data.pieces_per_bin / 100) * pending_bin_percentage
//                 );
//                 if (element.order_qty < temp_sku_allowed_limit) {
//                   response_array.push({
//                     counter: counter,
//                     material_no: element.material_no,
//                     item_no: element.item_no,
//                     pending_qty: element.order_qty,
//                     qty_in_kg: weight_data.qty_in_kg,
//                   });
//                   let temp_previous_bin_percentage = Math.floor(
//                     (element.order_qty / weight_data.pieces_per_bin) * 100
//                   );
//                   previous_bin_percentage += temp_previous_bin_percentage;
//                   element.order_qty = 0;
//                   console.log(
//                     "temp_previous_bin_percentage",
//                     temp_previous_bin_percentage,
//                     previous_bin_percentage
//                   );
//                 } else {
//                   response_array.push({
//                     counter: counter,
//                     material_no: element.material_no,
//                     item_no: element.item_no,
//                     pending_qty: temp_sku_allowed_limit,
//                     qty_in_kg: weight_data.qty_in_kg,
//                   });
//                   element.order_qty =
//                     element.order_qty - temp_sku_allowed_limit;
//                   counter++;
//                   previous_bin_percentage = 0;
//                 }
//               }
//             }
//           }
//         }
//       });
//     });

//     let final_response = {};
//     let final_response_array = [];

//     for (let i = 1; i <= counter; i++) {
//       let array = [];
//       response_array.forEach((element) => {
//         if (i == element.counter) {
//           array.push({
//             material_no: element.material_no,
//             item_no: element.item_no,
//             pending_qty: element.pending_qty,
//             qty_in_kg: element.qty_in_kg,
//           });
//         }
//       });
//       if (array.length) {
//         final_response_array.push({
//           counter: i,
//           details: array,
//         });
//       }
//     }

//     final_response.bin_count = final_response_array.length;
//     // final_response.min_bin_capacity = min_bin_capacity;
//     final_response.bin_details = final_response_array;
//     if (final_response_array.length) {
//       return res.status(200).send({
//         status_code: "200",
//         status_message: "Bin count is available!",
//         data: final_response,
//       });
//     } else {
//       return res.status(400).send({
//         status_code: "400",
//         status_message: "Bins are not required for the so",
//       });
//     }
//   } catch (err) {
//     return res.status(400).send({
//       status_code: "400",
//       status_message:
//         err.message || "Some error occurred while creating the customer.",
//     });
//   }
// };

// exports.get_no_of_bins = async (req, res) => {
//   const sales_order_no = req.body.sales_order_no;
//   let plant_id = req.query.plant_id;
//   let company_code = req.query.company_code;
//   let bin_capacity = 5;
//   let counter = 1;
//   console.log("get_no_of_bins");
//   if (!(company_code && plant_id)) {
//     return res
//       .status(400)
//       .send({ status_code: "400", status_message: "Missing parameter." });
//   }

//   try {
//     let so_details = await so_allocation_table.find(
//       {
//         sales_order_no: sales_order_no,
//         plant_id: plant_id,
//         company_code: company_code,
//         pending_qty: { $gt: 0 },
//       },
//       { _id: 0, material_no: 1, pending_qty: 1,item_no: 1 }
//     );

//     if (!so_details.length) {
//       return res
//         .status(400)
//         .send({
//           status_code: "400",
//           status_message: "Please provide valid so number",
//         });
//     }

//     let material_code_array = [];
//     so_details.forEach((element) => {
//       material_code_array.push(element.material_no);
//     });

//     let unique_material_code_array = [];
//     material_code_array.forEach(element =>{
//       // console.log('unique_material_code_array',material_code_array,unique_material_code_array,element);
//       // console.log(unique_material_code_array.includes(element));
//       if(!(unique_material_code_array.includes(element)))
//       {
//         unique_material_code_array.push(element);
//       }
//     })
//     // console.log("material_code_array",material_code_array);

//     // console.log("unique_material_code_array",unique_material_code_array,material_code_array);
//     let product_weight_data = await product_weight_model
//       .find(
//         {
//           plant_id: plant_id,
//           company_code: company_code,
//           material_code: { $in: material_code_array },
//         },
//         { _id: 0, material_code: 1, qty_in_kg: 1 }
//       )
//       .sort({ qty_in_kg: -1 });
//     // console.log("product_weight_data.length",product_weight_data.length,so_details.length);
//     if (!(product_weight_data.length == unique_material_code_array.length)) {
//       return res
//         .status(400)
//         .send({
//           status_code: "400",
//           status_message:
//             "Material code not available in product weight tolerance collection",
//         });
//     }

//     let min_bin_capacity = product_weight_data[0].qty_in_kg;
//     // console.log("min_bin_capacity", min_bin_capacity);

//     let response_array = [];

//     so_details.forEach((element) => {
//       product_weight_data.forEach((weight_data) => {
//         // console.log("weight_data.qty_in_kg", weight_data.qty_in_kg);
//         if (weight_data.qty_in_kg < 5) {
//           if (element.material_no == weight_data.material_code) {
//             let overall_weight = element.pending_qty * weight_data.qty_in_kg;
//             let temp_bin_capacity = bin_capacity - overall_weight;
//             // console.log(
//             //   "overall_weight",
//             //   overall_weight,
//             //   temp_bin_capacity,
//             //   element.pending_qty,
//             //   weight_data.qty_in_kg
//             // );

//             if (temp_bin_capacity < min_bin_capacity) {
//               let each_element_weight = weight_data.qty_in_kg;
//               let element_pick_qty = Math.trunc(
//                 bin_capacity / each_element_weight
//               );
//               response_array.push({
//                 counter: counter,
//                 material_no: element.material_no,
//                 item_no: element.item_no,
//                 pending_qty: element_pick_qty,
//                 qty_in_kg: weight_data.qty_in_kg,
//               });
//               element.pending_qty = element.pending_qty - element_pick_qty;
//               counter++;
//               bin_capacity = 5;
//               while (element.pending_qty > 0) {
//                 // console.log("element.pending_qty", element.pending_qty);
//                 let overall_weight =
//                   element.pending_qty * weight_data.qty_in_kg;
//                 let temp_bin_capacity = bin_capacity - overall_weight;
//                 if (temp_bin_capacity < min_bin_capacity) {
//                   let each_element_weight = weight_data.qty_in_kg;
//                   let element_pick_qty = Math.trunc(
//                     bin_capacity / each_element_weight
//                   );
//                   response_array.push({
//                     counter: counter,
//                     material_no: element.material_no,
//                     item_no: element.item_no,
//                     pending_qty: element_pick_qty,
//                     qty_in_kg: weight_data.qty_in_kg,
//                   });
//                   element.pending_qty = element.pending_qty - element_pick_qty;
//                   counter++;
//                   bin_capacity = 5;
//                 } else {
//                   response_array.push({
//                     counter: counter,
//                     material_no: element.material_no,
//                     item_no: element.item_no,
//                     pending_qty: element.pending_qty,
//                     qty_in_kg: weight_data.qty_in_kg,
//                   });
//                   bin_capacity -= overall_weight;
//                   element.pending_qty = 0;
//                 }
//               }
//             } else {
//               response_array.push({
//                 counter: counter,
//                 material_no: element.material_no,
//                 item_no: element.item_no,
//                 pending_qty: element.pending_qty,
//                 qty_in_kg: weight_data.qty_in_kg,
//               });
//               bin_capacity -= overall_weight;
//             }
//           }
//         }
//       });
//     });

//     let final_response = {};
//     let final_response_array = [];

//     for (let i = 1; i <= counter; i++) {
//       let array = [];
//       response_array.forEach((element) => {
//         if (i == element.counter) {
//           array.push({
//             material_no: element.material_no,
//             item_no: element.item_no,
//             pending_qty: element.pending_qty,
//             qty_in_kg: element.qty_in_kg,
//           });
//         }
//       });
//       if (array.length) {
//         final_response_array.push({
//           counter: i,
//           details: array,
//         });
//       }
//     }

//     final_response.bin_count = final_response_array.length;
//     final_response.min_bin_capacity = min_bin_capacity;
//     final_response.bin_details = final_response_array;
//     if (final_response_array.length) {
//       return res.status(200).send({
//         status_code: "200",
//         status_message: "Bin count is available!",
//         data: final_response,
//       });
//     }
//     else{
//       return res.status(400).send({
//         status_code: "400",
//         status_message: "Bins are not required for the so"
//       });
//     }
//   } catch (err) {
//     return res.status(400).send({
//       status_code: "400",
//       status_message:
//         err.message || "Some error occurred while creating the customer.",
//     });
//   }
// };

exports.update = async (req, res) => {
  try {
    if (
      !(
        req.body.bin_id &&
        req.body.bin_status &&
        req.body.company_code &&
        req.body.plant_id &&
        req.body.status &&
        req.body.bin_detail &&
        req.body.sales_order_no
      )
    ) {
      return res.status(400).send({
        message: "Missing parameter!",
      });
    }

    // let objj = {
    //   sales_order_no: req.body.sales_order_no,
    //   company_code: req.body.company_code,
    //   plant_id: req.body.plant_id,
    // };

    // console.log("no_bin_detail", no_bin_detail);
    // return res.send(no_bin_detail);

    const job_scheduled_time = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD");

    //

    // const bin_inserted_at = moment_tz(new Date())
    //   .tz("Asia/Kolkata")
    //   .format("DD-MM-YYYY HH:mm:ss");

    const sales_order_no = req.body.sales_order_no;

    const check_job = await db.rapid_job_scheduler_v2.findOne({
      sales_order_no: req.body.sales_order_no,
      bin_id: req.body.bin_id,
      is_deleted: false,
    });

    if (check_job) {
      return res.send({
        status_code: 200,
        message: "provided bin is already assign to given sales order.",
      });
    }

    const check_job_on_bin = await db.rapid_job_scheduler_v2.findOne({
      job_scheduled_on: job_scheduled_time,
      bin_id: req.body.bin_id,
      is_deleted: false,
    });

    // console.log("one secondcheck", check_job_on_bin);

    if (
      check_job_on_bin &&
      check_job_on_bin.job_scheduled_on == job_scheduled_time
    ) {
      return res.send({
        status_code: 200,
        message: `Bin with id ${req.body.bin_id} already assisgned for Today`,
      });
    }

    // check bin scheduled

    // let no_bin_detail = await get_no_of_bins_v3_call(objj);

    // if (no_bin_detail.status_code != 200) {
    //   console.log("checked");
    //   return res.send(no_bin_detail);
    // }

    // const check_no_bin = await db.rapid_job_scheduler_v2.find({
    //   sales_order_no: req.body.sales_order_no,
    // });

    // // console.log(
    // //   "no_bin_detail.data.bin_details",
    // //   no_bin_detail.data.bin_details.length,
    // //   check_no_bin.length
    // // );

    // if (
    //   no_bin_detail.data &&
    //   no_bin_detail.data.bin_details.length > check_no_bin.length
    // ) {
    //   var update_bin_detail =
    //     no_bin_detail.data &&
    //     no_bin_detail.data.bin_details[check_no_bin.length].details;
    // } else {
    //   return res.send({
    //     status_code: 400,
    //     message: "bin detail not avaialble",
    //   });
    // }

    // update job with bin

    var job_detail = {
      sales_order_no: req.body.sales_order_no,
      plant_id: req.body.plant_id,
      company_code: req.body.company_code,
      bin_id: req.body.bin_id,
      bin_status: req.body.bin_status,
      status: req.body.status,
      job_scheduled_on: job_scheduled_time,
      bin_detail: req.body.bin_detail,
    };

    const new_job_entry = new db.rapid_job_scheduler_v2(job_detail);

    let save_new_job = await new_job_entry.save();

    // console.log("create", save_new_job);

    if (save_new_job) {
      return res.status(200).send({
        status_code: 200,
        message: "Job scheduled successfully.",
      });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "Unable to schedule job.",
      });
    }
  } catch (err) {
    // console.log(err);
    return res.status(500).send({
      message: err.message || "Some error occurred while job scheduling !",
    });
  }
};

///  get no of bin function
var get_no_of_bins_v3_call = async (paramter) => {
  console.log("paramter", paramter);
  // return "successfully return ed";

  const sales_order_no = paramter.sales_order_no;
  let plant_id = paramter.plant_id;
  let company_code = paramter.company_code;
  // let bin_capacity = 5;
  // let counter = 1;
  console.log("get_no_of_bins");
  // if (!(company_code && plant_id)) {
  //   return res
  //     .status(400)
  //     .send({ status_code: "400", status_message: "Missing parameter." });
  // }

  try {
    let so_details = await so_allocation_table
      .find(
        {
          sales_order_no: sales_order_no,
          plant_id: plant_id,
          company_code: company_code,
        },
        { _id: 0, material_no: 1, pending_qty: 1, item_no: 1, material_name: 1 }
      )
      .sort({ material_no: 1 });

    if (!so_details.length) {
      return {
        status_code: 400,
        status_message: "Please provide valid so number",
      };
      // return res.status(400).send({
      //   status_code: "400",
      //   status_message: "Please provide valid so number",
      // });
    }

    let material_code_array = [];
    so_details.forEach((element) => {
      element.pending_qty = Math.round(element.pending_qty);
      material_code_array.push(element.material_no);
    });

    let unique_material_code_array = [];
    material_code_array.forEach((element) => {
      // console.log('unique_material_code_array',material_code_array,unique_material_code_array,element);
      // console.log(unique_material_code_array.includes(element));
      if (!unique_material_code_array.includes(element)) {
        unique_material_code_array.push(element);
      }
    });
    // console.log("material_code_array",material_code_array);

    // console.log("unique_material_code_array",unique_material_code_array,material_code_array);
    let product_weight_data = await product_weight_model
      .find(
        {
          plant_id: plant_id,
          company_code: company_code,
          material_code: { $in: material_code_array },
        },
        {
          _id: 0,
          material_code: 1,
          qty_in_kg: 1,
          pieces_per_bin: 1,
          qty_in_pack: 1,
          pieces_per_pack: 1,
        }
      )
      .sort({ qty_in_kg: -1 });
    // console.log("product_weight_data.length",product_weight_data.length,so_details.length);
    if (!(product_weight_data.length == unique_material_code_array.length)) {
      return {
        status_code: 400,
        status_message:
          "Material code not available in product weight tolerance collection",
      };
      // return res.status(400).send({
      //   status_code: "400",
      //   status_message:
      //     "Material code not available in product weight tolerance collection",
      // });
    }

    // console.log("so_details",so_details,product_weight_data);
    so_details.forEach((so) => {
      product_weight_data.forEach((sku) => {
        if (so.material_no == sku.material_code) {
          if (
            so.pending_qty >= sku.qty_in_pack &&
            Math.floor(sku.qty_in_pack)
          ) {
            let x = Math.floor(
              Math.floor(so.pending_qty) / Math.floor(sku.qty_in_pack)
            );
            let y = Math.floor(Math.floor(sku.qty_in_pack) * x);
            so.pending_qty -= y;
          }
        }
      });
    });
    //console.log("so_details",so_details);

    let allocated_so_details = await so_allocation_table.aggregate([
      {
        $match: {
          sales_order_no: sales_order_no,
          plant_id: plant_id,
          company_code: company_code,
        },
      },
      { $unwind: "$allocation_detail" },
      { $match: { "allocation_detail.mode": "ptl" } },
      {
        $group: {
          _id: "$material_no",
          material_no: { $first: "$material_no" },
          allocated_qty: { $sum: "$allocation_detail.net_weight" },
        },
      },
    ]);

    if (allocated_so_details.length) {
      allocated_so_details.forEach((allocated_so) => {
        so_details.forEach((so) => {
          if (allocated_so.material_no == so.material_no) {
            so.pending_qty += allocated_so.allocated_qty;
          }
        });
      });
    }

    // let min_bin_capacity = product_weight_data[0].qty_in_kg;
    // let bin_capacity = product_weight_data[0].pieces_per_bin;
    // if (!bin_capacity) {
    //   return res.send("Bulk So Selected");
    // }
    // console.log("min_bin_capacity", min_bin_capacity, bin_capacity, counter);

    let response_array = [];
    let pending_bin_percentage;
    let previous_bin_percentage = 0;

    let counter = 1;

    // console.log('product_weight_data',product_weight_data);
    // console.log('so_details',so_details);

    so_details.forEach((element) => {
      product_weight_data.forEach((weight_data) => {
        if (weight_data.pieces_per_bin) {
          // console.log("pieces_per_bin");
          if (element.material_no == weight_data.material_code) {
            let ordered_qty = element.pending_qty;
            let sku_peices_per_bin = weight_data.pieces_per_bin;
            if (ordered_qty % sku_peices_per_bin == 0) {
              // console.log("true",element.material_no);
              let sku_counter = ordered_qty / sku_peices_per_bin;
              // console.log("sku_counter",sku_counter);
              while (sku_counter) {
                response_array.push({
                  counter: counter,
                  material_no: element.material_no,
                  material_name: element.material_name,
                  item_no: element.item_no,
                  assigned_qty: weight_data.pieces_per_bin,
                  pending_qty: weight_data.pieces_per_bin,
                  qty_in_kg: weight_data.qty_in_kg,
                });
                counter++;
                sku_counter--;
              }
              element.pending_qty = 0;
            }
          }
        }
      });
    });

    // console.log('so_details',so_details);

    so_details.forEach((element) => {
      product_weight_data.forEach((weight_data) => {
        // to check whether the material is discrete
        if (weight_data.pieces_per_bin && element.pending_qty) {
          // console.log("pieces_per_bin");
          if (element.material_no == weight_data.material_code) {
            // console.log("element.material_no", element.material_no);
            // pending_bin_percentage = 100 - previous_bin_percentage;
            // console.log(
            //   "pending_bin_percentage",
            //   pending_bin_percentage,
            //   weight_data.pieces_per_bin
            // );
            while (element.pending_qty > 0) {
              pending_bin_percentage = 100 - previous_bin_percentage;
              let temp_sku_allowed_limit = Math.floor(
                (weight_data.pieces_per_bin / 100) * pending_bin_percentage
              );
              // console.log(
              //   "temp_sku_allowed_limit",
              //   temp_sku_allowed_limit,
              //   weight_data.pieces_per_pack
              // );
              if (element.pending_qty < temp_sku_allowed_limit) {
                response_array.push({
                  counter: counter,
                  material_no: element.material_no,
                  material_name: element.material_name,
                  item_no: element.item_no,
                  assigned_qty: element.pending_qty,
                  pending_qty: element.pending_qty,
                  qty_in_kg: weight_data.qty_in_kg,
                });
                let temp_previous_bin_percentage = Math.floor(
                  (element.pending_qty / weight_data.pieces_per_bin) * 100
                );
                previous_bin_percentage += temp_previous_bin_percentage;
                element.pending_qty = 0;
                // console.log(
                //   "temp_previous_bin_percentage",
                //   temp_previous_bin_percentage,
                //   previous_bin_percentage
                // );
              } else if (
                weight_data.pieces_per_pack &&
                temp_sku_allowed_limit > weight_data.pieces_per_pack
              ) {
                // console.log("else if");
                let x = Math.floor(
                  temp_sku_allowed_limit / weight_data.pieces_per_pack
                );
                let y = weight_data.pieces_per_pack * x;
                // console.log(
                //   "else if",
                //   x,
                //   y,
                //   element.pending_qty,
                //   temp_sku_allowed_limit,
                //   weight_data.pieces_per_pack
                // );
                response_array.push({
                  counter: counter,
                  material_no: element.material_no,
                  material_name: element.material_name,
                  item_no: element.item_no,
                  assigned_qty: y,
                  pending_qty: y,
                  qty_in_kg: weight_data.qty_in_kg,
                });
                element.pending_qty = element.pending_qty - y;
                counter++;
                // console.log("else if", counter, element.pending_qty);
                previous_bin_percentage = 0;
              } else {
                response_array.push({
                  counter: counter,
                  material_no: element.material_no,
                  material_name: element.material_name,
                  item_no: element.item_no,
                  assigned_qty: temp_sku_allowed_limit,
                  pending_qty: temp_sku_allowed_limit,
                  qty_in_kg: weight_data.qty_in_kg,
                });
                element.pending_qty =
                  element.pending_qty - temp_sku_allowed_limit;
                counter++;
                previous_bin_percentage = 0;
              }
            }
          }
        }
      });
    });

    let final_response = {};
    let final_response_array = [];

    for (let i = 1; i <= counter; i++) {
      let array = [];
      response_array.forEach((element) => {
        if (i == element.counter) {
          array.push({
            material_no: element.material_no,
            material_name: element.material_name,
            item_no: element.item_no,
            assigned_qty: element.assigned_qty,
            pending_qty: element.pending_qty,
            qty_in_kg: element.qty_in_kg,
          });
        }
      });
      if (array.length) {
        final_response_array.push({
          counter: i,
          details: array,
        });
      }
    }

    final_response.bin_count = final_response_array.length;
    // final_response.min_bin_capacity = min_bin_capacity;
    final_response.bin_details = final_response_array;
    if (final_response_array.length) {
      return {
        status_code: 200,
        status_message: "Bin count is available!",
        data: final_response,
      };

      // return res.status(200).send({
      //   status_code: "200",
      //   status_message: "Bin count is available!",
      //   data: final_response,
      // });
    } else {
      return {
        status_code: 400,
        status_message: "Bins are not required for the so",
      };
      // return res.status(400).send({
      //   status_code: "400",
      //   status_message: "Bins are not required for the so",
      // });
    }
  } catch (err) {
    return {
      status_code: 400,
      status_message:
        err.message || "Some error occurred while creating the customer.",
    };
    // return res.status(400).send({
    //   status_code: "400",
    //   status_message:
    //     err.message || "Some error occurred while creating the customer.",
    // });
  }
};

// update bin with bin detail

exports.update_bin_with_bin_detail = async (req, res) => {
  try {
    if (
      !(
        req.body.bin_id &&
        req.body.bin_status &&
        req.body.company_code &&
        req.body.plant_id &&
        req.body.status &&
        req.body.bin_detail &&
        req.body.sales_order_no
      )
    ) {
      return res.status(400).send({
        message: "Missing parameter!",
      });
    }

    let objj = {
      sales_order_no: req.body.sales_order_no,
      company_code: req.body.company_code,
      plant_id: req.body.plant_id,
    };

    // console.log("no_bin_detail", no_bin_detail);
    // return res.send(no_bin_detail);

    const job_scheduled_time = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD");

    //

    // const bin_inserted_at = moment_tz(new Date())
    //   .tz("Asia/Kolkata")
    //   .format("DD-MM-YYYY HH:mm:ss");

    const sales_order_no = req.body.sales_order_no;

    const check_job = await db.rapid_job_scheduler_v2.findOne({
      sales_order_no: req.body.sales_order_no,
      bin_id: req.body.bin_id,
      is_deleted: false,
    });

    if (check_job) {
      return res.send({
        status_code: 200,
        message: "provided bin is already assign to given sales order.",
      });
    }

    const check_job_on_bin = await db.rapid_job_scheduler_v2.findOne({
      job_scheduled_on: job_scheduled_time,
      bin_id: req.body.bin_id,
      is_deleted: false,
    });

    // console.log("one secondcheck", check_job_on_bin);

    if (
      check_job_on_bin &&
      check_job_on_bin.job_scheduled_on == job_scheduled_time
    ) {
      return res.send({
        status_code: 200,
        message: `Bin with id ${req.body.bin_id} already assisgned for Today`,
      });
    }

    // check bin scheduled

    let no_bin_detail = await get_no_of_bins_v3_call(objj);

    if (no_bin_detail.status_code != 200) {
      console.log("checked");
      return res.send(no_bin_detail);
    }

    const check_no_bin = await db.rapid_job_scheduler_v2.find({
      sales_order_no: req.body.sales_order_no,
    });

    // console.log(
    //   "no_bin_detail.data.bin_details",
    //   no_bin_detail.data.bin_details.length,
    //   check_no_bin.length
    // );

    if (
      no_bin_detail.data &&
      no_bin_detail.data.bin_details.length > check_no_bin.length
    ) {
      var update_bin_detail =
        no_bin_detail.data &&
        no_bin_detail.data.bin_details[check_no_bin.length].details;
    } else {
      return res.send({
        status_code: 400,
        message: "bin detail not avaialble",
      });
    }

    // update job with bin

    var job_detail = {
      sales_order_no: req.body.sales_order_no,
      plant_id: req.body.plant_id,
      company_code: req.body.company_code,
      bin_id: req.body.bin_id,
      bin_status: req.body.bin_status,
      status: req.body.status,
      job_scheduled_on: job_scheduled_time,
      bin_detail: update_bin_detail,
    };

    const new_job_entry = new db.rapid_job_scheduler_v2(job_detail);

    let save_new_job = await new_job_entry.save();

    // console.log("create", save_new_job);

    if (save_new_job) {
      return res.status(200).send({
        status_code: 200,
        message: "Job scheduled successfully.",
      });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "Unable to schedule job.",
      });
    }
  } catch (err) {
    // console.log(err);
    return res.status(500).send({
      message: err.message || "Some error occurred while job scheduling !",
    });
  }
};

// update bin status

exports.update_bin_status = async (req, res) => {
  try {
    if (
      !(
        req.body.bin_id &&
        req.body.company_code &&
        req.body.plant_id &&
        req.body.sales_order_no &&
        req.body.status
      )
    ) {
      return res.status(400).send({
        message:
          "Please provide all required fields like company_code,plant_id, sales_order_no, bin_id!",
      });
    }

    const job_scheduled_time = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD");
    //

    const bin_inserted_at = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("DD-MM-YYYY HH:mm:ss");
    //

    const update_bin_status = await db.rapid_job_scheduler_v2.findOneAndUpdate(
      {
        plant_id: req.body.plant_id,
        company_code: req.body.company_code,
        sales_order_no: req.body.sales_order_no,
        "bin_detail.bin_id": req.body.bin_id,
      },
      { $set: { "bin_detail.$.status": req.body.status } }
    );

    // console.log("update2", update_parameter);

    if (update_bin_status) {
      return res.status(200).send({
        status_code: 200,
        message: `Bin status updated successfully to ${req.body.status}`,
      });
    } else if (!update_bin_status) {
      return res.status(400).send({
        status_code: 400,
        message: `bin ${req.body.bin_id} with sales order number ${req.body.sales_order_no} not exists in Jobscheduler`,
      });
    }
  } catch (err) {
    // console.log(err);
    return res.status(500).send({
      message: err.message || "Some error occurred while updating bin status!",
    });
  }
};
