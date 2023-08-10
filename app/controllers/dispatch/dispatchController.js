const db = require("../../models");
const _ = require("lodash");
const axios = require("axios");
const conn = require("../../../server.js");
const moment = require("moment");
const moment_tz = require("moment-timezone");

const invoice_generation = db.invoiceGenerate;
const so_allocation_table = db.soAllocationGenerate;
const invoice_master = db.invoicemasters;
const dispatch_details = db.dispatchDetails;
const soAllocationColl = db.soAllocation;
const secondaryStorageColl = db.secondary_storage;
const primaryStorageColl = db.primary_storage;
const rackColl = db.racks;
const palletizationColl = db.palletization;
const cumulativePalletizationColl = db.cumulativePalletization;
const allocationPalletizationColl = db.allocationPalletization;
const dispatchColl = db.dispatch_storage;
const palletMasterColl = db.pallets;
const toleranceColl = db.product_weight_model;
const skuPickingUserColl = db.skuPickingUser;

// helpers
const { respondSuccess, respondFailure } = require("../../helpers/response");
const {
  result,
  find,
  update,
  assign,
  filter,
  pick,
  create,
  get,
} = require("lodash");
const { Aggregate } = require("mongoose");
const { secondary_storage, racks, primary_storage } = require("../../models");
const palletModel = require("../../models/master/pallet.model");
const { compileETag } = require("express/lib/utils");
const e = require("express");
const plantModel = require("../../models/master/plant.model");
const { boolean } = require("joi");
const { getCountries } = require("../master/country_details.controller");
const weight_tolerenceModel = require("../../models/product_weight_tolerence/weight_tolerence.model");
const { StatusCode } = require("../../helpers/constant");
const res = require("express/lib/response");
const { promises } = require("nodemailer/lib/xoauth2");
const { status } = require("express/lib/response");

exports.getRouteDetails = async (req, res) => {
  try {
    const { delivery_date, company_code, plant_id } = req.query;

    if (!(delivery_date, company_code, plant_id)) {
      return res
        .status(400)
        .send({ status_code: "400", message: "Missing parameter." });
    }

    // let allocation_data = await so_allocation_table.find({ delivery_date, plant_id, company_code, route_id: {$ne: ''} })
    //    .select('route_id -_id')
    //    .sort({ route_id: 1 }).collation({locale: "en_US", numericOrdering: true});

    let allocation_data = await invoice_generation
      .find({ delivery_date, plant_id, company_code, route_id: { $ne: "" } })
      .select("route_id -_id");

    const newRouteList = _.uniqBy(allocation_data, "route_id");

    if (newRouteList.length) {
      return respondSuccess(res, "Route id are available", newRouteList);
    }
    return respondSuccess(res, "Route id not available", newRouteList);
  } catch (err) {
    res.status(500).send({
      status_code: "500",
      message:
        err.message || "Some error occurred while retrieving route details.",
    });
  }
};

exports.getCustomerDetails = async (req, res) => {
  try {
    const { delivery_date, route_id, plant_id, company_code } = req.query;

    if (!(delivery_date, route_id, plant_id, company_code)) {
      return res
        .status(400)
        .send({ status_code: "400", message: "Missing parameter." });
    }

    let allocation_data = await so_allocation_table
      .find({ delivery_date: delivery_date, plant_id, company_code })
      .select("customer_name customer_code route_id -_id")
      .sort({ customer_name: 1 });

    const newCustomerList = _.uniqBy(allocation_data, "customer_code");

    if (allocation_data.length) {
      return respondSuccess(res, "Customers are available", newCustomerList);
      // return res.send({ newCustomerList});
    }
    return respondSuccess(res, "Customers not available", newCustomerList);
  } catch (err) {
    res.status(500).send({
      status_code: "500",
      message:
        err.message || "Some error occurred while retrieving customer details.",
    });
  }
};

exports.getSoDetails = async (req, res) => {
  try {
    const { delivery_date, route_id, plant_id, company_code, customer_code } =
      req.query;

    if (!(delivery_date, route_id, plant_id, company_code, customer_code)) {
      return res
        .status(400)
        .send({ status_code: "400", message: "Missing parameter." });
    }

    let allocation_data = await so_allocation_table
      .find({ delivery_date, route_id, plant_id, company_code, customer_code })
      .select("sales_order_no -_id");

    const soList = _.uniqBy(allocation_data, "sales_order_no");

    if (soList.length) {
      return respondSuccess(res, "So lists are available", soList);
    }
    return respondSuccess(res, "So lists not available", soList);
  } catch (err) {
    res.status(500).send({
      status_code: "500",
      message:
        err.message ||
        "Some error occurred while retrieving so allocation details.",
    });
  }
};

exports.getSoNoList = async (req, res) => {
  try {
    const {
      company_code,
      plant_id,
      delivery_date,
      route_id,
      pallet_barcode,
      customer_code,
    } = req.query;

    if (
      !(
        delivery_date &&
        route_id &&
        plant_id &&
        company_code &&
        pallet_barcode &&
        customer_code
      )
    ) {
      return res.status(400).send({
        status_code: "400",
        message: "Provide all required parameters!",
      });
    }

    const getSoNoList = (
      await dispatchColl.aggregate([
        {
          $match: {
            company_code: company_code,
            plant_id: plant_id,
            delivery_date: delivery_date,
            route_id: route_id,
            pallet_barcode: pallet_barcode,
          },
        },
        { $unwind: "$items" },
        {
          $match: {
            "items.customer_code": customer_code,
          },
        },
        { $project: { _id: 0, "items.sales_order_no": 1 } },
      ])
    ).map((no) => {
      return { sales_order_no: no.items.sales_order_no };
    });

    let mssge = "Sales order number list is available!";
    let status = 200;

    if (!getSoNoList.length) {
      mssge = "sales order number not found!";
      status = 404;
    }

    return res.status(status).send({
      status_code: status,
      message: mssge,
      data: getSoNoList,
    });

    // const fromStorage = (
    //   await dispatchColl.aggregate([
    //     {
    //       $match: {
    //         company_code: company_code,
    //         plant_id: plant_id,
    //         delivery_date: delivery_date,
    //         route_id: route_id,
    //         pallet_barcode: pallet_barcode,
    //       },
    //     },
    //     { $unwind: "$items" },
    //     {
    //       $match: {
    //         customer_code: customer_code,
    //       },
    //     },
    //     {
    //       $project: {
    //         _id: 0,
    //         "items.material_code": 1,
    //       },
    //     },
    //   ])
    // ).map((code) => {
    //   return code.items.material_code;
    // });

    // if (!fromStorage.length)
    //   return res
    //     .status(404)
    //     .send({ status_code: 404, message: "Sales order number not found!" });

    // const soNOList = (
    //   await allocationPalletizationColl.aggregate([
    //     {
    //       $match: {
    //         company_code: company_code,
    //         plant_id: plant_id,
    //         delivery_date: delivery_date,
    //         route_id: route_id,
    //         pallet_barcode: pallet_barcode,
    //         is_deleted: false,
    //       },
    //     },
    //     { $unwind: "$items" },
    //     {
    //       $match: {
    //         "items.material_code": { $in: fromStorage },
    //       },
    //     },
    //     {
    //       $project: {
    //         _id: 0,
    //         "items.sales_order_no": 1,
    //       },
    //     },
    //   ])
    // ).map((no) => {
    //   return { sales_order_no: no.items.sales_order_no };
    // });

    // if (!soNOList.length)
    //   return res
    //     .status(404)
    //     .send({ status_code: 404, message: "Sales order number not found!" });
    // else {
    //   const soList = _.uniqBy(allocation_data, "sales_order_no");

    //   return res.send({
    //     status_code: 200,
    //     message: "Sales order number list is available!",
    //     data: soList,
    //   });
    // }
  } catch (err) {
    console.log(err);
    res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting sales order number list!",
    });
  }
};

exports.getInvoiceDetail = async (req, res) => {
  try {
    const {
      delivery_date,
      plant_id,
      company_code,
      customer_code,
      route_id,
      sales_order_no,
    } = req.query;

    if (
      !(delivery_date,
      route_id,
      plant_id,
      company_code,
      customer_code,
      route_id,
      sales_order_no)
    ) {
      return res
        .status(400)
        .send({ status_code: "400", message: "Missing parameter." });
    }

    let invoice_data = await invoice_generation
      .find({
        delivery_date,
        route_id,
        plant_id,
        company_code,
        customer_code,
        route_id,
        sales_order_no,
      })
      .select("invoice_no -_id");

    const invoiceList = _.uniqBy(invoice_data, "invoice_no");

    if (invoiceList.length) {
      return respondSuccess(res, "Invoices are available", invoiceList);
    }
    return respondSuccess(res, "Invoices are not available", invoiceList);
  } catch (err) {
    res.status(500).send({
      status_code: "500",
      message:
        err.message ||
        "Some error occurred while retrieving so allocation details.",
    });
  }
};

exports.getInvoiceItems = async (req, res) => {
  try {
    const { invoice_no } = req.query;

    if (!invoice_no) {
      return res
        .status(400)
        .send({ status_code: "400", message: "Missing parameter." });
    }

    let invoice_items = await invoice_master
      .findOne({ "invoiceDetails.invoiceNo": invoice_no })
      .select(
        "itemSupplied.item_no itemSupplied.itemId itemSupplied.itemName itemSupplied.uom -_id"
      );

    let itemLists, new_item_list;
    if (invoice_items) {
      new_item_list = invoice_items.itemSupplied;
      itemLists = _.uniqBy(new_item_list, "itemId");

      if (itemLists.length) {
        return respondSuccess(res, "Invoice items are available", itemLists);
      }
      return respondSuccess(res, "Invoices items are not available", itemLists);
    }

    return respondSuccess(res, "Invoices items are not available", itemLists);
  } catch (err) {
    res.status(500).send({
      status_code: "500",
      message:
        err.message ||
        "Some error occurred while retrieving so allocation details.",
    });
  }
};

exports.getItemQuantity = async (req, res) => {
  try {
    const { item_code, invoice_no, item_no, uom } = req.query;

    if (!(item_code, invoice_no, item_no, uom)) {
      return res
        .status(400)
        .send({ status_code: "400", message: "Missing parameter." });
    }

    let item_quantity = await invoice_master
      .findOne({
        "invoiceDetails.invoiceNo": invoice_no,
        "itemSupplied.itemId": item_code,
        "itemSupplied.item_no": item_no,
        "itemSupplied.uom": uom,
      })
      .select("itemSupplied.quantity -_id");

    if (item_quantity && item_quantity.itemSupplied.length) {
      return respondSuccess(
        res,
        "Item quantity are available",
        item_quantity.itemSupplied[0]
      );
    }
    return respondSuccess(res, "item quantities are not available", []);
  } catch (err) {
    res.status(500).send({
      status_code: "500",
      message:
        err.message ||
        "Some error occurred while retrieving so allocation details.",
    });
  }
};

exports.saveDispatch = async (req, res) => {
  try {
    const {
      plant_id,
      company_code,
      customer_name,
      customer_code,
      item_code,
      delivery_date,
      route_id,
      sales_order_no,
      invoice_no,
      item_name,
      item_quantity,
      uom,
    } = req.body;

    if (
      !plant_id ||
      !company_code ||
      !customer_name ||
      !customer_code ||
      !item_code ||
      !delivery_date ||
      !route_id ||
      !sales_order_no ||
      !invoice_no ||
      !item_name ||
      !item_quantity ||
      !uom
    ) {
      return res
        .status(400)
        .send({ status_code: "400", message: "Missing parameter''''." });
    }

    let dispatched_data = await dispatch_details.findOne({
      plant_id,
      company_code,
      customer_name,
      customer_code,
      invoice_no,
      delivery_date,
      route_id,
      sales_order_no,
    });

    if (dispatched_data) {
      const dispatched_item = await dispatch_details.findOne({
        _id: dispatched_data._id,
        "items.item_code": item_code,
        "items.item_name": item_name,
        "items.item_quantity": item_quantity,
        "items.uom": uom,
      });

      if (dispatched_item) {
        return respondSuccess(res, "Dispatch details already stored");
      }

      await dispatch_details.updateOne(
        {
          _id: dispatched_data._id,
        },
        {
          $push: {
            items: { item_code, item_name, item_quantity, uom },
          },
        }
      );
      return respondSuccess(res, "Dispatch details stored successfully");
    }
    const today = new Date();
    var dd = String(today.getDate()).padStart(2, "0");
    var mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
    var yyyy = today.getFullYear();
    req.body.dispatch_date = yyyy + "-" + mm + "-" + dd;

    req.body.items = {
      item_code,
      item_name,
      item_quantity,
      uom,
    };
    const new_dispatch_details = new dispatch_details(req.body);
    await new_dispatch_details.save();

    return respondSuccess(res, "Dispatch details stored successfully");
  } catch (err) {
    res.status(500).send({
      status_code: "500",
      message:
        err.message ||
        "Some error occurred while retrieving so allocation details.",
    });
  }
};

// exports.v2SaveDispatch = async (req, res) => {
//   const {
//     plant_id,
//     company_code,
//     customer_name,
//     customer_code,
//     material_no,
//     item_no,
//     delivery_date,
//     route_id,
//     sales_order_no,
//     invoice_no,
//     material_name,
//     invoice_qty,
//     uom,
//     crate_barcode_value,
//     actual_qty,
//     tare_weight,
//   } = req.body;

//   if (
//     !(
//       company_code &&
//       plant_id &&
//       customer_name &&
//       customer_code &&
//       material_no &&
//       item_no &&
//       delivery_date &&
//       route_id &&
//       sales_order_no &&
//       invoice_no &&
//       material_name &&
//       uom &&
//       invoice_qty != null &&
//       actual_qty != null &&
//       tare_weight != null &&
//       crate_barcode_value
//     )
//   ) {
//     return res
//       .status(400)
//       .send({ status_code: "400", status_message: "Missing parameters" });
//   }

//   try {
//     let dispatch_data = await dispatch_details.findOne({
//       company_code: company_code,
//       plant_id: plant_id,
//       customer_code: customer_code,
//       material_no: material_no,
//       item_no: item_no,
//       delivery_date: delivery_date,
//       route_id: route_id,
//       sales_order_no: sales_order_no,
//       invoice_no: invoice_no,
//     });

//     console.log("plant_id", plant_id, dispatch_data);

//     let format = "YYYY-MM-DD";
//     let format_with_time = "DD-MM-YYYY HH:mm:ss";
//     let dispatch_date = moment_tz(new Date(), format)
//       .tz("Asia/Kolkata")
//       .format(format);
//     const outward_time = moment_tz(new Date(), format_with_time)
//       .tz("Asia/Kolkata")
//       .format(format_with_time);
//     var net_weight = parseFloat(actual_qty) - parseFloat(tare_weight);

//     if (!dispatch_data) {
//       // let sales_orders_details = await soAllocationColl.findOne(
//       //   {
//       //     company_code: company_code,
//       //     plant_id: plant_id,
//       //     customer_code: customer_code,
//       //     material_no: material_no,
//       //     item_no: item_no,
//       //     delivery_date: delivery_date,
//       //     sales_order_no: sales_order_no,
//       //   },
//       //   { _id: 0, order_qty: 1 }
//       // );

//       // if (!sales_orders_details) {
//       //   return res.status(400).send({
//       //     status_code: "400",
//       //     status_message: "sales orders details are invalid",
//       //   });
//       // }

//       let insert_data = {};
//       insert_data.plant_id = plant_id;
//       insert_data.company_code = company_code;
//       insert_data.customer_name = customer_name;
//       insert_data.customer_code = customer_code;
//       insert_data.material_no = material_no;
//       insert_data.item_no = item_no;
//       insert_data.delivery_date = delivery_date;
//       insert_data.route_id = route_id;
//       insert_data.sales_order_no = sales_order_no;
//       insert_data.invoice_no = invoice_no;
//       insert_data.material_name = material_name;
//       // insert_data.so_order_qty = sales_orders_details.order_qty;
//       insert_data.invoice_qty = invoice_qty;
//       insert_data.uom = uom;
//       insert_data.total_net_weight = net_weight;
//       insert_data.total_gross_weight = actual_qty;
//       insert_data.total_tare_weight = tare_weight;
//       insert_data.crate_count = 1;
//       insert_data.crate_details = {
//         crate_barcode_value: crate_barcode_value,
//         gross_weight: actual_qty,
//         net_weight: net_weight,
//         tare_weight: tare_weight,
//         outward_time: outward_time,
//       };
//       insert_data.dispatch_date = dispatch_date;

//       console.log("insert_data", insert_data);

//       const new_dispatch_details = new dispatch_details(insert_data);
//       await new_dispatch_details.save();
//       return res.send({
//         status_code: 200,
//         status_message: "Outward details stored successfully",
//       });
//     } else {
//       console.log("else dispatch_data", dispatch_data);
//       let update_dispatch_data = {};
//       update_dispatch_data.total_net_weight = (
//         net_weight + dispatch_data.total_net_weight
//       ).toFixed(2);
//       update_dispatch_data.total_gross_weight = (
//         +actual_qty + dispatch_data.total_gross_weight
//       ).toFixed(2);
//       update_dispatch_data.total_tare_weight = (
//         +tare_weight + dispatch_data.total_tare_weight
//       ).toFixed(2);
//       update_dispatch_data.crate_count = ++dispatch_data.crate_count;
//       update_dispatch_data.crate_details = dispatch_data.crate_details;
//       update_dispatch_data.crate_details.push({
//         crate_barcode_value: crate_barcode_value,
//         gross_weight: actual_qty,
//         net_weight: net_weight,
//         tare_weight: tare_weight,
//         outward_time: outward_time,
//       });
//       await dispatch_details.findByIdAndUpdate(
//         { _id: dispatch_data._id },
//         update_dispatch_data,
//         { useFindAndModify: false, upsert: false, new: true }
//       );
//       return res.send({
//         status_code: 200,
//         status_message: "Outward details stored successfully",
//       });
//     }
//   } catch (err) {
//     return res.status(500).send({
//       status_code: 500,
//       status_message:
//         err.message ||
//         "Some error occurred while storing outwarding material details!",
//     });
//   }
// };

// exports.v2SaveDispatch = async (req, res) => {
//   const {
//     plant_id,
//     company_code,
//     customer_name,
//     customer_code,
//     material_no,
//     item_no,
//     delivery_date,
//     route_id,
//     sales_order_no,
//     invoice_no,
//     material_name,
//     invoice_qty,
//     uom,
//     crate_barcode_value,
//     actual_qty,
//     tare_weight,
//   } = req.body;

//   if (
//     !(
//       company_code &&
//       plant_id &&
//       customer_name &&
//       customer_code &&
//       material_no &&
//       item_no &&
//       delivery_date &&
//       route_id &&
//       sales_order_no &&
//       invoice_no &&
//       material_name &&
//       uom &&
//       invoice_qty != null &&
//       actual_qty != null &&
//       tare_weight != null &&
//       crate_barcode_value
//     )
//   ) {
//     return res
//       .status(400)
//       .send({ status_code: "400", status_message: "Missing parameters" });
//   }

//   try {
//     const checkDuplicateBarcode = await dispatch_details.findOne({
//       company_code: company_code,
//       plant_id: plant_id,
//       "crate_details.crate_barcode_value": crate_barcode_value,
//     });

//     if (checkDuplicateBarcode != null)
//       return res.send({
//         status_code: 400,
//         status_message: "Duplicate barcode not allowed!",
//       });

//     let dispatch_data = await dispatch_details.findOne({
//       company_code: company_code,
//       plant_id: plant_id,
//       customer_code: customer_code,
//       material_no: material_no,
//       item_no: item_no,
//       delivery_date: delivery_date,
//       route_id: route_id,
//       sales_order_no: sales_order_no,
//       invoice_no: invoice_no,
//     });

//     console.log("plant_id", plant_id, dispatch_data);

//     let invoice_quantity = invoice_qty;

//     if (uom == "KG") {
//       const getWeightTolerance = await db.product_weight_model.findOne(
//         {
//           company_code: company_code,
//           plant_id: plant_id,
//           material_code: material_no,
//         },
//         { _id: 0, qty_in_kg: 1 }
//       );

//       if (getWeightTolerance == null)
//         return res.send({
//           status_code: 404,
//           message:
//             "Weight tolerance is not available for the given material code!",
//         });
//       else invoice_quantity = invoice_qty / getWeightTolerance.qty_in_kg;
//     }

//     let format = "YYYY-MM-DD";
//     let format_with_time = "DD-MM-YYYY HH:mm:ss";
//     let dispatch_date = moment_tz(new Date(), format)
//       .tz("Asia/Kolkata")
//       .format(format);
//     const outward_time = moment_tz(new Date(), format_with_time)
//       .tz("Asia/Kolkata")
//       .format(format_with_time);
//     let net_weight = parseFloat(actual_qty) - parseFloat(tare_weight);

//     //
//     let mssge = "Outward details stored successfully";
//     let status = 200;

//     if (!dispatch_data) {
//       // let sales_orders_details = await soAllocationColl.findOne(
//       //   {
//       //     company_code: company_code,
//       //     plant_id: plant_id,
//       //     customer_code: customer_code,
//       //     material_no: material_no,
//       //     item_no: item_no,
//       //     delivery_date: delivery_date,
//       //     sales_order_no: sales_order_no,
//       //   },
//       //   { _id: 0, order_qty: 1 }
//       // );

//       // if (!sales_orders_details) {
//       //   return res.status(400).send({
//       //     status_code: "400",
//       //     status_message: "sales orders details are invalid",
//       //   });
//       // }

//       let insert_data = {};
//       insert_data.plant_id = plant_id;
//       insert_data.company_code = company_code;
//       insert_data.customer_name = customer_name;
//       insert_data.customer_code = customer_code;
//       insert_data.material_no = material_no;
//       insert_data.item_no = item_no;
//       insert_data.delivery_date = delivery_date;
//       insert_data.route_id = route_id;
//       insert_data.sales_order_no = sales_order_no;
//       insert_data.invoice_no = invoice_no;
//       insert_data.material_name = material_name;
//       // insert_data.so_order_qty = sales_orders_details.order_qty;
//       insert_data.invoice_qty = invoice_qty;
//       insert_data.uom = uom;
//       insert_data.total_net_weight = net_weight;
//       insert_data.total_gross_weight = actual_qty;
//       insert_data.total_tare_weight = tare_weight;
//       insert_data.crate_count = 1;
//       insert_data.crate_details = {
//         crate_barcode_value: crate_barcode_value,
//         gross_weight: actual_qty,
//         net_weight: net_weight,
//         tare_weight: tare_weight,
//         outward_time: outward_time,
//       };
//       insert_data.dispatch_date = dispatch_date;

//       console.log("insert_data", insert_data);

//       const new_dispatch_details = new dispatch_details(insert_data);
//       await new_dispatch_details.save();

//       if (invoice_quantity == 1) {
//         status = 309;
//         mssge = "Invoice qty reached!";
//       }

//       return res.status(status).send({
//         status_code: status,
//         status_message: mssge,
//       });
//     } else {
//       if (invoice_quantity == dispatch_data.crate_count)
//         return res.send({
//           status_code: 400,
//           status_message: "Invoice qty already reached!",
//         });
//       else {
//         console.log("else dispatch_data", dispatch_data);
//         let update_dispatch_data = {};
//         update_dispatch_data.total_net_weight = (
//           net_weight + dispatch_data.total_net_weight
//         ).toFixed(2);
//         update_dispatch_data.total_gross_weight = (
//           +actual_qty + dispatch_data.total_gross_weight
//         ).toFixed(2);
//         update_dispatch_data.total_tare_weight = (
//           +tare_weight + dispatch_data.total_tare_weight
//         ).toFixed(2);
//         update_dispatch_data.crate_count = ++dispatch_data.crate_count;
//         update_dispatch_data.crate_details = dispatch_data.crate_details;
//         update_dispatch_data.crate_details.push({
//           crate_barcode_value: crate_barcode_value,
//           gross_weight: actual_qty,
//           net_weight: net_weight,
//           tare_weight: tare_weight,
//           outward_time: outward_time,
//         });
//         await dispatch_details.findByIdAndUpdate(
//           { _id: dispatch_data._id },
//           update_dispatch_data,
//           { useFindAndModify: false, upsert: false, new: true }
//         );

//         if (invoice_quantity == ++dispatch_data.crate_count)
//           mssge = "Invoice qty reached!";

//         return res.send({
//           status_code: status,
//           status_message: mssge,
//         });
//       }
//     }
//   } catch (err) {
//     return res.status(500).send({
//       status_code: 500,
//       status_message:
//         err.message ||
//         "Some error occurred while storing outwarding material details!",
//     });
//   }
// };

exports.v2SaveDispatch = async (req, res) => {
  console.log("calling save outward details v2 api");
  const {
    pallet_barcode,
    plant_id,
    company_code,
    customer_name,
    customer_code,
    material_no,
    item_no,
    delivery_date,
    route_id,
    sales_order_no,
    invoice_no,
    material_name,
    invoice_qty,
    uom,
    crate_barcode_value,
    actual_qty,
    tare_weight,
  } = req.body;

  if (
    !(
      pallet_barcode &&
      company_code &&
      plant_id &&
      customer_name &&
      customer_code &&
      material_no &&
      item_no &&
      delivery_date &&
      route_id &&
      sales_order_no &&
      invoice_no &&
      material_name &&
      uom &&
      invoice_qty != null &&
      actual_qty != null &&
      tare_weight != null &&
      crate_barcode_value
    )
  ) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameters" });
  }

  try {
    const checkDuplicateBarcode = await dispatch_details.findOne({
      company_code: company_code,
      plant_id: plant_id,
      "crate_details.crate_barcode_value": crate_barcode_value,
    });

    if (checkDuplicateBarcode != null)
      return res.status(400).send({
        status_code: 400,
        status_message: "Duplicate barcode not allowed! " + crate_barcode_value,
      });

    let allocation_palletization_details =
      await allocationPalletizationColl.findOne({
        pallet_barcode: pallet_barcode,
        route_id: route_id,
        delivery_date: delivery_date,
        plant_id: plant_id,
        company_code: company_code,
        palletization_status: "DISPATCH",
        items: {
          $elemMatch: {
            material_code: material_no,
            "carriers.carrier_barcode": crate_barcode_value,
          },
        },
      });

    if (!allocation_palletization_details) {
      return res.status(400).send({
        status_code: 400,
        status_message: "Wrong barcode not allowed! " + crate_barcode_value,
      });
    }

    let dispatch_data = await dispatch_details.findOne({
      company_code: company_code,
      plant_id: plant_id,
      customer_code: customer_code,
      material_no: material_no,
      item_no: item_no,
      delivery_date: delivery_date,
      route_id: route_id,
      sales_order_no: sales_order_no,
      invoice_no: invoice_no,
    });

    const getWeightTolerance = await db.product_weight_model.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        material_code: material_no,
      },
      { _id: 0, qty_in_kg: 1, qty_in_pack: 1, pieces_per_bin: 1, uom: 1 }
    );

    if (getWeightTolerance == null)
      return res.send({
        status_code: 404,
        message:
          "Weight tolerance is not available for the given material code!",
      });

    let invoice_quantity =
      uom == "KG"
        ? +invoice_qty / getWeightTolerance.qty_in_kg
        : getWeightTolerance.pieces_per_bin > 0 && uom == "PAC"
        ? +invoice_qty / getWeightTolerance.qty_in_pack
        : +invoice_qty;

    let format = "YYYY-MM-DD";
    let format_with_time = "DD-MM-YYYY HH:mm:ss";
    let dispatch_date = moment_tz(new Date(), format)
      .tz("Asia/Kolkata")
      .format(format);
    const outward_time = moment_tz(new Date(), format_with_time)
      .tz("Asia/Kolkata")
      .format(format_with_time);
    let net_weight = parseFloat(actual_qty) - parseFloat(tare_weight);

    //
    let mssge = "Outward details stored successfully";
    let status = 200;

    if (!dispatch_data) {
      let insert_data = {};
      insert_data.plant_id = plant_id;
      insert_data.company_code = company_code;
      insert_data.customer_name = customer_name;
      insert_data.customer_code = customer_code;
      insert_data.material_no = material_no;
      insert_data.item_no = item_no;
      insert_data.delivery_date = delivery_date;
      insert_data.route_id = route_id;
      insert_data.sales_order_no = sales_order_no;
      insert_data.invoice_no = invoice_no;
      insert_data.material_name = material_name;
      // insert_data.so_order_qty = sales_orders_details.order_qty;
      insert_data.invoice_qty = invoice_qty;
      insert_data.uom = uom;
      insert_data.total_net_weight = net_weight;
      insert_data.total_gross_weight = actual_qty;
      insert_data.total_tare_weight = tare_weight;
      insert_data.crate_count = 1;
      insert_data.crate_details = {
        crate_barcode_value: crate_barcode_value,
        gross_weight: actual_qty,
        net_weight: net_weight,
        tare_weight: tare_weight,
        outward_time: outward_time,
        pallet_barcode: pallet_barcode,
      };
      insert_data.dispatch_date = dispatch_date;

      // console.log("insert_data", insert_data);

      const new_dispatch_details = new dispatch_details(insert_data);
      await new_dispatch_details.save();

      if (invoice_quantity == 1) {
        status = 309;
        mssge = "Invoice qty reached!";
      }
    } else {
      console.log("entry available");

      if (invoice_quantity == dispatch_data.crate_count) {
        status = 309;
        mssge = "Invoice qty already reached!";
      } else {
        let update_dispatch_data = {};
        update_dispatch_data.total_net_weight = (
          net_weight + dispatch_data.total_net_weight
        ).toFixed(2);
        update_dispatch_data.total_gross_weight = (
          +actual_qty + dispatch_data.total_gross_weight
        ).toFixed(2);
        update_dispatch_data.total_tare_weight = (
          +tare_weight + dispatch_data.total_tare_weight
        ).toFixed(2);
        update_dispatch_data.crate_count = ++dispatch_data.crate_count;
        update_dispatch_data.crate_details = dispatch_data.crate_details;
        update_dispatch_data.crate_details.push({
          crate_barcode_value: crate_barcode_value,
          gross_weight: actual_qty,
          net_weight: net_weight,
          tare_weight: tare_weight,
          outward_time: outward_time,
          pallet_barcode: pallet_barcode,
        });
        await dispatch_details.findByIdAndUpdate(
          { _id: dispatch_data._id },
          update_dispatch_data,
          { useFindAndModify: false, upsert: false, new: true }
        );

        if (invoice_quantity == dispatch_data.crate_count) {
          mssge = "Invoice qty reached!";
          status = 309;
        }
      }
    }
    return res.status(status).send({
      status_code: status,
      status_message: mssge,
    });
  } catch (err) {
    return res.status(500).send({
      status_code: 500,
      status_message:
        err.message ||
        "Some error occurred while storing outwarding material details!",
    });
  }
};

