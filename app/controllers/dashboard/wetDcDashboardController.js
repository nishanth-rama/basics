const db = require("../../models");
const inward_po_table = db.inwardProcess;
const purchase_order_table = db.purchaseOrder;
const sales_order_table = db.soAllocation;
const moment_tz = require("moment-timezone");
const plant_table = db.plants;
const moment = require("moment");

exports.get_poType_onDateRange = async (req, res) => {
  var { company_code, plant_id, from_date, to_date } = req.query;

  if (!(company_code && plant_id && from_date && to_date)) {
    return res.send({
      status_code: 400,
      message: "Missing Parameters!",
    });
  }

  try {
    let purchase_order_type = await purchase_order_table.aggregate([
      {
        $match: {
          company_code: company_code,
          supplying_plant: plant_id,
          delivery_date: { $gte: from_date, $lte: to_date },
        },
      },
      {
        $group: {
          _id: "$po_document_type",
          po_doc_type: { $first: "$po_document_type" },
        },
      },
      {
        $project: {
          _id: 0,
          po_doc_type: 1,
        },
      },
    ]);
    console.log("purchase_order_type", purchase_order_type);
    if (purchase_order_type.length) {
      return res.status(200).send({
        status_code: 200,
        message: "po doc list!",
        data: purchase_order_type,
      });
    } else {
      return res
        .status(400)
        .send({ status_code: 400, message: "PO doc list not available" });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message || "Some error occurred while retrieving purchase order",
    });
  }
};

// exports.home_dashboard_report = async (req, res) => {
//   var { company_code, plant_id, from_date, to_date, po_doc_type } = req.query;

//   if (!(company_code && plant_id && from_date && to_date && po_doc_type)) {
//     return res.send({
//       status_code: 400,
//       message: "Missing Parameters!",
//     });
//   }

//   try {
//     if (po_doc_type == "All") {
//       po_doc_type = {
//         $ne: null,
//       };
//     }

//     // console.log("po_doc_type", po_doc_type);

//     let purchase_order_detail = await purchase_order_table.aggregate([
//       {
//         $match: {
//           company_code: company_code,
//           supplying_plant: plant_id,
//           po_document_type: po_doc_type,
//           delivery_date: { $gte: from_date, $lte: to_date },
//         },
//       },
//       {
//         $lookup: {
//           from: "rapid_grn_items",
//           localField: "po_number",
//           foreignField: "purchase_order",
//           as: "grn_detail",
//         },
//       },
//       {
//         $lookup: {
//           from: "rapid_purchase_order_inward_details",
//           localField: "po_number",
//           foreignField: "po_no",
//           as: "inward_detail",
//         },
//       },
//       {
//         $project: {
//           // grn_detail:1,
//           // inward_detail:1,
//           vendor_no: 1,
//           vendor_name: 1,
//           po_sum: { $sum: "$item.quantity" },
//           inward_po: { $sum: "$inward_detail.total_inwarded_qty" },
//           grn_po: { $sum: "$grn_detail.quantity" },
//         },
//       },
//     ]);

//     var final_array = [];

//     if (purchase_order_detail.length) {
//       let po_obj = {
//         po: 0,
//         vendor: 0,
//         total_po_qty: 0,
//       };
//       let inward_po_obj = {
//         po: 0,
//         total_inward_qty: 0,
//       };
//       let grn_po_obj = {
//         grn: 0,
//         total_grn_qty: 0,
//       };

//       let vendor_array = [];

//       for (let i = 0; i < purchase_order_detail.length; i++) {
//         po_obj.total_po_qty += purchase_order_detail[i].po_sum;
//         inward_po_obj.total_inward_qty += purchase_order_detail[i].inward_po;
//         grn_po_obj.total_grn_qty += purchase_order_detail[i].grn_po;

//         po_obj.po += 1;

//         // console.log("purchase_order_detail[i].inward_po",purchase_order_detail[i].inward_po,inward_po_obj.po)

//         if (purchase_order_detail[i].inward_po) {
//           inward_po_obj.po += 1;
//         }

//         if (purchase_order_detail[i].grn_po) {
//           grn_po_obj.grn += 1;
//         }

//         if (!vendor_array.includes(purchase_order_detail[i].vendor_no)) {
//           // console.log("prasdad")
//           vendor_array.push(purchase_order_detail[i].vendor_no);
//         }
//       }

//       po_obj.vendor = vendor_array.length;

//       po_obj.total_po_qty.toFixed(2);
//       inward_po_obj.total_inward_qty.toFixed(2);
//       grn_po_obj.total_grn_qty.toFixed(2);

//       var final_obj = {
//         po: po_obj,
//         inward_po: inward_po_obj,
//         grn: grn_po_obj,
//       };
//       // final_array.push(final_obj);

//       return res.send({ status_code: 200, data: final_obj });
//     } else {
//       return res.send({
//         status_code: 400,
//         message: "purchase order not available",
//       });
//     }
//   } catch (error) {
//     return res.status(500).send({
//       status_code: 500,
//       message:
//         error.message || "Some error occurred while retrieving purchase order",
//     });
//   }
// };