exports.getDispatchDetails = async (req, res) => {
  try {
    const { plant_id, company_code, dispatch_date, route_id } = req.query;

    if (!(plant_id && company_code && dispatch_date && route_id)) {
      return res
        .status(400)
        .send({ status_code: "400", message: "Provide required parameters!" });
    }

    let filter = {
      company_code: company_code,
      plant_id: plant_id,
      dispatch_date: dispatch_date,
    };
    if (route_id == "all") filter.route_id = { $ne: "" };
    else filter.route_id = route_id;

    const dispatched_data = await dispatch_details.find(filter, {
      // company_code: 1,
      // plant_id: 1,
      // customer_name: 1,
      // customer_code,
      // invoice_no,
      // delivery_date: 1,
      // route_id: 1,
      // sales_order_no: 1,
      // dispatch_date: 1,
    });

    let status = 200;
    let mssge = "Dispatch details not available";

    if (dispatched_data.length == 0) {
      status = 404;
      mssge = "Dispatch details not found!";
    }

    return res.status(status).send({
      status_code: status.toString(),
      message: mssge,
      data: dispatched_data,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send({
      status_code: "500",
      message: "Some error occurred while retrieving so dispatch details!",
    });
  }
};

exports.getOutwardDetails = async (req, res) => {
  try {
    const { plant_id, company_code, dispatch_date } = req.query;

    if (!(plant_id && company_code && dispatch_date)) {
      return res
        .status(400)
        .send({ status_code: "400", message: "Provide required parameters!" });
    }

    let filter = {
      company_code: company_code,
      plant_id: plant_id,
      dispatch_date: dispatch_date,
    };

    const dispatched_data = await dispatch_details.find(filter, {
      // company_code: 1,
      // plant_id: 1,
      // customer_name: 1,
      // customer_code,
      // invoice_no,
      // delivery_date: 1,
      // route_id: 1,
      // sales_order_no: 1,
      // dispatch_date: 1,
    });

    let status = 200;
    let mssge = "Outward details available";

    if (dispatched_data.length == 0) {
      status = 404;
      mssge = "Outward details not found!";
    }

    return res.status(status).send({
      status_code: status.toString(),
      message: mssge,
      data: dispatched_data,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send({
      status_code: "500",
      message: "Some error occurred while retrieving so outward details!",
    });
  }
};

exports.getDispatchedItems = async (req, res) => {
  try {
    const { plant_id, company_code, dispatch_date, invoice_no } = req.query;

    if (!(plant_id, company_code, dispatch_date, invoice_no)) {
      return res
        .status(400)
        .send({ status_code: "400", message: "Missing parameter." });
    }

    const dispatched_items = await dispatch_details.find({
      plant_id,
      company_code,
      dispatch_date,
      invoice_no,
    });
    // .select("items -_id");

    if (dispatched_items.length) {
      return respondSuccess(
        res,
        "Outward items are available",
        dispatched_items
      );
    }

    return respondSuccess(res, "Outward items are not available", []);
  } catch (err) {
    res.status(500).send({
      status_code: "500",
      message: err.message || "Some error occurred while retrieving data.",
    });
  }
};

////////////////// -- Aakash Ravikumar -- ///////////////////////

const getRoutes = async (filter) => {
  const getRouteIds = await soAllocationColl.aggregate([
    {
      $match: filter,
    },
    { $group: { _id: "$route_id" } },
    { $sort: { _id: 1 } },
  ]);

  const routes = getRouteIds.map((id) => {
    return id._id;
  });

  return routes;
};

exports.getRouteIds = async (req, res) => {
  console.log("Calling get route ids from SAP");
  const { company_code, plant_id, delivery_date } = req.query;

  try {
    if (!(company_code && plant_id && delivery_date))
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required to parameters!",
      });

    let apiResult = "";
    //calling api
    // await axios
    //   .get(
    //     `http://localhost:3033/api/dispatch/SAP/v1/get_so_list_by_route_id?company_code=${company_code}&plant_id=${plant_id}&delivery_date${delivery_date}`
    //   )
    //   // Print response
    //   .then((response) => {
    //     apiResult = response.data.status_code;
    //     console.log("get - ", apiResult);
    //   })

    // Print error message if occur
    // .catch((error) => console.log(error));

    let mssge = "Route ids are available";
    let status = 200;

    const getRouteIds = await getRoutes({
      company_code: company_code,
      plant_id: plant_id,
      delivery_date: delivery_date,
      route_id: { $ne: "" },
    });

    if (getRouteIds.length == 0) {
      (mssge = "Route ids are not avaiable!"), (status = 404);
    }

    return res.send({ status_code: status, message: mssge, data: getRouteIds });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting route ids from SAP!",
    });
  }
};

exports.get_allocation_route_ids = async (req, res) => {
  console.log("Calling get_allocation_route_ids");
  const { company_code, plant_id, delivery_date } = req.query;

  try {
    if (!(company_code && plant_id && delivery_date))
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required to parameters!",
      });

    let mssge = "Route ids are available";
    let status = 200;

    const getStackedPallets = await allocationPalletizationColl.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          palletization_status: "STACKED",
          is_deleted: false,
        },
      },
      { $group: { _id: "$route_id" } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, route_id: "$_id" } },
    ]);

    // const getRouteIds = [];
    // getStackedPallets.forEach((element) => {
    //   getRouteIds.push(element._id);
    // });

    if (getStackedPallets.length == 0) {
      (mssge = "Route ids are not avaiable!"), (status = 404);
    }
    return res.send({
      status_code: status,
      message: mssge,
      data: getStackedPallets,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting route ids from SAP!",
    });
  }
};

exports.getSoListFromSap = async (req, res) => {
  console.log("Calling get so list api from SAP");
  const { company_code, plant_id, delivery_date } = req.query;

  try {
    if (!(company_code && plant_id && delivery_date))
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required to parameters!",
      });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting route ids list!",
    });
  }
};

exports.getSoPickingQtyList = async (req, res) => {
  console.log("Calling get non allocated so total pick qty list api");
  const { company_code, plant_id, delivery_date, route_id, status } = req.query;
  try {
    if (!(company_code && plant_id && delivery_date && route_id && status))
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required to parameters!",
      });

    let filter = {
      company_code: company_code,
      plant_id: plant_id,
      delivery_date: delivery_date,
      route_id: route_id,
    };

    if (status == "pending") {
      filter.pending_qty = { $ne: 0 };
    } else if (status == "completed") {
    } else {
      return res
        .status(400)
        .send({ status_code: 400, message: "Wrong status provided!" });
    }

    const str =
      status == "PENDING"
        ? "pending data"
        : status == "COMPLETED"
        ? "completed data"
        : "data";

    let mssge = "SKU based SO picking quantity list is available";

    const getSosPickingQtyList = await soAllocationColl.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: {
            material_no: "$material_no",
            material_name: "$material_name",
            // item_no: "$item_no",
            uom: "$uom",
          },
          total_picking_qty: { $sum: "$pending_qty" },
          total_ordered_qty: { $sum: "$order_qty" },
        },
      },
      { $sort: { "_id.uom": 1, total_ordered_qty: -1 } },
    ]);

    let pickingQtyArr = [];

    if (getSosPickingQtyList.length != 0) {
      if (status == "pending")
        pickingQtyArr = getSosPickingQtyList.map((data) => {
          return {
            selected_date: delivery_date,
            material_no: data._id["material_no"],
            material_name: data._id["material_name"],
            ordered_qty: data.total_ordered_qty,
            picked_qty: data.total_ordered_qty - data.total_picking_qty,
            require_qty: data.total_picking_qty,
            uom: data._id["uom"],
            status: "dispatch",
            picking_status: status,
            route_id: route_id,
          };
        });
      else {
        for (let i = 0; i < getSosPickingQtyList.length; i++) {
          //
          if (getSosPickingQtyList[i].total_picking_qty == 0)
            pickingQtyArr.push({
              selected_date: delivery_date,
              material_no: getSosPickingQtyList[i]._id["material_no"],
              material_name: getSosPickingQtyList[i]._id["material_name"],
              ordered_qty: getSosPickingQtyList[i].total_ordered_qty,
              picked_qty:
                getSosPickingQtyList[i].total_ordered_qty -
                getSosPickingQtyList[i].total_picking_qty,
              require_qty: getSosPickingQtyList[i].total_picking_qty,
              uom: getSosPickingQtyList[i]._id["uom"],
              status: "dispatch",
              picking_status: status,
              route_id: route_id,
            });
        }
      }
    } else
      mssge = "No " + str + " for the selected delivery date and route id!";

    if (pickingQtyArr.length == 0)
      mssge = "No data available in SO picking " + status + " list!";

    return res.send({ status_code: 200, message: mssge, data: pickingQtyArr });
    //
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting so list",
    });
  }
};

const getPTLItemCodes = async (filter) => {
  return (
    await toleranceColl.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: "$material_code",
        },
      },
    ])
  ).map((code) => {
    return code._id;
  });
};

const getSoPickingQty_normal = async (filter, status) => {
  const non_ptlPickingQty = await soAllocationColl.aggregate([
    {
      $match: filter,
    },
    {
      $group: {
        _id: {
          material_no: "$material_no",
          material_name: "$material_name",
          uom: "$uom",
        },
        total_picking_qty: { $sum: "$pending_qty" },
        total_ordered_qty: { $sum: "$order_qty" },
      },
    },
    { $sort: { "_id.uom": 1, "_id.material_code": 1 } },
  ]);

  let finalArr = [];

  let getPickedList = await cumulativePalletizationColl.aggregate([
    {
      $match: {
        company_code: filter.company_code,
        plant_id: filter.plant_id,
        delivery_date: filter.delivery_date,
        route_id: filter.route_id,
        "items.material_code": filter.material_no,
      },
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: {
          material_code: "$items.material_code",
          qty_in_kg: "$items.sku_qty_in_kg",
        },
        carrier_count: { $sum: "$items.total_carrier_count" },
      },
    },
    { $sort: { "_id.material_code": 1 } },
  ]);

  // console.log("cumulative picked norml- ", getPickedList, non_ptlPickingQty);

  let pickingQtyArr = [];

  for (let i = 0; i < non_ptlPickingQty.length; i++) {
    //
    let picked =
      non_ptlPickingQty[i].total_ordered_qty -
      non_ptlPickingQty[i].total_picking_qty;

    if (status == "pending" && non_ptlPickingQty[i] > picked) {
      pickingQtyArr.push({
        selected_date: filter.delivery_date,
        route_id: filter.route_id,
        material_no: non_ptlPickingQty[i]._id["material_no"],
        material_name: non_ptlPickingQty[i]._id["material_name"],
        ordered_qty: non_ptlPickingQty[i].total_ordered_qty,
        require_qty: non_ptlPickingQty[i].total_picking_qty,
        picked_qty: picked,
        uom: non_ptlPickingQty[i]._id["uom"],
        status: "dispatch",
        picking_status: status,
      });
    } else if (
      status == "completed" &&
      non_ptlPickingQty[i].total_ordered_qty == picked
    ) {
      pickingQtyArr.push({
        selected_date: filter.delivery_date,
        route_id: filter.route_id,
        material_no: non_ptlPickingQty[i]._id["material_no"],
        material_name: non_ptlPickingQty[i]._id["material_name"],
        ordered_qty: non_ptlPickingQty[i].total_ordered_qty,
        require_qty: non_ptlPickingQty[i].total_picking_qty,
        picked_qty:
          non_ptlPickingQty[i].total_ordered_qty -
          non_ptlPickingQty[i].total_picking_qty,
        uom: non_ptlPickingQty[i]._id["uom"],
        status: "dispatch",
        picking_status: status,
      });
    }
  }

  console.log(pickingQtyArr);

  let flag = 0;

  if (getPickedList.length > 0) {
    console.log("entered if something picked");
    for (let i = 0; i < pickingQtyArr.length; i++) {
      for (let j = 0; j < getPickedList.length; j++) {
        if (
          pickingQtyArr[i]["material_no"] ==
          getPickedList[j]._id["material_code"]
        ) {
          flag = 1;

          let picked =
            getPickedList[j].carrier_count * getPickedList[j]._id["qty_in_kg"];

          if (status == "pending" && pickingQtyArr[i].ordered_qty > picked)
            finalArr.push({
              selected_date: filter.delivery_date,
              route_id: filter.route_id,
              material_no: pickingQtyArr[i]["material_no"],
              material_name: pickingQtyArr[i]["material_name"],
              ordered_qty: pickingQtyArr[i].ordered_qty,
              require_qty:
                pickingQtyArr[i].ordered_qty -
                getPickedList[j].carrier_count *
                  getPickedList[j]._id["qty_in_kg"],
              picked_qty: picked,
              uom: pickingQtyArr[i]["uom"],
              status: "dispatch",
              picking_status: status,
            });
          else if (
            status == "completed" &&
            pickingQtyArr[i].ordered_qty == picked
          )
            finalArr.push({
              selected_date: filter.delivery_date,
              route_id: filter.route_id,
              material_no: pickingQtyArr[i]["material_no"],
              material_name: pickingQtyArr[i]["material_name"],
              ordered_qty: pickingQtyArr[i].ordered_qty,
              require_qty:
                pickingQtyArr[i].ordered_qty -
                getPickedList[j].carrier_count *
                  getPickedList[j]._id["qty_in_kg"],
              picked_qty: picked,
              uom: pickingQtyArr[i]["uom"],
              status: "dispatch",
              picking_status: status,
            });
        }
      }
      if (flag == 0 && status == "pending") {
        finalArr.push(pickingQtyArr[i]);
      }
      flag = 0;
    }
  } else {
    finalArr = pickingQtyArr;
  }

  console.log("final non ptl - - - - - ", pickingQtyArr, finalArr);
  return finalArr;
};

const pushData_pickingQtyArr = async (
  filter,
  non_ptlPickingQty,
  qty_in_kg,
  status
) => {
  console.log("Entered function");
  let ordered_qty = non_ptlPickingQty.total_ordered_qty;
  let ordered_unit = ordered_qty / qty_in_kg;
  let picking_qty = non_ptlPickingQty.total_picking_qty;
  let picking_unit = picking_qty / qty_in_kg;
  let picked_qty =
    non_ptlPickingQty.total_ordered_qty - non_ptlPickingQty.total_picking_qty;
  let picked_unit = picked_qty / qty_in_kg;

  if (non_ptlPickingQty._id.uom == "PAC") {
    ordered_qty = non_ptlPickingQty.total_ordered_qty * qty_in_kg;
    ordered_unit = ordered_unit * qty_in_kg;

    picking_qty = non_ptlPickingQty.total_picking_qty * qty_in_kg;
    picking_unit = picking_unit * qty_in_kg;

    picked_qty =
      (non_ptlPickingQty.total_ordered_qty -
        non_ptlPickingQty.total_picking_qty) *
      qty_in_kg;
    picking_unit = picking_unit * qty_in_kg;
  }

  return {
    selected_date: filter.delivery_date,
    route_id: filter.route_id,
    material_no: non_ptlPickingQty._id["material_no"],
    material_name: non_ptlPickingQty._id["material_name"],
    ordered_qty: ordered_qty.toFixed(2),
    ordered_unit: ordered_unit.toFixed(2),
    require_qty: picking_qty.toFixed(2),
    require_unit: picking_unit.toFixed(2),
    picked_qty: picked_qty.toFixed(2),
    picked_unit: picked_unit.toFixed(2),
    uom: "KG",
    status: "dispatch",
    picking_status: status,
  };
};

const getSoPickingQty_normal_v2 = async (filter, status) => {
  const non_ptlPickingQty = await soAllocationColl.aggregate([
    {
      $match: filter,
    },
    {
      $group: {
        _id: {
          material_no: "$material_no",
          material_name: "$material_name",
          uom: "$uom",
        },
        total_picking_qty: { $sum: "$pending_qty" },
        total_ordered_qty: { $sum: "$order_qty" },
      },
    },
    { $sort: { "_id.material_no": 1, "_id.uom": 1 } },
  ]);

  // console.log(
  //   "check -- ",
  //   await soAllocationColl.aggregate([
  //     {
  //       $match: {
  //         company_code: "1000",
  //         plant_id: "1023",
  //         delivery_date: { $in: ["2023-01-25", "2023-01-26", "2023-01-27"] },
  //         material_no: "WC0001000102420818",
  //         route_id: "R-Id-27",
  //       },
  //     },
  //     {
  //       $group: {
  //         _id: {
  //           material_no: "$material_no",
  //           material_name: "$material_name",
  //           uom: "$uom",
  //         },
  //         total_picking_qty: { $sum: "$pending_qty" },
  //         total_ordered_qty: { $sum: "$order_qty" },
  //       },
  //     },
  //     { $sort: { "_id.material_no": 1, "_id.uom": 1 } },
  //   ])
  // );

  let getPickedList = await cumulativePalletizationColl.aggregate([
    {
      $match: {
        company_code: filter.company_code,
        plant_id: filter.plant_id,
        delivery_date: filter.delivery_date,
        route_id: filter.route_id,
      },
    },
    { $unwind: "$items" },
    { $match: { "items.material_code": filter.material_no } },
    {
      $group: {
        _id: {
          material_code: "$items.material_code",
          qty_in_kg: "$items.sku_qty_in_kg",
        },
        carrier_count: { $sum: "$items.total_carrier_count" },
      },
    },
    { $sort: { "_id.material_code": 1 } },
  ]);

  // console.log("cumulative picked norml- ", getPickedList, non_ptlPickingQty);

  let pickingQtyArr = [];

  for (let i = 0; i < non_ptlPickingQty.length; i++) {
    //
    let tolerance = await toleranceColl.findOne(
      {
        company_code: filter.company_code,
        plant_id: filter.plant_id,
        material_code: non_ptlPickingQty[i]._id["material_no"],
      },
      { _id: 0, qty_in_kg: 1 }
    );

    if (i + 1 < non_ptlPickingQty.length) {
      if (
        non_ptlPickingQty[i]._id["material_no"] ==
        non_ptlPickingQty[i + 1]._id["material_no"]
      ) {
        console.log("entered same material kg and pac");

        let ordered_qty =
          non_ptlPickingQty[i].total_ordered_qty +
          non_ptlPickingQty[i + 1].total_ordered_qty * tolerance.qty_in_kg;

        let ordered_unit = ordered_qty / tolerance.qty_in_kg;

        let picked_qty =
          ordered_qty -
          (non_ptlPickingQty[i].total_picking_qty +
            non_ptlPickingQty[i + 1].total_picking_qty * tolerance.qty_in_kg);

        let picked_unit = picked_qty / tolerance.qty_in_kg;

        pickingQtyArr.push({
          selected_date: filter.delivery_date,
          route_id: filter.route_id,
          material_no: non_ptlPickingQty[i]._id["material_no"],
          material_name: non_ptlPickingQty[i]._id["material_name"],
          ordered_qty: ordered_qty.toFixed(2),
          ordered_unit: ordered_unit.toFixed(2),
          require_qty: (
            non_ptlPickingQty[i].total_picking_qty +
            non_ptlPickingQty[i + 1].total_picking_qty * tolerance.qty_in_kg
          ).toFixed(2),
          require_unit: (
            non_ptlPickingQty[i].total_picking_qty / tolerance.qty_in_kg +
            non_ptlPickingQty[i + 1].total_picking_qty
          ).toFixed(2),
          picked_qty: picked_qty.toFixed(2),
          picked_unit: picked_unit.toFixed(2),
          uom: "KG",
          status: "dispatch",
          picking_status: status,
        });

        ++i;
      } else {
        // console.log("entered diff mat code in normal ");

        pickingQtyArr.push(
          await pushData_pickingQtyArr(
            filter,
            non_ptlPickingQty[i],
            tolerance.qty_in_kg,
            status
          )
        );
      }
    } else {
      // console.log("entered only one code in normal ");
      pickingQtyArr.push(
        await pushData_pickingQtyArr(
          filter,
          non_ptlPickingQty[i],
          tolerance.qty_in_kg,
          status
        )
      );
    }
  }

  // console.log("pickingQtyArr", pickingQtyArr);

  let finalArr = [];

  let flag = 0;

  if (getPickedList.length > 0) {
    console.log("entered if something picked");
    for (let i = 0; i < pickingQtyArr.length; i++) {
      for (let j = 0; j < getPickedList.length; j++) {
        if (
          pickingQtyArr[i]["material_no"] ==
          getPickedList[j]._id["material_code"]
        ) {
          flag = 1;

          let picked =
            getPickedList[j].carrier_count * getPickedList[j]._id["qty_in_kg"];

          if (status == "pending" && pickingQtyArr[i].ordered_qty > picked)
            finalArr.push({
              selected_date: filter.delivery_date,
              route_id: filter.route_id,
              material_no: pickingQtyArr[i]["material_no"],
              material_name: pickingQtyArr[i]["material_name"],
              ordered_qty: pickingQtyArr[i].ordered_qty,
              ordered_unit: pickingQtyArr[i].ordered_unit,
              require_qty: (+pickingQtyArr[i].ordered_qty - picked).toFixed(2),
              require_unit: (
                +pickingQtyArr[i].ordered_unit - getPickedList[j].carrier_count
              ).toFixed(2),
              picked_qty: picked.toFixed(2),
              picked_unit: getPickedList[j].carrier_count.toFixed(2),
              uom: pickingQtyArr[i]["uom"],
              status: "dispatch",
              picking_status: status,
            });
          else if (
            status == "completed" &&
            pickingQtyArr[i].ordered_qty == picked
          )
            finalArr.push({
              selected_date: filter.delivery_date,
              route_id: filter.route_id,
              material_no: pickingQtyArr[i]["material_no"],
              material_name: pickingQtyArr[i]["material_name"],
              ordered_qty: pickingQtyArr[i].ordered_qty,
              ordered_unit: pickingQtyArr[i].ordered_unit,
              require_qty: (+pickingQtyArr[i].ordered_qty - picked).toFixed(2),
              require_unit: (
                +pickingQtyArr[i].ordered_unit - getPickedList[j].carrier_count
              ).toFixed(2),
              picked_qty: picked.toFixed(2),
              picked_unit: getPickedList[j].carrier_count.toFixed(2),
              uom: pickingQtyArr[i]["uom"],
              status: "dispatch",
              picking_status: status,
            });
        }
      }
      if (flag == 0 && status == "pending") {
        finalArr.push(pickingQtyArr[i]);
      }
      flag = 0;
    }
  } else {
    for (let i = 0; i < pickingQtyArr.length; i++) {
      if (
        status == "pending" &&
        pickingQtyArr[i].ordered_qty > pickingQtyArr[i].picked_qty
      ) {
        pickingQtyArr[i].picking_status = status;

        finalArr.push(pickingQtyArr[i]);
      } else if (
        status == "completed" &&
        pickingQtyArr[i].ordered_qty == pickingQtyArr[i].picked_qty
      ) {
        pickingQtyArr[i].picking_status = status;

        finalArr.push(pickingQtyArr[i]);
      }
    }
  }

  // console.log("final non ptl - - - - - ", pickingQtyArr, finalArr);

  return finalArr;
};

const getSoPickingQty_ptl = async (filter, status) => {
  console.log("entered - ptl function");
  let flag = 0;
  let prev_material_code = "";
  let ptlPickingQtyArr = [];
  let tolerance = null;

  const ptlPickingQty = await soAllocationColl.aggregate([
    {
      $match: filter,
    },
    { $sort: { material_no: 1 } },
  ]);

  // console.log("ptlPickingQty - ", ptlPickingQty);

  for (let i = 0; i < ptlPickingQty.length; i++) {
    //

    if (prev_material_code != ptlPickingQty[i].material_no) {
      console.log("entered - diff material code");
      //
      prev_material_code = ptlPickingQty[i].material_no;

      tolerance = await db.product_weight_model.findOne(
        {
          company_code: filter.company_code,
          plant_id: filter.plant_id,
          material_code: ptlPickingQty[i].material_no,
        },
        { _id: 0, qty_in_pack: 1 }
      );
    }
    if (tolerance != null) {
      //
      if (ptlPickingQty[i].order_qty >= tolerance.qty_in_pack) {
        //

        let len = ptlPickingQtyArr.length;
        // console.log("entered - tolernace - ", len);

        if (len > 0) {
          // console.log("entered - ptlPickingQtyArr len > 0");
          if (
            ptlPickingQtyArr[len - 1].material_no ==
            ptlPickingQty[i].material_no
          ) {
            ptlPickingQtyArr[len - 1].ordered_qty =
              Math.floor(ptlPickingQty[i].order_qty / tolerance.qty_in_pack) *
                tolerance.qty_in_pack +
              ptlPickingQtyArr[len - 1].ordered_qty;

            ptlPickingQtyArr[len - 1].ordered_unit =
              ptlPickingQtyArr[len - 1].ordered_qty / tolerance.qty_in_pack;

            ptlPickingQtyArr[len - 1].require_qty =
              ptlPickingQtyArr[len - 1].ordered_qty;

            ptlPickingQtyArr[len - 1].require_unit =
              ptlPickingQtyArr[len - 1].ordered_unit;

            //
          } else {
            //
            ptlPickingQtyArr.push({
              selected_date: filter.delivery_date,
              route_id: filter.route_id,
              sales_order_no: ptlPickingQty[i].sales_order_no,
              material_no: ptlPickingQty[i].material_no,
              material_name: ptlPickingQty[i].material_name,
              ordered_qty:
                Math.floor(ptlPickingQty[i].order_qty / tolerance.qty_in_pack) *
                tolerance.qty_in_pack,

              ordered_unit: Math.floor(
                ptlPickingQty[i].order_qty / tolerance.qty_in_pack
              ),
              require_qty:
                Math.floor(ptlPickingQty[i].order_qty / tolerance.qty_in_pack) *
                tolerance.qty_in_pack,

              require_unit: Math.floor(
                ptlPickingQty[i].order_qty / tolerance.qty_in_pack
              ),
              picked_qty: 0,
              picked_unit: 0,
              uom: ptlPickingQty[i].uom,
              status: "dispatch",
              picking_status: status,
            });
          }
        } else {
          ptlPickingQtyArr.push({
            selected_date: filter.delivery_date,
            route_id: filter.route_id,
            sales_order_no: ptlPickingQty[i].sales_order_no,
            material_no: ptlPickingQty[i].material_no,
            material_name: ptlPickingQty[i].material_name,
            ordered_qty:
              Math.floor(ptlPickingQty[i].order_qty / tolerance.qty_in_pack) *
              tolerance.qty_in_pack,
            ordered_unit: Math.floor(
              ptlPickingQty[i].order_qty / tolerance.qty_in_pack
            ),
            require_qty:
              Math.floor(ptlPickingQty[i].order_qty / tolerance.qty_in_pack) *
              tolerance.qty_in_pack,
            require_unit: Math.floor(
              ptlPickingQty[i].order_qty / tolerance.qty_in_pack
            ),
            picked_qty: 0,
            picked_unit: 0,
            uom: ptlPickingQty[i].uom,
            status: "dispatch",
            picking_status: status,
          });
        }
      }
    } else {
      flag = 1;

      ptlPickingQtyArr = [];
    }

    if (flag == 1) break;
  }

  // console.log("ptlPickingQtyArr - ", ptlPickingQtyArr);

  let finalArr = [];

  let getPickedList = await cumulativePalletizationColl.aggregate([
    {
      $match: {
        company_code: filter.company_code,
        plant_id: filter.plant_id,
        delivery_date: filter.delivery_date,
        route_id: filter.route_id,
      },
    },
    { $unwind: "$items" },
    { $match: { "items.material_code": filter.material_no } },
    {
      $group: {
        _id: {
          material_code: "$items.material_code",
          qty_in_pack: "$items.sku_qty_in_pack",
        },
        carrier_count: { $sum: "$items.total_carrier_count" },
      },
    },
    { $sort: { "_id.material_code": 1 } },
  ]);

  // console.log("picked - ", getPickedList);

  // let before = 0;
  // let after = 0;

  if (getPickedList.length != 0) {
    console.log("entered picked list available");
    for (let i = 0; i < ptlPickingQtyArr.length; i++) {
      for (let j = 0; j < getPickedList.length; j++) {
        // before = getPickedList.length;
        if (
          ptlPickingQtyArr[i].material_no == getPickedList[j]._id.material_code
        ) {
          let qty_in_pack = getPickedList[j]._id["qty_in_pack"];

          ptlPickingQtyArr[i].picked_qty =
            ptlPickingQtyArr[i].ordered_qty -
            (ptlPickingQtyArr[i].require_qty -
              getPickedList[j].carrier_count * qty_in_pack);

          ptlPickingQtyArr[i].picked_unit =
            ptlPickingQtyArr[i].ordered_unit -
            (ptlPickingQtyArr[i].require_unit - getPickedList[j].carrier_count);

          ptlPickingQtyArr[i].require_qty =
            ptlPickingQtyArr[i].require_qty -
            getPickedList[j].carrier_count * qty_in_pack;

          ptlPickingQtyArr[i].require_unit =
            ptlPickingQtyArr[i].require_unit - getPickedList[j].carrier_count;

          getPickedList.splice(j, 1); // removing after push
          j = j - 1;
        }
      }
    }
  }

  finalArr = ptlPickingQtyArr;

  // console.log("check final arr - ", finalArr);

  let final_arr = [];
  for (let i = 0; i < finalArr.length; i++) {
    if (status == "pending" && finalArr[i].ordered_qty > finalArr[i].picked_qty)
      final_arr.push({
        selected_date: filter.delivery_date,
        route_id: filter.route_id,
        sales_order_no: finalArr[i].sales_order_no,
        material_no: finalArr[i].material_no,
        material_name: finalArr[i].material_name,
        ordered_qty: finalArr[i].ordered_qty.toFixed(2),
        ordered_unit: finalArr[i].ordered_unit.toFixed(2),
        require_qty: finalArr[i].require_qty.toFixed(2),
        require_unit: finalArr[i].require_unit.toFixed(2),
        picked_qty: finalArr[i].picked_qty.toFixed(2),
        picked_unit: finalArr[i].picked_unit.toFixed(2),
        uom: finalArr[i].uom,
        status: "dispatch",
        picking_status: status,
      });
    else if (
      status == "completed" &&
      finalArr[i].ordered_qty == finalArr[i].picked_qty
    )
      final_arr.push({
        selected_date: filter.delivery_date,
        route_id: filter.route_id,
        sales_order_no: finalArr[i].sales_order_no,
        material_no: finalArr[i].material_no,
        material_name: finalArr[i].material_name,
        ordered_qty: finalArr[i].ordered_qty.toFixed(2),
        ordered_unit: finalArr[i].ordered_unit.toFixed(2),
        require_qty: finalArr[i].require_qty.toFixed(2),
        require_unit: finalArr[i].require_unit.toFixed(2),
        picked_qty: finalArr[i].picked_qty.toFixed(2),
        picked_unit: finalArr[i].picked_unit.toFixed(2),
        uom: finalArr[i].uom,
        status: "dispatch",
        picking_status: status,
      });
  }
  // console.log("finalArr  ptl - ", final_arr);

  return final_arr;
};