exports.home_dashboard_report = async (req, res) => {
  var { company_code, plant_id, from_date, to_date, po_doc_type } = req.query;

  if (!(company_code && plant_id && from_date && to_date && po_doc_type)) {
    return res.send({
      status_code: 400,
      message: "Missing Paramaters!",
    });
  }

  try {
    if (po_doc_type == "All") {
      po_doc_type = {
        $ne: null,
      };
    }

    // console.log("po_doc_type", po_doc_type);

    let purchase_order_detail = await purchase_order_table.aggregate([
      {
        $match: {
          company_code: company_code,
          supplying_plant: plant_id,
          po_document_type: po_doc_type,
          delivery_date: { $gte: from_date, $lte: to_date },
        },
      },
      {
        $lookup: {
          from: "rapid_grn_items",
          localField: "po_number",
          foreignField: "purchase_order",
          as: "grn_detail",
        },
      },
      {
        $lookup: {
          from: "rapid_purchase_order_inward_details",
          localField: "po_number",
          foreignField: "po_no",
          as: "inward_detail",
        },
      },
    ]);

    var final_array = [];

    // return res.send({ data: purchase_order_detail });

    if (purchase_order_detail.length) {
      let po_obj = {
        total_po_qty: 0,
        po: 0,
        vendor: 0,
        qty_kg: 0,
        qty_pac: 0,
        qty_ea: 0,
        other_uom: 0,
      };
      let inward_po_obj = {
        total_inward_qty: 0,
        po: 0,
        qty_kg: 0,
        qty_pac: 0,
        qty_ea: 0,
        other_uom: 0,
      };
      let grn_po_obj = {
        total_grn_qty: 0,
        grn: 0,
        qty_kg: 0,
        qty_pac: 0,
        qty_ea: 0,
        other_uom: 0,
      };

      let vendor_array = [];
      // data mapping start from here

      let abc = purchase_order_detail.map((itemm, idx) => {
        // if (itemm.vendor_no == "" || itemm.vendor_no == null) {
        //   po_obj.vendor += 1;
        // } else {
        //   po_obj.po += 1;
        // }
        if (itemm.po_number) {
          po_obj.po += 1;

          // po_obj.total_po_qty += purchase_order_detail[i].po_sum;

          if (!vendor_array.includes(itemm.vendor_no)) {
            // console.log("prasdad")
            vendor_array.push(itemm.vendor_no);
          }
          // for sum of item qty of po
          for (let i = 0; i < itemm.item.length; i++) {
            if (itemm.item[i].uom == "KG") {
              po_obj.qty_kg = po_obj.qty_kg + itemm.item[i].quantity;
            } else if (itemm.item[i].uom == "PAC") {
              po_obj.qty_pac = po_obj.qty_pac + itemm.item[i].quantity;
            } else if (itemm.item[i].uom == "EA") {
              po_obj.qty_ea = po_obj.qty_ea + itemm.item[i].quantity;
            } else {
              po_obj.other_uom = po_obj.other_uom + itemm.item[i].quantity;
            }
            po_obj.total_po_qty = po_obj.total_po_qty + itemm.item[i].quantity;
          }

          // for inward
          if (itemm.inward_detail.length) {
            inward_po_obj.po += 1;

            // getting qty sum
            for (let i = 0; i < itemm.inward_detail.length; i++) {
              // console.log(
              //   "hghg",
              //   itemm.inward_detail[i].total_inwarded_qty,
              //   itemm.inward_detail[i].uom
              // );
              if (itemm.inward_detail[i].uom == "KG") {
                inward_po_obj.qty_kg =
                  +(inward_po_obj.qty_kg +
                    itemm.inward_detail[i].total_inwarded_qty).toFixed(2);
              } else if (itemm.inward_detail[i].uom == "PAC") {
                inward_po_obj.qty_pac =
                  +(inward_po_obj.qty_pac +
                    itemm.inward_detail[i].total_inwarded_qty).toFixed(2);
              } else if (itemm.inward_detail[i].uom == "EA") {
                inward_po_obj.qty_ea =
                  +(inward_po_obj.qty_ea +
                    itemm.inward_detail[i].total_inwarded_qty).toFixed(2);
              } else {
                inward_po_obj.other_uom =
                  +(inward_po_obj.other_uom +
                    itemm.inward_detail[i].total_inwarded_qty).toFixed(2);
              }

              inward_po_obj.total_inward_qty = +(inward_po_obj.total_inward_qty +
                (itemm.inward_detail[i].total_inwarded_qty)).toFixed(2);
            }
          }

          // for grn
          if (itemm.grn_detail.length) {
            grn_po_obj.grn += 1;

            // getting qty sum
            for (let i = 0; i < itemm.grn_detail.length; i++) {
              if (itemm.grn_detail[i].base_unit_of_measure == "KG") {
                grn_po_obj.qty_kg =
                  +(grn_po_obj.qty_kg + Number(itemm.grn_detail[i].quantity)).toFixed(2);
              } else if (itemm.grn_detail[i].base_unit_of_measure == "PAC") {
                grn_po_obj.qty_pac =
                  +(grn_po_obj.qty_pac + Number(itemm.grn_detail[i].quantity)).toFixed(2);
              } else if (itemm.grn_detail[i].base_unit_of_measure == "EA") {
                grn_po_obj.qty_ea =
                  +(grn_po_obj.qty_ea + Number(itemm.grn_detail[i].quantity)).toFixed(2);
              } else {
                grn_po_obj.other_uom =
                  +(grn_po_obj.other_uom + Number(itemm.grn_detail[i].quantity)).toFixed(2);
              }

              grn_po_obj.total_grn_qty = +(grn_po_obj.total_grn_qty +(Number(itemm.grn_detail[i].quantity))).toFixed(2);
            }
          }
        }
      });
      // data mapping ends here
      po_obj.vendor = vendor_array.length;

      var final_obj = {
        po: po_obj,
        inward_po: inward_po_obj,
        grn: grn_po_obj,
      };
      final_array.push(final_obj);
      //   final_array.push({inward_po:inward_po_obj});
      //   final_array.push({grn_po:grn_po_obj});

      return res.send({ status_code: 200, data: final_obj });
    } else {
      return res
        .status(400)
        .send({ status_code: 400, message: "PO not available" });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message || "Some error occurred while retreiving purchase order",
    });
  }
};