const checkOrderedItemCodesAvailable = async (data) => {
  const filter = data.filter;
  let getCodes = (
    await soAllocationColl.aggregate([
      { $match: filter },
      { $group: { _id: "$material_no" } },
    ])
  ).map((code) => {
    return code._id;
  });

  let checkAvailable = (
    await toleranceColl.find(
      {
        company_code: filter.company_code,
        plant_id: filter.plant_id,
        material_code: { $in: getCodes },
      },
      { _id: 0, material_code: 1 }
    )
  ).map((code) => {
    return code.material_code;
  });

  for (let i = 0; i < getCodes.length; i++) {
    for (let j = 0; j < checkAvailable.length; j++) {
      if (getCodes[i] == checkAvailable[j]) {
        getCodes.splice(i, 1);
        i = i - 1;
      }
    }
  }

  return getCodes;
};

exports.getSoPickingQtyListV2 = async (req, res) => {
  console.log("Calling get non allocated so total pick qty list api v2");

  const {
    company_code,
    plant_id,
    delivery_date,
    route_id,
    status,
    sales_order_no,
  } = req.query;
  try {
    if (
      !(
        company_code &&
        plant_id &&
        delivery_date &&
        status &&
        route_id &&
        sales_order_no
      )
    )
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required to parameters!",
      });

    const filter = {
      company_code: company_code,
      plant_id: plant_id,
      delivery_date: delivery_date,
      route_id: route_id,
    };
    // if (route_id) {
    //   filter.route_id = route_id;
    // }
    if (sales_order_no !== "All") {
      filter.sales_order_no = sales_order_no;
    }
    const checkItemsCodesAvailable = await checkOrderedItemCodesAvailable({
      filter,
    });

    if (checkItemsCodesAvailable.length > 0) {
      return res.send({
        status_code: 404,
        message:
          "Weight tolerance data is not available for the following material codes  : " +
          checkItemsCodesAvailable,
        data: [],
      });
    }

    const ptl_item_codes = await getPTLItemCodes({
      company_code: company_code,
      plant_id: plant_id,
      pieces_per_bin: { $gt: 0 },
    });

    if (status != "pending" && status != "completed")
      return res
        .status(400)
        .send({ status_code: 400, message: "Wrong status provided!" });

    const str =
      status == "PENDING"
        ? "pending data"
        : status == "COMPLETED"
        ? "completed data"
        : "data";

    let mssge = "SKU based SO picking quantity list is available";
    let statusCode = 200;

    let value = {
      company_code: company_code,
      plant_id: plant_id,
      delivery_date: delivery_date,
      route_id: route_id,
      material_no: { $in: ptl_item_codes },
    };
    // if (route_id) value.route_id = route_id;
    if (sales_order_no !== "All") value.sales_order_no = sales_order_no;

    let getSoPickingQty_data = {
      company_code: company_code,
      plant_id: plant_id,
      delivery_date: delivery_date,
      route_id: route_id,
      material_no: { $nin: ptl_item_codes },
    };
    if (sales_order_no !== "All")
      getSoPickingQty_data.sales_order_no = sales_order_no;

    const getSosPickQtyList = await Promise.all([
      getSoPickingQty_normal_v2(getSoPickingQty_data, status),

      getSoPickingQty_ptl(value, status),
    ]);

    let pickingQtyArr = getSosPickQtyList[0].concat(getSosPickQtyList[1]);

    if (pickingQtyArr.length == 0) {
      statusCode = 404;
      mssge = "No " + str + " for the selected delivery date and route id!";
    }

    if (pickingQtyArr.length == 0)
      mssge = "No data available in SO picking " + status + " list!";

    let result = pickingQtyArr.map((item) => {
      if (!item.hasOwnProperty("sales_order_no")) {
        item["sales_order_no"] = "";
      }
      return item;
    });
    return res.send({
      status_code: statusCode,
      message: mssge,
      data: result,
    });
    //
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        "Some error occurred while extracting SKU based cumulative picking qty list!",
    });
  }
};

exports.get_so_no = async (req, res) => {
  const { company_code, plant_id, delivery_date, route_id } = req.query;
  try {
    if (!(company_code && plant_id && delivery_date && route_id))
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required to parameters!",
      });

    const filter = {
      company_code: company_code,
      plant_id: plant_id,
      delivery_date: delivery_date,
      route_id: route_id,
    };
    const sales_order = await soAllocationColl.find(filter, {
      _id: 0,
      sales_order_no: 1,
    });
    return res.status(200).send({
      status_code: 200,
      message: `SKU based SO number list is available`,
      data: sales_order,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting SO number",
    });
  }
};

const getLocationsData = async (filter) => {
  return await secondaryStorageColl
    .find(filter, {
      _id: 0,
      rack_id: 1,
      column_id: 1,
      location_id: 1,
      current_stock: 1,
      uom: 1,
    })
    .sort({ _id: 1 });
};

const pushLocationsData = (itemLocations, pick_qty, uom) => {
  return {
    rack_id: itemLocations.rack_id,
    column_id:
      "A" +
      itemLocations.column_id.substring(1, itemLocations.column_id.length),
    location_id: itemLocations.location_id,
    rack_total_stock: itemLocations.total_stock,
    rack_stock_uom: itemLocations.uom,
    pick_qty: pick_qty,
    pick_uom: uom,
  };
};

// not using
exports.getItemLocations = async (req, res) => {
  console.log("calling get item locations api for dispatch");
  const { company_code, plant_id, material_code, qty, uom } = req.query;
  try {
    if (!(company_code && plant_id && material_code && qty && uom))
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    const itemLocations = await getLocationsData({
      company_code: company_code,
      plant_id: plant_id,
      material_code: material_code,
      rack_type: "secondary",
      level_id: { $in: ["L2", "L3"] },
      uom: uom,
    });

    const getWeightTolerance = await db.product_weight_model.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        material_code: material_code,
      },
      { _id: 0, qty_in_kg: 1 }
    );

    if (getWeightTolerance == null)
      return res.send({
        status_code: 200,
        message:
          "Weight tolerance is not available for the given material code!",
        data: [],
      });

    let locationArr = [];
    let addedCount = 0;
    let locatedQty = 0;
    let u_o_m = "PAC";
    let subMainIdentityFlag = false;

    for (let i = 0; i < itemLocations.length; i++) {
      addedCount += itemLocations[i].total_stock;

      let pack_qty = 0;

      if (+qty > addedCount) {
        console.log("entered main qty > addedCount");

        locatedQty += itemLocations[i].total_stock;

        pack_qty =
          uom == "KG"
            ? itemLocations[i].total_stock / getWeightTolerance.qty_in_kg
            : itemLocations[i].total_stock;

        if (uom != "PAC" && uom != "KG") u_o_m = uom;

        locationArr.push(pushLocationsData(itemLocations[i], pack_qty, u_o_m));
        //
      } else if (+qty < addedCount) {
        console.log("entered main qty < addedCount");

        const remaining_pick_qty = +qty - locatedQty;
        //
        // console.log("remaining - ", remaining_pick_qty);

        const getLevel1Rack = await getLocationsData({
          company_code: company_code,
          plant_id: plant_id,
          material_code: material_code,
          rack_type: "secondary",
          level_id: "L1",
          uom: uom,
        });

        let remainingAddedCount = 0;
        let subLocatedQty = 0;

        for (let j = 0; j < getLevel1Rack.length; j++) {
          pack_qty = 0;

          remainingAddedCount += getLevel1Rack[j].total_stock;
          //
          if (remaining_pick_qty > remainingAddedCount) {
            console.log("entered sub main qty > addedCount");

            locatedQty += getLevel1Rack[j].total_stock;
            subLocatedQty += getLevel1Rack[j].total_stock;

            pack_qty =
              uom == "KG"
                ? getLevel1Rack[j].total_stock / getWeightTolerance.qty_in_kg
                : getLevel1Rack[j].total_stock;

            if (uom != "PAC" && uom != "KG") u_o_m = uom;

            locationArr.push(
              pushLocationsData(getLevel1Rack[j], pack_qty, u_o_m)
            );
          } else if (remaining_pick_qty < remainingAddedCount) {
            subMainIdentityFlag = true;

            console.log("entered sub main qty < addedCount");
            //
            if (uom == "KG")
              pack_qty =
                remaining_pick_qty - subLocatedQty <
                getWeightTolerance.qty_in_kg
                  ? 1
                  : (remaining_pick_qty - subLocatedQty) /
                    getWeightTolerance.qty_in_kg;
            //
            else pack_qty = remaining_pick_qty - subLocatedQty;

            locatedQty += remaining_pick_qty - subLocatedQty;

            if (uom != "PAC" && uom != "KG") u_o_m = uom;

            locationArr.push(
              pushLocationsData(getLevel1Rack[j], pack_qty, u_o_m)
            );
            break;
            //
          } else if (remaining_pick_qty == remainingAddedCount) {
            console.log("entered sub main qty == addedCount");

            pack_qty =
              uom == "KG"
                ? getLevel1Rack[j].total_stock / getWeightTolerance.qty_in_kg
                : getLevel1Rack[j].total_stock;

            if (uom != "PAC" && uom != "KG") u_o_m = uom;

            locationArr.push(
              pushLocationsData(getLevel1Rack[j], pack_qty, u_o_m)
            );

            break;
          } else {
          }
        }
        // using again main block
        if (locatedQty != qty) {
          console.log("entered locatedQty != qty");
          if (uom == "KG")
            pack_qty =
              +qty - locatedQty < getWeightTolerance.qty_in_kg
                ? 1
                : (+qty - locatedQty) / getWeightTolerance.qty_in_kg;
          //
          else pack_qty = +qty - locatedQty;

          locatedQty += +qty - locatedQty;

          if (uom != "PAC" && uom != "KG") u_o_m = uom;

          locationArr.push(
            pushLocationsData(itemLocations[i], pack_qty, u_o_m)
          );
          break;
        }
      } else if (+qty == addedCount) {
        console.log("entered main qty == addedCount");
        //
        pack_qty =
          uom == "KG"
            ? itemLocations[i].total_stock / getWeightTolerance.qty_in_kg
            : itemLocations[i].total_stock;

        if (uom != "PAC" && uom != "KG") u_o_m = uom;

        locationArr.push(pushLocationsData(itemLocations[i], pack_qty, u_o_m));
        break;
        //
      } else {
      }
    }

    console.log(
      "sub main identity -",
      subMainIdentityFlag,
      "ordered qty -",
      +qty,
      "total located qty -",
      locatedQty,
      "pending qty -",
      qty - locatedQty
    );

    // using sub main block if after main block sub main block not entered means
    if (subMainIdentityFlag == false && +qty != locatedQty) {
      console.log(
        "entered sub main identity false and ordered qty not reached!"
      );

      const remaining_pick_qty = +qty - locatedQty;
      //
      console.log("remaining - ", remaining_pick_qty);

      const getLevel1Rack = await getLocationsData({
        company_code: company_code,
        plant_id: plant_id,
        material_code: material_code,
        rack_type: "secondary",
        level_id: "L1",
        uom: uom,
      });

      let remainingAddedCount = 0;
      let subLocatedQty = 0;

      for (let j = 0; j < getLevel1Rack.length; j++) {
        pack_qty = 0;

        remainingAddedCount += getLevel1Rack[j].total_stock;
        //
        if (remaining_pick_qty > remainingAddedCount) {
          console.log("entered sub main qty > addedCount");

          locatedQty += getLevel1Rack[j].total_stock;
          subLocatedQty += getLevel1Rack[j].total_stock;

          pack_qty =
            uom == "KG"
              ? getLevel1Rack[j].total_stock / getWeightTolerance.qty_in_kg
              : getLevel1Rack[j].total_stock;

          if (uom != "PAC" && uom != "KG") u_o_m = uom;

          locationArr.push(
            pushLocationsData(getLevel1Rack[j], pack_qty, u_o_m)
          );
        } else if (remaining_pick_qty < remainingAddedCount) {
          subMainIdentityFlag = true;

          console.log("entered sub main qty < addedCount");
          //
          if (uom == "KG")
            pack_qty =
              remaining_pick_qty - subLocatedQty < getWeightTolerance.qty_in_kg
                ? 1
                : (remaining_pick_qty - subLocatedQty) /
                  getWeightTolerance.qty_in_kg;
          //
          else pack_qty = remaining_pick_qty - subLocatedQty;

          locatedQty += remaining_pick_qty - subLocatedQty;

          if (uom != "PAC" && uom != "KG") u_o_m = uom;

          locationArr.push(
            pushLocationsData(getLevel1Rack[j], pack_qty, u_o_m)
          );
          break;
          //
        } else if (remaining_pick_qty == remainingAddedCount) {
          console.log("entered sub main qty == addedCount");

          pack_qty =
            uom == "KG"
              ? getLevel1Rack[j].total_stock / getWeightTolerance.qty_in_kg
              : getLevel1Rack[j].total_stock;

          if (uom != "PAC" && uom != "KG") u_o_m = uom;

          locationArr.push(
            pushLocationsData(getLevel1Rack[j], pack_qty, u_o_m)
          );

          break;
        } else {
        }
      }
    }

    console.log(
      "sub main identity -",
      subMainIdentityFlag,
      "ordered qty -",
      +qty,
      "total located qty -",
      locatedQty,
      "pending qty -",
      qty - locatedQty
    );

    let mssge =
      locationArr.length != 0
        ? "Picking locations list is available"
        : "Given material is not available in secondary storage!";

    return res.send({ status_code: 200, message: mssge, data: locationArr });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        "Some error occurred while getting picking item locations for dispatch!",
    });
  }
};

// const extractCarriers = (carriers, count, picked_by) => {
//   console.log("entered format carriers");
//   let presentCarriers = carriers;

//   let neededCarriers = presentCarriers.splice(0, count);

//   const formatCarriers = neededCarriers.map((data) => {
//     return {
//       crate_barcode: data.items.carriers.carrier_barcode,
//       tare_weight: data.items.carriers.crate_weight,
//       gross_weight: data.items.carriers.gross_weight,
//       net_weight: data.items.carriers.net_weight,
//       user_name: picked_by,
//     };
//   });

//   console.log(
//     "formated and remaining carrier - ",
//     formatCarriers.length,
//     presentCarriers.length
//   );

//   return [formatCarriers, presentCarriers];
// };

// const updatePickedInAllocation = async (
//   filter,
//   picked_qty,
//   weight_in_kg,
//   picked_by,
//   pallet_barcode,
//   location_id,
//   session
// ) => {
//   console.log(
//     "entered update picking qty",
//     filter,
//     picked_qty,
//     picked_by,
//     pallet_barcode,
//     location_id,
//     weight_in_kg
//   );

//   const getCarriers = await cumulativePalletizationColl.aggregate([
//     {
//       $match: {
//         company_code: filter.company_code,
//         plant_id: filter.plant_id,
//         delivery_date: filter.delivery_date,
//         route_id: filter.route_id,
//         // pallet_barcode: pallet_barcode,
//         "items.material_code": filter.material_no,
//       },
//     },
//     { $unwind: "$items" },
//     { $unwind: "$items.carriers" },
//     { $match: { "items.carriers.picked_location": location_id } },
//     { $project: { _id: 0, "items.carriers": 1 } },
//   ]);

//   console.log(" carriers ", getCarriers);

//   const getSosPickingQtyList = await soAllocationColl
//     .find(filter, {
//       sales_order_no: 1,
//       material_no: 1,
//       material_name: 1,
//       item_no: 1,
//       uom: 1,
//       pending_qty: 1,
//       allocated_qty: 1,
//       order_qty: 1,
//     })
//     .sort({ uom: 1, pending_qty: -1 });

//   // console.log("data - ", getSosPickingQtyList, picked_qty);

//   let remaining_pick_qty = picked_qty;
//   let flag = 0;
//   let count = 0;
//   let remaining_carriers = getCarriers;
//   let extracted_carriers = [];

//   for (let i = 0; i < getSosPickingQtyList.length; i++) {
//     console.log("looping");
//     let remaining_ordered_qty = getSosPickingQtyList[i].pending_qty; // getSosPickingQtyList[i].ordered_qty - getSosPickingQtyList[i].allocated_qty is fine

//     let allocated_qty = 0;
//     let pending_qty = 0;

//     if (remaining_ordered_qty > remaining_pick_qty) {
//       console.log("else if > ");

//       count =
//         getSosPickingQtyList[i].uom == "KG"
//           ? remaining_pick_qty / weight_in_kg
//           : remaining_pick_qty;

//       allocated_qty =
//         getSosPickingQtyList[i].allocated_qty + remaining_pick_qty;

//       pending_qty = getSosPickingQtyList[i].order_qty - allocated_qty;

//       remaining_pick_qty = 0;

//       let result = extractCarriers(remaining_carriers, count, picked_by);

//       extracted_carriers = result[0];
//       remaining_carriers = result[1];

//       flag = 1;

//       //
//     } else if (remaining_ordered_qty == remaining_pick_qty) {
//       console.log("else if == ");

//       count =
//         getSosPickingQtyList[i].uom == "KG"
//           ? remaining_pick_qty / weight_in_kg
//           : remaining_pick_qty;

//       allocated_qty =
//         getSosPickingQtyList[i].allocated_qty + remaining_pick_qty;

//       pending_qty = remaining_pick_qty = 0;

//       let result = extractCarriers(remaining_carriers, count, picked_by);

//       extracted_carriers = result[0];
//       remaining_carriers = result[1];

//       flag = 1;
//       //
//     } else if (remaining_ordered_qty < remaining_pick_qty) {
//       console.log("else if < ");

//       count =
//         getSosPickingQtyList[i].uom == "KG"
//           ? remaining_ordered_qty / weight_in_kg
//           : remaining_ordered_qty;

//       allocated_qty = getSosPickingQtyList[i].order_qty;

//       pending_qty = 0;

//       remaining_pick_qty = remaining_pick_qty - remaining_ordered_qty;

//       let result = extractCarriers(remaining_carriers, count, picked_by);

//       extracted_carriers = result[0];
//       remaining_carriers = result[1];

//       //
//     } else {
//     }

//     let updation = { pending_qty: pending_qty, allocated_qty: allocated_qty };
//     if (pending_qty == 0) {
//       updation.allocation_status = "PICKED";
//       updation.is_ready_for_invoice = true;
//     }

//     console.log("allocation update - ", updation);

//     await soAllocationColl.findOneAndUpdate(
//       {
//         company_code: filter.company_code,
//         plant_id: filter.plant_id,
//         sales_order_no: getSosPickingQtyList[i].sales_order_no,
//         delivery_date: filter.delivery_date,
//         material_no: filter.material_no,
//         item_no: getSosPickingQtyList[i].item_no,
//         pending_qty: { $ne: 0 },
//       },
//       // { $push: { allocation_detail: { $each: carrierArr } } },
//       { $set: updation },
//       { useFindAndModify: false, session }
//     );

//     // pushing carriers
//     await soAllocationColl.findOneAndUpdate(
//       {
//         company_code: filter.company_code,
//         plant_id: filter.plant_id,
//         sales_order_no: getSosPickingQtyList[i].sales_order_no,
//         delivery_date: filter.delivery_date,
//         material_no: filter.material_no,
//         item_no: getSosPickingQtyList[i].item_no,
//         // pending_qty: { $ne: 0 },
//       },
//       { $push: { allocation_detail: { $each: extracted_carriers } } },
//       { useFindAndModify: false, session }
//     );

//     console.log("update finished ", flag);
//     // break the loop if remaining pick qty is 'zero'
//     if (flag == 1) break;
//   }
//   return flag;
// };

// const updatePickedInAllocation = async (filter, picked_qty, session) => {
//   console.log("entered update picking qty");

//   const getSosPickingQtyList = await soAllocationColl
//     .find(filter, {
//       sales_order_no: 1,
//       material_no: 1,
//       material_name: 1,
//       item_no: 1,
//       uom: 1,
//       pending_qty: 1,
//       allocated_qty: 1,
//       order_qty: 1,
//     })
//     .sort({ uom: 1, pending_qty: -1 });

//   // console.log("data - ", getSosPickingQtyList, picked_qty);

//   let remaining_pick_qty = picked_qty;
//   let flag = 0;

//   for (let i = 0; i < getSosPickingQtyList.length; i++) {
//     console.log("looping");
//     let remaining_ordered_qty = getSosPickingQtyList[i].pending_qty; // getSosPickingQtyList[i].ordered_qty - getSosPickingQtyList[i].allocated_qty is fine

//     let allocated_qty = 0;
//     let pending_qty = 0;

//     if (remaining_ordered_qty > remaining_pick_qty) {
//       console.log("else if > ");

//       allocated_qty =
//         getSosPickingQtyList[i].allocated_qty + remaining_pick_qty;

//       pending_qty = getSosPickingQtyList[i].order_qty - allocated_qty;

//       remaining_pick_qty = 0;

//       flag = 1;
//       //
//     } else if (remaining_ordered_qty == remaining_pick_qty) {
//       console.log("else if == ");

//       allocated_qty =
//         getSosPickingQtyList[i].allocated_qty + remaining_pick_qty;

//       pending_qty = remaining_pick_qty = 0;

//       flag == 1;
//       //
//     } else if (remaining_ordered_qty < remaining_pick_qty) {
//       console.log("else if < ");

//       allocated_qty = getSosPickingQtyList[i].order_qty;

//       pending_qty = 0;

//       remaining_pick_qty = remaining_pick_qty - remaining_ordered_qty;
//     } else {
//     }

//     let updation = { pending_qty: pending_qty, allocated_qty: allocated_qty };
//     if (pending_qty == 0) {
//       updation.allocation_status = "PICKED";
//       // updation.is_ready_for_invoice = true;
//     }

//     console.log("allocation update - ", updation);

//     await soAllocationColl.findOneAndUpdate(
//       {
//         company_code: filter.company_code,
//         plant_id: filter.plant_id,
//         sales_order_no: getSosPickingQtyList[i].sales_order_no,
//         delivery_date: filter.delivery_date,
//         material_no: filter.material_no,
//         item_no: getSosPickingQtyList[i].item_no,
//         pending_qty: { $ne: 0 },
//       },
//       { $set: updation },
//       { useFindAndModify: false, session }
//     );

//     // break the loop if remaining pick qty is 'zero'
//     if (flag == 1) break;
//   }
//   return flag;
// };

exports.confirmItemPicked = async (req, res) => {
  console.log("calling confirm items picked api");
  const {
    company_code,
    plant_id,
    route_id,
    delivery_date,
    material_code,
    uom,
    picked_qty,
    location_id,
  } = req.query;

  try {
    if (
      !(
        company_code &&
        plant_id &&
        route_id &&
        delivery_date &&
        material_code &&
        uom &&
        picked_qty &&
        location_id
      )
    )
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters to proceed!",
      });

    if (+picked_qty == 0)
      return res.status(400).send({
        status_code: 400,
        message: "No. of carriers picked count should not be zero!",
      });

    const checkPickedBeforeAck = await cumulativePalletizationColl.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          route_id: route_id,
        },
      },
      { $unwind: "$items" },
      { $match: { "items.material_code": material_code } },
      { $unwind: "$items.carriers" },
      { $match: { "items.carriers.picked_location": location_id } },
    ]);

    if (checkPickedBeforeAck.length != +picked_qty)
      return res.status(400).send({
        status_code: 400,
        message:
          "First pick the mentioned no. of carriers and then press acknowledge!",
      });
    else
      return res.status(200).send({
        status_code: 200,
        message: "Picking confirmed successfully",
      });
  } catch (err) {
    console.log(err);

    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while confirming item picked!",
    });
  }
};

// old logic
// exports.confirmItemPicked = async (req, res) => {
//   console.log("calling confirm items picked api");
//   const {
//     company_code,
//     plant_id,
//     route_id,
//     delivery_date,
//     material_code,
//     uom,
//     picked_qty,
//     location_id,
//     pallet_barcode,
//     picked_by,
//   } = req.query;

//   const session = await conn.startSession();
//   session.startTransaction();

//   try {
//     if (
//       !(
//         company_code &&
//         plant_id &&
//         route_id &&
//         delivery_date &&
//         material_code &&
//         uom &&
//         picked_qty &&
//         location_id &&
//         pallet_barcode &&
//         picked_by
//       )
//     )
//       return res.status(400).send({
//         status_code: 400,
//         message: "Provide all required parameters to proceed!",
//       });

//     if (+picked_qty == 0)
//       return res.status(400).send({
//         status_code: 400,
//         message: "No. of carriers picked count should not be zero!",
//       });

//     // restricted acknowledge after palletization is done

//     const checkPickedBeforeAck = await cumulativePalletizationColl.aggregate([
//       {
//         $match: {
//           company_code: company_code,
//           plant_id: plant_id,
//           delivery_date: delivery_date,
//           route_id: route_id,
//         },
//       },
//       { $unwind: "$items" },
//       { $match: { "items.material_code": material_code } },
//       { $unwind: "$items.carriers" },
//       { $match: { "items.carriers.picked_location": location_id } },
//     ]);

//     if (checkPickedBeforeAck.length != +picked_qty) {
//       return res.status(400).send({
//         status_code: 400,
//         message:
//           "First pick the mentioned no. of carriers and then press acknowledge!",
//       });
//     }

//     const getWeightTolerance = await db.product_weight_model.findOne(
//       {
//         company_code: company_code,
//         plant_id: plant_id,
//         material_code: material_code,
//       },
//       { _id: 0, qty_in_kg: 1 }
//     );

//     const pickQty =
//       uom == "KG" ? +picked_qty * getWeightTolerance.qty_in_kg : +picked_qty;

//     const getCarrierCount = await secondaryStorageColl.findOne(
//       {
//         company_code: company_code,
//         plant_id: plant_id,
//         location_id: location_id,
//         pallet_barcode: pallet_barcode,
//         rack_type: "secondary",
//       },
//       { _id: 0, carrier_count: 1, current_stock: 1 }
//     );

//     if (getCarrierCount == null) {
//       return res.send({
//         status_code: 404,
//         message:
//           "Material pick confirmed already or no material found in selected location!",
//       });
//     }

//     let mssge = "Confirming item picking failed!";
//     let status = 200;

//     if (+picked_qty == getCarrierCount.carrier_count) {
//       //
//       console.log("entered entire pallet");

//       const updatePalletization = await palletizationColl.findOneAndUpdate(
//         {
//           company_code: company_code,
//           plant_id: plant_id,
//           pallet_barcode_value: pallet_barcode,
//           pallet_status: "Secondary_storage",
//           is_deleted: false,
//           item_code: material_code,
//           location_id: location_id,
//         },
//         {
//           is_deleted: true,
//         },
//         { useFindAndModify: false, session }
//       );

//       if (updatePalletization != null) {
//         console.log("entered update pallization");
//         // update master
//         await palletMasterColl.updateOne(
//           {
//             company_code: company_code,
//             plant_id: plant_id,
//             pallet_id: pallet_barcode,
//             active_status: 1,
//             // palletization_status: "Assigned",
//           },
//           { $set: { palletization_status: "Unassigned" } },
//           { session }
//         );

//         await secondaryStorageColl.deleteOne({
//           company_code: company_code,
//           plant_id: plant_id,
//           location_id: location_id,
//           material_code: material_code,
//           rack_type: "secondary",
//         });

//         await rackColl.updateOne(
//           {
//             company_code: company_code,
//             plant_id: plant_id,
//             location_id: location_id,
//             active_status: 1,
//           },
//           {
//             $set: {
//               locked: false,
//               status: "unoccupied",
//               updated_by: picked_by,
//               locked_by: "",
//             },
//           },
//           { session }
//         );

//         // await updatePickedInAllocation(
//         //   {
//         //     company_code: company_code,
//         //     plant_id: plant_id,
//         //     route_id: route_id,
//         //     delivery_date: delivery_date,
//         //     material_no: material_code,
//         //     pending_qty: { $ne: 0 },
//         //   },
//         //   pickQty,
//         //   session
//         // );

//         mssge = "Picking confirmed sucessfully";
//       } else {
//         status = 404;
//         mssge = "No pallet or material found in rack location : " + location_id;
//       }
//     } else if (+picked_qty < getCarrierCount.carrier_count) {
//       //
//       const updatePickedCarriers = await secondaryStorageColl.updateOne(
//         {
//           company_code: company_code,
//           plant_id: plant_id,
//           location_id: location_id,
//           rack_type: "secondary",
//         },
//         {
//           current_stock: getCarrierCount.current_stock - pickQty,
//           carrier_count: getCarrierCount.carrier_count - +picked_qty,
//         },
//         { session }
//       );

//       // const updatePicked = await updatePickedInAllocation(
//       //   {
//       //     company_code: company_code,
//       //     plant_id: plant_id,
//       //     route_id: route_id,
//       //     delivery_date: delivery_date,
//       //     material_no: material_code,
//       //     pending_qty: { $ne: 0 },
//       //   },
//       //   pickQty,
//       //   session
//       // );
//       mssge = "Picking confirmed sucessfully";
//     } else {
//       status = 400;
//       mssge = "No. of carriers picked count is wrong!";
//     }

//     await session.commitTransaction();

//     return res.send({
//       status_code: status,
//       message: mssge,
//     });
//   } catch (err) {
//     console.log(err);
//     await session.abortTransaction();

//     return res.status(500).send({
//       status_code: 500,
//       message: "Some error occurred while confirming item picked!",
//     });
//   }
// };