// get po detail new screen

exports.get_purchase_order_list = async (req, res) => {
  try {
    var { company_code, plant_id, delivery_date, po_type, vendor_no, mode } =
      req.query;

    if (!(company_code && plant_id && delivery_date)) {
      return res
        .status(400)
        .send({ status_code: 400, message: "Missing Parameters!" });
    }


    let filter = {
      company_code: company_code,
      supplying_plant: plant_id,
      delivery_date: delivery_date,
      vendor_no:{$ne:""}
      // po_document_type: po_type ? po_type : { $ne: null },
      // vendor_no: vendor_no
      //   ? vendor_no != "all"
      //     ? vendor_no
      //     : { $ne: null }
      //   : { $ne: null },
    };

    let filter_auto = {
      company_code,plant_id,delivery_date,
      "inward_crate_details.mode":"autoinward"
    }


    if(po_type && po_type!="all"){
      filter.po_document_type = po_type
      filter_auto.po_type = po_type
    }

    if(vendor_no && vendor_no!="all"){
      filter.vendor_no = vendor_no
      filter_auto.supplier_no = vendor_no
    }


    // console.log("filter",filter);


    let purchase_order_detail = await purchase_order_table.aggregate([
      {
        $match: filter,
      },
   
      {
        $lookup: {
          from: "rapid_wdc_asn_details",
          localField: "po_number",
          foreignField: "po_number",
          pipeline: [
            {
              $unwind: "$item",
            },
            {
              $group: {
                _id: "$po_number",
                po_number: { $first: "$po_number" },
                po_type: { $first: "$po_type" },
                unique_asn: { $addToSet: "$item.inbound_delivery_number" }
              }
            },
            {
              $unwind: "$unique_asn"
            }
      
          ],
          as: "asn_detail",
        },
      },
 
      {
        $unwind: {
          path: "$asn_detail",
          preserveNullAndEmptyArrays: true,
        },
      },
       {
        $lookup: {
          from: "rapid_purchase_order_inward_details",
          localField: "po_number",
          foreignField: "po_no",
          let: { asn_number: "$asn_detail.unique_asn" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$inbound_delivery_number", "$$asn_number"],
                },
              },
            },
          ],
          as: "po_inward_detail",
        },
      },
      {
        $addFields: {
          inward_date1: { $arrayElemAt: ["$po_inward_detail.created_at", 0] },
        },
      },
      {
        $project: {
          _id: 0,
          mode:"vendor",
          po_number: "$po_number",
          po_document_type: "$po_document_type",
          asn_sto_number : {
            $cond: {
              if: "$asn_detail.unique_asn",
              then: "$asn_detail.unique_asn",
              else: "",
            },
          },
          asn_number: {
            $cond: {
              if: "$asn_detail.unique_asn",
              then: "$asn_detail.unique_asn",
              else: "",
            },
          },

          vendor_name: "$vendor_name",
          vendor_no: "$vendor_no",
          po_creation_date: {
            $dateToString: {
              date: {
                $dateFromString: {
                  dateString: "$document_date",
                },
              },
              format: "%d-%m-%Y",
              timezone: "Asia/Kolkata",
              onNull: "",
            },
          },
          inward_date: {
            $dateToString: {
              date: "$inward_date1",
              format: "%d-%m-%Y",
              timezone: "Asia/Kolkata",
              onNull: "",
            },
          },

          // asn_detail: 1,
        },
      },
      {
        $sort:{
          po_number:1,
          asn_number:1
        }
      }
    ]);

 
    let auto_inward_data = await get_autoInward_po_list(filter_auto)

   if(mode && mode == "auto"){
    var result_array = [...auto_inward_data]
   }
   else if(mode && mode == "vendor"){
    var result_array = [...purchase_order_detail]
   }
   else {
    var result_array = [...purchase_order_detail,...auto_inward_data]
   }
   
   

    if (result_array.length) {
      return res.send({ status_code: 200, data: result_array });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "Purchase Order list not available",
      });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message || "Some error occurred while retrieving purchase order",
    });
  }
};

// get data for po detail page
exports.get_po_detail = async (req, res) => {
  var {
    company_code,
    plant_id,
    delivery_date,
    po_doc_type,
    vendor_code,
    po_number,
    asn_number,
  } = req.query;

  if (!(company_code && plant_id && delivery_date && po_doc_type)) {
    return res.send({
      status_code: 400,
      message: "Missing Parameters!",
    });
  }

  try {
    let filter = {
      company_code: company_code,
      supplying_plant: plant_id,
      delivery_date: delivery_date,
      po_document_type: po_doc_type,
      // vendor_no: vendor_code ? vendor_code : { $ne: null },
      // po_number: po_number ? po_number : { $ne: null },
      // asn_number: asn_number
    };


    if (vendor_code) {
      filter.vendor_no = vendor_code
    }

    if (po_number) {
      filter.po_number = po_number
    }


    if (asn_number) {
      var filter_2 = {
        "item.inbound_delivery_number": asn_number,
        // "asn_detail.item.inbound_delivery_number": asn_number,
      };
    } else {
      var filter_2 = {};
    }

    if (asn_number) {
      var filter_3 = {
        "asn_detail.inbound_delivery_number": asn_number,
        // "asn_detail.item.inbound_delivery_number": asn_number,
      };
    } else {
      var filter_3 = {};
    }


    let purchase_order_detail = await purchase_order_table.aggregate([
      {
        $match: filter,
      },
      {
        $project: {
          company_code: 1,
          supplying_plant: 1,
          po_number: 1,
          po_document_type: 1,
          delivery_date: 1,
          vendor_no: 1,
          vendor_name: 1,
        },
      },
      {
        $lookup: {
          from: "rapid_wdc_asn_details",
          localField: "po_number",
          foreignField: "po_number",
          pipeline: [
            // {
            //   $project: {
            //     _id: 0,
            //     customer_code: 1,
            //     customer_name: 1,
            //     plant_id: 1,
            //     company_code: 1,
            //     item_details: 1,
            //   },
            // },
            {
              $unwind: "$item",
            },
            {
              $match: filter_2,
            },
            {
              $project: {
                po_number: 1,
                po_release_status: 1,
                vendor_acceptance_status: 1,
                // "item.inbound_delivery_number":1
                inbound_delivery_number: "$item.inbound_delivery_number",
              },
            },
          ],
          as: "asn_detail",
        },
      },
      {
        $match: filter_3,
      },
      // {
      //   $project :{
      //     po_number:1,
      //     po_document_type:1,
      //     company_code:1,
      //     vendor_no:1,
      //     delivery_date:1,
      //     supplying_plant:1,
      //     vendor_name:1,
      //     asn_no : "$asn_detail.item.inbound_delivery_number"
      //     // "asn_detail.item.inbound_delivery_number":1
      //   }
      // }
    ]);

    // console.log("purchase_order_detail", purchase_order_detail);
    if (purchase_order_detail.length) {
      return res.send({ status_code: 200, data: purchase_order_detail });
    } else {
      return res
        .status(400)
        .send({ status_code: 400, message: "PO not available" });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message || "Some error occurred while retrieving purchase order",
    });
  }
};

// get po item detail
exports.get_po_item_detail = async (req, res) => {
  var { company_code, plant_id, po_number } = req.query;

  if (!(company_code && plant_id && po_number)) {
    return res.send({
      status_code: 400,
      message: "Missing Parameters!",
    });
  }

  try {
    let purchase_order_detail = await purchase_order_table.aggregate([
      {
        $match: {
          company_code: company_code,
          supplying_plant: plant_id,
          po_number: po_number,
        },
      },
      {
        $project: {
          company_code: 1,
          supplying_plant: 1,
          po_number: 1,
          po_document_type: 1,
          delivery_date: 1,
          vendor_no: 1,
          vendor_name: 1,
          "item.material_no": 1,
          "item.material_description": 1,
          "item.quantity": 1,
          "item.uom": 1,
        },
      },
    ]);

    // console.log("purchase_order_detail", purchase_order_detail);
    if (purchase_order_detail.length) {
      return res.send({ status_code: 200, data: purchase_order_detail });
    } else {
      return res
        .status(400)
        .send({ status_code: 400, message: "PO not available" });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message || "Some error occurred while retrieving purchase order",
    });
  }
};

// get apis of inward po detail filter
//1. inward po doc type on po delivery date

exports.get_inward_PoType_on_DeliveryDate = async (req, res) => {
  var { company_code, plant_id, delivery_date } = req.query;

  if (!(company_code && plant_id && delivery_date)) {
    return res.send({
      status_code: 400,
      message: "Missing Parameters!",
    });
  }

  try {
    let inward_purchase_order_type = await inward_po_table.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
        },
      },
      {
        $group: {
          _id: "$po_type",
          po_type: { $first: "$po_type" },
        },
      },
      {
        $project: {
          _id: 0,
          po_type: 1,
        },
      },
    ]);

    if (inward_purchase_order_type.length) {
      return res.status(200).send({
        status_code: 200,
        message: "inward po type list!",
        data: inward_purchase_order_type,
      });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "inward po type list not available!",
      });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message || "Some error occurred while retrieving purchase order",
    });
  }
};

// 2. get inward vendor name on po delivery date and and po type
exports.get_inward_vendorName = async (req, res) => {
  var { company_code, plant_id, delivery_date, po_type } = req.query;

  if (!(company_code && plant_id && delivery_date && po_type)) {
    return res.send({
      status_code: 400,
      message: "Missing Parameters!",
    });
  }

  try {
    let inward_purchase_order = await inward_po_table.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          po_type: po_type,
        },
      },
      {
        $group: {
          _id: "$supplier_no",
          supplier_no: { $first: "$supplier_no" },
          supplier_name: { $first: "$supplier_name" },
        },
      },
      {
        $project: {
          _id: 0,
          vendor_no: "$supplier_no",
          vendor_name: "$supplier_name",
          // supplier_no: 1,
          // supplier_name: 1,
        },
      },
    ]);
    console.log("purchase_order_type", inward_purchase_order);
    if (inward_purchase_order.length) {
      return res.status(200).send({
        status_code: 200,
        message: "inward vendor list!",
        data: inward_purchase_order,
      });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "inward vendor list not available!",
      });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message ||
        "Some error occurred while retrieving purchase order data",
    });
  }
};