const getPickingQty = async (filter, location_id, tolerance, uom) => {
  console.log("entered get picking qty");

  let picking_count = {};

  if (tolerance.pieces_per_bin > 0) {
    const pickingCount = await soAllocationColl.aggregate([
      { $match: filter },
      {
        $project: {
          _id: 0,
          material_no: 1,
          material_name: 1,
          order_qty: 1,
          pending_qty: 1,
          allocated_aty: 1,
        },
      },
    ]);

    // console.log("order ", pickingCount);

    let total_ordered_qty = 0;

    for (let i = 0; i < pickingCount.length; i++) {
      if (pickingCount[i].order_qty >= tolerance.qty_in_pack) {
        total_ordered_qty +=
          Math.floor(pickingCount[i].order_qty / tolerance.qty_in_pack) *
          tolerance.qty_in_pack;
      }
    }

    picking_count = {
      material_no: pickingCount[0]["material_no"],
      material_name: pickingCount[0]["material_name"],
      uom: uom,
      total_ordered_qty: total_ordered_qty,
    };
    // console.log("pickingcount - ", picking_count);
  } else {
    console.log("entered else - pieces per bin == 0");
    const pickingCount = await soAllocationColl.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: {
            material_no: "$material_no",
            material_name: "$material_name",
            uom: "$uom",
          },
          total_ordered_qty: { $sum: "$order_qty" },
        },
      },
      { $sort: { "_id.uom": 1 } },
    ]);

    // console.log("pickingCount - ", pickingCount);

    if (pickingCount.length > 1) {
      if (
        pickingCount[0]._id["uom"] == "KG" &&
        pickingCount[1]._id["uom"] == "PAC"
      ) {
        picking_count = {
          material_no: pickingCount[0]._id["material_no"],
          material_name: pickingCount[0]._id["material_name"],
          uom: "KG",
          total_ordered_qty:
            pickingCount[0].total_ordered_qty +
            pickingCount[1].total_ordered_qty * tolerance.qty_in_kg,
        };
      }
    } else if (
      pickingCount.length == 1 &&
      pickingCount[0]._id["uom"] == "PAC" &&
      tolerance.pieces_per_bin == 0
    ) {
      picking_count = {
        material_no: pickingCount[0]._id["material_no"],
        material_name: pickingCount[0]._id["material_name"],
        uom: "KG",
        total_ordered_qty:
          pickingCount[0].total_ordered_qty * tolerance.qty_in_kg,
      };
    } else {
      picking_count = {
        material_no: pickingCount[0]._id["material_no"],
        material_name: pickingCount[0]._id["material_name"],
        uom: uom,
        total_ordered_qty: pickingCount[0].total_ordered_qty,
      };
    }
  }

  // console.log("picking count", picking_count);

  let query_filter = {
    company_code: filter.company_code,
    plant_id: filter.plant_id,
    delivery_date: filter.delivery_date,
    route_id: filter.route_id,
  };

  const pickedCount = await cumulativePalletizationColl.aggregate([
    {
      $match: query_filter,
    },
    { $unwind: "$items" },
    { $match: { "items.material_code": filter.material_no } },
    { $unwind: "$items.carriers" },
    { $match: { "items.carriers.picked_location": { $ne: location_id } } },
    { $project: { _id: 0, "items.carriers.carrier_barcode": 1 } },
  ]);

  const alreadyPicked = await cumulativePalletizationColl.aggregate([
    {
      $match: query_filter,
    },
    { $unwind: "$items" },
    { $match: { "items.material_code": filter.material_no } },
    { $unwind: "$items.carriers" },
    { $match: { "items.carriers.picked_location": location_id } },
    { $project: { _id: 0, "items.carriers.picked_location": 1 } },
  ]);

  // console.log(
  //   "already Picked -",
  //   picking_count,
  //   pickedCount.length,
  //   alreadyPicked.length
  // );

  const order_qty = picking_count.total_ordered_qty;

  if (pickedCount.length != 0 || alreadyPicked.length != 0) {
    console.log("entered - data on picked count ");

    if (tolerance.pieces_per_bin == 0) {
      console.log("entered non ptl");

      let picked =
        picking_count["uom"] == "KG"
          ? (pickedCount.length + alreadyPicked.length) * tolerance["qty_in_kg"]
          : pickedCount.length + alreadyPicked.length;

      // console.log("picked - ", picked);

      if (order_qty > picked)
        return {
          picking_qty: order_qty - picked,
          carrier_type: "Bag",
          alreadyPicked: alreadyPicked.length,
          totalRemainingUnit:
            picking_count["uom"] == "KG"
              ? order_qty / tolerance["qty_in_kg"] - pickedCount.length
              : order_qty - pickedCount.length,
        };
      //
      else if (order_qty == picked)
        return {
          picking_qty: 0,
          carrier_type: "Bag",
          alreadyPicked: alreadyPicked.length,
          totalRemainingUnit: 0,
        };
    } else {
      console.log("entered ptl");

      let picked =
        picking_count["uom"] == "PAC"
          ? (pickedCount.length + alreadyPicked.length) *
            tolerance["qty_in_pack"]
          : pickedCount.length + alreadyPicked.length;

      // console.log("picked - ", picked);

      if (order_qty > picked)
        return {
          picking_qty: order_qty - picked,
          carrier_type: "Box",
          alreadyPicked: alreadyPicked.length,
          totalRemainingUnit:
            picking_count["uom"] == "PAC"
              ? order_qty / tolerance["qty_in_pack"] - pickedCount.length
              : order_qty - pickedCount.length,
        };
      //
      else if (order_qty == picked)
        return {
          picking_qty: 0,
          carrier_type: "Box",
          alreadyPicked: alreadyPicked.length,
          totalRemainingUnit: 0,
        };
    }
  } else
    return tolerance.pieces_per_bin == 0
      ? {
          picking_qty: order_qty,
          carrier_type: "Bag",
          alreadyPicked: alreadyPicked.length,
          totalRemainingUnit:
            picking_count["uom"] == "KG"
              ? order_qty / tolerance.qty_in_kg
              : order_qty,
        }
      : {
          picking_qty: order_qty,
          carrier_type: "Box",
          alreadyPicked: alreadyPicked.length,
          totalRemainingUnit:
            picking_count["uom"] == "PAC"
              ? order_qty / tolerance.qty_in_pack
              : order_qty,
        };
};

const getLocations = async (filter) => {
  return await secondaryStorageColl
    .findOne(filter, {
      _id: 0,
      rack_id: 1,
      column_id: 1,
      location_id: 1,
      current_stock: 1,
      carrier_count: 1,
      uom: 1,
      pallet_barcode: 1,
    })
    .sort({ _id: 1 });
};

const getLocationsV2 = async (filter, storage) => {
  if (storage == "Secondary_storage")
    return await secondaryStorageColl.findOne(filter, {
      _id: 0,
      rack_id: 1,
      column_id: 1,
      location_id: 1,
      current_stock: 1,
      carrier_count: 1,
      uom: 1,
      pallet_barcode: 1,
    });
  else
    return await primaryStorageColl.findOne(filter, {
      _id: 0,
      rack_id: 1,
      column_id: 1,
      location_id: 1,
      total_stock: 1,
      carrier_count: 1,
      uom: 1,
      pallet_barcode: 1,
    });
};

const pushLocations = (
  itemLocation,
  pick_qty,
  remaining_qty,
  qty_in_kg,
  qty_in_pack,
  boolean,
  carrier_type,
  uom,
  total_stock,
  alreadyPicked
) => {
  return {
    rack_id: itemLocation.rack_id,

    column_id:
      "A" + itemLocation.column_id.substring(1, itemLocation.column_id.length),

    location_id: itemLocation.location_id,

    pallet_barcode: itemLocation.pallet_barcode,

    rack_total_stock: total_stock,

    rack_stock_uom: uom,

    pick_qty:
      uom == "KG"
        ? (pick_qty + alreadyPicked) * qty_in_kg
        : uom == "PAC" || uom == "PAK"
        ? (pick_qty + alreadyPicked) * qty_in_pack
        : pick_qty + alreadyPicked,

    unit: pick_qty + alreadyPicked,

    total_remaining_qty:
      remaining_qty -
      (uom == "KG"
        ? pick_qty * qty_in_kg
        : uom == "PAC" || uom == "PAK"
        ? pick_qty * qty_in_pack
        : pick_qty),

    pick_entire_pallet: boolean,

    carrier_type: carrier_type,
  };
};

exports.getItemLocationsV2 = async (req, res) => {
  console.log("calling get picking item location api v2");
  const {
    company_code,
    plant_id,
    delivery_date,
    route_id,
    material_code,
    uom,
  } = req.query;
  try {
    if (
      !(
        company_code &&
        plant_id &&
        delivery_date &&
        route_id &&
        material_code &&
        uom
      )
    )
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters to proceed!",
      });

    const itemLocations = await getLocations({
      company_code: company_code,
      plant_id: plant_id,
      material_code: material_code,
      rack_type: "secondary",
    });

    // console.log("location - ", itemLocations);

    const getWeightTolerance = await db.product_weight_model.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        material_code: material_code,
      },
      { _id: 0, qty_in_kg: 1, qty_in_pack: 1, pieces_per_bin: 1 }
    );

    if (getWeightTolerance == null)
      return res.send({
        status_code: 404,
        message:
          "Weight tolerance is not available for the given material code!",
        data: {},
      });

    if (itemLocations == null)
      return res.send({
        status_code: 404,
        message: "Selected SKU is not available in secondary storage!",
        data: {},
      });
    else {
      const getSosPickingQty = await getPickingQty(
        {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          material_no: material_code,
          route_id: route_id,
          pending_qty: { $ne: 0 },
        },
        itemLocations.location_id,
        getWeightTolerance,
        uom
      );

      // console.log("picking qty - ", getSosPickingQty);

      if (getSosPickingQty.picking_qty == 0)
        return res.status(200).send({
          status_code: 404,
          message:
            "Selected SKU item is already picked. Please go back and check again!",
          data: {},
        });

      let pick_qty = 0;
      let locationData = {};
      let remaining_qty = getSosPickingQty.picking_qty;
      const carrier_type = getSosPickingQty.carrier_type;
      const alreadyPickedCount = getSosPickingQty.alreadyPicked;

      // console.log("remaining - ", remaining_qty, alreadyPickedCount);

      const total_stock =
        uom == "KG"
          ? (itemLocations.carrier_count + alreadyPickedCount) *
            getWeightTolerance.qty_in_kg
          : uom == "PAC" || uom == "PAK"
          ? (itemLocations.carrier_count + alreadyPickedCount) *
            getWeightTolerance.qty_in_pack
          : itemLocations.carrier_count + alreadyPickedCount;

      // console.log(
      //   "total stock - ",
      //   total_stock,
      //   remaining_qty,
      //   uom,
      //   getWeightTolerance.qty_in_pack,
      //   itemLocations.carrier_count,
      //   alreadyPickedCount
      // );

      if (total_stock < remaining_qty) {
        console.log("entered < ");

        pick_qty = itemLocations.carrier_count;

        locationData = pushLocations(
          itemLocations,
          pick_qty,
          remaining_qty,
          getWeightTolerance.qty_in_kg,
          getWeightTolerance.qty_in_pack,
          true,
          carrier_type,
          uom,
          total_stock,
          alreadyPickedCount
        );
      } else if (total_stock > remaining_qty) {
        console.log("entered > ");

        pick_qty =
          uom == "KG"
            ? remaining_qty / getWeightTolerance.qty_in_kg
            : uom == "PAC" || uom == "PAK"
            ? Math.floor(remaining_qty / getWeightTolerance.qty_in_pack)
            : remaining_qty;

        console.log(
          // itemLocations,
          pick_qty,
          remaining_qty,
          getWeightTolerance.qty_in_kg,
          getWeightTolerance.qty_in_pack,
          false,
          carrier_type,
          alreadyPickedCount,
          uom,
          total_stock
        );
        locationData = pushLocations(
          itemLocations,
          pick_qty,
          remaining_qty,
          getWeightTolerance.qty_in_kg,
          getWeightTolerance.qty_in_pack,
          false,
          carrier_type,
          uom,
          total_stock,
          alreadyPickedCount
        );
      } else if (total_stock == remaining_qty) {
        console.log("entered == ");
        pick_qty = itemLocations.carrier_count;

        locationData = pushLocations(
          itemLocations,
          pick_qty,
          remaining_qty,
          getWeightTolerance.qty_in_kg,
          getWeightTolerance.qty_in_pack,
          true,
          carrier_type,
          uom,
          total_stock,
          alreadyPickedCount
        );
      } else {
      }

      return res.send({
        status_code: 200,
        message: "SO item Pick location is available",
        data: locationData,
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        "Some error occurred while fetching location details for selected SKU for dispatch!",
    });
  }
};

const pushLocationsV2 = (
  location_no,
  itemLocation,
  pick_qty,
  remaining_qty,
  qty_in_kg,
  qty_in_pack,
  boolean,
  carrier_type,
  uom,
  total_stock,
  alreadyPicked
) => {
  return {
    location_no: location_no,
    rack_id: itemLocation.rack_id,

    column_id:
      "A" + itemLocation.column_id.substring(1, itemLocation.column_id.length),

    location_id: itemLocation.location_id,

    pallet_barcode: itemLocation.pallet_barcode,

    rack_total_stock:
      uom == "KG"
        ? total_stock + alreadyPicked * qty_in_kg
        : uom == "PAC" || uom == "PAK"
        ? total_stock + alreadyPicked * qty_in_pack
        : total_stock + alreadyPicked,

    rack_stock_uom: uom,

    pick_qty:
      uom == "KG"
        ? (pick_qty + alreadyPicked) * qty_in_kg
        : uom == "PAC" || uom == "PAK"
        ? (pick_qty + alreadyPicked) * qty_in_pack
        : pick_qty + alreadyPicked,

    unit: pick_qty + alreadyPicked,

    total_remaining_qty:
      remaining_qty -
      (uom == "KG"
        ? pick_qty * qty_in_kg
        : uom == "PAC" || uom == "PAK"
        ? pick_qty * qty_in_pack
        : pick_qty),

    pick_entire_pallet: boolean,

    carrier_type: carrier_type,
  };
};

const pushLocationsV3 = (
  location_no,
  itemLocation,
  pick_qty,
  remaining_qty,
  qty_in_kg,
  qty_in_pack,
  boolean,
  carrier_type,
  uom,
  total_stock,
  alreadyPicked,
  pallet_location,
  totalPickLocations
) => {
  return {
    location_no: location_no,

    rack_id: itemLocation.rack_id,

    column_id:
      "A" + itemLocation.column_id.substring(1, itemLocation.column_id.length),

    location_id: itemLocation.location_id,

    pallet_barcode: itemLocation.pallet_barcode,

    rack_total_stock:
      uom == "KG"
        ? (total_stock + alreadyPicked * qty_in_kg).toFixed(2)
        : uom == "PAC" || uom == "PAK"
        ? (total_stock + alreadyPicked * qty_in_pack).toFixed(2)
        : (total_stock + alreadyPicked).toFixed(2),

    rack_stock_uom: uom,

    pick_qty:
      uom == "KG"
        ? ((pick_qty + alreadyPicked) * qty_in_kg).toFixed(2)
        : uom == "PAC" || uom == "PAK"
        ? ((pick_qty + alreadyPicked) * qty_in_pack).toFixed(2)
        : (pick_qty + alreadyPicked).toFixed(2),

    unit: (pick_qty + alreadyPicked).toFixed(2),

    total_remaining_qty: (
      remaining_qty -
      (uom == "KG"
        ? pick_qty * qty_in_kg
        : uom == "PAC" || uom == "PAK"
        ? pick_qty * qty_in_pack
        : pick_qty)
    ).toFixed(2),

    pick_entire_pallet: boolean,

    carrier_type: carrier_type,

    storage: pallet_location.split("_")[0],

    totalLocations: totalPickLocations,
  };
};

exports.getItemLocationsV3 = async (req, res) => {
  console.log("calling get picking item location api v3");
  const {
    company_code,
    plant_id,
    delivery_date,
    route_id,
    material_code,
    uom,
  } = req.query;
  try {
    if (
      !(
        company_code &&
        plant_id &&
        delivery_date &&
        route_id &&
        material_code &&
        uom
      )
    )
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters to proceed!",
      });

    const itemLocations = await getLocations({
      company_code: company_code,
      plant_id: plant_id,
      material_code: material_code,
      rack_type: "secondary",
    });

    // console.log("location - ", itemLocations);

    const getWeightTolerance = await db.product_weight_model.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        material_code: material_code,
      },
      { _id: 0, qty_in_kg: 1, qty_in_pack: 1, pieces_per_bin: 1 }
    );

    if (getWeightTolerance == null)
      return res.send({
        status_code: 404,
        message:
          "Weight tolerance is not available for the given material code!",
        data: {},
      });

    const getSosPickingQty = await getPickingQty(
      {
        company_code: company_code,
        plant_id: plant_id,
        delivery_date: delivery_date,
        material_no: material_code,
        route_id: route_id,
        // pending_qty: { $ne: 0 },
      },
      itemLocations != null ? itemLocations.location_id : "empty",
      getWeightTolerance,
      uom
    );

    // console.log("picking qty - ", getSosPickingQty);

    if (getSosPickingQty.picking_qty == 0)
      return res.status(200).send({
        status_code: 404,
        message:
          "Selected SKU item is already picked. Please go back and check again!",
        data: {},
      });

    if (itemLocations == null)
      return res.send({
        status_code: 404,
        message: "Selected SKU is not available in secondary storage!",
        data: {},
      });
    else {
      const pickedLocations = await cumulativePalletizationColl.aggregate([
        {
          $match: {
            company_code: company_code,
            plant_id: plant_id,
            delivery_date: delivery_date,
            route_id: route_id,
          },
        },
        { $unwind: "$items" },
        { $match: { "items.material_code": material_code } },
        { $unwind: "$items.carriers" },
        {
          $group: { _id: "items.carriers.picked_location" },
        },
      ]);

      let location_no = 1;

      if (pickedLocations.length > 0)
        if (
          pickedLocations[pickedLocations.length - 1]._id ==
          itemLocations.location_id
        )
          location_no = pickedLocations.length;
        else if (
          pickedLocations[pickedLocations.length - 1]._id !=
          itemLocations.location_id
        )
          location_no = pickedLocations.length + 1;

      let pick_qty = 0;
      let locationData = {};
      let remaining_qty = getSosPickingQty.picking_qty;
      const carrier_type = getSosPickingQty.carrier_type;
      const alreadyPickedCount = getSosPickingQty.alreadyPicked;

      // console.log("remaining - ", remaining_qty, alreadyPickedCount);

      const total_stock =
        uom == "KG"
          ? itemLocations.carrier_count * getWeightTolerance.qty_in_kg
          : uom == "PAC" || uom == "PAK"
          ? itemLocations.carrier_count * getWeightTolerance.qty_in_pack
          : itemLocations.carrier_count;

      if (total_stock < remaining_qty) {
        console.log("entered < ");

        pick_qty = itemLocations.carrier_count;

        locationData = pushLocationsV2(
          location_no,
          itemLocations,
          pick_qty,
          remaining_qty,
          getWeightTolerance.qty_in_kg,
          getWeightTolerance.qty_in_pack,
          true,
          carrier_type,
          uom,
          total_stock,
          alreadyPickedCount
        );
      } else if (total_stock > remaining_qty) {
        console.log("entered > ");

        pick_qty =
          uom == "KG"
            ? remaining_qty / getWeightTolerance.qty_in_kg
            : uom == "PAC" || uom == "PAK"
            ? Math.floor(remaining_qty / getWeightTolerance.qty_in_pack)
            : remaining_qty;

        locationData = pushLocationsV2(
          location_no,
          itemLocations,
          pick_qty,
          remaining_qty,
          getWeightTolerance.qty_in_kg,
          getWeightTolerance.qty_in_pack,
          false,
          carrier_type,
          uom,
          total_stock,
          alreadyPickedCount
        );
      } else if (total_stock == remaining_qty) {
        console.log("entered == ");
        pick_qty = itemLocations.carrier_count;

        locationData = pushLocationsV2(
          location_no,
          itemLocations,
          pick_qty,
          remaining_qty,
          getWeightTolerance.qty_in_kg,
          getWeightTolerance.qty_in_pack,
          true,
          carrier_type,
          uom,
          total_stock,
          alreadyPickedCount
        );
      } else {
      }

      return res.send({
        status_code: 200,
        message: "SO item Pick location is available",
        data: locationData,
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        "Some error occurred while fetching location details for selected SKU for dispatch!",
    });
  }
};

const getPickingLocationsCount = async (
  filter,
  palletDetails,
  totalRemainingUnit,
  material_code,
  location_id
) => {
  const alreadyPickedLocations = await cumulativePalletizationColl.aggregate([
    {
      $match: filter,
    },
    { $unwind: "$items" },
    { $match: { "items.material_code": material_code } },
    { $unwind: "$items.carriers" },
    { $match: { "items.carriers.picked_location": { $ne: location_id } } },
    { $group: { _id: "$items.carriers.picked_location" } },
  ]);

  let addingCarriers = 0;
  let totalLocationsCount = 0;

  for (let i = 0; i < palletDetails.length; i++) {
    addingCarriers += palletDetails[i].carrier_count;

    totalLocationsCount++;

    if (addingCarriers >= totalRemainingUnit) break;
  }

  totalLocationsCount += alreadyPickedLocations.length;

  return totalLocationsCount;
};

exports.getItemLocationsV4 = async (req, res) => {
  console.log("calling get picking item location api v4");
  const {
    company_code,
    plant_id,
    delivery_date,
    route_id,
    material_code,
    uom,
  } = req.query;
  try {
    if (
      !(
        company_code &&
        plant_id &&
        delivery_date &&
        route_id &&
        material_code &&
        uom
      )
    )
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters to proceed!",
      });

    let getPalletWithRequiredItem = await palletizationColl
      .find({
        company_code: company_code,
        plant_id: plant_id,
        item_code: material_code,
        is_deleted: false,
        pallet_status: { $in: ["Primary_storage", "Secondary_storage"] },
      })
      .sort({ createdAt: 1 });

    const currentDate = new Date();

    getPalletWithRequiredItem = getPalletWithRequiredItem.filter((item) => {
      const expiryDate = new Date(item.expiry_date);
      const stackedDate = new Date(item.stacked_date);
      const daysUntilExpiry = Math.floor(
        (expiryDate - stackedDate) / (1000 * 60 * 60 * 24)
      );
      const daysRemaining = Math.floor(
        (expiryDate - currentDate) / (1000 * 60 * 60 * 24)
      );

      return daysRemaining < daysUntilExpiry && daysRemaining >= 0;
    });

    getPalletWithRequiredItem.sort((a, b) => {
      const expiryDateA = new Date(a.expiry_date);
      const expiryDateB = new Date(b.expiry_date);
      const daysRemainingA = Math.floor(
        (expiryDateA - currentDate) / (1000 * 60 * 60 * 24)
      );
      const daysRemainingB = Math.floor(
        (expiryDateB - currentDate) / (1000 * 60 * 60 * 24)
      );

      return daysRemainingA - daysRemainingB;
    });

    let itemLocations = null;

    if (getPalletWithRequiredItem.length > 0)
      itemLocations = await getLocationsV2(
        {
          company_code: company_code,
          plant_id: plant_id,
          location_id: getPalletWithRequiredItem[0].location_id,
          pallet_barcode: getPalletWithRequiredItem[0].pallet_barcode_value,
          material_code: material_code,
          rack_type: { $in: ["primary", "secondary"] },
        },
        getPalletWithRequiredItem[0].pallet_status
      );

    // console.log("location - ", itemLocations);

    const getWeightTolerance = await db.product_weight_model.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        material_code: material_code,
      },
      { _id: 0, qty_in_kg: 1, qty_in_pack: 1, pieces_per_bin: 1 }
    );

    if (getWeightTolerance == null)
      return res.send({
        status_code: 404,
        message:
          "Weight tolerance data is not available for the given material code!",
        data: {},
      });

    const getSosPickingQty = await getPickingQty(
      {
        company_code: company_code,
        plant_id: plant_id,
        delivery_date: delivery_date,
        material_no: material_code,
        route_id: route_id,
      },
      itemLocations != null ? itemLocations.location_id : "empty",
      getWeightTolerance,
      uom
    );

    // console.log("picking qty - ", getSosPickingQty);

    if (getSosPickingQty.picking_qty == 0)
      return res.status(200).send({
        status_code: 404,
        message:
          "Selected SKU item is already picked. Please go back and check again!",
        data: {},
      });

    if (itemLocations == null)
      return res.send({
        status_code: 404,
        message:
          "Selected SKU is not available in both primary and secondary storage!",
        data: {},
      });
    else {
      const totalPickLocations = await getPickingLocationsCount(
        {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          route_id: route_id,
        },
        getPalletWithRequiredItem,
        getSosPickingQty.totalRemainingUnit,
        material_code,
        itemLocations.location_id
      );

      const pickedLocations = await cumulativePalletizationColl.aggregate([
        {
          $match: {
            company_code: company_code,
            plant_id: plant_id,
            delivery_date: delivery_date,
            route_id: route_id,
          },
        },
        { $unwind: "$items" },
        { $match: { "items.material_code": material_code } },
        { $unwind: "$items.carriers" },
        {
          $group: { _id: "$items.carriers.picked_location" },
        },
      ]);

      let location_no = 1;
      let locationMatch = false;

      pickedLocations.map((location) => {
        if (location._id == itemLocations.location_id) locationMatch = true;
      });

      if (locationMatch) location_no = pickedLocations.length;
      else location_no = pickedLocations.length + 1;

      let pick_qty = 0;
      let locationData = {};
      let remaining_qty = getSosPickingQty.picking_qty;
      const carrier_type = getSosPickingQty.carrier_type;
      const alreadyPickedCount = getSosPickingQty.alreadyPicked;

      // console.log("remaining - ", remaining_qty, alreadyPickedCount);

      const total_stock =
        uom == "KG"
          ? itemLocations.carrier_count * getWeightTolerance.qty_in_kg
          : uom == "PAC" || uom == "PAK"
          ? itemLocations.carrier_count * getWeightTolerance.qty_in_pack
          : itemLocations.carrier_count;

      if (total_stock < remaining_qty) {
        console.log("entered < ");

        pick_qty = itemLocations.carrier_count;

        locationData = pushLocationsV3(
          location_no,
          itemLocations,
          pick_qty,
          remaining_qty,
          getWeightTolerance.qty_in_kg,
          getWeightTolerance.qty_in_pack,
          true,
          carrier_type,
          uom,
          total_stock,
          alreadyPickedCount,
          getPalletWithRequiredItem[0].pallet_status,
          totalPickLocations
        );
      } else if (total_stock > remaining_qty) {
        console.log("entered > ");

        pick_qty =
          uom == "KG"
            ? remaining_qty / getWeightTolerance.qty_in_kg
            : uom == "PAC" || uom == "PAK"
            ? Math.floor(remaining_qty / getWeightTolerance.qty_in_pack)
            : remaining_qty;

        locationData = pushLocationsV3(
          location_no,
          itemLocations,
          pick_qty,
          remaining_qty,
          getWeightTolerance.qty_in_kg,
          getWeightTolerance.qty_in_pack,
          false,
          carrier_type,
          uom,
          total_stock,
          alreadyPickedCount,
          getPalletWithRequiredItem[0].pallet_status,
          totalPickLocations
        );
      } else if (total_stock == remaining_qty) {
        console.log("entered == ");
        pick_qty = itemLocations.carrier_count;

        locationData = pushLocationsV3(
          location_no,
          itemLocations,
          pick_qty,
          remaining_qty,
          getWeightTolerance.qty_in_kg,
          getWeightTolerance.qty_in_pack,
          true,
          carrier_type,
          uom,
          total_stock,
          alreadyPickedCount,
          getPalletWithRequiredItem[0].pallet_status,
          totalPickLocations
        );
      } else {
      }

      return res.send({
        status_code: 200,
        message: "SO item Pick location is available",
        data: locationData,
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        "Some error occurred while fetching location details for selected SKU for dispatch!",
    });
  }
};

const getPrimaryLocations = async (filter) => {
  return await secondaryStorageColl
    .findOne(filter, {
      _id: 0,
      rack_id: 1,
      column_id: 1,
      location_id: 1,
      total_stock: 1,
      carrier_count: 1,
      uom: 1,
      pallet_barcode: 1,
    })
    .sort({ _id: 1 });
};

exports.getPrimaryItemLocations = async (req, res) => {
  console.log("calling get picking item location api v3");
  const {
    company_code,
    plant_id,
    delivery_date,
    route_id,
    material_code,
    uom,
  } = req.query;
  try {
    if (
      !(
        company_code &&
        plant_id &&
        delivery_date &&
        route_id &&
        material_code &&
        uom
      )
    )
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters to proceed!",
      });

    const itemLocations = await getPrimaryLocations({
      company_code: company_code,
      plant_id: plant_id,
      material_code: material_code,
      rack_type: "primary",
    });

    // console.log("location - ", itemLocations);

    const getWeightTolerance = await db.product_weight_model.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        material_code: material_code,
      },
      { _id: 0, qty_in_kg: 1, qty_in_pack: 1, pieces_per_bin: 1 }
    );

    if (getWeightTolerance == null)
      return res.send({
        status_code: 404,
        message:
          "Weight tolerance is not available for the given material code!",
        data: {},
      });

    const getSosPickingQty = await getPickingQty(
      {
        company_code: company_code,
        plant_id: plant_id,
        delivery_date: delivery_date,
        material_no: material_code,
        route_id: route_id,
        // pending_qty: { $ne: 0 },
      },
      itemLocations != null ? itemLocations.location_id : "empty",
      getWeightTolerance,
      uom
    );

    // console.log("picking qty - ", getSosPickingQty);

    if (getSosPickingQty.picking_qty == 0)
      return res.status(200).send({
        status_code: 404,
        message:
          "Selected SKU item is already picked. Please go back and check again!",
        data: {},
      });

    if (itemLocations == null)
      return res.send({
        status_code: 404,
        message: "Selected SKU is not available in primary storage!",
        data: {},
      });
    else {
      const pickedLocations = await cumulativePalletizationColl.aggregate([
        {
          $match: {
            company_code: company_code,
            plant_id: plant_id,
            delivery_date: delivery_date,
            route_id: route_id,
          },
        },
        { $unwind: "$items" },
        { $match: { "items.material_code": material_code } },
        { $unwind: "$items.carriers" },
        {
          $group: { _id: "items.carriers.picked_location" },
        },
      ]);

      let location_no = 1;

      if (pickedLocations.length > 0)
        if (
          pickedLocations[pickedLocations.length - 1]._id ==
          itemLocations.location_id
        )
          location_no = pickedLocations.length;
        else if (
          pickedLocations[pickedLocations.length - 1]._id !=
          itemLocations.location_id
        )
          location_no = pickedLocations.length + 1;

      let pick_qty = 0;
      let locationData = {};
      let remaining_qty = getSosPickingQty.picking_qty;
      const carrier_type = getSosPickingQty.carrier_type;
      const alreadyPickedCount = getSosPickingQty.alreadyPicked;

      // console.log("remaining - ", remaining_qty, alreadyPickedCount);

      const total_stock =
        uom == "KG"
          ? itemLocations.carrier_count * getWeightTolerance.qty_in_kg
          : uom == "PAC" || uom == "PAK"
          ? itemLocations.carrier_count * getWeightTolerance.qty_in_pack
          : itemLocations.carrier_count;

      if (total_stock < remaining_qty) {
        console.log("entered < ");

        pick_qty = itemLocations.carrier_count;

        locationData = pushLocationsV2(
          location_no,
          itemLocations,
          pick_qty,
          remaining_qty,
          getWeightTolerance.qty_in_kg,
          getWeightTolerance.qty_in_pack,
          true,
          carrier_type,
          uom,
          total_stock,
          alreadyPickedCount
        );
      } else if (total_stock > remaining_qty) {
        console.log("entered > ");

        pick_qty =
          uom == "KG"
            ? remaining_qty / getWeightTolerance.qty_in_kg
            : uom == "PAC" || uom == "PAK"
            ? Math.floor(remaining_qty / getWeightTolerance.qty_in_pack)
            : remaining_qty;

        locationData = pushLocationsV2(
          location_no,
          itemLocations,
          pick_qty,
          remaining_qty,
          getWeightTolerance.qty_in_kg,
          getWeightTolerance.qty_in_pack,
          false,
          carrier_type,
          uom,
          total_stock,
          alreadyPickedCount
        );
      } else if (total_stock == remaining_qty) {
        console.log("entered == ");
        pick_qty = itemLocations.carrier_count;

        locationData = pushLocationsV2(
          location_no,
          itemLocations,
          pick_qty,
          remaining_qty,
          getWeightTolerance.qty_in_kg,
          getWeightTolerance.qty_in_pack,
          true,
          carrier_type,
          uom,
          total_stock,
          alreadyPickedCount
        );
      } else {
      }

      return res.send({
        status_code: 200,
        message: "SO item Pick location is available",
        data: locationData,
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        "Some error occurred while fetching location details for selected SKU for dispatch!",
    });
  }
};