// 3. get inward po number on dd,po type and vendor name
exports.get_inward_poNumber = async (req, res) => {
  var { company_code, plant_id, delivery_date, po_type, vendor_no } = req.query;

  if (!(company_code && plant_id && delivery_date && po_type && vendor_no)) {
    return res.send({
      status_code: 400,
      message: "Missing Parameters!",
    });
  }

  try {
    let inward_purchase_order = await inward_po_table.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          po_type: po_type,
          supplier_no: vendor_no,
        },
      },
      {
        $group: {
          _id: "$po_no",
          po_no: { $first: "$po_no" },
        },
      },
      {
        $project: {
          _id: 0,
          po_no: 1,
        },
      },
    ]);
    // console.log("purchase_order_type", inward_purchase_order);
    if (inward_purchase_order.length) {
      return res.status(200).send({
        status_code: 200,
        message: "inward po list!",
        data: inward_purchase_order,
      });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "inward po list is not available!",
      });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message ||
        "Some error occurred while retrieving purchase order data",
    });
  }
};

//4.get asn number on dd,po type vendor name and po number
exports.get_inward_asnNumber = async (req, res) => {
  var {
    company_code,
    plant_id,
    // delivery_date,
    // po_type,
    // vendor_name,
    po_number,
  } = req.query;

  if (
    !(
      company_code &&
      // plant_id &&
      // delivery_date &&
      // po_type &&
      // vendor_name &&
      po_number
    )
  ) {
    return res.send({
      status_code: 400,
      message: "Missing Parameters!",
    });
  }

  try {
    let inward_purchase_order_asn = await db.asnDetails.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          po_number: po_number,
        },
      },
      {
        $project: {
          item: 0,
        },
      },
      // {
      //   $lookup: {
      //     from: "rapid_wdc_asn_details",
      //     localField: "po_no",
      //     foreignField: "po_number",
      //     as: "asn_detail",
      //   },
      // },
      // {
      //   $group: {
      //     _id: "$po_document_type",
      //     po_doc_type: { $first: "$po_document_type" },
      //   },
      // },
    ]);

    if (inward_purchase_order_asn.length) {
      return res.status(200).send({
        status_code: 200,
        message: "asn list!",
        data: inward_purchase_order_asn,
      });
    } else {
      return res
        .status(400)
        .send({ status_code: 400, message: "asn list not available!" });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message || "Some error occurred while retrieving purchase order",
    });
  }
};