exports.get_dispatch_details = async (req, res) => {
  let company_code = req.query.company_code;
  let plant_id = req.query.plant_id;
  let dispatch_date = req.query.dispatch_date;
  let route_id = req.query.route_id;

  if (!(company_code && dispatch_date && route_id && plant_id)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }

  try {
    let dispatch_data = await dispatch_details.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          dispatch_date: dispatch_date,
          route_id: route_id,
        },
      },
    ]);

    let status_message = dispatch_data.length
      ? "Dispatch details are available!"
      : "Dispatch details is empty!";

    return res.status(200).send({
      status_code: "200",
      status_message: status_message,
      data: dispatch_data,
    });
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some Error Occurred While Creating The Customer.",
    });
  }
};

const getCarrierDetails = async (filter) => {
  return await palletizationColl.aggregate([
    {
      $match: filter,
    },
    { $unwind: "$carrier_detail" },
    { $match: { "carrier_detail.carrier_status": { $ne: "REMOVED" } } }, // should be equal to status:"PRESENT"
    {
      $project: {
        _id: 0,
        carrier_detail: 1,
        item_code: 1,
        item_name: 1,
        uom: 1,
        sku_qty_in_kg: 1,
        sku_qty_in_pack: 1,
        pallet_status: 1,
      },
    },
  ]);
};
// not using
exports.dispatchPalletization = async (req, res) => {
  console.log("calling dispatch palletization api");
  const {
    company_code,
    plant_id,
    route_id,
    delivery_date,
    picking_location_id,
    picking_pallet_barcode,
    picking_qty,
    assigned_pallet_barcode,
    carrier_barcode,
    material_code,
    picked_by,
  } = req.body;
  try {
    if (
      !(
        company_code &&
        plant_id &&
        route_id &&
        delivery_date &&
        picking_location_id &&
        picking_pallet_barcode &&
        picking_qty &&
        assigned_pallet_barcode &&
        material_code
      )
    )
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    let mssge = "Carrier data added successfully";
    let status = 200;

    const checkAlreadyEntryHappened = await cumulativePalletizationColl.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        pallet_barcode: assigned_pallet_barcode,
        // route_id: route_id,
        // delivery_date: delivery_date,
        is_deleted: false,
        // palletization_status: { $nin: ["STACKED", "DISPATCH"] },
      }
    );

    if (!checkAlreadyEntryHappened) {
      console.log("entered if - no entry");
      // assign a new pallet here

      if (picking_pallet_barcode == assigned_pallet_barcode) {
        console.log("entered if - entire pallet");
        const carriers = await getCarrierDetails({
          company_code: company_code,
          plant_id: plant_id,
          location_id: picking_location_id,
          pallet_barcode_value: picking_pallet_barcode,
          // is_deleted: true,
        });

        console.log("carriers - ", carriers.length);

        if (carriers.length > 0) {
          if (carriers.length != +picking_qty)
            return res.send({
              status_code: 400,
              message: "Picking entire pallet is not allowed!",
            });

          // const getWeightTolerance = await db.product_weight_model.findOne(
          //   {
          //     company_code: company_code,
          //     plant_id: plant_id,
          //     material_code: material_code,
          //   },
          //   { _id: 0, qty_in_kg: 1 }
          // );

          let total_crate_weight = 0;
          let total_net_weight = 0;
          let total_gross_weight = 0;
          let carriersArr = [];

          for (let i = 0; i < carriers.length; i++) {
            total_crate_weight += carriers[i].carrier_detail.tare_weight;
            total_net_weight += carriers[i].carrier_detail.net_weight;
            total_gross_weight += carriers[i].carrier_detail.gross_weight;

            carriersArr.push({
              carrier_barcode: carriers[i].carrier_detail.carrier_barcode,
              crate_weight: carriers[i].carrier_detail.tare_weight,
              net_weight: carriers[i].carrier_detail.net_weight,
              gross_weight: carriers[i].carrier_detail.gross_weight,
            });
          }

          const palletData = {
            company_code: company_code,
            plant_id: plant_id,
            delivery_date: delivery_date,
            route_id: route_id,
            pallet_barcode: assigned_pallet_barcode,
            is_deleted: false,
            palletization_status: "STACKING",
            total_stacked_weight: total_gross_weight.toFixed(2),
            total_stacked_carriers: carriersArr.length,
            items: [
              {
                material_code: carriers[0].item_code,
                material_name: carriers[0].item_name,
                uom: carriers[0].uom,
                total_crate_weight: total_crate_weight.toFixed(2),
                total_net_weight: total_net_weight.toFixed(2),
                total_gross_weight: total_gross_weight.toFixed(2),
                total_carrier_count: carriersArr.length,
                carriers: carriersArr,
              },
            ],
            created_by: picked_by,
          };
          // adding entire pallet data
          await cumulativePalletizationColl.create(palletData);

          // removing entire carriers
          await palletizationColl.updateOne(
            {
              location_id: picking_location_id,
              pallet_barcode_value: picking_pallet_barcode,
              pallet_status: "Secondary_storage",
              is_deleted: false,
            },
            { $set: { "carrier_detail.$[x].carrier_status": "REMOVED" } },
            {
              arrayFilters: [{ "x.carrier_status": { $ne: "REMOVED" } }],
              multi: true,
            }
          );

          mssge = "Entire pallet carriers data added succefully";
        } else {
          // just in case
          mssge = "Carrier details not found";
          status = 404;
        }
      } else {
        console.log("entered else - assign pallet");

        // if not entire pallet then check and assign scanned empty pallet
        if (
          !(await palletMasterColl.findOne({
            company_code: company_code,
            plant_id: plant_id,
            pallet_id: assigned_pallet_barcode,
            palletization_status: "Unassigned",
            active_status: 1,
          }))
        ) {
          status = 400;
          mssge = "scanned pallet :" + pallet_barcode + " is already in use!";
        } else {
          await palletMasterColl.updateOne(
            {
              company_code: company_code,
              plant_id: plant_id,
              pallet_id: assigned_pallet_barcode,
              palletization_status: "Unassigned",
              active_status: 1,
            },
            { $set: { palletization_status: "Assigned" } }
          );

          await cumulativePalletizationColl.create({
            company_code: company_code,
            plant_id: plant_id,
            delivery_date: delivery_date,
            route_id: route_id,
            pallet_barcode: assigned_pallet_barcode,
            palletization_status: "ASSIGNED",
            total_stacked_weight: 0,
            total_stacked_carriers: 0,
            items: [],
            created_by: picked_by,
          });

          mssge = "Scanned pallet assigned successfully";
        }
      }
    } else {
      console.log("entered else - already assigned pallet is available!");

      const pallet_status = checkAlreadyEntryHappened.palletization_status;

      if (pallet_status == "STACKED" || pallet_status == "DISPATCH") {
        const str =
          pallet_status == "STACKED" ? "stacked" : "in dispatch area!";

        status = 403;
        mssge = "Scanned pallet is already " + str;
      } else {
        // not allowed to stack different route id materials in one pallet
        if (checkAlreadyEntryHappened.route_id != route_id)
          return res.send({
            status_code: 400,
            message:
              "Stacking different route materials in one pallet is not allowed!",
          });

        // already pallet is assigned
        const carrierInfo = await palletizationColl.findOne(
          {
            company_code: company_code,
            plant_id: plant_id,
            pallet_barcode_value: picking_pallet_barcode,
            location_id: picking_location_id,
            // is_deleted: false,
            "carrier_detail.carrier_barcode": carrier_barcode,
            // "carrier_detail.carrier_status": { $ne: "REMOVED" }, // check filter please
          },
          { _id: 0, "carrier_detail.$": 1, item_code: 1, item_name: 1, uom: 1 }
        );

        if (carrierInfo.carrier_detail[0].carrier_status == "REMOVED") {
          return res.send({
            status_code: 404,
            message: "scanned carrier is not in the picking location!",
          });
        }

        mssge = "Scanned carrier added successfully";

        // checking provided item present in items array
        const checkItemPresent = await cumulativePalletizationColl.findOne(
          {
            company_code: company_code,
            plant_id: plant_id,
            pallet_barcode: assigned_pallet_barcode,
            is_deleted: false,
            "items.material_code": material_code,
          },
          { "items.$": 1 }
        );

        // no data in items array
        if (
          checkAlreadyEntryHappened["items"].length == 0 ||
          checkItemPresent == null
        ) {
          let body = {
            material_code: carrierInfo.item_code,
            material_name: carrierInfo.item_name,
            uom: carrierInfo.uom,
            total_crate_weight: carrierInfo.carrier_detail[0].tare_weight,
            total_net_weight: carrierInfo.carrier_detail[0].net_weight,
            total_gross_weight: carrierInfo.carrier_detail[0].gross_weight,
            total_carrier_count: 1,
            carriers: [
              {
                carrier_barcode: carrierInfo.carrier_detail[0].carrier_barcode,
                crate_weight: carrierInfo.carrier_detail[0].tare_weight,
                net_weight: carrierInfo.carrier_detail[0].net_weight,
                gross_weight: carrierInfo.carrier_detail[0].gross_weight,
              },
            ],
          };

          // updating header
          await cumulativePalletizationColl.updateOne(
            {
              company_code: company_code,
              plant_id: plant_id,
              route_id: route_id,
              pallet_barcode: assigned_pallet_barcode,
              is_deleted: false,
            },
            {
              palletization_status: "STACKING",
              total_stacked_weight:
                carrierInfo.carrier_detail[0].gross_weight +
                checkAlreadyEntryHappened.total_stacked_weight,
              total_stacked_carriers: 1,
            }
          );

          //updating body
          await cumulativePalletizationColl.updateOne(
            {
              company_code: company_code,
              plant_id: plant_id,
              route_id: route_id,
              pallet_barcode: assigned_pallet_barcode,
              is_deleted: false,
            },
            { $push: { items: body } }
          );

          // removing entire the carriers
          await palletizationColl.updateOne(
            {
              location_id: picking_location_id,
              pallet_barcode_value: picking_pallet_barcode,
              pallet_status: "Secondary_storage",
              is_deleted: false,
              "carrier_detail.carrier_barcode": carrier_barcode,
            },
            { $set: { "carrier_detail.$.carrier_status": "REMOVED" } }
          );
        } else {
          // if already data present in items array

          console.log("entered else - already item has data");

          let total_crate_weight = 0;
          let total_net_weight = 0;
          let total_gross_weight = 0;
          let total_carrier_count = 0;

          for (let i = 0; i < checkAlreadyEntryHappened.items.length; i++) {
            if (
              checkAlreadyEntryHappened.items[i].material_code ==
              carrierInfo.item_code
            ) {
              total_crate_weight =
                checkAlreadyEntryHappened.items[i].total_crate_weight +
                carrierInfo.carrier_detail[0].tare_weight;

              total_net_weight =
                checkAlreadyEntryHappened.items[i].total_net_weight +
                carrierInfo.carrier_detail[0].net_weight;

              total_gross_weight =
                checkAlreadyEntryHappened.items[i].total_gross_weight +
                carrierInfo.carrier_detail[0].gross_weight;

              total_carrier_count =
                checkAlreadyEntryHappened.items[i].total_carrier_count + 1;
            }
          }

          // updating header
          await cumulativePalletizationColl.updateOne(
            {
              company_code: company_code,
              plant_id: plant_id,
              route_id: route_id,
              pallet_barcode: assigned_pallet_barcode,
              is_deleted: false,
              "items.material_code": carrierInfo.item_code,
            },
            {
              $set: {
                total_stacked_weight: (
                  checkAlreadyEntryHappened.total_stacked_weight +
                  carrierInfo.carrier_detail[0].gross_weight
                ).toFixed(2),
                total_stacked_carriers:
                  checkAlreadyEntryHappened.total_stacked_carriers + 1,
                "items.$.total_crate_weight": total_crate_weight.toFixed(2),
                "items.$.total_net_weight": total_net_weight.toFixed(2),
                "items.$.total_gross_weight": total_gross_weight.toFixed(2),
                "items.$.total_carrier_count": total_carrier_count,
              },
            }
          );

          //updating body
          await cumulativePalletizationColl.updateOne(
            {
              company_code: company_code,
              plant_id: plant_id,
              route_id: route_id,
              pallet_barcode: assigned_pallet_barcode,
              is_deleted: false,
              "items.material_code": carrierInfo.item_code,
            },
            {
              $push: {
                "items.$.carriers": {
                  carrier_barcode:
                    carrierInfo.carrier_detail[0].carrier_barcode,
                  crate_weight: carrierInfo.carrier_detail[0].tare_weight,
                  net_weight: carrierInfo.carrier_detail[0].net_weight,
                  gross_weight: carrierInfo.carrier_detail[0].gross_weight,
                },
              },
            }
          );

          // removing picked carrier
          await palletizationColl.updateOne(
            {
              location_id: picking_location_id,
              pallet_barcode_value: picking_pallet_barcode,
              pallet_status: "Secondary_storage",
              is_deleted: false,
              "carrier_detail.carrier_barcode": carrier_barcode,
            },
            { $set: { "carrier_detail.$.carrier_status": "REMOVED" } }
          );
        }
      }
    }

    return res.send({ status_code: 200, message: mssge });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        "Some error occurred while stacking cummulative picking materials!",
    });
  }
};

const getPalletInfo = async (
  company_code,
  plant_id,
  delivery_date,
  route_id,
  pallet_barcode
) => {
  let filter = {
    company_code: company_code,
    plant_id: plant_id,
    delivery_date: delivery_date,
    route_id: route_id,
    pallet_barcode: pallet_barcode,
    // palletization_status: { $in: ["ASSIGNED", "STACKING"] },
    is_deleted: false,
  };

  let project = {
    _id: 0,
    pallet_barcode: 1,
    palletization_status: 1,
    total_stacked_carriers: 1,
    total_stacked_weight: 1,
    items: 1,
  };

  const getPalletInfo = await cumulativePalletizationColl.findOne(
    filter,
    project
  );

  const materialsDetailArr = getPalletInfo.items.map((info) => {
    return {
      material_code: info.material_code,
      material_name: info.material_name,
      total_carriers_count: info.total_carrier_count,
      total_carriers_weight: info.total_gross_weight.toFixed(2),
    };
  });

  return {
    pallet_barcode: getPalletInfo.pallet_barcode,
    total_stacked_carriers: getPalletInfo.total_stacked_carriers,
    total_stacked_weight: getPalletInfo.total_stacked_weight.toFixed(2),
    materials_detail: materialsDetailArr,
    pallet_status: getPalletInfo.palletization_status,
  };
};

exports.dispatchPalletizationV2 = async (req, res) => {
  console.log("calling dispatch palletization api V2");
  const {
    company_code,
    plant_id,
    route_id,
    delivery_date,
    picking_location_id,
    picking_pallet_barcode,
    picking_qty,
    assigned_pallet_barcode,
    carrier_barcode,
    material_code,
    picked_by,
  } = req.body;
  try {
    if (
      !(
        company_code &&
        plant_id &&
        route_id &&
        delivery_date &&
        picking_location_id &&
        picking_pallet_barcode &&
        picking_qty &&
        assigned_pallet_barcode &&
        material_code
      )
    )
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    let mssge = "Carrier data added successfully";
    let status = 200;
    let picked_carriers = 0;
    let remaining_carriers = 0;

    const checkAlreadyEntryHappened = await cumulativePalletizationColl.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        pallet_barcode: assigned_pallet_barcode,
        // route_id: route_id,
        delivery_date: delivery_date,
        is_deleted: false,
        // palletization_status: { $nin: ["STACKED", "DISPATCH"] },
      }
    );

    if (!checkAlreadyEntryHappened) {
      console.log("entered if - no entry");

      // assign a new pallet here
      if (picking_pallet_barcode == assigned_pallet_barcode) {
        console.log("entered if - entire pallet");
        const carriers = await getCarrierDetails({
          company_code: company_code,
          plant_id: plant_id,
          location_id: picking_location_id,
          pallet_barcode_value: picking_pallet_barcode,
          // is_deleted: true,
        });

        console.log("carriers - ", carriers.length);

        if (carriers.length > 0) {
          if (carriers.length == +picking_qty) {
            const getWeightTolerance = await db.product_weight_model.findOne(
              {
                company_code: company_code,
                plant_id: plant_id,
                material_code: material_code,
              },
              { _id: 0, qty_in_kg: 1, pallet_capacity: 1 }
            );

            const pallet_status =
              getWeightTolerance.pallet_capacity == carriers.length
                ? "STACKED"
                : "STACKING";

            let total_crate_weight = 0;
            let total_net_weight = 0;
            let total_gross_weight = 0;
            let carriersArr = [];

            for (let i = 0; i < carriers.length; i++) {
              total_crate_weight += carriers[i].carrier_detail.tare_weight;
              total_net_weight += carriers[i].carrier_detail.net_weight;
              total_gross_weight += carriers[i].carrier_detail.gross_weight;

              carriersArr.push({
                carrier_barcode: carriers[i].carrier_detail.carrier_barcode,
                crate_weight: carriers[i].carrier_detail.tare_weight,
                net_weight: carriers[i].carrier_detail.net_weight,
                gross_weight: carriers[i].carrier_detail.gross_weight,
                picked_location: picking_location_id,
              });
            }

            const palletData = {
              company_code: company_code,
              plant_id: plant_id,
              delivery_date: delivery_date,
              route_id: route_id,
              pallet_barcode: assigned_pallet_barcode,
              is_deleted: false,
              palletization_status: pallet_status,
              total_stacked_weight: total_gross_weight.toFixed(2),
              total_stacked_carriers: carriersArr.length,
              items: [
                {
                  material_code: carriers[0].item_code,
                  material_name: carriers[0].item_name,
                  uom: carriers[0].uom,
                  total_crate_weight: total_crate_weight.toFixed(2),
                  total_net_weight: total_net_weight.toFixed(2),
                  total_gross_weight: total_gross_weight.toFixed(2),
                  total_carrier_count: carriersArr.length,
                  carriers: carriersArr,
                },
              ],
              created_by: picked_by,
            };
            // adding entire pallet data
            await cumulativePalletizationColl.create(palletData);

            // removing entire carriers
            await palletizationColl.updateOne(
              {
                location_id: picking_location_id,
                pallet_barcode_value: picking_pallet_barcode,
                pallet_status: "Secondary_storage",
                is_deleted: false,
              },
              { $set: { "carrier_detail.$[x].carrier_status": "REMOVED" } },
              {
                arrayFilters: [{ "x.carrier_status": { $ne: "REMOVED" } }],
                multi: true,
              }
            );

            const str =
              pallet_status == "STACKED"
                ? "and confirmed stacked"
                : "successfully";
            mssge = "Entire pallet data added " + str;

            picked_carriers = carriers.length;
          } else {
            status = 400;
            mssge =
              "Since picking qty is less than rack qty, taking entire pallet is not allowed!";
          }
        } else {
          // just in case
          mssge = "Carrier details not found";
          status = 404;
        }
      } else {
        console.log("entered else - assign pallet");

        // if not entire pallet then check and assign scanned empty pallet
        if (
          !(await palletMasterColl.findOne({
            company_code: company_code,
            plant_id: plant_id,
            pallet_id: assigned_pallet_barcode,
            palletization_status: "Unassigned",
            active_status: 1,
          }))
        ) {
          console.log("entred pallet already in use!");
          status = 400;
          mssge =
            "scanned pallet:" +
            assigned_pallet_barcode +
            " is already in use or wrong barcode!";
        } else {
          await palletMasterColl.updateOne(
            {
              company_code: company_code,
              plant_id: plant_id,
              pallet_id: assigned_pallet_barcode,
              palletization_status: "Unassigned",
              active_status: 1,
            },
            { $set: { palletization_status: "Assigned" } }
          );

          await cumulativePalletizationColl.create({
            company_code: company_code,
            plant_id: plant_id,
            delivery_date: delivery_date,
            route_id: route_id,
            pallet_barcode: assigned_pallet_barcode,
            palletization_status: "ASSIGNED",
            total_stacked_weight: 0,
            total_stacked_carriers: 0,
            items: [],
            created_by: picked_by,
          });

          mssge = "Scanned pallet assigned successfully";
          remaining_carriers = +picking_qty;
        }
      }
    } else {
      console.log("entered else - already assigned pallet is available!");

      const pallet_status = checkAlreadyEntryHappened.palletization_status;

      if (pallet_status == "STACKED" || pallet_status == "DISPATCH") {
        const str =
          pallet_status == "STACKED" ? "stacked!" : "in dispatch area!";

        status = pallet_status == "STACKED" ? 200 : 403;

        mssge = "Scanned pallet is already " + str;
      } else {
        // not allowed to stack different route id materials in one pallet
        if (checkAlreadyEntryHappened.route_id != route_id)
          return res.send({
            status_code: 400,
            message:
              "Stacking different route materials in one pallet is not allowed!",
          });

        // scanned a pallet to get only stacked information
        if (!carrier_barcode) {
          console.log("entered - no carrier barcode");

          mssge = "Scanned pallet details is available";

          let picking_location_carriers = 0;

          for (let i = 0; i < checkAlreadyEntryHappened.items.length; i++) {
            if (
              checkAlreadyEntryHappened.items[i].material_code == material_code
            ) {
              for (
                let j = 0;
                j < checkAlreadyEntryHappened.items[i].carriers.length;
                j++
              ) {
                if (
                  checkAlreadyEntryHappened.items[i].carriers[j]
                    .picked_location == picking_location_id
                ) {
                  picking_location_carriers += 1;
                }
              }
            }
          }

          picked_carriers = picking_location_carriers;
          remaining_carriers = +picking_qty - picked_carriers;
        } else {
          // already pallet is assigned
          const carrierInfo = await palletizationColl.findOne(
            {
              company_code: company_code,
              plant_id: plant_id,
              pallet_barcode_value: picking_pallet_barcode,
              location_id: picking_location_id,
              // is_deleted: false,
              "carrier_detail.carrier_barcode": carrier_barcode,
              // "carrier_detail.carrier_status": { $ne: "REMOVED" }, // check filter please
            },
            {
              _id: 0,
              "carrier_detail.$": 1,
              item_code: 1,
              item_name: 1,
              uom: 1,
            }
          );

          if (
            carrierInfo == null ||
            carrierInfo.carrier_detail[0].carrier_status == "REMOVED"
          ) {
            return res.send({
              status_code: 404,
              message:
                "scanned carrier is not in the picking location or wrong barcode!",
            });
          }

          mssge = "Scanned carrier:" + carrier_barcode + " added successfully";

          // checking provided item present in items array
          const checkItemPresent = await cumulativePalletizationColl.findOne(
            {
              company_code: company_code,
              plant_id: plant_id,
              pallet_barcode: assigned_pallet_barcode,
              is_deleted: false,
              "items.material_code": material_code,
            },
            { _id: 0, "items.$": 1 }
          );

          // no data in items array
          if (
            checkAlreadyEntryHappened["items"].length == 0 ||
            checkItemPresent == null
          ) {
            let body = {
              material_code: carrierInfo.item_code,
              material_name: carrierInfo.item_name,
              uom: carrierInfo.uom,
              total_crate_weight: carrierInfo.carrier_detail[0].tare_weight,
              total_net_weight: carrierInfo.carrier_detail[0].net_weight,
              total_gross_weight: carrierInfo.carrier_detail[0].gross_weight,
              total_carrier_count: 1,
              carriers: [
                {
                  carrier_barcode:
                    carrierInfo.carrier_detail[0].carrier_barcode,
                  crate_weight: carrierInfo.carrier_detail[0].tare_weight,
                  net_weight: carrierInfo.carrier_detail[0].net_weight,
                  gross_weight: carrierInfo.carrier_detail[0].gross_weight,
                  picked_location: picking_location_id,
                },
              ],
            };

            // updating header
            await cumulativePalletizationColl.updateOne(
              {
                company_code: company_code,
                plant_id: plant_id,
                route_id: route_id,
                pallet_barcode: assigned_pallet_barcode,
                is_deleted: false,
              },
              {
                palletization_status: "STACKING",
                total_stacked_weight:
                  carrierInfo.carrier_detail[0].gross_weight +
                  checkAlreadyEntryHappened.total_stacked_weight,
                total_stacked_carriers:
                  checkAlreadyEntryHappened.total_stacked_carriers + 1,
              }
            );

            //updating body
            await cumulativePalletizationColl.updateOne(
              {
                company_code: company_code,
                plant_id: plant_id,
                route_id: route_id,
                pallet_barcode: assigned_pallet_barcode,
                is_deleted: false,
              },
              { $push: { items: body } }
            );

            // removing entire the carriers
            await palletizationColl.updateOne(
              {
                location_id: picking_location_id,
                pallet_barcode_value: picking_pallet_barcode,
                pallet_status: "Secondary_storage",
                is_deleted: false,
                "carrier_detail.carrier_barcode": carrier_barcode,
              },
              { $set: { "carrier_detail.$.carrier_status": "REMOVED" } }
            );

            picked_carriers = 1;
            remaining_carriers = +picking_qty - 1;
          } else {
            // if already data present in items array

            console.log("entered else - already item has data");

            let total_crate_weight = 0;
            let total_net_weight = 0;
            let total_gross_weight = 0;
            let total_carrier_count = 0;
            let picking_location_carriers = 0;

            for (let i = 0; i < checkAlreadyEntryHappened.items.length; i++) {
              if (
                checkAlreadyEntryHappened.items[i].material_code ==
                carrierInfo.item_code
              ) {
                total_crate_weight =
                  checkAlreadyEntryHappened.items[i].total_crate_weight +
                  carrierInfo.carrier_detail[0].tare_weight;

                total_net_weight =
                  checkAlreadyEntryHappened.items[i].total_net_weight +
                  carrierInfo.carrier_detail[0].net_weight;

                total_gross_weight =
                  checkAlreadyEntryHappened.items[i].total_gross_weight +
                  carrierInfo.carrier_detail[0].gross_weight;

                total_carrier_count =
                  checkAlreadyEntryHappened.items[i].total_carrier_count + 1;

                for (
                  let j = 0;
                  j < checkAlreadyEntryHappened.items[i].carriers.length;
                  j++
                ) {
                  if (
                    checkAlreadyEntryHappened.items[i].carriers[j]
                      .picked_location == picking_location_id
                  ) {
                    picking_location_carriers += 1;
                  }
                }
              }
            }

            picked_carriers = picking_location_carriers + 1;
            remaining_carriers = +picking_qty - picked_carriers;

            if (picked_carriers > +picking_qty) {
              status = 400;
              mssge = "Already picked mentioned no. of carriers!";
            } else {
              // updating header
              await cumulativePalletizationColl.updateOne(
                {
                  company_code: company_code,
                  plant_id: plant_id,
                  route_id: route_id,
                  pallet_barcode: assigned_pallet_barcode,
                  is_deleted: false,
                  "items.material_code": carrierInfo.item_code,
                },
                {
                  $set: {
                    total_stacked_weight: (
                      checkAlreadyEntryHappened.total_stacked_weight +
                      carrierInfo.carrier_detail[0].gross_weight
                    ).toFixed(2),
                    total_stacked_carriers:
                      checkAlreadyEntryHappened.total_stacked_carriers + 1,
                    "items.$.total_crate_weight": total_crate_weight.toFixed(2),
                    "items.$.total_net_weight": total_net_weight.toFixed(2),
                    "items.$.total_gross_weight": total_gross_weight.toFixed(2),
                    "items.$.total_carrier_count": total_carrier_count,
                  },
                }
              );

              //updating body
              await cumulativePalletizationColl.updateOne(
                {
                  company_code: company_code,
                  plant_id: plant_id,
                  route_id: route_id,
                  pallet_barcode: assigned_pallet_barcode,
                  is_deleted: false,
                  "items.material_code": carrierInfo.item_code,
                },
                {
                  $push: {
                    "items.$.carriers": {
                      carrier_barcode:
                        carrierInfo.carrier_detail[0].carrier_barcode,
                      crate_weight: carrierInfo.carrier_detail[0].tare_weight,
                      net_weight: carrierInfo.carrier_detail[0].net_weight,
                      gross_weight: carrierInfo.carrier_detail[0].gross_weight,
                      picked_location: picking_location_id,
                    },
                  },
                }
              );

              // removing picked carrier
              await palletizationColl.updateOne(
                {
                  location_id: picking_location_id,
                  pallet_barcode_value: picking_pallet_barcode,
                  pallet_status: "Secondary_storage",
                  is_deleted: false,
                  "carrier_detail.carrier_barcode": carrier_barcode,
                },
                { $set: { "carrier_detail.$.carrier_status": "REMOVED" } }
              );
            }
          }
        }
      }
    }

    let getPalletDetails = {};
    if (status == 200) {
      getPalletDetails = await getPalletInfo(
        company_code,
        plant_id,
        delivery_date,
        route_id,
        assigned_pallet_barcode
      );
    }

    return res.send({
      status_code: status,
      message: mssge,
      data: {
        palletDetails: getPalletDetails,
        picked_carriers: picked_carriers,
        remaining_carriers: remaining_carriers,
      },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        "Some error occurred while stacking cummulative picking materials!",
    });
  }
};