exports.get_inward_po_detail = async (req, res) => {
  var {
    company_code,
    plant_id,
    delivery_date,
    po_doc_type,
    vendor_code,
    po_number,
    asn_number,
  } = req.query;

  if (!(company_code && plant_id && delivery_date && po_doc_type)) {
    return res.send({
      status_code: 400,
      message: "Missing Parameters!",
    });
  }

  try {
    let filter = {
      company_code: company_code,
      plant_id: plant_id,
      delivery_date: delivery_date,
      po_type: po_doc_type,
      supplier_no: vendor_code ? vendor_code : { $ne: null },
      po_no: po_number ? po_number : { $ne: null },
      // asn_number: asn_number
    };

    if (asn_number) {
      var filter_2 = {
        "item.inbound_delivery_number": asn_number,
        // "asn_detail.item.inbound_delivery_number": asn_number,
      };
    } else {
      var filter_2 = {};
    }

    if (asn_number) {
      var filter_3 = {
        "asn_detail.inbound_delivery_number": asn_number,
        // "asn_detail.item.inbound_delivery_number": asn_number,
      };
    } else {
      var filter_3 = {};
    }

    // if (asn_number) {
    //   var filter_2 = {
    //     "asn_detail.item.inbound_delivery_number": asn_number,
    //   };
    // } else {
    //   var filter_2 = {};
    // }

    // const today_date = moment_tz(new Date())
    //   .tz("Asia/Kolkata")
    //   .format("YYYY-MM-DD");

    // let yesterday = moment_tz().subtract(1, "days").format("YYYY-MM-DD");

    let inward_purchase_order_detail = await inward_po_table.aggregate([
      {
        $match: filter,
      },
      {
        $sort: {
          created_at: 1,
        },
      },
      {
        $group: {
          _id: "$po_no",
          po_no: { $first: "$po_no" },
          company_code: { $first: "$company_code" },
          plant_id: { $first: "$plant_id" },
          po_type: { $first: "$po_type" },
          vendor_code: { $first: "$supplier_no" },
          vendor_name: { $first: "$supplier_name" },
          // inward_createdAt: {
          //   $push: {
          //     date: { $toDate: "$created_at" },
          //   },
          // },
          inward_createdAt: {
            $push: {
              date: {
                $dateToString: {
                  date: "$created_at",
                  format: "%d-%m-%Y",
                  timezone: "Asia/Kolkata",
                },
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "rapid_wdc_asn_details",
          localField: "po_no",
          foreignField: "po_number",
          pipeline: [
            {
              $unwind: "$item",
            },
            {
              $match: filter_2,
            },
            {
              $project: {
                po_number: 1,
                po_release_status: 1,
                vendor_acceptance_status: 1,
                // "item.inbound_delivery_number":1
                inbound_delivery_number: "$item.inbound_delivery_number",
              },
            },
          ],
          as: "asn_detail",
        },
      },
      // {
      //   $match: filter_2,
      // },
      {
        $match: filter_3,
      },
      {
        $project: {
          po_no: 1,
          company_code: 1,
          plant_id: 1,
          po_type: 1,
          vendor_code: 1,
          vendor_name: 1,
          inward_date: { $arrayElemAt: ["$inward_createdAt.date", 0] },
          // akak: {
          //   $slice: ["$inward_createdAt.date",0,1],
          // },
          // inward_date: "$inward_createdAt.date",
          // "inward_createdAt.date": 1,
          // "asn_detail.item.inbound_delivery_number": 1,
          asn_detail: 1,
        },
      },
    ]);

    // console.log("inward_purchase_order_detail", inward_purchase_order_detail);
    if (inward_purchase_order_detail.length) {
      return res.send({ status_code: 200, data: inward_purchase_order_detail });
    } else {
      return res
        .status(400)
        .send({ status_code: 400, message: "Inward PO not available" });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message ||
        "Some error occurred while retrieving inward purchase order data",
    });
  }
};

// get inward po item detail
exports.get_inward_po_item_detail = async (req, res) => {
  var { company_code, plant_id, po_number, asn_no } = req.query;
  

  if (!(company_code && plant_id && po_number)) {
    return res.send({
      status_code: 400,
      message: "Missing Parameters!",
    });
  }

  try {
    // let inward_purchase_order_item_detail = await inward_po_table.aggregate([
    //   {
    //     $match: {
    //       company_code: company_code,
    //       plant_id: plant_id,
    //       po_no: po_number,
    //     },
    //   },
    //   {
    //     $group: {
    //       _id: "$po_no",
    //       po_number: { $first: "$po_no" },
    //       item_detail: {
    //         $push: {
    //           id: "$_id",
    //           item_code: "$item_code",
    //           item_name: "$item_name",
    //           item_uom: "$uom",
    //           ordered_qty: "$ordered_qty",
    //           inward_qty: "$total_inwarded_qty",
    //           pending_qty: "$total_pending_qty",
    //           crate_count: "$total_crates",
    //           item_no: "$item_no",
    //           delivery_date: {
    //             $dateToString: {
    //               date: {
    //                 $dateFromString: {
    //                   dateString: "$delivery_date",
    //                 },
    //               },
    //               format: "%d-%m-%Y",
    //               timezone: "Asia/Kolkata",
    //               onNull: "",
    //             },
    //           },
    //         },
    //       },
    //     },
    //   },
    //   {
    //     $project: {
    //       _id: 0,
    //       po_number: 1,
    //       item_detail: 1,
    //       // "item_detail.delivery_date": {
    //       //   $dateFromString: {
    //       //     dateString: "$item_detail.delivery_date",
    //       //     format: "%d-%m-%Y",
    //       //   },
    //       // },
    //     },
    //   },
    // ]);


    if (asn_no) {
      var asn_search = { "inward_detail.inbound_delivery_number": asn_no }
    }
    else {
      var asn_search = {}
    }

    let inward_purchase_order_item_detail_new =
      await purchase_order_table.aggregate([
        {
          $match: {
            company_code: company_code,
            supplying_plant: plant_id,
            po_number: po_number,
          },
        },
        {
          $unwind: {
            path: "$item",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "rapid_purchase_order_inward_details",
            localField: "po_number",
            foreignField: "po_no",
            let: { po_material: "$item.material_no" },
            // localField: "po_number",
            // foreignField: "po_no",
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$item_code", "$$po_material"], }
                    ]

                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  ordered_qty: 1,
                  total_crates: 1,
                  total_pending_qty: 1,
                  total_inwarded_qty: 1,
                  total_net_qty: 1,
                  inbound_delivery_number: 1

                }
              }
            ],
            as: "inward_detail",
          },
        },
        {
          $unwind: {
            path: "$inward_detail",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: asn_search
        },
        {
          $group: {
            _id: "$po_number",
            po_number: { $first: "$po_number" },
            asn_no: { $first: "$inward_detail.inbound_delivery_number" },
            item_detail: {
              $push: {
                id: {
                  $cond: {
                    if: "$inward_detail._id",
                    then: "$inward_detail._id",
                    else: "",
                  },
                },
                item_no: "$item.item_no",
                item_code: "$item.material_no",
                item_name: "$item.material_description",
                item_uom: "$item.uom",
                // ordered_qty: "$item.quantity",
                ordered_qty: {
                  $cond: {
                    if: "$inward_detail.ordered_qty",
                    then: "$inward_detail.ordered_qty",
                    else: "$item.quantity",
                  },
                },
                inward_qty: {
                  $cond: {
                    if: "$inward_detail.total_net_qty",
                    then: "$inward_detail.total_net_qty",
                    else: 0,
                  },
                },
                pending_qty: {
                  $cond: {
                    if: "$inward_detail.total_pending_qty",
                    then: "$inward_detail.total_pending_qty",
                    else: 0,
                  },
                },
                crate_count: {
                  $cond: {
                    if: "$inward_detail.total_crates",
                    then: "$inward_detail.total_crates",
                    else: 0,
                  },
                },
                delivery_date: {
                  $dateToString: {
                    date: {
                      $dateFromString: {
                        dateString: "$item.delivery_date",
                      },
                    },
                    format: "%d-%m-%Y",
                    timezone: "Asia/Kolkata",
                    onNull: "",
                  },
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            asn_no: 1,
            po_number: 1,
            item_detail: 1,
          },
        },
      ]);

    // return res.send({ data: inward_purchase_order_item_detail_new });

    // console.log("purchase_order_detail", purchase_order_detail);
    if (inward_purchase_order_item_detail_new.length) {
      return res.send({
        status_code: 200,
        data: inward_purchase_order_item_detail_new[0],
      });
    } else {
      return res
        .status(400)
        .send({ status_code: 400, message: "PO not available" });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message ||
        "Some error occurred while retrieving inward purchase order data",
    });
  }
};

exports.get_inward_crate_log_detail = async (req, res) => {
  var { company_code, plant_id, item_code, po_number } = req.query;

  if (!(company_code && plant_id && item_code && po_number)) {
    return res.send({
      status_code: 400,
      message: "Missing Parameters!",
    });
  }
  try {
    let inward_item_crate_detail = await inward_po_table.aggregate([
      {
        $match: {
          company_code,
          plant_id,
          po_no: po_number,
          item_code: item_code,
        },
      },
      {
        $project: {
          company_code: 1,
          plant_id: 1,
          item_no: 1,
          item_code: 1,
          item_name: 1,
          uom: 1,
          vendor_code: "$supplier_no",
          vendor_name: "$supplier_name",
          "inward_crate_details.crate_barcode_value": 1,
          "inward_crate_details.crate_tare": 1,
          "inward_crate_details.inwarded_qty": 1,
          "inward_crate_details.net_qty": 1,
          "inward_crate_details.pallet_barcode": 1,
          "inward_crate_details.inwarded_time": 1,
          // barcode_id : "$inward_crate_details.crate_barcode_value",
          // crate_tare :  "$inward_crate_details.crate_tare",
          // inward_qty : "$inward_crate_details.inwarded_qty",
          // net_qty : "$inward_crate_details.net_qty",
          // pallet_id : "$inward_crate_details.pallet_barcode",
          // inward_date_time : "$inward_crate_details.inwarded_time",
        },
      },
    ]);

    if (inward_item_crate_detail.length) {
      return res.send({
        status_code: 200,
        data: inward_item_crate_detail,
      });
    } else {
      return res.send({
        status_code: 400,
        message: "crate detail not available",
      });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message ||
        "Some error occurred while retrieving inward crate log data",
    });
  }
};


exports.get_autoInward_po_type = async (req, res) => {
  try {
    var { company_code, plant_id, delivery_date } = req.query;

    if (!(company_code && plant_id && delivery_date)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    let po_type = await inward_po_table.aggregate([
      {
        $match: {
          company_code, plant_id, delivery_date,
          "inward_crate_details.mode": "autoinward"
        }
      },
      {
        $group: {
          _id: "$po_type",
          po_type: { $first: "$po_type" }

        }
      },
      {
        $project: {
          _id: 0,
          po_type: 1
        }
      },
      {
        $sort: {
          po_type: 1
        }
      }
    ])

    if (po_type.length) {
      return res.send({ status_code: 200, message: "Po type list!", data: po_type })
    }
    else {
      return res.send({ status_code: 400, message: "Po type not available!" })
    }

  }
  catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message ||
        "Some error occurred while retrieving inward po detail",
    });
  }
}

exports.get_autoInward_vendor_name = async (req, res) => {
  try {
    var { company_code, plant_id, delivery_date, po_type } = req.query;

    if (!(company_code && plant_id && delivery_date && po_type)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }


    let filter_obj = {
      company_code, plant_id, delivery_date,
      "inward_crate_details.mode": "autoinward"
    }

    if (po_type != "All") {
      filter_obj.po_type = po_type
    }


    let vendor_name = await inward_po_table.aggregate([
      {
        $match: filter_obj
      },
      {
        $group: {
          _id: "$supplier_no",
          supplier_no: { $first: "$supplier_no" },
          supplier_name: { $first: "$supplier_name" }
        }
      },
      {
        $project: {
          _id: 0,
          vendor_code: "$supplier_no",
          vendor_name: "$supplier_name"
        }
      },
      {
        $sort: {
          vendor_code: 1
        }
      }
    ])


    if (vendor_name.length) {
      return res.send({ status_code: 200, message: "Vendor list!", data: vendor_name })
    }
    else {
      return res.send({ status_code: 400, message: "Vendor list not available!" })
    }

  }
  catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message ||
        "Some error occurred while retrieving inward po detail",
    });
  }
}