// freeing rack and pallet after picking
const confirmPickedItem = async (
  company_code,
  plant_id,
  route_id,
  delivery_date,
  material_code,
  uom,
  picked_qty,
  location_id,
  pallet_barcode,
  picked_by
) => {
  console.log("entered - confirm items picked func");

  const session = await conn.startSession();
  session.startTransaction();

  // restricted acknowledge after palletization is done

  const getWeightTolerance = await db.product_weight_model.findOne(
    {
      company_code: company_code,
      plant_id: plant_id,
      material_code: material_code,
    },
    { _id: 0, qty_in_kg: 1, qty_in_pack: 1 }
  );

  const pickQty =
    uom == "KG" || (uom == "PAC" && getWeightTolerance.pieces_per_bin == 0)
      ? +picked_qty * getWeightTolerance.qty_in_kg
      : uom == "PAC" || uom == "PAK "
      ? +picked_qty * getWeightTolerance.qty_in_pack
      : +picked_qty;

  const getCarrierCount = await secondaryStorageColl.findOne(
    {
      company_code: company_code,
      plant_id: plant_id,
      location_id: location_id,
      pallet_barcode: pallet_barcode,
      rack_type: "secondary",
    },
    { _id: 0, carrier_count: 1, current_stock: 1 }
  );

  // if (getCarrierCount == null) {
  //   return res.send({
  //     status_code: 404,
  //     message:
  //       "Material pick confirmed already or no material found in selected location!",
  //   });
  // }

  let mssge = "Confirming item picking failed!";
  let status = 200;

  const checkAllPicked = await palletizationColl.aggregate([
    {
      $match: {
        company_code: company_code,
        plant_id: plant_id,
        pallet_barcode_value: pallet_barcode,
        pallet_status: "Secondary_storage",
        is_deleted: false,
        item_code: material_code,
        location_id: location_id,
      },
    },
    { $unwind: "$carrier_detail" },
    { $match: { "carrier_detail.carrier_status": "PRESENT" } },
    {
      $project: { _id: 0, "carrier_detail.carrier_status": 1 },
    },
  ]);

  if (+picked_qty == getCarrierCount.carrier_count || checkAllPicked == null) {
    //
    console.log("entered entire pallet or all picked");

    const updatePalletization = await palletizationColl.findOneAndUpdate(
      {
        company_code: company_code,
        plant_id: plant_id,
        pallet_barcode_value: pallet_barcode,
        pallet_status: "Secondary_storage",
        is_deleted: false,
        item_code: material_code,
        location_id: location_id,
      },
      {
        is_deleted: true,
      },
      { useFindAndModify: false, session }
    );

    if (updatePalletization != null) {
      console.log("entered update pallization");

      if (
        !(await cumulativePalletizationColl.findOne({
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          route_id: route_id,
          pallet_barcode: pallet_barcode,
          is_deleted: false,
        }))
      )
        await palletMasterColl.updateOne(
          {
            company_code: company_code,
            plant_id: plant_id,
            pallet_id: pallet_barcode,
            active_status: 1,
            // palletization_status: "", // may be we can go with "Secondary_storage"
          },
          {
            $set: { palletization_status: "Unassigned", updated_by: picked_by },
          },
          { session }
        );

      await secondaryStorageColl.deleteOne({
        company_code: company_code,
        plant_id: plant_id,
        location_id: location_id,
        material_code: material_code,
        rack_type: "secondary",
      });

      await rackColl.updateOne(
        {
          company_code: company_code,
          plant_id: plant_id,
          location_id: location_id,
          active_status: 1,
        },
        {
          $set: {
            locked: false,
            status: "unoccupied",
            updated_by: picked_by,
            locked_by: "",
          },
        },
        { session }
      );

      mssge = "Picking confirmed sucessfully";
    } else {
      status = 404;
      mssge = "No pallet or material found in rack location : " + location_id;
    }
  } else if (+picked_qty < getCarrierCount.carrier_count) {
    //
    const updatePickedCarriers = await secondaryStorageColl.findOneAndUpdate(
      {
        company_code: company_code,
        plant_id: plant_id,
        location_id: location_id,
        rack_type: "secondary",
      },
      {
        current_stock: (getCarrierCount.current_stock - pickQty).toFixed(2),
        carrier_count: getCarrierCount.carrier_count - +picked_qty,
      },
      { useFindAndModify: false, session }
    );

    mssge = "Picking confirmed sucessfully";
  } else {
    status = 400;
    mssge = "No. of carriers picked count is wrong!";
  }

  await session.commitTransaction();

  return {
    status_code: status,
    message: mssge,
  };
};

const confirmPickedItemV2 = async (
  company_code,
  plant_id,
  route_id,
  delivery_date,
  material_code,
  uom,
  picked_qty,
  location_id,
  pallet_barcode,
  storage,
  picked_by
) => {
  console.log("entered - confirm items picked func v2");

  // restricted acknowledge after palletization is done

  const getWeightTolerance = await db.product_weight_model.findOne(
    {
      company_code: company_code,
      plant_id: plant_id,
      material_code: material_code,
    },
    { _id: 0, qty_in_kg: 1, qty_in_pack: 1 }
  );

  const pickQty =
    uom == "KG" || (uom == "PAC" && getWeightTolerance.pieces_per_bin == 0)
      ? +picked_qty * getWeightTolerance.qty_in_kg
      : uom == "PAC" || uom == "PAK "
      ? +picked_qty * getWeightTolerance.qty_in_pack
      : +picked_qty;

  let getCarrierCount = null;

  if (storage == "Primary_storage") {
    getCarrierCount = await primaryStorageColl.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        location_id: location_id,
        pallet_barcode: pallet_barcode,
        rack_type: "primary",
      },
      { _id: 0, carrier_count: 1, total_stock: 1 }
    );
  } else {
    getCarrierCount = await secondaryStorageColl.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        location_id: location_id,
        pallet_barcode: pallet_barcode,
        rack_type: "secondary",
      },
      { _id: 0, carrier_count: 1, current_stock: 1 }
    );
  }

  const checkAllPicked = await palletizationColl.aggregate([
    {
      $match: {
        company_code: company_code,
        plant_id: plant_id,
        pallet_barcode_value: pallet_barcode,
        pallet_status: storage,
        is_deleted: false,
        item_code: material_code,
        location_id: location_id,
      },
    },
    { $unwind: "$carrier_detail" },
    { $match: { "carrier_detail.carrier_status": "PRESENT" } },
    {
      $project: { _id: 0, "carrier_detail.carrier_status": 1 },
    },
  ]);

  let picking_status = "";

  if (+picked_qty == getCarrierCount.carrier_count || checkAllPicked == null) {
    //
    console.log("entered entire pallet or all picked");

    picking_status = "Entire_Pallet";
  } else if (+picked_qty < getCarrierCount.carrier_count) {
    //
    let filter = {
      company_code: company_code,
      plant_id: plant_id,
      location_id: location_id,
      rack_type: { $in: ["secondary", "primary"] },
    };

    let storageUpdateResult = null;

    if (storage == "Primary_storage")
      storageUpdateResult = await primaryStorageColl.findOneAndUpdate(
        filter,
        {
          total_stock: (uom == "KG" ||
          (uom == "PAC" && getWeightTolerance.pieces_per_bin == 0)
            ? getCarrierCount.carrier_count * getWeightTolerance.qty_in_kg -
              +pickQty
            : uom == "PAC" || uom == "PAK "
            ? getCarrierCount.carrier_count * getWeightTolerance.qty_in_pack -
              +pickQty
            : getCarrierCount.total_stock - +pickQty
          ).toFixed(2),
          carrier_count: getCarrierCount.carrier_count - +picked_qty,
        },
        { useFindAndModify: false }
      );
    else {
      storageUpdateResult = await secondaryStorageColl.findOneAndUpdate(
        filter,
        {
          current_stock: (uom == "KG" ||
          (uom == "PAC" && getWeightTolerance.pieces_per_bin == 0)
            ? getCarrierCount.carrier_count * getWeightTolerance.qty_in_kg -
              +pickQty
            : uom == "PAC" || uom == "PAK "
            ? getCarrierCount.carrier_count * getWeightTolerance.qty_in_pack -
              +pickQty
            : getCarrierCount.current_stock - +pickQty
          ).toFixed(2),
          carrier_count: getCarrierCount.carrier_count - +picked_qty,
        },
        { useFindAndModify: false }
      );
      // console.log("check last carrier - ", storageUpdateResult);

      if (storageUpdateResult.carrier_count == 1)
        picking_status = "Last_Carrier";
      else
        return {
          status_code: 200,
          message: "Picking confirmed sucessfully",
        };
    }
  } else {
    return {
      status_code: 400,
      message: "No. of carriers picked count is wrong!",
    };
  }

  console.log("entered free rack and pallet");

  if (picking_status == "Entire_Pallet" || picking_status == "Last_Carrier") {
    const updatePalletization = await palletizationColl.findOneAndUpdate(
      {
        company_code: company_code,
        plant_id: plant_id,
        pallet_barcode_value: pallet_barcode,
        pallet_status: storage,
        is_deleted: false,
        item_code: material_code,
        location_id: location_id,
      },
      {
        is_deleted: true,
      },
      { useFindAndModify: false }
    );

    if (updatePalletization != null) {
      console.log("entered update palletization");

      const session = await conn.startSession();
      session.startTransaction();

      if (
        !(await cumulativePalletizationColl.findOne({
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          route_id: route_id,
          pallet_barcode: pallet_barcode,
          is_deleted: false,
        }))
      )
        if (picking_status == "Last_Carrier")
          await palletMasterColl.updateOne(
            {
              company_code: company_code,
              plant_id: plant_id,
              pallet_id: pallet_barcode,
              active_status: 1,
              palletization_status: storage,
            },
            {
              $set: {
                palletization_status: "Unassigned",
                updated_by: picked_by,
              },
            },
            { session }
          );

      const storageColl =
        storage == "Primary_storage"
          ? primaryStorageColl
          : secondaryStorageColl;

      await storageColl.deleteOne(
        {
          company_code: company_code,
          plant_id: plant_id,
          location_id: location_id,
          material_code: material_code,
          rack_type: { $in: ["secondary", "primary"] },
        },
        { session }
      );

      await rackColl.updateOne(
        {
          company_code: company_code,
          plant_id: plant_id,
          location_id: location_id,
          active_status: 1,
        },
        {
          $set: {
            locked: false,
            status: "unoccupied",
            updated_by: picked_by,
            locked_by: "",
          },
        },
        { session }
      );

      await session.commitTransaction();

      return {
        status_code: 200,
        message: "Picking confirmed sucessfully",
      };
    } else {
      return {
        status_code: 404,
        message:
          calling_from == "Entire_Pallet"
            ? "Picking confirmed, but failed to free rack!"
            : "Picking confirmed, but failed to free rack and pallet!",
      };
    }
  }
};

exports.dispatchPalletizationV3 = async (req, res) => {
  console.log("calling dispatch palletization api V3");
  const {
    company_code,
    plant_id,
    route_id,
    delivery_date,
    picking_location_id,
    picking_pallet_barcode,
    picking_qty,
    assigned_pallet_barcode,
    carrier_barcode,
    material_code,
    picked_by,
    uom,
  } = req.body;
  try {
    if (
      !(
        company_code &&
        plant_id &&
        route_id &&
        delivery_date &&
        picking_location_id &&
        picking_pallet_barcode &&
        picking_qty &&
        assigned_pallet_barcode &&
        material_code &&
        uom
      )
    )
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    const pickedCarriersCount = await cumulativePalletizationColl.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          route_id: route_id,
          delivery_date: delivery_date,
          // is_deleted: false,
          "items.material_code": material_code,
        },
      },
      { $unwind: "$items" },
      { $unwind: "$items.carriers" },
      { $match: { "items.carriers.picked_location": picking_location_id } },
      // { $count: "items" },
    ]);

    let mssge = "Carrier data added successfully";
    let status = 200;
    let picked_carriers = 0;
    let remaining_carriers = 0;

    const checkAlreadyEntryHappened = await cumulativePalletizationColl.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        pallet_barcode: assigned_pallet_barcode,
        // route_id: route_id,
        delivery_date: delivery_date,
        is_deleted: false,
        // palletization_status: { $nin: ["STACKED", "DISPATCH"] },
      }
    );

    if (!checkAlreadyEntryHappened) {
      console.log("entered if - no entry");

      // assign a new pallet here
      if (picking_pallet_barcode == assigned_pallet_barcode) {
        console.log("entered if - entire pallet");
        const carriers = await getCarrierDetails({
          company_code: company_code,
          plant_id: plant_id,
          location_id: picking_location_id,
          pallet_barcode_value: picking_pallet_barcode,
          is_deleted: false,
        });

        // console.log("carriers - ", carriers.length);

        if (carriers.length > 0) {
          if (carriers.length == +picking_qty) {
            const getWeightTolerance = await db.product_weight_model.findOne(
              {
                company_code: company_code,
                plant_id: plant_id,
                material_code: material_code,
              },
              { _id: 0, qty_in_kg: 1, pallet_capacity: 1 }
            );

            const pallet_status =
              getWeightTolerance.pallet_capacity == carriers.length
                ? "STACKED"
                : "STACKING";

            let total_crate_weight = 0;
            let total_net_weight = 0;
            let total_gross_weight = 0;
            let carriersArr = [];

            for (let i = 0; i < carriers.length; i++) {
              total_crate_weight += carriers[i].carrier_detail.tare_weight;
              total_net_weight += carriers[i].carrier_detail.net_weight;
              total_gross_weight += carriers[i].carrier_detail.gross_weight;

              carriersArr.push({
                carrier_barcode: carriers[i].carrier_detail.carrier_barcode,
                crate_weight: carriers[i].carrier_detail.tare_weight,
                net_weight: carriers[i].carrier_detail.net_weight,
                gross_weight: carriers[i].carrier_detail.gross_weight,
                picked_location: picking_location_id,
              });
            }

            const palletData = {
              company_code: company_code,
              plant_id: plant_id,
              delivery_date: delivery_date,
              route_id: route_id,
              pallet_barcode: assigned_pallet_barcode,
              is_deleted: false,
              palletization_status: pallet_status,
              total_stacked_weight: total_gross_weight.toFixed(2),
              total_stacked_carriers: carriersArr.length,
              items: [
                {
                  material_code: carriers[0].item_code,
                  material_name: carriers[0].item_name,
                  uom: uom,
                  total_crate_weight: total_crate_weight.toFixed(2),
                  total_net_weight: total_net_weight.toFixed(2),
                  total_gross_weight: total_gross_weight.toFixed(2),
                  total_carrier_count: carriersArr.length,
                  carriers: carriersArr,
                  sku_qty_in_kg: carriers[0].sku_qty_in_kg,
                  sku_qty_in_pack: carriers[0].sku_qty_in_pack,
                },
              ],
              created_by: picked_by,
            };
            // adding entire pallet data
            await cumulativePalletizationColl.create(palletData);

            //changing pallet status
            await palletMasterColl.updateOne(
              {
                company_code: company_code,
                plant_id: plant_id,
                pallet_id: assigned_pallet_barcode,
                palletization_status: "Secondary_storage",
              },
              {
                $set: {
                  palletization_status:
                    pallet_status == "STACKED" ? "Stacked" : "Stacking",
                  updated_by: picked_by,
                },
              }
            );

            // removing entire carriers
            await palletizationColl.updateOne(
              {
                location_id: picking_location_id,
                pallet_barcode_value: picking_pallet_barcode,
                pallet_status: "Secondary_storage",
                is_deleted: false,
              },
              { $set: { "carrier_detail.$[x].carrier_status": "REMOVED" } },
              {
                arrayFilters: [{ "x.carrier_status": { $ne: "REMOVED" } }],
                multi: true,
              }
            );

            const str =
              pallet_status == "STACKED"
                ? "and confirmed stacked"
                : "successfully";
            mssge = "Entire pallet data added " + str;

            picked_carriers = carriers.length;

            const confirmPicked = await confirmPickedItem(
              company_code,
              plant_id,
              route_id,
              delivery_date,
              material_code,
              uom,
              +picking_qty,
              picking_location_id,
              picking_pallet_barcode,
              picked_by
            );
          } else {
            status = 400;
            mssge = "Taking entire pallet is not allowed!";
          }
        } else {
          // just in case
          mssge = "Carrier details not found";
          status = 404;
        }
      } else {
        console.log("entered else - assign pallet");

        // if not entire pallet then check and assign scanned empty pallet
        if (
          !(await palletMasterColl.findOne({
            company_code: company_code,
            plant_id: plant_id,
            pallet_id: assigned_pallet_barcode,
            palletization_status: "Unassigned",
            active_status: 1,
          }))
        ) {
          console.log("entred pallet already in use!");
          status = 400;
          mssge =
            "scanned pallet:" +
            assigned_pallet_barcode +
            " is already in use or wrong barcode!";
        } else {
          await palletMasterColl.updateOne(
            {
              company_code: company_code,
              plant_id: plant_id,
              pallet_id: assigned_pallet_barcode,
              palletization_status: "Unassigned",
              active_status: 1,
            },
            { $set: { palletization_status: "Assigned" } }
          );

          await cumulativePalletizationColl.create({
            company_code: company_code,
            plant_id: plant_id,
            delivery_date: delivery_date,
            route_id: route_id,
            pallet_barcode: assigned_pallet_barcode,
            palletization_status: "ASSIGNED",
            total_stacked_weight: 0,
            total_stacked_carriers: 0,
            items: [],
            created_by: picked_by,
          });

          mssge = "Scanned pallet assigned successfully";

          picked_carriers = pickedCarriersCount.length;
          remaining_carriers = +picking_qty - picked_carriers;
        }
      }
    } else {
      console.log("entered else - already assigned pallet is available!");

      const pallet_status = checkAlreadyEntryHappened.palletization_status;

      if (pallet_status == "STACKED") {
        if (!carrier_barcode) {
          status = 200;
          mssge = "Scanned pallet details is available";

          picked_carriers = pickedCarriersCount.length;
          remaining_carriers = +picking_qty - picked_carriers;
        } else {
          status = 403;
          mssge = "Scanned pallet is already stacked!";
        }
      } else {
        // not allowed to stack different route id materials in one pallet
        if (checkAlreadyEntryHappened.route_id != route_id)
          return res.send({
            status_code: 400,
            message:
              "Stacking different route materials in one pallet is not allowed!",
          });

        // scanned a pallet to get only stacked information
        if (!carrier_barcode) {
          console.log("entered - no carrier barcode");

          mssge = "Scanned pallet details is available";

          picked_carriers = pickedCarriersCount.length;
          remaining_carriers = +picking_qty - picked_carriers;

          // console.log("check - ", pickedCarriersCount.length);
        } else {
          // already pallet is assigned
          const carrierInfo = await palletizationColl.findOne(
            {
              company_code: company_code,
              plant_id: plant_id,
              pallet_barcode_value: picking_pallet_barcode,
              location_id: picking_location_id,
              // is_deleted: false,
              "carrier_detail.carrier_barcode": carrier_barcode,
              // "carrier_detail.carrier_status": { $ne: "REMOVED" }, // check filter please
            },
            {
              _id: 0,
              "carrier_detail.$": 1,
              item_code: 1,
              item_name: 1,
              uom: 1,
              sku_qty_in_kg: 1,
              sku_qty_in_pack: 1,
            }
          );

          if (
            carrierInfo == null ||
            carrierInfo.carrier_detail[0].carrier_status == "REMOVED"
          ) {
            return res.send({
              status_code: 404,
              message:
                "scanned carrier is not in the picking location or wrong barcode!",
            });
          }

          mssge = "Scanned carrier:" + carrier_barcode + " added successfully";

          // checking provided item present in items array
          const checkItemPresent = await cumulativePalletizationColl.findOne(
            {
              company_code: company_code,
              plant_id: plant_id,
              pallet_barcode: assigned_pallet_barcode,
              is_deleted: false,
              "items.material_code": material_code,
            },
            { _id: 0, "items.$": 1 }
          );

          // no data in items array
          if (
            checkAlreadyEntryHappened["items"].length == 0 ||
            checkItemPresent == null
          ) {
            if (pickedCarriersCount.length == +picking_qty) {
              status = 400;
              mssge = "Already picked mentioned no. of carriers!";
            } else {
              let body = {
                material_code: carrierInfo.item_code,
                material_name: carrierInfo.item_name,
                uom: uom,
                total_crate_weight: carrierInfo.carrier_detail[0].tare_weight,
                total_net_weight: carrierInfo.carrier_detail[0].net_weight,
                total_gross_weight: carrierInfo.carrier_detail[0].gross_weight,
                total_carrier_count: 1,
                sku_qty_in_kg: carrierInfo.sku_qty_in_kg,
                sku_qty_in_pack: carrierInfo.sku_qty_in_pack,

                carriers: [
                  {
                    carrier_barcode:
                      carrierInfo.carrier_detail[0].carrier_barcode,
                    crate_weight: carrierInfo.carrier_detail[0].tare_weight,
                    net_weight: carrierInfo.carrier_detail[0].net_weight,
                    gross_weight: carrierInfo.carrier_detail[0].gross_weight,
                    picked_location: picking_location_id,
                  },
                ],
              };

              // updating header
              await cumulativePalletizationColl.updateOne(
                {
                  company_code: company_code,
                  plant_id: plant_id,
                  delivery_date: delivery_date,
                  route_id: route_id,
                  pallet_barcode: assigned_pallet_barcode,
                  is_deleted: false,
                },
                {
                  palletization_status: "STACKING",
                  total_stacked_weight:
                    carrierInfo.carrier_detail[0].gross_weight +
                    checkAlreadyEntryHappened.total_stacked_weight,
                  total_stacked_carriers:
                    checkAlreadyEntryHappened.total_stacked_carriers + 1,
                }
              );

              //updating body
              await cumulativePalletizationColl.updateOne(
                {
                  company_code: company_code,
                  plant_id: plant_id,
                  delivery_date: delivery_date,
                  route_id: route_id,
                  pallet_barcode: assigned_pallet_barcode,
                  is_deleted: false,
                },
                { $push: { items: body } }
              );

              // removing entire the carriers
              await palletizationColl.updateOne(
                {
                  location_id: picking_location_id,
                  pallet_barcode_value: picking_pallet_barcode,
                  pallet_status: "Secondary_storage",
                  is_deleted: false,
                  "carrier_detail.carrier_barcode": carrier_barcode,
                },
                { $set: { "carrier_detail.$.carrier_status": "REMOVED" } }
              );

              // updating masters
              await palletMasterColl.updateOne(
                {
                  company_code: company_code,
                  plant_id: plant_id,
                  pallet_id: assigned_pallet_barcode,
                  palletization_status: "Assigned",
                },
                {
                  $set: {
                    palletization_status: "Stacking",
                    updated_by: picked_by,
                  },
                }
              );

              picked_carriers = pickedCarriersCount.length + 1;
              remaining_carriers = +picking_qty - picked_carriers;

              const confirmPicked = await confirmPickedItem(
                company_code,
                plant_id,
                route_id,
                delivery_date,
                material_code,
                uom,
                1,
                picking_location_id,
                picking_pallet_barcode,
                picked_by
              );
            }
          } else {
            // if already data present in items array

            console.log("entered else - already item has data");

            let total_crate_weight = 0;
            let total_net_weight = 0;
            let total_gross_weight = 0;
            let total_carrier_count = 0;
            // let picking_location_carriers = 0;

            for (let i = 0; i < checkAlreadyEntryHappened.items.length; i++) {
              if (
                checkAlreadyEntryHappened.items[i].material_code ==
                carrierInfo.item_code
              ) {
                total_crate_weight =
                  checkAlreadyEntryHappened.items[i].total_crate_weight +
                  carrierInfo.carrier_detail[0].tare_weight;

                total_net_weight =
                  checkAlreadyEntryHappened.items[i].total_net_weight +
                  carrierInfo.carrier_detail[0].net_weight;

                total_gross_weight =
                  checkAlreadyEntryHappened.items[i].total_gross_weight +
                  carrierInfo.carrier_detail[0].gross_weight;

                total_carrier_count =
                  checkAlreadyEntryHappened.items[i].total_carrier_count + 1;
              }
            }

            picked_carriers = pickedCarriersCount.length + 1;
            remaining_carriers = +picking_qty - picked_carriers;

            if (picked_carriers > +picking_qty) {
              status = 400;
              mssge = "Already picked mentioned no. of carriers!";
            } else {
              // updating header
              await cumulativePalletizationColl.updateOne(
                {
                  company_code: company_code,
                  plant_id: plant_id,
                  delivery_date: delivery_date,
                  route_id: route_id,
                  pallet_barcode: assigned_pallet_barcode,
                  is_deleted: false,
                  "items.material_code": carrierInfo.item_code,
                },
                {
                  $set: {
                    total_stacked_weight: (
                      checkAlreadyEntryHappened.total_stacked_weight +
                      carrierInfo.carrier_detail[0].gross_weight
                    ).toFixed(2),
                    total_stacked_carriers:
                      checkAlreadyEntryHappened.total_stacked_carriers + 1,
                    "items.$.total_crate_weight": total_crate_weight.toFixed(2),
                    "items.$.total_net_weight": total_net_weight.toFixed(2),
                    "items.$.total_gross_weight": total_gross_weight.toFixed(2),
                    "items.$.total_carrier_count": total_carrier_count,
                  },
                }
              );

              //updating body
              await cumulativePalletizationColl.updateOne(
                {
                  company_code: company_code,
                  plant_id: plant_id,
                  delivery_date: delivery_date,
                  route_id: route_id,
                  pallet_barcode: assigned_pallet_barcode,
                  is_deleted: false,
                  "items.material_code": carrierInfo.item_code,
                },
                {
                  $push: {
                    "items.$.carriers": {
                      carrier_barcode:
                        carrierInfo.carrier_detail[0].carrier_barcode,
                      crate_weight: carrierInfo.carrier_detail[0].tare_weight,
                      net_weight: carrierInfo.carrier_detail[0].net_weight,
                      gross_weight: carrierInfo.carrier_detail[0].gross_weight,
                      picked_location: picking_location_id,
                    },
                  },
                }
              );

              // removing picked carrier
              await palletizationColl.updateOne(
                {
                  location_id: picking_location_id,
                  pallet_barcode_value: picking_pallet_barcode,
                  pallet_status: "Secondary_storage",
                  is_deleted: false,
                  "carrier_detail.carrier_barcode": carrier_barcode,
                },
                { $set: { "carrier_detail.$.carrier_status": "REMOVED" } }
              );

              const confirmPicked = await confirmPickedItem(
                company_code,
                plant_id,
                route_id,
                delivery_date,
                material_code,
                uom,
                1,
                picking_location_id,
                picking_pallet_barcode,
                picked_by
              );
            }
          }
        }
      }
    }

    let getPalletDetails = {};
    if (status == 200) {
      getPalletDetails = await getPalletInfo(
        company_code,
        plant_id,
        delivery_date,
        route_id,
        assigned_pallet_barcode
      );
    }

    return res.send({
      status_code: status,
      message: mssge,
      data: {
        palletDetails: getPalletDetails,
        picked_carriers: picked_carriers,
        remaining_carriers: remaining_carriers,
      },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        "Some error occurred while stacking cummulative picking materials!",
    });
  }
};

exports.dispatchPalletizationV4 = async (req, res) => {
  console.log("calling dispatch palletization api V4");
  const {
    company_code,
    plant_id,
    route_id,
    delivery_date,
    picking_location_id,
    picking_pallet_barcode,
    picking_qty,
    assigned_pallet_barcode,
    carrier_barcode,
    material_code,
    picked_by,
    uom,
  } = req.body;
  try {
    if (
      !(
        company_code &&
        plant_id &&
        route_id &&
        delivery_date &&
        picking_location_id &&
        picking_pallet_barcode &&
        picking_qty &&
        assigned_pallet_barcode &&
        material_code &&
        // picked_by &&
        uom
      )
    )
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    const pickedCarriersCount = await cumulativePalletizationColl.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          route_id: route_id,
          delivery_date: delivery_date,
          // is_deleted: false,
          "items.material_code": material_code,
        },
      },
      { $unwind: "$items" },
      { $unwind: "$items.carriers" },
      { $match: { "items.carriers.picked_location": picking_location_id } },
      // { $count: "items" },
    ]);

    let mssge = "Carrier data added successfully";
    let status = 200;
    let picked_carriers = 0;
    let remaining_carriers = 0;

    const checkAlreadyEntryHappened = await cumulativePalletizationColl.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        pallet_barcode: assigned_pallet_barcode,
        // route_id: route_id,
        delivery_date: delivery_date,
        is_deleted: false,
        // palletization_status: { $nin: ["STACKED", "DISPATCH"] },
      }
    );

    if (!checkAlreadyEntryHappened) {
      console.log("entered if - no entry");

      // assign a new pallet here
      if (picking_pallet_barcode == assigned_pallet_barcode) {
        console.log("entered if - entire pallet");
        const carriers = await getCarrierDetails({
          company_code: company_code,
          plant_id: plant_id,
          location_id: picking_location_id,
          pallet_barcode_value: picking_pallet_barcode,
          is_deleted: false,
        });

        // console.log("carriers - ", carriers.length);

        if (carriers.length > 0) {
          if (carriers.length == +picking_qty) {
            const getWeightTolerance = await db.product_weight_model.findOne(
              {
                company_code: company_code,
                plant_id: plant_id,
                material_code: material_code,
              },
              { _id: 0, qty_in_kg: 1, pallet_capacity: 1 }
            );

            const pallet_status =
              getWeightTolerance.pallet_capacity == carriers.length
                ? "STACKED"
                : "STACKING";

            let total_crate_weight = 0;
            let total_net_weight = 0;
            let total_gross_weight = 0;
            let carriersArr = [];

            for (let i = 0; i < carriers.length; i++) {
              total_crate_weight += carriers[i].carrier_detail.tare_weight;
              total_net_weight += carriers[i].carrier_detail.net_weight;
              total_gross_weight += carriers[i].carrier_detail.gross_weight;

              carriersArr.push({
                carrier_barcode: carriers[i].carrier_detail.carrier_barcode,
                crate_weight: carriers[i].carrier_detail.tare_weight,
                net_weight: carriers[i].carrier_detail.net_weight,
                gross_weight: carriers[i].carrier_detail.gross_weight,
                picked_location: picking_location_id,
              });
            }

            const palletData = {
              company_code: company_code,
              plant_id: plant_id,
              delivery_date: delivery_date,
              route_id: route_id,
              pallet_barcode: assigned_pallet_barcode,
              is_deleted: false,
              palletization_status: pallet_status,
              total_stacked_weight: total_gross_weight.toFixed(2),
              total_stacked_carriers: carriersArr.length,
              items: [
                {
                  material_code: carriers[0].item_code,
                  material_name: carriers[0].item_name,
                  uom: uom,
                  total_crate_weight: total_crate_weight.toFixed(2),
                  total_net_weight: total_net_weight.toFixed(2),
                  total_gross_weight: total_gross_weight.toFixed(2),
                  total_carrier_count: carriersArr.length,
                  carriers: carriersArr,
                  sku_qty_in_kg: carriers[0].sku_qty_in_kg,
                  sku_qty_in_pack: carriers[0].sku_qty_in_pack,
                },
              ],
              created_by: picked_by,
              updated_by: picked_by,
            };
            // adding entire pallet data
            await cumulativePalletizationColl.create(palletData);

            //changing pallet status
            await palletMasterColl.updateOne(
              {
                company_code: company_code,
                plant_id: plant_id,
                pallet_id: assigned_pallet_barcode,
                palletization_status: carriers[0].pallet_status,
              },
              {
                $set: {
                  palletization_status:
                    pallet_status == "STACKED" ? "Stacked" : "Stacking",
                  updated_by: picked_by,
                },
              }
            );

            // removing entire carriers
            await palletizationColl.updateOne(
              {
                location_id: picking_location_id,
                pallet_barcode_value: picking_pallet_barcode,
                pallet_status: carriers[0].pallet_status,
                is_deleted: false,
              },
              { $set: { "carrier_detail.$[x].carrier_status": "REMOVED" } },
              {
                arrayFilters: [{ "x.carrier_status": { $ne: "REMOVED" } }],
                multi: true,
              }
            );

            const str =
              pallet_status == "STACKED"
                ? "and confirmed stacked"
                : "successfully";
            mssge = "Entire pallet data added " + str;

            picked_carriers = carriers.length;

            const confirmPicked = await confirmPickedItemV2(
              company_code,
              plant_id,
              route_id,
              delivery_date,
              material_code,
              uom,
              +picking_qty,
              picking_location_id,
              picking_pallet_barcode,
              carriers[0].pallet_status,
              picked_by
            );
          } else {
            status = 400;
            mssge = "Taking entire pallet is not allowed!";
          }
        } else {
          // just in case
          mssge = "Carrier details not found";
          status = 404;
        }
      } else {
        console.log("entered else - assign pallet");

        // if not entire pallet then check and assign scanned empty pallet
        if (
          !(await palletMasterColl.findOne({
            company_code: company_code,
            plant_id: plant_id,
            pallet_id: assigned_pallet_barcode,
            palletization_status: "Unassigned",
            active_status: 1,
          }))
        ) {
          console.log("entred pallet already in use!");
          status = 400;
          mssge =
            "scanned pallet:" +
            assigned_pallet_barcode +
            " is already in use or wrong barcode!";
        } else {
          await palletMasterColl.updateOne(
            {
              company_code: company_code,
              plant_id: plant_id,
              pallet_id: assigned_pallet_barcode,
              palletization_status: "Unassigned",
              active_status: 1,
            },
            { $set: { palletization_status: "Assigned" } }
          );

          await cumulativePalletizationColl.create({
            company_code: company_code,
            plant_id: plant_id,
            delivery_date: delivery_date,
            route_id: route_id,
            pallet_barcode: assigned_pallet_barcode,
            palletization_status: "ASSIGNED",
            total_stacked_weight: 0,
            total_stacked_carriers: 0,
            items: [],
            created_by: picked_by,
            updated_by: picked_by,
          });

          mssge = "Scanned pallet assigned successfully";

          picked_carriers = pickedCarriersCount.length;
          remaining_carriers = +picking_qty - picked_carriers;
        }
      }
    } else {
      console.log("entered else - already assigned pallet is available!");

      const pallet_status = checkAlreadyEntryHappened.palletization_status;

      if (pallet_status == "STACKED") {
        if (!carrier_barcode) {
          status = 200;
          mssge = "Scanned pallet details is available";

          picked_carriers = pickedCarriersCount.length;
          remaining_carriers = +picking_qty - picked_carriers;
        } else {
          status = 403;
          mssge = "Scanned pallet is already stacked!";
        }
      } else {
        // not allowed to stack different route id materials in one pallet
        if (checkAlreadyEntryHappened.route_id != route_id)
          return res.send({
            status_code: 400,
            message:
              "Stacking different route materials in one pallet is not allowed!",
          });

        // scanned a pallet to get only stacked information
        if (!carrier_barcode) {
          console.log("entered - no carrier barcode");

          mssge = "Scanned pallet details is available";

          picked_carriers = pickedCarriersCount.length;
          remaining_carriers = +picking_qty - picked_carriers;

          // console.log("check - ", pickedCarriersCount.length);
        } else {
          // already pallet is assigned
          const carrierInfo = await palletizationColl.findOne(
            {
              company_code: company_code,
              plant_id: plant_id,
              pallet_barcode_value: picking_pallet_barcode,
              location_id: picking_location_id,
              // is_deleted: false,
              "carrier_detail.carrier_barcode": carrier_barcode,
              // "carrier_detail.carrier_status": { $ne: "REMOVED" }, // check filter please
            },
            {
              _id: 0,
              "carrier_detail.$": 1,
              item_code: 1,
              item_name: 1,
              uom: 1,
              sku_qty_in_kg: 1,
              sku_qty_in_pack: 1,
              pallet_status: 1,
            }
          );

          if (
            carrierInfo == null ||
            carrierInfo.carrier_detail[0].carrier_status == "REMOVED"
          ) {
            return res.send({
              status_code: 404,
              message:
                "scanned carrier is not in the picking location or wrong barcode!",
            });
          }

          mssge = "Scanned carrier:" + carrier_barcode + " added successfully";

          // checking provided item present in items array
          const checkItemPresent = await cumulativePalletizationColl.findOne(
            {
              company_code: company_code,
              plant_id: plant_id,
              pallet_barcode: assigned_pallet_barcode,
              is_deleted: false,
              "items.material_code": material_code,
            },
            { _id: 0, "items.$": 1 }
          );

          // no data in items array
          if (
            checkAlreadyEntryHappened["items"].length == 0 ||
            checkItemPresent == null
          ) {
            if (pickedCarriersCount.length == +picking_qty) {
              status = 400;
              mssge = "Already picked mentioned no. of carriers!";
            } else {
              let body = {
                material_code: carrierInfo.item_code,
                material_name: carrierInfo.item_name,
                uom: uom,
                total_crate_weight: carrierInfo.carrier_detail[0].tare_weight,
                total_net_weight: carrierInfo.carrier_detail[0].net_weight,
                total_gross_weight: carrierInfo.carrier_detail[0].gross_weight,
                total_carrier_count: 1,
                sku_qty_in_kg: carrierInfo.sku_qty_in_kg,
                sku_qty_in_pack: carrierInfo.sku_qty_in_pack,

                carriers: [
                  {
                    carrier_barcode:
                      carrierInfo.carrier_detail[0].carrier_barcode,
                    crate_weight: carrierInfo.carrier_detail[0].tare_weight,
                    net_weight: carrierInfo.carrier_detail[0].net_weight,
                    gross_weight: carrierInfo.carrier_detail[0].gross_weight,
                    picked_location: picking_location_id,
                  },
                ],
              };

              // updating header
              await cumulativePalletizationColl.updateOne(
                {
                  company_code: company_code,
                  plant_id: plant_id,
                  delivery_date: delivery_date,
                  route_id: route_id,
                  pallet_barcode: assigned_pallet_barcode,
                  is_deleted: false,
                },
                {
                  palletization_status: "STACKING",
                  total_stacked_weight:
                    carrierInfo.carrier_detail[0].gross_weight +
                    checkAlreadyEntryHappened.total_stacked_weight,
                  total_stacked_carriers:
                    checkAlreadyEntryHappened.total_stacked_carriers + 1,
                  updated_by: picked_by,
                }
              );

              //updating body
              await cumulativePalletizationColl.updateOne(
                {
                  company_code: company_code,
                  plant_id: plant_id,
                  delivery_date: delivery_date,
                  route_id: route_id,
                  pallet_barcode: assigned_pallet_barcode,
                  is_deleted: false,
                },
                { $push: { items: body } }
              );

              // removing entire the carriers
              await palletizationColl.updateOne(
                {
                  location_id: picking_location_id,
                  pallet_barcode_value: picking_pallet_barcode,
                  pallet_status: carrierInfo.pallet_status,
                  is_deleted: false,
                  "carrier_detail.carrier_barcode": carrier_barcode,
                },
                { $set: { "carrier_detail.$.carrier_status": "REMOVED" } }
              );

              // updating masters
              await palletMasterColl.updateOne(
                {
                  company_code: company_code,
                  plant_id: plant_id,
                  pallet_id: assigned_pallet_barcode,
                  palletization_status: "Assigned",
                },
                {
                  $set: {
                    palletization_status: "Stacking",
                    updated_by: picked_by,
                  },
                }
              );

              picked_carriers = pickedCarriersCount.length + 1;
              remaining_carriers = +picking_qty - picked_carriers;

              const confirmPicked = await confirmPickedItemV2(
                company_code,
                plant_id,
                route_id,
                delivery_date,
                material_code,
                uom,
                1,
                picking_location_id,
                picking_pallet_barcode,
                carrierInfo.pallet_status,
                picked_by
              );
            }
          } else {
            // if already data present in items array

            console.log("entered else - already item has data");

            let total_crate_weight = 0;
            let total_net_weight = 0;
            let total_gross_weight = 0;
            let total_carrier_count = 0;
            // let picking_location_carriers = 0;

            for (let i = 0; i < checkAlreadyEntryHappened.items.length; i++) {
              if (
                checkAlreadyEntryHappened.items[i].material_code ==
                carrierInfo.item_code
              ) {
                total_crate_weight =
                  checkAlreadyEntryHappened.items[i].total_crate_weight +
                  carrierInfo.carrier_detail[0].tare_weight;

                total_net_weight =
                  checkAlreadyEntryHappened.items[i].total_net_weight +
                  carrierInfo.carrier_detail[0].net_weight;

                total_gross_weight =
                  checkAlreadyEntryHappened.items[i].total_gross_weight +
                  carrierInfo.carrier_detail[0].gross_weight;

                total_carrier_count =
                  checkAlreadyEntryHappened.items[i].total_carrier_count + 1;
              }
            }

            picked_carriers = pickedCarriersCount.length + 1;
            remaining_carriers = +picking_qty - picked_carriers;

            if (picked_carriers > +picking_qty) {
              status = 400;
              mssge = "Already picked mentioned no. of carriers!";
            } else {
              // updating header
              await cumulativePalletizationColl.updateOne(
                {
                  company_code: company_code,
                  plant_id: plant_id,
                  delivery_date: delivery_date,
                  route_id: route_id,
                  pallet_barcode: assigned_pallet_barcode,
                  is_deleted: false,
                  "items.material_code": carrierInfo.item_code,
                },
                {
                  $set: {
                    updated_by: picked_by,
                    total_stacked_weight: (
                      checkAlreadyEntryHappened.total_stacked_weight +
                      carrierInfo.carrier_detail[0].gross_weight
                    ).toFixed(2),
                    total_stacked_carriers:
                      checkAlreadyEntryHappened.total_stacked_carriers + 1,
                    "items.$.total_crate_weight": total_crate_weight.toFixed(2),
                    "items.$.total_net_weight": total_net_weight.toFixed(2),
                    "items.$.total_gross_weight": total_gross_weight.toFixed(2),
                    "items.$.total_carrier_count": total_carrier_count,
                  },
                }
              );

              //updating body
              await cumulativePalletizationColl.updateOne(
                {
                  company_code: company_code,
                  plant_id: plant_id,
                  delivery_date: delivery_date,
                  route_id: route_id,
                  pallet_barcode: assigned_pallet_barcode,
                  is_deleted: false,
                  "items.material_code": carrierInfo.item_code,
                },
                {
                  $push: {
                    "items.$.carriers": {
                      carrier_barcode:
                        carrierInfo.carrier_detail[0].carrier_barcode,
                      crate_weight: carrierInfo.carrier_detail[0].tare_weight,
                      net_weight: carrierInfo.carrier_detail[0].net_weight,
                      gross_weight: carrierInfo.carrier_detail[0].gross_weight,
                      picked_location: picking_location_id,
                    },
                  },
                }
              );

              // removing picked carrier
              await palletizationColl.updateOne(
                {
                  location_id: picking_location_id,
                  pallet_barcode_value: picking_pallet_barcode,
                  pallet_status: carrierInfo.pallet_status,
                  is_deleted: false,
                  "carrier_detail.carrier_barcode": carrier_barcode,
                },
                { $set: { "carrier_detail.$.carrier_status": "REMOVED" } }
              );

              const confirmPicked = await confirmPickedItemV2(
                company_code,
                plant_id,
                route_id,
                delivery_date,
                material_code,
                uom,
                1,
                picking_location_id,
                picking_pallet_barcode,
                carrierInfo.pallet_status,
                picked_by
              );
            }
          }
        }
      }
    }

    let getPalletDetails = {};
    if (status == 200) {
      getPalletDetails = await getPalletInfo(
        company_code,
        plant_id,
        delivery_date,
        route_id,
        assigned_pallet_barcode
      );
    }

    return res.send({
      status_code: status,
      message: mssge,
      data: {
        palletDetails: getPalletDetails,
        picked_carriers: picked_carriers,
        remaining_carriers: remaining_carriers,
      },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        "Some error occurred while stacking cummulative picking materials!",
    });
  }
};

exports.getPickedBarcodes = async (req, res) => {
  console.log("calling get cumulative picked carrier barcodes api");
  const { company_code, plant_id, delivery_date, route_id, location_id } =
    req.query;
  try {
    if (!(company_code && plant_id && delivery_date && route_id && location_id))
      return res
        .status(400)
        .send({ status_code: 400, message: "Provide all required paramters!" });

    const getBarcodes = (
      await cumulativePalletizationColl.aggregate([
        {
          $match: {
            company_code: company_code,
            plant_id: plant_id,
            delivery_date: delivery_date,
            route_id: route_id,
          },
        },
        { $unwind: "$items" },
        { $unwind: "$items.carriers" },
        { $match: { "items.carriers.picked_location": location_id } },
        { $project: { _id: 0, "items.carriers.carrier_barcode": 1 } },
      ])
    ).map((code) => {
      return code.items.carriers.carrier_barcode;
    });

    let mssge = "Picked barcodes list available",
      status = 200;

    if (getBarcodes.length == 0) {
      mssge = "No carriers picked from " + location_id + " location!";
      status = 404;
    }

    return res.send({ status_code: status, message: mssge, data: getBarcodes });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        "Some error occurred while extracting cumultaive picked carrier barcodes!",
    });
  }
};

exports.confirmPalletStacked = async (req, res) => {
  console.log("calling confirm pallet stacked api");

  const { company_code, plant_id, pallet_barcode, delivery_date, route_id } =
    req.body;
  try {
    if (
      !(company_code && plant_id && pallet_barcode && delivery_date && route_id)
    )
      return res
        .status(400)
        .send({ status_code: 400, message: "Provide all required paramters!" });

    const filter = {
      company_code: company_code,
      plant_id: plant_id,
      delivery_date: delivery_date,
      route_id: route_id,
      pallet_barcode: pallet_barcode,
      palletization_status: "STACKING",
      is_deleted: false,
    };

    const palletStatus = await cumulativePalletizationColl.findOne(filter, {
      _id: 0,
      palletization_status: 1,
    });

    const confirmStacking = await cumulativePalletizationColl.findOneAndUpdate(
      filter,
      {
        palletization_status: "STACKED",
      },
      { useFindAndModify: false }
    );

    let mssge = "Pallet stacked successfully";
    let status = 200;

    if (confirmStacking != null) {
      await db.pallets.updateOne(
        {
          company_code: company_code,
          plant_id: plant_id,
          pallet_id: pallet_barcode,
          palletization_status: "Stacking",
        },
        { $set: { palletization_status: "Stacked" } }
      );
    } else {
      const getStatus = await cumulativePalletizationColl
        .findOne(
          {
            company_code: company_code,
            plant_id: plant_id,
            delivery_date: delivery_date,
            route_id: route_id,
            is_deleted: false,
          },
          {
            _id: 0,
            palletization_status: 1,
          }
        )
        .sort({ _id: -1 });

      if (getStatus != null) {
        switch (getStatus.palletization_status) {
          case "ASSIGNED":
            status = 400;
            mssge = "pallet is empty!";
            break;

          case "STACKED":
            status = 400;
            mssge = "pallet is already stacked!";
            break;

          default:
            status = 202;
            mssge = "Failed to confirm pallet stacked!";
            break;
        }
      } else {
        status = 404;
        mssge = "Pallet not found!";
      }
    }

    return res.send({ status_code: status, message: mssge });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while confirming the pallet is stacked!",
    });
  }
};

exports.stackedPallets = async (req, res) => {
  console.log("calling get cummulative picking stacked pallets api");
  const { company_code, plant_id, delivery_date, route_id } = req.query;
  try {
    if (!(company_code && plant_id && delivery_date && route_id))
      return res
        .status(400)
        .send({ status_code: 400, message: "Provide all required paramters!" });

    //  new  -   allocationPalletizationColl   old -  cumulativePalletizationColl

    const getStackedPallets = await allocationPalletizationColl.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          route_id: route_id,
          palletization_status: "STACKED",
          is_deleted: false,
        },
      },
      {
        $lookup: {
          from: "rapid_allocation_invoice_details",
          localField: "pallet_barcode",
          foreignField: "pallet_details.pallet_id",
          pipeline: [{ $limit: 1 }],
          as: "invoice_details",
        },
      },
      { $unwind: "$invoice_details" },
      {
        $project: {
          _id: 0,
          pallet_barcode: 1,
          location_id: 1,
          total_stacked_carriers: 1,
          total_stacked_weight: 1,
          palletization_status: 1,
          items: 1,
          updatedAt: 1,
        },
      },
      { $sort: { updatedAt: -1 } },
    ]);

    let mssge = "Stacked pallets data is available";
    let status = 200;
    let data = [];
    let final_response = [];
    if (getStackedPallets.length != 0) {
      let temp_array = getStackedPallets.map(async (element) => {
        element.status = true;
        for (let j = 0; j < element.items.length; j++) {
          let allocation_so_number = element.items[j].sales_order_no;
          let allocation_pallet_barcode = element.pallet_barcode;
          let invoice_length_for_so = await db.invoiceGenerate.aggregate([
            {
              $match: {
                plant_id: plant_id,
                company_code: company_code,
                sales_order_no: allocation_so_number,
                "pallet_details.pallet_id": allocation_pallet_barcode,
              },
            },
          ]);
          if (!invoice_length_for_so.length) {
            element.status = false;
          }
        }
        if (element.status) {
          final_response.push(element);
        }
      });
      await Promise.all(temp_array);
    }
    //console.log("final_response", final_response);

    if (final_response.length != 0) {
      data = final_response.map((item) => {
        return {
          company_code: company_code,
          plant_id: plant_id,
          route_id: route_id,
          delivery_date: delivery_date,
          pallet_barcode: item.pallet_barcode,
          palletization_status: item.palletization_status,
          total_stacked_carriers: item.total_stacked_carriers,
          total_stacked_weight: item.total_stacked_weight,
          material_details: item.items.map((obj) => {
            return {
              material_code: obj.material_code,
              material_name: obj.material_name,
              carriers_count: obj.total_carrier_count,
              carriers_weight: obj.total_gross_weight,
              uom: obj.uom,
              sales_order_no: obj.sales_order_no,
            };
          }),
          updated_at: moment(item.updatedAt)
            .tz("Asia/Kolkata")
            .format("DD-MM-YYYY HH:mm:ss"),
        };
      });
    } else {
      mssge = "No stacked pallets found!";
      status = 404;
    }

    return res.send({
      status_code: status,
      message: mssge,
      data: data,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting stacked pallets details!",
    });
  }
};

exports.list_sku_based_on_invoice = async (req, res) => {
  let company_code = req.query.company_code;
  let plant_id = req.query.plant_id;
  let route_id = req.query.route_id;
  let delivery_date = req.query.delivery_date;
  //let sales_order_no = req.query.sales_order_no;

  if (!(company_code && plant_id && route_id && delivery_date)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }

  try {
    let data = await invoice_generation.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          route_id: route_id,
          delivery_date: delivery_date,
        },
      },
      {
        $lookup: {
          from: "invoicemasters",
          localField: "invoice_no",
          foreignField: "invoiceDetails.invoiceNo",
          as: "invoice_item_details",
        },
      },
      {
        $project: {
          _id: 0,
          invoice_no: 1,
          "invoice_item_details.itemSupplied": 1,
        },
      },
      {
        $unwind: "$invoice_item_details",
      },
      {
        $unwind: "$invoice_item_details.itemSupplied",
      },
      {
        $group: {
          _id: "$invoice_item_details.itemSupplied.itemId",
          material_code: {
            $first: "$invoice_item_details.itemSupplied.itemId",
          },
          material_name: {
            $first: "$invoice_item_details.itemSupplied.itemName",
          },
          required_qty: { $sum: "$invoice_item_details.itemSupplied.quantity" },
          uom: { $first: "$invoice_item_details.itemSupplied.uom" },
        },
      },
      {
        $project: {
          _id: 0,
          material_code: 1,
          material_name: 1,
          uom: 1,
          required_qty: 1,
        },
      },
    ]);

    let status_message =
      data.length > 0 ? "Listing the records" : "No Data found";

    return res.status(200).send({
      status_code: "200",
      status_message: status_message,
      data: data,
    });
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some Error Occurred While Creating The Customer.",
    });
  }
};

exports.getEmptyRack = async (req, res) => {
  console.log("calling get free dispatch location");
  const { company_code, plant_id, route_id, delivery_date, pallet_barcode } =
    req.query;
  try {
    if (
      !(company_code && plant_id && route_id && delivery_date && pallet_barcode)
    )
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    const CheckAlreadyLocked = await allocationPalletizationColl.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        delivery_date: delivery_date,
        route_id: route_id,
        pallet_barcode: pallet_barcode,
        is_deleted: false,
        palletization_status: "STACKED",
      },
      {
        _id: 0,
        location_id: 1,
      }
    );

    let mssge = "Empty rack is available";
    let status = 200;
    let rackLocation = "";
    let lockedBy = "";

    // console.log("CheckAlreadyLocked",CheckAlreadyLocked)

    if (CheckAlreadyLocked && CheckAlreadyLocked.location_id != "") {
      const getWhoLocked = await rackColl.findOne(
        {
          company_code: company_code,
          plant_id: plant_id,
          rack_type: "dispatch",
          location_id: CheckAlreadyLocked.location_id,
        },
        { _id: 0, locked_by: 1, location_id: 1 }
      );
      // console.log(getWhoLocked);

      lockedBy = getWhoLocked.locked_by;
      rackLocation = getWhoLocked.location_id;
    } else {
      const routeIdArr = await getRoutes({
        company_code: company_code,
        plant_id: plant_id,
        delivery_date: delivery_date,
        route_id: { $ne: "" },
      });

      const prevIds = routeIdArr.slice(0, routeIdArr.indexOf(route_id));

      console.log("previds-", prevIds);

      const filter = {
        company_code: company_code,
        plant_id: plant_id,
        rack_type: "dispatch",
        active_status: 1,
        locked: false,
        status: "unoccupied",
      };

      if (prevIds.length == 0) {
        console.log("entered if - no previous route ids available");
        const getFirstAvailableLocation = await rackColl
          .findOne(filter, {
            _id: 0,
            location_id: 1,
            locked_by: 1,
          })
          .sort({ rack_id: 1, unit_no: 1, column_id: 1 });

        if (getFirstAvailableLocation == null)
          mssge = "No empty racks in dispatch area!";
        else rackLocation = getFirstAvailableLocation.location_id;
      } else {
        console.log("entered else -  previous route ids available");
        // const checkPrevPickingPending = await soAllocationColl.find(
        //   {
        //     company_code: company_code,
        //     plant_id: plant_id,
        //     route_id: route_id,
        //     delivery_date: delivery_date,
        //     pending_qty: { $ne: 0 },
        //     route_id: { $in: prevIds },
        //   },
        //   { pending_qty: 1, _id: 0 }
        // );

        // if (checkPrevPickingPending.length == 0) {
        const checkPickdSkuStacked = await allocationPalletizationColl.find({
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          route_id: { $in: prevIds },
          palletization_status: { $in: ["STACKED"] }, // status Assigned i have removed
          // palletization_status: { $in: ["STACKING", "STACKED"] }, // status Assigned i have removed
          // is_deleted: false,
        });

        if (checkPickdSkuStacked.length == 0) {
          const getFirstAvailableLocation = await rackColl
            .findOne(filter, {
              _id: 0,
              location_id: 1,
            })
            .sort({ rack_id: 1, unit_no: 1, column_id: 1 });

          if (getFirstAvailableLocation == null) {
            status = 404;
            mssge = "No empty racks in dispatch area!";
          } else rackLocation = getFirstAvailableLocation.location_id;
        } else {
          status = 400;
          mssge = "Please stack previously picked route SKU's";
        }
        //
        // }
        // else {
        //   status = 400;
        //   mssge = "Please first pick and stack SKU's for previous routes";
        // }
      }
    }

    return res.send({
      status_code: status,
      message: mssge,
      data: { rackLocation: rackLocation, lockedBy: lockedBy },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while finding the empty rack!",
    });
  }
};

const pending_nrml = async (filter) => {
  const pending_nrml_codes = (
    await soAllocationColl.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$material_code",
        },
      },
    ])
  ).map((code) => {
    return code._id;
  });

  const checkMaterialAvailable = await secondaryStorageColl.find({
    company_code: filter.company_code,
    plant_id: filter.plant_id,
    rack_type: "secondary",
    material_code: { $in: pending_nrml_codes },
  });

  let flag = 0;
  if (checkMaterialAvailable.length > 0) flag = 1;

  return flag;
};

const pending_ptl = async (pending_list, filter) => {
  let flag = 0;

  if (pending_list.length > 0) {
    const pending_ptl_codes = pending_list.map((code) => {
      return code.material_no;
    });

    const checkMaterialAvailable = await secondaryStorageColl.find({
      company_code: filter.company_code,
      plant_id: filter.plant_id,
      rack_type: "secondary",
      material_code: { $in: pending_ptl_codes },
    });

    if (checkMaterialAvailable.length > 0) flag = 1;
  }
  return flag;
};

const emptyRack = async (filter) => {
  return await rackColl
    .findOne(filter, {
      _id: 0,
      location_id: 1,
      locked_by: 1,
    })
    .sort({ rack_id: 1, unit_no: 1, column_id: 1, location_id: 1 });
};

const getNextInsertedFloorNo = async (filter) => {
  const lastplacedInFloor = await dispatchColl
    .findOne(filter)
    .sort({ _id: -1 });

  if (lastplacedInFloor == null) return "F1";
  else {
    let lastInsertedFloorNo = +lastplacedInFloor.location_id.substring(
      1,
      lastplacedInFloor.location_id.length
    );

    return "F" + ++lastInsertedFloorNo;
  }
};