const get_autoInward_po_list = async (filter) =>{


  return await inward_po_table.aggregate([
    {
    $match:filter
   },
   {
    $group:{
      _id:{
        po_no:"$po_no",
        sto_number:"$sto_number",
      },
        po_no:{$first:"$po_no"},
        po_type:{$first:"$po_type"},
        sto_number:{$first:"$sto_number"},
        supplier_no:{$first:"$supplier_no"},
        supplier_name:{$first:"$supplier_name"},
        created_at:{$first:"$created_at"},
        document_date:{$first:"$document_date"}
    
    }
   },
   {
    $project:{
      _id:0,
      mode:"auto",
      po_number:"$po_no",
      po_document_type:"$po_type",
      asn_sto_number : "$sto_number",
      sto_number:"$sto_number",
      vendor_no:"$supplier_no",
      vendor_name:"$supplier_name",
      po_creation_date: {
        $dateToString: {
          date: {
            $dateFromString: {
              dateString: "$document_date",
            },
          },
          format: "%d-%m-%Y",
          timezone: "Asia/Kolkata",
          onNull: "",
        },
      },
      inward_date: {
        $dateToString: {
          date: "$created_at",
          format: "%d-%m-%Y",
          timezone: "Asia/Kolkata",
          onNull: "",
        },
      },
    }
   },
   {
    $sort:{
      po_number:1
    }
   }
  ]) 
  // try{
  //   var { company_code, plant_id,delivery_date,po_type, vendor_code } = req.query;

  //   if (!(company_code && plant_id && delivery_date && po_type && vendor_code)) {
  //     return res.send({
  //       status_code: 400,
  //       message: "Missing Parameters!",
  //     });
  //   }

  //   let filter_obj = {
  //     company_code,plant_id,delivery_date,
  //     "inward_crate_details.mode":"autoinward"
  //   }

  //   if(po_type != "All"){
  //     filter_obj.po_type = po_type
  //   }

  //   if(vendor_code != "All"){
  //     filter_obj.supplier_no = vendor_code
  //   }



  //   let po_list = await inward_po_table.aggregate([
  //     {
  //     $match:filter_obj
  //    },
  //    {
  //     $group:{
  //       _id:{
  //         po_no:"$po_no",
  //         sto_number:"$sto_number",
  //       },
  //         po_no:{$first:"$po_no"},
  //         po_type:{$first:"$po_type"},
  //         sto_number:{$first:"$sto_number"},
  //         supplier_no:{$first:"$supplier_no"},
  //         supplier_name:{$first:"$supplier_name"},
  //         created_at:{$first:"$created_at"},
  //         document_date:{$first:"$document_date"}
      
  //     }
  //    },
  //    {
  //     $project:{
  //       _id:0,
  //       po_number:"$po_no",
  //       po_type:"$po_type",
  //       sto_number:"$sto_number",
  //       vendor_code:"$supplier_no",
  //       vendor_name:"$supplier_name",
  //       po_creation_date: {
  //         $dateToString: {
  //           date: {
  //             $dateFromString: {
  //               dateString: "$document_date",
  //             },
  //           },
  //           format: "%d-%m-%Y",
  //           timezone: "Asia/Kolkata",
  //           onNull: "",
  //         },
  //       },
  //       inward_date: {
  //         $dateToString: {
  //           date: "$created_at",
  //           format: "%d-%m-%Y",
  //           timezone: "Asia/Kolkata",
  //           onNull: "",
  //         },
  //       },
  //     }
  //    },
  //    {
  //     $sort:{
  //       po_number:1
  //     }
  //    }
  //   ]) 

  //    if(po_list.length){
  //     return res.send({status_code:200,message:"Po list!",data:po_list})
  //  }
  //  else{
  //     return res.send({status_code:400,message:"Po list not available!"})
  //  } 

  // }
  // catch(error){
  //   return res.status(500).send({
  //     status_code: 500,
  //     message:
  //       error.message ||
  //       "Some error occurred while retrieving inward po detail",
  //   });
  // }
}

exports.get_autoInward_po_itemDetail = async (req, res) => {
  try {
    var { company_code, plant_id, po_number, asn_sto_number, mode } = req.query;

    if (!(company_code && plant_id && asn_sto_number && po_number && mode)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    let filter = {
      company_code, plant_id,
      po_no : po_number
    }

    if(mode == "auto"){
      filter.sto_number = asn_sto_number
    }
    else if(mode == "vendor"){
      filter.inbound_delivery_number = asn_sto_number
    }



    let po_item_detail = await inward_po_table.aggregate([
      {
        $match: filter
      },
      {
        $project: {
          _id: 0,
          po_number: "$po_no",
          sto_number: "$sto_number",
          item_code: "$item_code",
          item_name: "$item_name",
          item_uom: "$uom",
          po_order_qty:"$po_qty",
          asn_sto_qty : "$ordered_qty",
          // order_qty: "$ordered_qty",
          inward_qty: "$total_net_qty",
          pending_qty: "$total_pending_qty",
          crate_count: "$total_crates"
        }
      },
      {
        $sort: {
          po_number: 1
        }
      }
    ])


    if (po_item_detail.length) {
      return res.send({ status_code: 200, message: "Po item detail!", data: po_item_detail })
    }
    else {
      return res.send({ status_code: 400, message: "Item detail not available!" })
    }

  }
  catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message ||
        "Some error occurred while retrieving inward po detail",
    });
  }
}



exports.get_inward_po_item_detail_v1 = async (req, res) => {
  try {
    var { company_code, plant_id, po_number, asn_sto_number, mode } = req.query;

    if (!(company_code && plant_id  && po_number && mode)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    let filter = {
      company_code, plant_id,
      po_no : po_number
    }

    if(mode == "auto" && asn_sto_number){
      filter.sto_number = asn_sto_number
    }
    else if(mode == "vendor" && asn_sto_number){
      filter.inbound_delivery_number = asn_sto_number
    }



    let po_item_detail = await inward_po_table.aggregate([
      {
        $match: filter
      },
      {
        $project: {
          _id:0,
          id:"$_id",
          po_number: "$po_no",
          sto_number: "$sto_number",
          item_code: "$item_code",
          item_name: "$item_name",
          item_uom: "$uom",
          po_qty:"$po_qty",
          asn_sto_qty : "$ordered_qty",
          ordered_qty: "$ordered_qty",
          inward_qty: "$total_net_qty",
          pending_qty: "$total_pending_qty",
          crate_count: "$total_crates"
        }
      },
      {
        $sort: {
          po_number: 1
        }
      }
    ])


    if (po_item_detail.length) {
      let result = {
        po_number:po_number,
        asn_sto_number:asn_sto_number?asn_sto_number:"",
        item_detail:po_item_detail

      }
      return res.send({ status_code: 200, message: "Po item detail!", data: result })
    }
    else {
      return res.send({ status_code: 400, message: "Item detail not available!" })
    }

  }
  catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message ||
        "Some error occurred while retrieving inward po detail",
    });
  }
}