exports.getEmptyRackV2 = async (req, res) => {
  console.log("calling get free dispatch location v2");
  const { company_code, plant_id, route_id, delivery_date, pallet_barcode } =
    req.query;
  try {
    if (
      !(company_code && plant_id && route_id && delivery_date && pallet_barcode)
    )
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    const CheckAlreadyLocked = await allocationPalletizationColl.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        delivery_date: delivery_date,
        route_id: route_id,
        pallet_barcode: pallet_barcode,
        is_deleted: false,
        palletization_status: "STACKED",
      },
      {
        _id: 0,
        location_id: 1,
        updated_by: 1,
      }
    );

    let mssge = "Empty rack is available";
    let status = 200;
    let rackLocation = "";
    let lockedBy = "";
    let isLoctionAvailable = true;

    // console.log("CheckAlreadyLocked",CheckAlreadyLocked)

    if (CheckAlreadyLocked && CheckAlreadyLocked.location_id != "") {
      // console.log(getWhoLocked);

      if (CheckAlreadyLocked.location_id.substring(0, 1) == "F") {
        lockedBy = CheckAlreadyLocked.updated_by;
        rackLocation = CheckAlreadyLocked.location_id;
        isLoctionAvailable = false;
      } else {
        const getWhoLocked = await rackColl.findOne(
          {
            company_code: company_code,
            plant_id: plant_id,
            rack_type: "dispatch",
            location_id: CheckAlreadyLocked.location_id,
          },
          { _id: 0, locked_by: 1, location_id: 1 }
        );

        lockedBy = getWhoLocked.locked_by;
        rackLocation = getWhoLocked.location_id;
      }
    } else {
      const filter = {
        company_code: company_code,
        plant_id: plant_id,
        rack_type: "dispatch",
        active_status: 1,
        locked: false,
        status: "unoccupied",
      };

      const lastPlacedPalletRouteId = await dispatchColl
        .findOne(
          {
            company_code: company_code,
            plant_id: plant_id,
            delivery_date: delivery_date,
            // route_id: route_id,
          },
          { _id: 0, delivery_date: 1, route_id: 1 }
        )
        .sort({ _id: -1 });

      if (lastPlacedPalletRouteId == null) {
        console.log("entered - if no pallet placed last");

        const getFirstAvailableLocation = await emptyRack(filter);

        if (getFirstAvailableLocation == undefined) {
          // status = 404;
          mssge = "No empty racks in dispatch area!";
          isLoctionAvailable = false;
          rackLocation = await getNextInsertedFloorNo({
            company: company_code,
            plant_id: plant_id,
            delivery_date: delivery_date,
            route_id: route_id,
            in_floor: true,
          });
        } else rackLocation = getFirstAvailableLocation.location_id;
        //
      } else {
        console.log("entered - if pallet already exit in rack");

        if (lastPlacedPalletRouteId.route_id == route_id) {
          const getFirstAvailableLocation = await emptyRack(filter);

          if (getFirstAvailableLocation == undefined) {
            // status = 404;
            mssge = "No empty racks in dispatch area!";
            isLoctionAvailable = false;
            rackLocation = await getNextInsertedFloorNo({
              company: company_code,
              plant_id: plant_id,
              delivery_date: delivery_date,
              route_id: route_id,
              in_floor: true,
            });
          } else rackLocation = getFirstAvailableLocation.location_id;
          //
        } else {
          const ptl_item_codes = await getPTLItemCodes({
            company_code: company_code,
            plant_id: plant_id,
            pieces_per_bin: { $gt: 0 },
          });

          const check_any_picking_pending = await Promise.all([
            pending_nrml({
              company_code: company_code,
              plant_id: plant_id,
              delivery_date: delivery_date,
              route_id: route_id,
              pending_qty: { $ne: 0 },
              material_no: { $nin: ptl_item_codes },
            }),

            getSoPickingQty_ptl(
              {
                company_code: company_code,
                plant_id: plant_id,
                delivery_date: delivery_date,
                route_id: route_id,
                material_no: { $in: ptl_item_codes },
              },
              "pending"
            ),
          ]);

          const result_ptl = pending_ptl(check_any_picking_pending[1], {
            company_code: company_code,
            plant_id: plant_id,
            delivery_date: delivery_date,
            route_id: route_id,
          });
          const result_nrml = check_any_picking_pending[0];

          if (result_nrml == 0 && result_ptl == 0) {
            const getFirstAvailableLocation = await emptyRack(filter);

            if (getFirstAvailableLocation == undefined) {
              // status = 404;
              mssge = "No empty racks in dispatch area!";
              isLoctionAvailable = false;
              rackLocation = await getNextInsertedFloorNo({
                company: company_code,
                plant_id: plant_id,
                delivery_date: delivery_date,
                route_id: route_id,
                in_floor: true,
              });
            } else rackLocation = getFirstAvailableLocation.location_id;
          } else {
            status = 400;
            isLoctionAvailable = false;
            mssge =
              "Different route id pallets are not allowed to stack together!";
          }
        }
      }
    }
    return res.send({
      status_code: status,
      message: mssge,
      data: {
        rackAvailable: isLoctionAvailable,
        rackLocation: rackLocation,
        lockedBy: lockedBy,
      },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while finding the empty rack!",
    });
  }
};

exports.lockAndUnlockRack = async (req, res) => {
  console.log("calling lock or unlock rack api");
  const {
    company_code,
    plant_id,
    delivery_date,
    route_id,
    location_id,
    pallet_barcode,
    lock,
    done_by,
  } = req.body;

  try {
    if (
      !(
        company_code &&
        plant_id &&
        delivery_date &&
        route_id &&
        location_id &&
        pallet_barcode &&
        lock != undefined &&
        done_by
      )
    )
      return res
        .status(400)
        .send({ status_code: 400, message: "Provide all required paramters!" });

    if (lock != true && lock != false)
      return res.status(400).send({
        status_code: 400,
        message: "Send only booleans as lock parameter",
      });

    // const rack_lock = lock == "true" ? true : false;

    let mssge = `Rack ${lock == true ? "locked" : "unlocked"} successfully`;
    let status = 200;

    const checkRack = await rackColl.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        location_id: location_id,
        active_status: 1,
        locked: lock,
      },
      { _id: 0, locked: 1 }
    );

    if (checkRack != null) {
      console.log();
      status = 400;
      mssge = `Rack is already ${lock == true ? "locked!" : "unlocked!"}`;
    } else {
      const filter = {
        company_code: company_code,
        plant_id: plant_id,
        delivery_date: delivery_date,
        route_id: route_id,
        pallet_barcode: pallet_barcode,
        is_deleted: false,
      };

      if (lock == true) {
        // lock
        await rackColl.updateOne(
          {
            company_code: company_code,
            plant_id: plant_id,
            location_id: location_id,
            active_status: 1,
          },
          {
            locked: lock,
            locked_by: done_by,
            updated_by: done_by,
            status: "occupied",
          }
        );

        await allocationPalletizationColl.updateOne(filter, {
          location_id: location_id,
          updated_by: done_by,
        });
      } else if (lock == false) {
        // unlock
        await rackColl.updateOne(
          {
            company_code: company_code,
            plant_id: plant_id,
            location_id: location_id,
            active_status: 1,
          },
          {
            locked: lock,
            locked_by: "",
            updated_by: done_by,
            status: "unoccupied",
          }
        );

        await allocationPalletizationColl.updateOne(filter, {
          location_id: "",
          updated_by: done_by,
        });
      }
    }

    return res.send({ status_code: status, message: mssge });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: `Some error occurred while ${
        lock == true ? "locking" : "unlocking"
      } the dispatch rack location!`,
    });
  }
};

exports.confirmPalletPlaced = async (req, res) => {
  console.log("calling confirm pallet is placed in dispatch area api");
  const {
    company_code,
    plant_id,
    delivery_date,
    route_id,
    location_id,
    pallet_barcode,
    items,
    confirmed_by,
  } = req.body;
  try {
    if (
      !(
        company_code &&
        plant_id &&
        delivery_date &&
        route_id &&
        location_id &&
        pallet_barcode &&
        items &&
        confirmed_by
      )
    )
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    if (items.length == 0)
      return res.status(400).send({
        status_code: 400,
        message: "Please provide valid invoice list!",
      });

    let invoiceGeneratedAllocatedQty = 0;

    items.map((total) => {
      invoiceGeneratedAllocatedQty += total.allocated_qty;
    });

    const totalAllocatedQty = await allocationPalletizationColl.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          route_id: route_id,
          pallet_barcode: pallet_barcode,
          is_deleted: false,
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$pallet_barcode",
          total_allocated_qty: { $sum: "$items.total_allocated_qty" },
        },
      },
    ]);

    if (totalAllocatedQty.length == 0)
      return res.send({ status_code: 404, message: "Pallet not found!" });

    if (
      invoiceGeneratedAllocatedQty != totalAllocatedQty[0].total_allocated_qty
    )
      return res.send({
        status_code: 400,
        message: "Invoice is not generated for the entire pallet!",
      });

    const confirmPalletPlaced =
      await allocationPalletizationColl.findOneAndUpdate(
        {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          route_id: route_id,
          pallet_barcode: pallet_barcode,
          is_deleted: false,
        },
        { palletization_status: "DISPATCH", updated_by: confirmed_by },
        { useFindAndModify: false }
      );

    let mssge = "Pallet placed is confirmed successfully";
    let status = 200;
    if (confirmPalletPlaced == null) {
      status = 500;
      mssge = "Failed to confirm pallet placed in dispatch rack!";
    } else {
      if (location_id.substring(0, 1) == "F") {
        const checkRackAvailable = await rackColl.findOne({
          company_code: company_code,
          plant_id: plant_id,
          rack_type: "dispatch",
          active_status: 1,
          locked: false,
          status: "unoccupied",
        });

        if (checkRackAvailable != null)
          return res.send({
            status_code: 400,
            message: "Please check empty rack available in dispatch area!",
          });
        else {
          await palletMasterColl.findOneAndUpdate(
            {
              company_code: company_code,
              plant_id: plant_id,
              pallet_id: pallet_barcode,
            },
            {
              $set: {
                palletization_status: "Dispatch_area",
                updated_by: confirmed_by,
              },
            }
          );

          await dispatchColl.create({
            company_code: company_code,
            plant_id: plant_id,
            status: "occupied",
            pallet_barcode: pallet_barcode,
            delivery_date: confirmPalletPlaced.delivery_date,
            route_id: confirmPalletPlaced.route_id,
            location_id: location_id,
            items: items,
            created_by: confirmed_by,
            updated_by: confirmed_by,
          });
        }
      } else {
        const rackDetails = await rackColl.findOne({
          company_code: company_code,
          plant_id: plant_id,
          rack_type: "dispatch",
          location_id: location_id,
          active_status: 1,
        });

        await palletMasterColl.findOneAndUpdate(
          {
            company_code: company_code,
            plant_id: plant_id,
            pallet_id: pallet_barcode,
          },
          {
            $set: {
              palletization_status: "Dispatch_area",
              updated_by: confirmed_by,
            },
          }
        );

        await dispatchColl.create({
          company_code: company_code,
          plant_id: plant_id,
          status: "occupied",
          unit_no: rackDetails.unit_no,
          rack_id: rackDetails.rack_id,
          level_id: rackDetails.level_id,
          column_id: rackDetails.column_id,
          location_id: rackDetails.location_id,
          pallet_barcode: pallet_barcode,
          delivery_date: confirmPalletPlaced.delivery_date,
          route_id: confirmPalletPlaced.route_id,
          items: items,
          created_by: confirmed_by,
          updated_by: confirmed_by,
        });
      }
    }

    return res.send({ status_code: status, message: mssge });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        "Some error occurred while confirming the pallet is placed in mentioned dispatch rack or location!",
    });
  }
};

const getPalletStackingDetails = async (filter, project) => {
  return await cumulativePalletizationColl.aggregate([
    { $match: filter },
    { $project: project },
  ]);
};

exports.getPalletDetails = async (req, res) => {
  console.log("calling get pallet stacking details");
  const {
    company_code,
    plant_id,
    delivery_date,
    route_id,
    pallet_barcode,
    material_code,
  } = req.query;
  try {
    if (!(company_code && plant_id && delivery_date && route_id))
      return res
        .status(400)
        .send({ status_code: 400, message: "Provide all required paramters!" });

    let data = [];
    let mssge = "Assigned or stacking pallets list is available";

    let filter = {
      company_code: company_code,
      plant_id: plant_id,
      delivery_date: delivery_date,
      route_id: route_id,
      palletization_status: { $in: ["ASSIGNED", "STACKING"] },
      is_deleted: false,
    };

    let project = {
      _id: 0,
      pallet_barcode: 1,
      palletization_status: 1,
      total_stacked_carriers: 1,
      total_stacked_weight: 1,
    };

    if (!pallet_barcode && !material_code) {
      data = await getPalletStackingDetails(filter, project);
      if (data.length == 0)
        mssge = "No pallets available in Assigned or Stacking status!";
      //
    } else if (pallet_barcode && !material_code) {
      filter.pallet_barcode = pallet_barcode;
      project = {
        _id: 0,
        pallet_barcode: 1,
        "items.material_code": 1,
        "items.material_name": 1,
        "items.uom": 1,
        "items.total_crate_weight": 1,
        "items.total_net_weight": 1,
        "items.total_gross_weight": 1,
        "items.total_carrier_count": 1,
      };

      mssge = "Materials data is available";

      data = await getPalletStackingDetails(filter, project);

      if (data.length == 0) mssge = "Materials data not available!";
    } else if (pallet_barcode && material_code) {
      filter.pallet_barcode = pallet_barcode;

      const getCarriers = await cumulativePalletizationColl.aggregate([
        { $match: filter },
        { $unwind: "$items" },
        { $match: { "items.material_code": material_code } },
        { $project: { _id: 0, "items.carriers": 1 } },
      ]);

      mssge = "Carriers data is available";

      data = getCarriers[0].items.carriers.reverse();

      if (data.length == 0) mssge = "Carriers data not available!";
    }

    res.send({ status_code: 200, message: mssge, data: data });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting",
    });
  }
};

exports.getInvoiceSkusPickLocation = async (req, res) => {
  console.log("calling get invoice based skus pick location api");
  const {
    company_code,
    plant_id,
    delivery_date,
    route_id,
    material_code,
    required_qty,
    uom,
  } = req.query;
  try {
    if (
      !(
        company_code &&
        plant_id &&
        route_id &&
        delivery_date &&
        material_code &&
        required_qty &&
        uom
      )
    )
      return res
        .status(400)
        .send({ status_code: 400, message: "Provide all required paramters!" });

    const getLocations = await cumulativePalletizationColl
      .find(
        {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          route_id: route_id,
          palletization_status: "DISPATCH",
          "items.material_code": material_code,
          "items.uom": uom,
        },
        {
          _id: 0,
          pallet_barcode: 1,
          location_id: 1,
          pallet_barcode: 1,
          "items.$": 1,
        }
      )
      .sort({ _id: 1 });

    let mssge = "Pick locations data is available";
    let status = 200;
    let data = [];

    if (getLocations.length == 0) {
      mssge = "Pick locations data is not available!";
      status = 404;
    } else {
      const getWeightTolerance = await db.product_weight_model.findOne(
        {
          company_code: company_code,
          plant_id: plant_id,
          material_code: material_code,
        },
        { _id: 0, qty_in_kg: 1 }
      );

      if (getWeightTolerance == null) {
        status = 404;
        mssge =
          "Weight tolerance is not available for the given material code!";
      } else {
        let remaining_qty =
          uom == "PAC" || uom == "PAK"
            ? +required_qty * getWeightTolerance.qty_in_kg
            : +required_qty;
        let picked_qty = 0;
        let loop_break = 0;

        for (let i = 0; i < getLocations.length; i++) {
          let rack_item_weight =
            uom == "PAC" || uom == "PAK" || uom == "KG"
              ? getLocations[i].items[0].total_carrier_count *
                getWeightTolerance.qty_in_kg
              : getLocations[i].items[0].total_carrier_count;

          if (remaining_qty > rack_item_weight) {
            //
            data.push({
              pick_location: getLocations[i].location_id,
              pallet_barcode: getLocations[i].pallet_barcode,
              rack_item_stack: rack_item_weight,
              pick_qty: rack_item_weight,
              units: getLocations[i].items[0].total_carrier_count,
            });

            picked_qty += rack_item_weight;
            remaining_qty -= rack_item_weight;
            //
          } else if (remaining_qty == rack_item_weight) {
            //
            data.push({
              pick_location: getLocations[i].location_id,
              pallet_barcode: getLocations[i].pallet_barcode,
              rack_item_stack: rack_item_weight,
              pick_qty: rack_item_weight,
              units: getLocations[i].items[0].total_carrier_count,
            });

            picked_qty += rack_item_weight;
            remaining_qty -= rack_item_weight;

            loop_break = 1;
            //
          } else if (remaining_qty < rack_item_weight) {
            //
            data.push({
              pick_location: getLocations[i].location_id,
              pallet_barcode: getLocations[i].pallet_barcode,
              rack_item_stack: rack_item_weight,
              pick_qty: remaining_qty,
              units:
                uom == "KG" || uom == "PAK" || uom == "PAC"
                  ? remaining_qty / getWeightTolerance.qty_in_kg
                  : remaining_qty,
            });

            picked_qty += remaining_qty;
            remaining_qty = 0;

            loop_break = 1;
            //
          } else {
          }

          if (loop_break == 1) break;
        }
      }
    }
    return res.send({ status_code: status, message: mssge, data: data });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        "Some error occurred while extracting invoice based pick locations!",
    });
  }
};

exports.confirmPalletRemovedFromRack = async (req, res) => {
  console.log("calling confirm pallet removed from dispatch area!");
  const {
    company_code,
    plant_id,
    delivery_date,
    route_id,
    pallet_barcode,
    location_id,
  } = req.body;
  try {
    if (
      !(
        company_code &&
        plant_id &&
        delivery_date &&
        route_id &&
        pallet_barcode &&
        location_id
      )
    )
      return res
        .status(400)
        .send({ status_code: 400, message: "Provide all required paramters!" });

    let mssge = "Provided rack location is freed now";
    let status = 200;

    const checkPallet = await cumulativePalletizationColl.findOne({
      company_code: company_code,
      plant_id: plant_id,
      route_id: route_id,
      delivery_date: delivery_date,
      pallet_barcode: pallet_barcode,
      palletization_status: "DISPATCH",
      is_deleted: false,
      location_id: location_id,
    });

    if (checkPallet != null) {
      const freeRack = await rackColl.findOneAndUpdate(
        {
          company_code: company_code,
          plant_id: plant_id,
          location_id: location_id,
          rack_type: "dispatch",
          active_status: 1,
          locked: true,
          status: "occupied",
        },
        {
          locked_by: "",
          locked: false,
          status: "unoccupied",
        },
        { useFindAndModify: false }
      );

      if (freeRack == null) {
        mssge = "Failed to free rack!";
        status = 500;
      }
    } else {
      mssge = "Failed to free rack!";
      status = 500;
    }

    return res.send({ status_code: status, message: mssge });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        "Some error occurred while confirming pallet removed from dispatch area",
    });
  }
};

exports.allocationWiseStackedPallets = async (req, res) => {
  console.log("calling get cummulative picking stacked pallets api");
  const { company_code, plant_id, delivery_date, route_id } = req.query;
  try {
    if (!(company_code && plant_id && delivery_date && route_id))
      return res
        .status(400)
        .send({ status_code: 400, message: "Provide all required paramters!" });

    const getStackedPallets = await allocationPalletizationColl.find(
      {
        company_code: company_code,
        plant_id: plant_id,
        delivery_date: delivery_date,
        route_id: route_id,
        palletization_status: "STACKED",
      },
      {
        _id: 0,
        pallet_barcode: 1,
        location_id: 1,
        total_stacked_carriers: 1,
        total_stacked_weight: 1,
        palletization_status: 1,
        items: 1,
      }
    );

    let mssge = "Stacked pallets data is available";
    let status = 200;
    let data = [];

    if (getStackedPallets.length != 0) {
      data = getStackedPallets.map((item) => {
        return {
          company_code: company_code,
          plant_id: plant_id,
          route_id: route_id,
          delivery_date: delivery_date,
          pallet_barcode: item.pallet_barcode,
          palletization_status: item.palletization_status,
          total_stacked_carriers: item.total_stacked_carriers,
          total_stacked_weight: item.total_stacked_weight,
          material_details: item.items.map((obj) => {
            return {
              material_code: obj.material_code,
              material_name: obj.material_name,
              carriers_count: obj.total_carrier_count,
              carriers_weight: obj.total_gross_weight,
              uom: obj.uom,
            };
          }),
        };
      });
    } else {
      mssge = "No stacked pallets found!";
      status = 404;
    }

    return res.send({
      status_code: status,
      message: mssge,
      data: data,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting stacked pallets details!",
    });
  }
};

exports.materialWisePallets = async (req, res) => {
  console.log("calling get material wise pallets api");
  const { company_code, plant_id, delivery_date, route_id, material_code } =
    req.query;
  try {
    if (
      !(company_code && plant_id && delivery_date && route_id && material_code)
    )
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    const pallets = await cumulativePalletizationColl.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          route_id: route_id,
          // is_deleted: false,
        },
      },
      { $unwind: "$items" },
      {
        $match: {
          "items.material_code": material_code,
        },
      },
      {
        $project: {
          _id: 0,
          pallet_barcode: 1,
          palletization_status: 1,
          "items.material_code": 1,
          "items.material_name": 1,
          "items.uom": 1,
          "items.total_carrier_count": 1,
          "items.total_net_weight": 1,
          "items.sku_qty_in_kg": 1,
          // "items.sku_qty_in_pack": 1,
        },
      },
    ]);
    let status = 200;
    let mssge = "Material wise pallets list available";
    let palletsArr = [];

    if (pallets.length == 0) {
      status = 404;
      mssge = "No pallets found!";
    } else {
      pallets.map((data) => {
        palletsArr.push({
          pallet_barcode: data.pallet_barcode,
          palletization_status: data.palletization_status,
          material_code: data.items.material_code,
          material_name: data.items.material_name,
          uom: data.items.uom,
          total_carrier_count: data.items.total_carrier_count,
          total_stacked_weight: (
            data.items.total_carrier_count * data.items.sku_qty_in_kg
          ).toFixed(2),
        });
      });
    }

    res.send({ status_code: status, message: mssge, data: palletsArr });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting material wise pallets!",
    });
  }
};

exports.checkPickingUser = async (req, res) => {
  console.log("calling check sku picking user api");
  const {
    company_code,
    plant_id,
    delivery_date,
    route_id,
    material_code,
    user_name,
    delete_previous_user,
  } = req.body;
  try {
    if (
      !(
        company_code &&
        plant_id &&
        delivery_date &&
        route_id &&
        material_code &&
        user_name &&
        delete_previous_user
      )
    )
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    if (delete_previous_user == "YES") {
    } else if (delete_previous_user == "NO") {
    } else
      return res.status(400).send({
        status_code: 400,
        message: "Expected 'YES' or 'NO' in 'delete_previous_user' parameter!",
      });

    let status = 200;
    let mssge = "You can proceed picking";

    const filter = {
      company_code: company_code,
      plant_id: plant_id,
      delivery_date: delivery_date,
      route_id: route_id,
      material_code: material_code,
    };

    const checkAlreadyPicking = await skuPickingUserColl.findOne(filter);

    console.log(checkAlreadyPicking);

    if (checkAlreadyPicking == null && delete_previous_user == "YES")
      return res.send({ status_code: 400, message: "Record not found!" });
    else if (checkAlreadyPicking == null && delete_previous_user == "NO") {
      // new user entry
      await skuPickingUserColl.create({
        company_code: company_code,
        plant_id: plant_id,
        delivery_date: delivery_date,
        route_id: route_id,
        material_code: material_code,
        user_name: user_name,
        user_name_list: [],
      });

      await skuPickingUserColl.updateOne(filter, {
        $push: { user_name_list: user_name },
      });

      mssge = "picking user added successfully. So, you can proceed picking";
      //
    } else if (
      delete_previous_user == "YES" &&
      checkAlreadyPicking.user_name == user_name
    ) {
      await skuPickingUserColl.updateOne(filter, {
        $set: { status: "INACTIVE" },
      });

      mssge = "User is inactive now";
    } else if (
      checkAlreadyPicking.status == "INACTIVE" &&
      delete_previous_user == "NO"
    ) {
      //may be new or same user for existing material. but the last user is inactive
      await skuPickingUserColl.updateOne(filter, {
        $set: { user_name: user_name, status: "ACTIVE" },
      });

      if (checkAlreadyPicking.user_name != user_name)
        await skuPickingUserColl.updateOne(filter, {
          $push: { user_name_list: user_name },
        });
      //
    } else if (
      checkAlreadyPicking.user_name != user_name &&
      delete_previous_user == "YES"
    ) {
      //force update user
      await skuPickingUserColl.updateOne(filter, {
        $set: { user_name: user_name },
      });

      await skuPickingUserColl.updateOne(filter, {
        $push: { user_name_list: user_name },
      });

      mssge = "Picking user changed successfully. So, you can proceed picking";
    } else if (
      checkAlreadyPicking.user_name != user_name &&
      delete_previous_user == "NO"
    ) {
      status = 422;
      mssge =
        "Already user : '" +
        checkAlreadyPicking.user_name +
        "' is picking for the selected material. Do you want to cancel '" +
        checkAlreadyPicking.user_name +
        "' and continue with picking?";
    } else {
      // same user no problem
    }

    return res.send({ status_code: status, message: mssge });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        "Some error occurred while checking or updating sku picking user in cumulative picking!",
    });
  }
};

exports.palletBarcodeList = async (req, res) => {
  console.log("calling get dispatch rack pallet ids");
  const { company_code, plant_id, delivery_date, route_id } = req.query;

  try {
    if (!(delivery_date && route_id))
      return res.status(400).send({
        status_code: 400,
        message: "Provide both delivery date and route id to proceed",
      });

    const palletIds = await dispatchColl
      .find(
        {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          route_id: route_id,
        },
        { _id: 0, pallet_barcode: 1 }
      )
      .sort({ _id: 1 });

    let status = 200;
    let mssge = "Pallet barcodes list available";
    if (palletIds.length == 0) {
      status = 404;
      mssge = "No pallets present in dispatch storage!";
    }

    return res
      .status(status)
      .send({ status_code: status, messge: mssge, data: palletIds });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        "Error occurred while extracting present pallet barcodes in dispatch rack!",
    });
  }
};

exports.customerNameList = async (req, res) => {
  console.log("calling get customer name list");
  const { company_code, plant_id, delivery_date, route_id, pallet_barcode } =
    req.query;

  try {
    if (
      !(company_code && plant_id && delivery_date && route_id && pallet_barcode)
    )
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    const customerList = (
      await dispatchColl.aggregate([
        {
          $match: {
            company_code: company_code,
            plant_id: plant_id,
            delivery_date: delivery_date,
            route_id: route_id,
            pallet_barcode: pallet_barcode,
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: {
              customer_name: "$items.customer_name",
              customer_code: "$items.customer_code",
            },
          },
        },
        { $sort: { "_id.customer_name": 1 } },
      ])
    ).map((custmr) => {
      return {
        customer_name: custmr._id.customer_name,
        customer_code: custmr._id.customer_code,
      };
    });

    let status = 200;
    let mssge = "Customer list is available";
    if (customerList.length == 0) {
      status = 404;
      mssge = "No record found!";
    }

    return res
      .status(status)
      .send({ status_code: status, messge: mssge, data: customerList });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        "Error occurred while extracting selected pallet customer names!",
    });
  }
};

exports.invoiceNoList = async (req, res) => {
  console.log("calling get invoice number list api");
  const {
    company_code,
    plant_id,
    delivery_date,
    route_id,
    pallet_barcode,
    customer_code,
  } = req.query;

  try {
    if (
      !(
        company_code &&
        plant_id &&
        delivery_date &&
        route_id &&
        pallet_barcode &&
        customer_code
      )
    )
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    const customerList = (
      await dispatchColl.aggregate([
        {
          $match: {
            company_code: company_code,
            plant_id: plant_id,
            delivery_date: delivery_date,
            route_id: route_id,
            pallet_barcode: pallet_barcode,
          },
        },
        { $unwind: "$items" },
        {
          $match: {
            "items.customer_code": customer_code,
          },
        },
        {
          $project: {
            _id: 0,
            "items.invoice_no": 1,
          },
        },
      ])
    ).map((no) => {
      return {
        invoice_no: no.items.invoice_no,
      };
    });

    let status = 200;
    let mssge = "SO number list is available";
    if (customerList.length == 0) {
      status = 404;
      mssge = "No record found!";
    }

    return res
      .status(status)
      .send({ status_code: status, messge: mssge, data: customerList });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        "Error occurred while extracting selected pallet customer names!",
    });
  }
};

exports.getRackBasedRouteIds = async (req, res) => {
  console.log("calling get dispatch rack based route id api");
  const { company_code, plant_id, delivery_date } = req.query;

  try {
    if (!(company_code && plant_id && delivery_date))
      return res
        .status(400)
        .send({ status_code: 400, message: "Provide required parameters!" });

    const routeIdList = (
      await dispatchColl.aggregate([
        {
          $match: {
            company_code: company_code,
            plant_id: plant_id,
            delivery_date: delivery_date,
          },
        },
        { $group: { _id: "$route_id" } },
      ])
    ).map((route) => {
      return { route_id: route._id };
    });

    let status = 200;
    let mssge = "Route ids list is available";

    if (routeIdList.length == 0) {
      status = 404;
      mssge = "Route ids not found!";
    }

    return res.status(status).send({
      status_code: status,
      message: mssge,
      data: routeIdList,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        "Some error occurred while extracting dispatch rack based route ids!",
    });
  }
};

////// below all are only for development purpose //////

exports.getCarriersBarcode = async (req, res) => {
  console.log("calling get carrier barcode list");
  const { company_code, plant_id, pallet_barcode, material_code, location_id } =
    req.query;

  console.log(
    company_code,
    plant_id,
    pallet_barcode,
    material_code,
    location_id
  );

  try {
    if (
      !(
        company_code &&
        plant_id &&
        material_code &&
        location_id &&
        pallet_barcode
      )
    )
      return res
        .status(400)
        .send({ status_code: 400, message: "Provide all required paramters!" });

    let mssge = "Carriers barcode list is available";
    let status = 200;

    filter.pallet_barcode = pallet_barcode;

    const getCarriers = await palletizationColl.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          location_id: location_id,
          pallet_barcode_value: pallet_barcode,
          item_code: material_code,
          pallet_status: { $in: ["Primary_storage", "Secondary_storage"] },
          is_deleted: false,
        },
      },
      { $unwind: "$carrier_detail" },
      { $match: { "carrier_detail.carrier_status": { $ne: "REMOVED" } } },
      { $project: { _id: 0, "carrier_detail.carrier_barcode": 1 } },
    ]);

    console.log(getCarriers);

    const data = getCarriers.map((code) => {
      return code.carrier_detail.carrier_barcode;
    });

    if (getCarriers == null) {
      (status = 404), (mssge = "Carrier barcode list is not available!");
    }

    res.send({ status_code: status, message: mssge, data: data });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting",
    });
  }
};

exports.deletePalletInfo = async (req, res) => {
  console.log("calling delete pallet info api");
  const { company_code, plant_id, pallet_barcode, material_code } = req.query;
  try {
    // if (!(company_code && plant_id && pallet_barcode))
    // return res
    //   .status(400)
    //   .send({ status_code: 400, message: "Provide all required paramters!" });

    console.log(company_code, material_code, plant_id);

    let pallets = [];
    let locations = [];

    (
      await db.primary_storage.find({
        company_code: company_code,
        plant_id: plant_id,
        material_code: material_code,
      })
    ).map((id) => {
      pallets.push(id.pallet_barcode);
      locations.push(id.location_id);
    });

    for (let i = 0; i < pallets.length; i++) {
      //
      let x = await db.palletization.findOne({
        pallet_barcode_value: pallets[i],
        location_id: locations[i],
        is_deleted: false,
      });

      if (x) {
        await db.palletization.updateOne(
          { pallet_barcode: pallets[i], is_deleted: false },
          { $set: { is_deleted: true } }
        );

        await db.primary_storage.deleteOne({
          location_id: locations[i],
          pallet_barcode: pallets[i],
        });

        await db.racks.updateOne(
          { location_id: locations[i] },
          { $set: { locked: false, status: "unoccupied", locked_by: "" } }
        );

        await db.pallets.updateOne(
          { pallet_id: pallets[i] },
          {
            $set: {
              palletization_status: "Unassigned",
            },
          }
        );
      }
    }

    // await db.primary_storage.deleteMany({
    //   company_code: company_code,
    //   plant_id: plant_id,
    //   material_code: material_code,
    // });

    return res.send({
      message: "sent successfully",
      data: { pallets: pallets, locations: locations },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while deleting pallet info",
    });
  }
};
