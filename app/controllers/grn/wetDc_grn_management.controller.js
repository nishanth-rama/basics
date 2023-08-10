const db = require("../../models");
const inward_po_table = db.inwardProcess;
const purchase_order_table = db.purchaseOrder;
const sales_order_table = db.soAllocation;
const sap_log_table = db.sap_logs_model;
const crate_detail_table = db.crateDetails;
const moment_tz = require("moment-timezone");
const plant_table = db.plants;
const sap_auth = process.env.SAP_AUTH;
const axios = require("axios");
const response = require("../../helpers/response");
const stock_summary_table = db.stock_summary;
const sap_grn_creation_logs = db.sap_logs_model;
const item_masters_table = db.itemMasters;
const sap_url = process.env.SAP_URL;
const new_sap_url = process.env.NEW_SAP_URL;

// grn po list
exports.get_grn_po_list_new = async (req, res) => {
  try {
    var { company_code, plant_id, document_date } = req.query;

    if (!(company_code && plant_id && document_date)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    let grn_po_list = await inward_po_table.aggregate([
      {
        $match: {
          company_code,
          plant_id,
          document_date,
        },
      },
      {
        $group: {
          _id: "$po_no",
          plant_id: { $first: "$plant_id" },
          po_no: { $first: "$po_no" },
          po_type: { $first: "$po_type" },
          supplier_no: { $first: "$supplier_no" },
          supplier_name: { $first: "$supplier_name" },
          delivery_date: { $first: "$delivery_date" },
        },
      },

      {
        $lookup: {
          from: "rapid_sap_logs",
          localField: "po_no",
          foreignField: "primaryData",
          pipeline: [
            // {
            //   $match:{
            //     "response.flag" :"E"
            //   }
            // },
            {
              $project: {
                grn_status: "$response.flag",
              },
            },
          ],
          as: "sap_po",
        },
      },
      {
        $unwind: {
          path: "$sap_po",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          po_no: 1,
          po_type: 1,
          vendor_code: "$supplier_no",
          vendor_name: "$supplier_name",
          plant_id: 1,
          delivery_date: {
            $dateToString: {
              date: {
                $dateFromString: {
                  dateString: "$delivery_date",
                },
              },
              format: "%d-%m-%Y",
              timezone: "Asia/Kolkata",
              onNull: "",
            },
          },
          status: "$sap_po.grn_status",
          grn_status: {
            $cond: {
              if: "$sap_po.grn_status",
              then: {
                $cond: {
                  if: { $eq: ["$sap_po.grn_status", "S"] },
                  then: "Completed",
                  else: "Failed",
                },
              },
              else: "Pending",
            },
          },
        },
      },
    ]);

    if (grn_po_list.length) {
      return res.status(200).send({ status_code: 200, data: grn_po_list });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "PO not available",
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

exports.get_pending_po_details = async (req, res) => {
  console.log("get_pending_po_details");
  let po_no = req.query.po_no;
  let company_code = req.query.company_code;
  let plant_id = req.query.plant_id;

  if (!(po_no && company_code && plant_id)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }

  try {
    let response = await inward_po_table.aggregate([
      {
        $match: {
          po_no: po_no,
          plant_id: plant_id,
          company_code: company_code,
        },
      },
      {
        $project: {
          _id: 0,
          item_name: 1,
          item_code: 1,
          uom: 1,
          ordered_qty: 1,
          inward_qty: "$total_net_qty",
          grn_qty: "$total_grn_post_qty",
          pending_grn_qty: {
            $subtract: ["$total_net_qty", "$total_grn_post_qty"],
          },
        },
      },
    ]);

    let status_message = "No records available!";
    if (response.length) status_message = "Data found!";

    return res.status(200).send({
      status_code: "200",
      status_message: status_message,
      data: response,
    });
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message || "Some error occurred while retrieving purchase order",
    });
  }
};

//pending poo list
exports.get_grn_po_list = async (req, res) => {
  try {
    var { company_code, plant_id, document_date } = req.query;

    if (!(company_code && plant_id && document_date)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    let new_grn_po_list = await inward_po_table.aggregate([
      {
        $match: {
          company_code,
          plant_id,
          document_date,
        },
      },
      {
        $group: {
          _id: "$po_no",
          po_no: { $first: "$po_no" },
          plant_id: { $first: "$plant_id" },
          po_type: { $first: "$po_type" },
          supplier_no: { $first: "$supplier_no" },
          supplier_name: { $first: "$supplier_name" },
          delivery_date: { $first: "$delivery_date" },
          total_ordered_qty: { $sum: "$ordered_qty" },
          total_net_qty: { $sum: "$total_net_qty" },
          inward_net_qty: { $sum: "$total_inwarded_qty" },
          total_grn_post_qty: { $sum: "$total_grn_post_qty" },
          po_grn_status: { $addToSet: "$po_grn_status" },
        },
      },
      {
        $match: {
          $expr: {
            $not: {
              $eq: ["$total_net_qty", "$total_grn_post_qty"],
            },
          },
        },
      },
      // {
      //   $match: {
      //     $expr: { $in: ["pending", "$po_grn_status"] },
      //     // { $in: ["failed", "$po_grn_status"] },
      //   },
      // },
      {
        $project: {
          _id: 0,
          plant_id: 1,
          po_no: 1,
          po_type: 1,
          vendor_code: "$supplier_no",
          vendor_name: "$supplier_name",
          delivery_date: {
            $dateToString: {
              date: {
                $dateFromString: {
                  dateString: "$delivery_date",
                },
              },
              format: "%d-%m-%Y",
              timezone: "Asia/Kolkata",
              onNull: "",
            },
          },
          grn_status: {
            $cond: {
              if: {
                $gt: ["$total_grn_post_qty", 0],
                // $or: [
                //   { $in: ["success", "$po_grn_status"] },
                //   { $gt: ["$total_grn_post_qty", 0] },
                // ],
              },
              then: "Partially Completed",
              else: "Pending",
            },
          },
        },
      },
    ]);

    // console.log("new_grn_po_list",new_grn_po_list);

    if (new_grn_po_list.length) {
      return res.status(200).send({
        status_code: 200,
        message: "pending and partially completed grn po list",
        count: new_grn_po_list.length,
        data: new_grn_po_list,
      });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "PO not available",
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

exports.get_success_po_list = async (req, res) => {
  try {
    var { company_code, plant_id, document_date } = req.query;

    let new_grn_po_List = await inward_po_table.aggregate([
      {
        $match: {
          company_code,
          plant_id,
          document_date,
          total_grn_post_qty: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: "$po_no",
          po_no: { $first: "$po_no" },
          plant_id: { $first: "$plant_id" },
          po_type: { $first: "$po_type" },
          supplier_no: { $first: "$supplier_no" },
          supplier_name: { $first: "$supplier_name" },
          delivery_date: { $first: "$delivery_date" },
          total_ordered_qty: { $sum: "$ordered_qty" },
          total_net_qty: { $sum: "$total_net_qty" },
          inward_net_qty: { $sum: "$total_inwarded_qty" },
          total_grn_post_qty: { $sum: "$total_grn_post_qty" },
          po_grn_status: { $addToSet: "$po_grn_status" },
          grn_no_list: {
            $addToSet: { $setUnion: "$inward_crate_details.grn_no" },
          },
        },
      },
      // {
      //   $lookup : {
      //     from: "rapid_sap_logs",
      //     localField: "po_no",
      //     foreignField: "primaryData",
      //     as: "sap_po",
      //   }
      // },
      // {
      //   $match: {
      //     $expr: {
      //       $ne: ["$sap_po", []],
      //     },
      //   },
      // },
      {
        $project: {
          po_no: 1,
          // po_grn_status: 1,
          // grn_no_list: 1,
          plant_id: 1,
          po_type: 1,
          vendor_code: "$supplier_no",
          vendor_name: "$supplier_name",
          delivery_date: {
            $dateToString: {
              date: {
                $dateFromString: {
                  dateString: "$delivery_date",
                },
              },
              format: "%d-%m-%Y",
              timezone: "Asia/Kolkata",
              onNull: "",
            },
          },
          grn_no: {
            $filter: {
              input: {
                $setUnion: {
                  $reduce: {
                    input: "$grn_no_list",
                    initialValue: [],
                    in: { $concatArrays: ["$$value", "$$this"] },
                  },
                },
              },
              as: "num",
              cond: { $ne: ["$$num", null] },
            },
          },
          grn_status: {
            $cond: {
              if: {
                $eq: ["$total_net_qty", "$total_grn_post_qty"],
                // $and: [
                //   { $eq: ["$total_net_qty", "$total_grn_post_qty"] },
                //   {
                //     $and: [
                //       { $not: { $in: ["pending", "$po_grn_status"] } },
                //       { $not: { $in: ["failed", "$po_grn_status"] } },
                //     ],
                //   },
                //   // {
                //   //   $not: {
                //   //     $and: [
                //   //       { $in: ["pending", "$po_grn_status"] },
                //   //       { $in: ["failed", "$po_grn_status"] },
                //   //     ],
                //   //   },
                //   // },
                // ],
              },
              then: "Completed",
              else: "Partially Completed",
            },
          },
        },
      },

      {
        $unwind: {
          path: "$grn_no",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $sort: {
          po_no: 1
        }
      }
    ]);

    // return res.send({data:new_grn_po_List})

    if (new_grn_po_List.length) {
      return res.status(200).send({
        status_code: 200,
        message: "GRN Success po list",
        count: new_grn_po_List.length,
        data: new_grn_po_List,
      });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "PO not available",
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

exports.get_success_grn_details = async (req, res) => {
  console.log("get_success_grn_details");
  let po_no = req.query.po_no;
  let company_code = req.query.company_code;
  let plant_id = req.query.plant_id;
  let grn_no = req.query.grn_no;

  if (!(po_no && company_code && plant_id && grn_no)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }

  try {
    await sap_log_table
      .findOne({
        "response.material_document_no": +grn_no,
        company_code: company_code,
        plant_id: plant_id,
        primaryData: po_no,
      })
      .then(async (data) => {
        if (!data)
          return res.status(400).send({
            status_code: "400",
            status_message: "Invalid Grn number and Po Number",
          });
        else {
          let response = [];
          let updated_data = data.request.Item.map(async (element) => {
            //console.log(element);
            await inward_po_table
              .findOne(
                {
                  po_no: po_no,
                  plant_id: plant_id,
                  company_code: company_code,
                  item_code: element.material_no,
                },
                {
                  ordered_qty: 1,
                  item_name: 1,
                  uom: 1,
                  total_net_qty: 1,
                  total_pending_qty: 1,
                  total_crates: 1,
                }
              )
              .then((data) => {
                //console.log("data", data);
                response.push({
                  item_name: data.item_name,
                  item_code: element.material_no,
                  item_uom: data.uom,
                  order_qty: data.ordered_qty,
                  inward_qty: data.total_net_qty,
                  pending_qty: data.total_pending_qty,
                  grn_qty: element.quantity,
                  crate_count: data.total_crates,
                });
              });
          });
          await Promise.all(updated_data);
          return res.status(200).send({
            status_code: "200",
            status_message: "Data found!",
            data: response,
          });
        }
      });
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message || "Some error occurred while retrieving purchase order",
    });
  }
};


exports.get_failed_po_list = async (req, res) => {
  try {
    var { company_code, plant_id, document_date } = req.query;

    if (!(company_code && plant_id && document_date)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    let grn_po_list = await inward_po_table.aggregate([
      {
        $match: {
          company_code,
          plant_id,
          document_date,
          po_grn_status: "failed",
        },
      },
      {
        $group: {
          _id: "$po_no",
          plant_id: { $first: "$plant_id" },
          po_no: { $first: "$po_no" },
          po_type: { $first: "$po_type" },
          supplier_no: { $first: "$supplier_no" },
          supplier_name: { $first: "$supplier_name" },
          delivery_date: { $first: "$delivery_date" },
        },
      },
      {
        $lookup: {
          from: "rapid_sap_logs",
          localField: "po_no",
          foreignField: "primaryData",
          pipeline: [
            {
              $match: {
                "response.flag": { $ne: "S" },
              },
            },
            {
              $sort: {
                createdAt: -1,
              },
            },
            {
              $project: {
                _id: 0,
                grn_status: "$response.flag",
                error_message: "$response.remarks",
                created_at: "$createdAt",
              },
            },
          ],
          as: "sap_po",
        },
      },
      {
        $addFields: {
          sap_po_status: { $arrayElemAt: ["$sap_po", 0] },
        },
      },
      {
        $project: {
          _id: 0,
          po_no: 1,
          po_type: 1,
          vendor_code: "$supplier_no",
          vendor_name: "$supplier_name",
          plant_id: 1,
          delivery_date: {
            $dateToString: {
              date: {
                $dateFromString: {
                  dateString: "$delivery_date",
                },
              },
              format: "%d-%m-%Y",
              timezone: "Asia/Kolkata",
              onNull: "",
            },
          },
          // status: "$sap_po.grn_status",
          grn_status: "Failed",
          error_message: { $arrayElemAt: ["$sap_po_status.error_message", 0] },
          // grn_status: {
          //   $cond: {
          //     if: "$sap_po.grn_status",
          //     then: {
          //       $cond: {
          //         if: { $eq: ["$sap_po.grn_status", "S"] },
          //         then: "Completed",
          //         else: "Failed",
          //       },
          //     },
          //     else: "Pending",
          //   },
          // },
          // inward_date: { $arrayElemAt: ["$inward_createdAt.date", 0] },
          // error_message: {
          //   $cond: {
          //     if: "$sap_po.error_message",
          //     then: { $arrayElemAt: ["$sap_po.error_message", 0] },
          //     else: "",
          //   },
          // },
        },
      },
      {
        $sort: {
          po_no: 1,
        },
      },
    ]);

    if (grn_po_list.length) {
      return res.status(200).send({
        status_code: 200,
        message: "GRN Failed attempts PO list",
        count: grn_po_list.length,
        data: grn_po_list,
      });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "PO not available",
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

// get_failed_po_item_list

exports.get_failed_po_item_list = async (req, res) => {
  try {
    var { company_code, plant_id, po_no } = req.query;

    if (!(company_code && plant_id && po_no)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    let grn_po_item_list = await inward_po_table.aggregate([
      {
        $match: {
          company_code,
          plant_id,
          po_no,
          po_grn_status: "failed",
        },
      },
      {
        $lookup: {
          from: "rapid_sap_logs",
          localField: "po_no",
          foreignField: "primaryData",
          let: { po_item_code: "$item_code" },
          pipeline: [
            {
              $unwind: {
                path: "$request.Item",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $match: {
                $expr: {
                  $eq: ["$request.Item.material_no", "$$po_item_code"],
                },
              },
            },
            {
              $match: {
                "response.flag": "E",
              },
            },
            {
              $sort: {
                createdAt: -1,
              },
            },
            {
              $project: {
                _id: 0,
                primaryData: 1,
                createdAt: 1,
                failure_message: "$response.remarks",
              },
            },
          ],
          as: "sap_log",
        },
      },
      {
        $addFields: {
          sap_po_status: { $arrayElemAt: ["$sap_log", 0] },
        },
      },
      {
        $project: {
          // sap_log: 1,
          _id: 0,
          po_no: 1,
          po_type: 1,
          // sap_po_status: 1,
          po_grn_status: 1,
          status: { $arrayElemAt: ["$sap_po_status.failure_message", 0] },
          vendor_code: "$supplier_no",
          vendor_name: "$supplier_name",
          item_code: "$item_code",
          item_name: "$item_name",
          uom: "$uom",
          ordered_qty: "$ordered_qty",
          inward_qty: "$total_inwarded_qty",
          total_net_qty: "$total_net_qty",
          grn_posted_qty: {
            $cond: {
              if: {
                // $not: {
                //   $eq: ["$total_grn_post_qty", null],
                // },
                $ifNull: ["$total_grn_post_qty", false],
              },
              then: "$total_grn_post_qty",
              else: 0,
            },
          },
          grn_pending_qty: {
            $cond: {
              if: {
                $ifNull: ["$total_grn_post_qty", false],
                // $not: {
                //   $eq: ["$total_grn_post_qty", null],
                // },
              },
              then: { $subtract: ["$total_net_qty", "$total_grn_post_qty"] },
              else: "$total_net_qty",
            },
            // $subtract: ["$total_net_qty", "$total_grn_post_qty"],
          },
        },
      },
    ]);

    if (grn_po_item_list.length) {
      return res.status(200).send({
        status_code: 200,
        message: "GRN Failed po item list",
        data: grn_po_item_list,
      });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "PO not available",
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

exports.stock_transfer_in = async (req, res) => {
  try {
    var { company_code, plant_id, po_no } = req.query;


    if (!(company_code && plant_id && po_no)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    const today_date = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD");

    // getting delivery_no/stopo number
    let get_sto_from_wdc_crate_detail = await crate_detail_table.aggregate([
      {
        $match: {
          po_number: po_no,
          // item_code: material_no,
          company_code: company_code,
          dc_id: plant_id,
        },
      },
      {
        $group: {
          _id: "$delivery_no",
          po_number: { $first: "$po_number" },
          delivery_no: { $first: "$delivery_no" },
          indent_number: { $first: "$indent_number" },
        },
      },
      {
        $project: {
          _id: 0,
          po_number: 1,
          delivery_no: 1,
          indent_number: 1,
        },
      },
      {
        $lookup: {
          from: "stockTransferIn",
          localField: "delivery_no",
          foreignField: "delivery_no",
          // pipeline:
          as: "sti_detail",
        },
      },
      {
        $unwind: {
          path: "$sti_detail",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $project: {
          _id: 0,
          posting_date: today_date,
          document_date: today_date,
          reference_document_no: "$indent_number",
          bill_of_lading: "$indent_number",
          header_txt: "",
          Item: {
            $map: {
              input: "$sti_detail.item",
              as: "sec",
              in: {
                material_no: "$$sec.material",
                material_name: "$$sec.material_description",
                movement_type: "$$sec.storage_location",
                quantity: { $toString: "$$sec.delivery_quantity" },
                uom: "$$sec.uom",
                delivery_no: "$sti_detail.delivery_no",
                delivery_item: { $toString: "$$sec.delivery_item_no" },
                batch: "$$sec.batch",
                valuation_type: "$$sec.valuation_type",
                po_number: "$indent_number",
                po_item: "$$sec.po_item",
                plant: plant_id,
                storage_location: "",
                // "new_section_name": "$$sec.sectionName"
              },
            },
          },
          // "item.material_number":"$item.material"
        },
      },
    ]);

    // return res.send({data:get_sto_from_wdc_crate_detail})
    let po_inward_entry = await inward_po_table.findOne({ po_no: po_no })

    if (!po_inward_entry) {
      return res.send({ status_code: 400, message: "PO not inwarded!" })
    }

    if (get_sto_from_wdc_crate_detail.length) {
      // grn post
      const newRequest = {};
      const request = get_sto_from_wdc_crate_detail[0];

      newRequest.request = request;
      var options = {
        method: "post",
        // url: `${sap_url}/credit_debit_note_get`,
        url: `${sap_url}/GRN_against_OBD_creation`,
        headers: { Authorization: `${sap_auth}` },
        data: JSON.stringify(newRequest),
      };

      let sap_grn_resp = await axios.request(options);

      let responseData = sap_grn_resp.data.response;
      let sapData = {};
      sapData.request = request;
      sapData.response = responseData;
      sapData.company_code = company_code;
      sapData.primaryData = po_no;
      // sapData.primaryData = get_sto_from_wdc_crate_detail[0].Item[0]
      //   ? get_sto_from_wdc_crate_detail[0].Item[0].delivery_no
      //   : "NA";
      sapData.type = "Stock Transfer In";
      sapData.plant_id = plant_id;

      const new_sap_grn_creation_logs = new sap_grn_creation_logs(sapData);
      await new_sap_grn_creation_logs.save();

      // console.log("pain",sapData);

      if (
        sap_grn_resp.status == 200 &&
        sap_grn_resp.data &&
        sap_grn_resp.data.response &&
        sap_grn_resp.data.response.flag == "S"
      ) {
        // grn_result.push(responseData);

        for (let j = 0; j < request.Item.length; j++) {
          let check_mt_availability = await db.inwardProcess.findOne({
            item_code: request.Item[j].material_no,
            po_no: po_no,
          });

          var grn_qty = Number(request.Item[j].quantity);

          var inventory_grn_qty = Number(request.Item[j].quantity);

          // check item alt uom
          // let alt_uom_exists = await item_masters_table.findOne( { itemId: request.Item[j].material_no },
          //   { uom: 1, material_type: 1, material_group: 1, itemName: 1, alt_uom: 1 })

          // if(check_mt_availability && alt_uom_exists && alt_uom_exists.uom && alt_uom_exists.alt_uom && alt_uom_exists.alt_uom!=" "){
          //   inventory_grn_qty = check_mt_availability.inventory_net_qty;
          // }

          if (check_mt_availability) {
            await db.inwardProcess.updateOne(
              {
                item_code: request.Item[j].material_no,
                po_no: po_no,
              },
              {
                $set: {
                  total_grn_post_qty: grn_qty,
                  inventory_grn_posted_qty: inventory_grn_qty,
                  po_grn_status: "success",
                  "inward_crate_details.$[].grn_status": "success",
                  "inward_crate_details.$[].grn_no":
                    responseData.material_document_no,
                },
              }
            );

            await stock_summary_table.updateOne(
              { material_no: request.Item[j].material_no },
              {
                $inc: {
                  inventory_stock_qty: grn_qty,
                  inventory_grn_posted_qty: inventory_grn_qty,
                },
              }
            );
          } else {
            // let po_inward_entry = await db.inwardProcess.findOne({
            //   // item_code: request.Item[j].material_no,
            //   po_no: po_no,
            // });

            const new_inward_entry = new db.inwardProcess({
              company_code: po_inward_entry.company_code,
              unit_price: "-",
              total_extra_qty: 0,
              total_grn_post_qty: grn_qty,
              inventory_grn_posted_qty: "",
              po_grn_status: "success",
              rejected_qty: 0,
              delivery_date: po_inward_entry.delivery_date,
              invoice_no: "",
              item_code: request.Item[j].material_no,
              item_name: request.Item[j].material_name,
              item_no: request.Item[j].po_item,
              ordered_qty: 0,
              plant_id: po_inward_entry.plant_id,
              po_no: po_inward_entry.po_no,
              po_type: po_inward_entry.po_type,
              supplier_name: po_inward_entry.supplier_name,
              supplier_no: po_inward_entry.supplier_no,
              uom: request.Item[j].uom,
              total_inwarded_qty: 0,
              total_pending_qty: 0,
              total_crates: 0,
              total_crates_weight: 0,
              total_net_qty: 0,
              cc_id: "",
              inventory_net_qty: "",
              inward_crate_details: [],
            });
            await new_inward_entry.save();

            await stock_summary_table.updateOne(
              { material_no: request.Item[j].material_no },
              {
                $inc: {
                  inventory_stock_qty: grn_qty,
                  inventory_grn_posted_qty: grn_qty,
                },
              }
            );
          }
        }

        return res.send({
          status_code: 200,
          message: "GRN Created Successfully!",
          data: [{ message: `${po_no} GRN Created!` }]
        });
      } else {
        return res.status(400).send({
          status_code: 400,
          message: "GRN creation failed!",
          data: [{ message: `${po_no} GRN failed!` }]
        });
      }
    } else {
      return res
        .status(400)
        .send({ status_code: 400, message: "stock transfered not found!" });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message: error.message || "Some error occurred while posting GRN!",
    });
  }
};

exports.stock_transfer_in_v2 = async (req, res) => {
  try {
    var { company_code, plant_id, sto_no } = req.query;


    if (!(company_code && plant_id && sto_no)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    const today_date = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD");

    // getting delivery_no/stopo number
    let get_sto_from_wdc_crate_detail = await crate_detail_table.aggregate([
      {
        $match: {
          delivery_no: sto_no,
          // item_code: material_no,
          company_code: company_code,
          dc_id: plant_id,
        },
      },
      {
        $group: {
          _id: "$delivery_no",
          po_number: { $first: "$po_number" },
          delivery_no: { $first: "$delivery_no" },
          indent_number: { $first: "$indent_number" },
        },
      },
      {
        $project: {
          _id: 0,
          po_number: 1,
          delivery_no: 1,
          indent_number: 1,
        },
      },
      {
        $lookup: {
          from: "stockTransferIn",
          localField: "delivery_no",
          foreignField: "delivery_no",
          // pipeline:
          as: "sti_detail",
        },
      },
      {
        $unwind: {
          path: "$sti_detail",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $project: {
          _id: 0,
          posting_date: today_date,
          document_date: today_date,
          reference_document_no: "$indent_number",
          bill_of_lading: "$indent_number",
          header_txt: "",
          Item: {
            $map: {
              input: "$sti_detail.item",
              as: "sec",
              in: {
                material_no: "$$sec.material",
                material_name: "$$sec.material_description",
                movement_type: "101",
                quantity: { $toString: "$$sec.delivery_quantity" },
                uom: "$$sec.uom",
                delivery_no: "$sti_detail.delivery_no",
                delivery_item: { $toString: "$$sec.delivery_item_no" },
                batch: "$$sec.batch",
                valuation_type: "$$sec.valuation_type",
                po_number: "$indent_number",
                po_item: "$$sec.po_item",
                plant: plant_id,
                storage_location: "",
                // "new_section_name": "$$sec.sectionName"
              },
            },
          },
          // "item.material_number":"$item.material"
        },
      },
    ]);

    // return res.send({data:get_sto_from_wdc_crate_detail})

    if(get_sto_from_wdc_crate_detail.length && !get_sto_from_wdc_crate_detail[0].Item.length ){
      return res.send({status_code:400,message:"Items are not available to post GRN"})
    }

    let po_inward_entry = await inward_po_table.findOne({ sto_number: sto_no })

    if (!po_inward_entry) {
      return res.send({ status_code: 400, message: "STO not inwarded!" })
    }
    
    if (get_sto_from_wdc_crate_detail.length) {
      // grn post
      const newRequest = {};
      const request = get_sto_from_wdc_crate_detail[0];

      newRequest.request = request;

      // old request
      // var options = {
      //   method: "post",
      //   // url: `${sap_url}/credit_debit_note_get`,
      //   url: `${sap_url}/GRN_against_OBD_creation`,
      //   headers: { Authorization: `${sap_auth}` },
      //   data: JSON.stringify(newRequest),
      // };

      // new request
      var options = {
        method: "post",
        url: `${new_sap_url}/GRN_against_OBD_creation`,
        headers: { },
        data: newRequest,
      };

      // console.log("options",options);

      let sap_grn_resp = await axios.request(options);

      let responseData = sap_grn_resp.data.response;
      let sapData = {};
      sapData.request = request;
      sapData.response = responseData;
      sapData.company_code = company_code;
      sapData.primaryData = sto_no;
      // sapData.primaryData = get_sto_from_wdc_crate_detail[0].Item[0]
      //   ? get_sto_from_wdc_crate_detail[0].Item[0].delivery_no
      //   : "NA";
      sapData.type = "Stock Transfer In";
      sapData.plant_id = plant_id;

      const new_sap_grn_creation_logs = new sap_grn_creation_logs(sapData);
      await new_sap_grn_creation_logs.save();

      // console.log("pain",sapData);

      if (
        sap_grn_resp.status == 200 &&
        sap_grn_resp.data &&
        sap_grn_resp.data.response &&
        sap_grn_resp.data.response.flag == "S"
      ) {
        // grn_result.push(responseData);

        for (let j = 0; j < request.Item.length; j++) {
          let check_mt_availability = await db.inwardProcess.findOne({
            item_code: request.Item[j].material_no,
            sto_number: sto_no,
          });

          var grn_qty = Number(request.Item[j].quantity);

          var inventory_grn_qty = Number(request.Item[j].quantity);

          // check item alt uom
          // let alt_uom_exists = await item_masters_table.findOne( { itemId: request.Item[j].material_no },
          //   { uom: 1, material_type: 1, material_group: 1, itemName: 1, alt_uom: 1 })

          // if(check_mt_availability && alt_uom_exists && alt_uom_exists.uom && alt_uom_exists.alt_uom && alt_uom_exists.alt_uom!=" "){
          //   inventory_grn_qty = check_mt_availability.inventory_net_qty;
          // }

          if (check_mt_availability) {
            await db.inwardProcess.updateOne(
              {
                item_code: request.Item[j].material_no,
                sto_number: sto_no,
              },
              {
                $inc:{
                  total_grn_post_qty: grn_qty,
                  inventory_grn_posted_qty: inventory_grn_qty,
                },
                $set: {
                  // total_grn_post_qty: grn_qty,
                  // inventory_grn_posted_qty: inventory_grn_qty,
                  po_grn_status: "success",
                  "inward_crate_details.$[].grn_status": "success",
                  "inward_crate_details.$[].grn_no":
                    responseData.material_document_no,
                },
              }
            );

            await stock_summary_table.updateOne(
              { material_no: request.Item[j].material_no },
              {
                $inc: {
                  inventory_stock_qty: grn_qty,
                  inventory_grn_posted_qty: inventory_grn_qty,
                },
              }
            );
          } else {
            // let po_inward_entry = await db.inwardProcess.findOne({
            //   // item_code: request.Item[j].material_no,
            //   po_no: po_no,
            // });

            const new_inward_entry = new db.inwardProcess({
              company_code: po_inward_entry.company_code,
              unit_price: "-",
              total_extra_qty: 0,
              total_grn_post_qty: grn_qty,
              inventory_grn_posted_qty: "",
              po_grn_status: "success",
              rejected_qty: 0,
              delivery_date: po_inward_entry.delivery_date,
              invoice_no: "",
              item_code: request.Item[j].material_no,
              item_name: request.Item[j].material_name,
              item_no: request.Item[j].po_item,
              ordered_qty: 0,
              plant_id: po_inward_entry.plant_id,
              po_no: po_inward_entry.po_no,
              sto_number: po_inward_entry.sto_number,
              purchase_group: po_inward_entry.purchase_group,
              po_type: po_inward_entry.po_type,
              supplier_name: po_inward_entry.supplier_name,
              supplier_no: po_inward_entry.supplier_no,
              uom: request.Item[j].uom,
              total_inwarded_qty: 0,
              total_pending_qty: 0,
              total_crates: 0,
              total_crates_weight: 0,
              total_net_qty: 0,
              cc_id: "",
              inventory_net_qty: "",
              inward_crate_details: [],
            });
            await new_inward_entry.save();

            await stock_summary_table.updateOne(
              { material_no: request.Item[j].material_no },
              {
                $inc: {
                  inventory_stock_qty: grn_qty,
                  inventory_grn_posted_qty: grn_qty,
                },
              }
            );
          }
        }

        return res.send({
          status_code: 200,
          message: "GRN Created Successfully!",
          data : [{message:`${sto_no} GRN Created!`}]
        });
      } else {


        await db.inwardProcess.updateMany(
          {
            // item_code: request.Item[j].material_no,
            sto_number: sto_no,
          },
          {
            $set: {
              po_grn_status: "failed",
              "inward_crate_details.$[].grn_status": "failed",
            },
          },
          {
            upsert:false
          }
        );


        return res.status(400).send({
          status_code: 400,
          message: "GRN creation failed!",
          data : [{message:`${sto_no} GRN failed!`}]
        });
      }
    } else {
      return res
        .status(400)
        .send({ status_code: 400, message: "stock transfered not found!" });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message: error.message || "Some error occurred while posting GRN!",
    });
  }
};


// new api for grn failed wrt mode
exports.get_failed_po_list_type = async (req, res) => {
  
  try {
    var { company_code, plant_id, document_date, mode } = req.query;

    if (!(company_code && plant_id && document_date && mode)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    if(mode == "Auto"){
      var match_obj ={
        company_code,
        plant_id,
        document_date,
        po_grn_status: "failed",
        "inward_crate_details.mode":"autoinward",
        sto_number :{
          $exists:true
        }
      }

      var grp_obj = {
        _id: "$sto_number",
        plant_id: { $first: "$plant_id" },
        sto_number :{$first:"$sto_number"},
        po_no: { $first: "$po_no" },
        po_type: { $first: "$po_type" },
        asn_no:{$first:"$inbound_delivery_number"},
        supplier_no: { $first: "$supplier_no" },
        supplier_name: { $first: "$supplier_name" },
        delivery_date: { $first: "$delivery_date" },
        inward_type:{$first:"$inward_crate_details.mode"}
      }
    }
    else {

      var match_obj ={
        company_code,
        plant_id,
        document_date,
        po_grn_status: "failed",
        "inward_crate_details.mode":"vendorinward",
        sto_number :{
          $exists:false
        }
  
      }

      var grp_obj = {
        _id:{
          po:"$po_no",
          asn_no:"$inbound_delivery_number"
        },
        plant_id: { $first: "$plant_id" },
        po_no: { $first: "$po_no" },
        asn_no:{$first:"$inbound_delivery_number"},
        sto_number :{$first:"$sto_number"},
        po_type: { $first: "$po_type" },
        supplier_no: { $first: "$supplier_no" },
        supplier_name: { $first: "$supplier_name" },
        delivery_date: { $first: "$delivery_date" },
        inward_type:{$first:"$inward_crate_details.mode"}
      }
    }

  

    let grn_po_list = await inward_po_table.aggregate([
      {
        $match: match_obj,
      },
      {
        $group: grp_obj
      },
      {
        $lookup: {
          from: "rapid_sap_logs",
          localField: "po_no",
          foreignField: "primaryData",
          pipeline: [
            {
              $match: {
                "response.flag": { $ne: "S" },
              },
            },
            {
              $sort: {
                createdAt: -1,
              },
            },
            {
              $project: {
                _id: 0,
                grn_status: "$response.flag",
                error_message: "$response.remarks",
                created_at: "$createdAt",
              },
            },
          ],
          as: "sap_po",
        },
      },
      {
        $addFields: {
          sap_po_status: { $arrayElemAt: ["$sap_po", 0] },
        },
      },
      {
        $project: {
          _id: 0,
          po_no: 1,
          po_type: 1,
          vendor_code: "$supplier_no",
          vendor_name: "$supplier_name",
          sto_number: { $ifNull: ["$sto_number", "-"] },
          asn_no: { $ifNull: ["$asn_no", "-"] },
          plant_id: 1,
          delivery_date: {
            $dateToString: {
              date: {
                $dateFromString: {
                  dateString: "$delivery_date",
                },
              },
              format: "%d-%m-%Y",
              timezone: "Asia/Kolkata",
              onNull: "",
            },
          },
          inward_type:"$inward_type",
          // status: "$sap_po.grn_status",
          grn_status: "Failed",
          // error_message: { $arrayElemAt: ["$sap_po_status.error_message", 0] },
          error_message:  { $ifNull: [{ $arrayElemAt: ["$sap_po_status.error_message", 0] }, "-"] },
          inward_type : {
            $cond :{
              if:{
                $eq :[{ $arrayElemAt: ["$inward_type", 0] },"autoinward"]
              },
              then:"Auto",
              else :"Vendor"
            }
          }

          
          // grn_status: {
          //   $cond: {
          //     if: "$sap_po.grn_status",
          //     then: {
          //       $cond: {
          //         if: { $eq: ["$sap_po.grn_status", "S"] },
          //         then: "Completed",
          //         else: "Failed",
          //       },
          //     },
          //     else: "Pending",
          //   },
          // },
          // inward_date: { $arrayElemAt: ["$inward_createdAt.date", 0] },
          // error_message: {
          //   $cond: {
          //     if: "$sap_po.error_message",
          //     then: { $arrayElemAt: ["$sap_po.error_message", 0] },
          //     else: "",
          //   },
          // },
        },
      },
      {
        $sort: {
          po_no: 1,
        },
      },
    ]);

    if (grn_po_list.length) {
      return res.status(200).send({
        status_code: 200,
        message: "GRN Failed attempts PO list",
        count: grn_po_list.length,
        data: grn_po_list,
      });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "PO not available",
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


exports.get_grn_po_item_list_auto = async (req, res) => {
 
  try {
    var { company_code, plant_id, po_no, sto_no  } = req.query;

    if (!(company_code && plant_id && po_no && sto_no)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    let grn_po_item_list = await inward_po_table.aggregate([
      {
        $match: {
          company_code,
          plant_id,
          po_no,
          sto_number :sto_no,
          // po_grn_status: "failed",
        },
      },
      {
        $lookup: {
          from: "rapid_sap_logs",
          localField: "sto_number",
          foreignField: "primaryData",
          let: { po_item_code: "$item_code" },
          pipeline: [
            {
              $unwind: {
                path: "$request.Item",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $match: {
                $expr: {
                  $eq: ["$request.Item.material_no", "$$po_item_code"],
                },
              },
            },
            {
              $match: {
                "response.flag": "E",
              },
            },
            {
              $sort: {
                createdAt: -1,
              },
            },
            {
              $project: {
                _id: 0,
                primaryData: 1,
                createdAt: 1,
                failure_message: "$response.remarks",
              },
            },
          ],
          as: "sap_log",
        },
      },
      {
        $addFields: {
          sap_po_status: { $arrayElemAt: ["$sap_log", 0] },
        },
      },
      {
        $project: {
          // sap_log: 1,
          _id: 0,
          po_no: 1,
          po_type: 1,
          // sap_po_status: 1,
          sto_number: { $ifNull: ["$sto_number", "-"] },
          asn_no: { $ifNull: ["$inbound_delivery_number", "-"] },
          po_grn_status: 1,
          status: { $arrayElemAt: ["$sap_po_status.failure_message", 0] },
          vendor_code: "$supplier_no",
          vendor_name: "$supplier_name",
          item_code: "$item_code",
          item_name: "$item_name",
          uom: "$uom",
          ordered_qty: "$ordered_qty",
          inward_qty: {$trunc:["$total_net_qty",2]},
          total_net_qty: {$trunc:["$total_net_qty",2]},
          po_qty:"$po_qty",
          grn_posted_qty:{$trunc:[{
            $cond: {
              if: {
                // $not: {
                //   $eq: ["$total_grn_post_qty", null],
                // },
                $ifNull: ["$total_grn_post_qty", false],
              },
              then: "$total_grn_post_qty",
              else: 0,
            },
          },2]}
           ,
          grn_pending_qty:{$trunc:[{
            $cond: {
              if: {
                $ifNull: ["$total_grn_post_qty", false],
                // $not: {
                //   $eq: ["$total_grn_post_qty", null],
                // },
              },
              then :{
                $cond :{
                  if:{
                    $lt :[{ $subtract: ["$total_net_qty", "$total_grn_post_qty"] },0]
                  },
                  then :0,
                  else : { $subtract: ["$total_net_qty", "$total_grn_post_qty"] }
                }
              },
              // then: { $subtract: ["$total_net_qty", "$total_grn_post_qty"] },
              else: "$total_net_qty",
            },
            // $subtract: ["$total_net_qty", "$total_grn_post_qty"],
          },2]}
           ,
        },
      },
    ]);

    if (grn_po_item_list.length) {
      return res.status(200).send({
        status_code: 200,
        message: "GRN po item list",
        data: grn_po_item_list,
      });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "PO not available",
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

exports.get_grn_po_item_list_vendor = async (req, res) => {
  try {
    var { company_code, plant_id, po_no , asn_no } = req.query;

    if (!(company_code && plant_id && po_no)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }


    if(asn_no){
      var match_obj = {
        company_code,
        plant_id,
        po_no,
        inbound_delivery_number:asn_no,
        // po_grn_status: "failed",
      }
    }
    else {
      var match_obj = {
        company_code,
        plant_id,
        po_no,
        // po_grn_status: "failed",
      }
    }


    let grn_po_item_list = await inward_po_table.aggregate([
      {
        $match:match_obj ,
      },
      {
        $lookup: {
          from: "rapid_sap_logs",
          localField: "po_no",
          foreignField: "primaryData",
          let: { po_item_code: "$item_code" },
          pipeline: [
            {
              $unwind: {
                path: "$request.Item",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $match: {
                $expr: {
                  $eq: ["$request.Item.material_no", "$$po_item_code"],
                },
              },
            },
            {
              $match: {
                "response.flag": "E",
              },
            },
            {
              $sort: {
                createdAt: -1,
              },
            },
            {
              $project: {
                _id: 0,
                primaryData: 1,
                createdAt: 1,
                failure_message: "$response.remarks",
              },
            },
          ],
          as: "sap_log",
        },
      },
      {
        $lookup :{
          from: "rapid_sap_logs",
          localField: "po_no",
          foreignField: "primaryData",
          pipeline :[
            {
              $match :{
                "response.flag":"S"
              }
            }
          ],
          as :"grn_detail"
        }
      },
      {
        $addFields: {
          sap_po_status: { $arrayElemAt: ["$sap_log", 0] },
        },
      },
      {
        $project: {
          // sap_log: 1,
          _id: 0,
          po_no: 1,
          po_type: 1,
          // sap_po_status: 1,
          // asn_no :"$inbound_delivery_number",
          // sto_no:"$sto_number",
          sto_number: { $ifNull: ["$sto_number", "-"] },
          asn_no: { $ifNull: ["$inbound_delivery_number", "-"] },
          po_grn_status: 1,
          status: { $arrayElemAt: ["$sap_po_status.failure_message", 0] },
          vendor_code: "$supplier_no",
          vendor_name: "$supplier_name",
          item_code: "$item_code",
          item_name: "$item_name",
          uom: "$uom",
          ordered_qty: "$ordered_qty",
          // inward_qty: "$total_net_qty",
          // total_net_qty: "$total_net_qty",
          inward_qty: {$trunc:["$total_net_qty",2]},
          total_net_qty: {$trunc:["$total_net_qty",2]},
          po_qty:"$po_qty",
          grn_posted_qty: {$trunc:[{
            $cond: {
              if: {
                // $not: {
                //   $eq: ["$total_grn_post_qty", null],
                // },
                $ifNull: ["$total_grn_post_qty", false],
              },
              then: "$total_grn_post_qty",
              else: 0,
            },
          },2]},
          grn_pending_qty: {$trunc:[{
            $cond: {
              if: {
                $ifNull: ["$total_grn_post_qty", false],
                // $not: {
                //   $eq: ["$total_grn_post_qty", null],
                // },
              },
              then: { $subtract: ["$total_net_qty", "$total_grn_post_qty"] },
              else: "$total_net_qty",
            },
            // $subtract: ["$total_net_qty", "$total_grn_post_qty"],
          },2]},
        },
      },
    ]);

    if (grn_po_item_list.length) {
      return res.status(200).send({
        status_code: 200,
        message: "GRN po item list",
        data: grn_po_item_list,
      });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "PO not available",
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



exports.get_failed_po_list_mode_type = async (req,res) =>{
  try {
    var { company_code, plant_id, document_date } = req.query;



    if (!(company_code && plant_id && document_date )) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    console.log("checked");
        
    let get_failed_po_mode_list = await inward_po_table.aggregate([
      {
        $match: {
          company_code,
          plant_id,
          document_date,
          po_grn_status: "failed",
        },
      },
      {
        $unwind:"$inward_crate_details"
      },
      {
        $group :{
          _id:"$inward_crate_details.mode",
          mode:{$first:"$inward_crate_details.mode"}
        }
      },
      {
        $match :{
          mode :{$in:["vendorinward","autoinward"]}
        }
      },
      {
        $project :{
          _id:0,
          mode:{$cond :{
            if :{
              $eq :["$mode","vendorinward"]
            },
            then :"Vendor",
            else :"Auto"
          }
        }
        }
      }
    ])

  


    if(get_failed_po_mode_list.length) {
      return res.send({status_code:200,message:"Mode list",data:get_failed_po_mode_list})
    }
    else {
      return res.status(400).send({status_code:400,message:"Mode not available!"})
    }


  }
  catch(error){
    return res.status(500).send({
      status_code: 500,
      message:
        error.message || "Some error occurred while retrieving purchase order",
    });
  }
}

exports.get_pending_po_list_mode_type = async (req,res) =>{
  try {
    var { company_code, plant_id, document_date } = req.query;



    if (!(company_code && plant_id && document_date )) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    console.log("checked");
        
    let get_failed_po_mode_list = await inward_po_table.aggregate([
      {
        $match: {
          company_code,
          plant_id,
          document_date,
          po_grn_status: {$ne:"failed"},
          $expr :{
            $ne:["$total_net_qty", "$total_grn_post_qty"]
          }
          // $eq: ["$total_net_qty", "$total_grn_post_qty"],
        },
      },
      {
        $unwind:"$inward_crate_details"
      },
      {
        $group :{
          _id:"$inward_crate_details.mode",
          mode:{$first:"$inward_crate_details.mode"}
        }
      },
      {
        $match :{
          mode :{$in:["vendorinward","autoinward"]}
        }
      },
      {
        $project :{
          _id:0,
          mode:{$cond :{
            if :{
              $eq :["$mode","vendorinward"]
            },
            then :"Vendor",
            else :"Auto"
          }
        }
        }
      }
    ])

  


    if(get_failed_po_mode_list.length) {
      return res.send({status_code:200,message:"Mode list",data:get_failed_po_mode_list})
    }
    else {
      return res.status(400).send({status_code:400,message:"Mode not available!"})
    }


  }
  catch(error){
    return res.status(500).send({
      status_code: 500,
      message:
        error.message || "Some error occurred while retrieving purchase order",
    });
  }
}

exports.get_success_po_list_mode_type = async (req,res) =>{
  try {
    var { company_code, plant_id, document_date } = req.query;



    if (!(company_code && plant_id && document_date )) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    console.log("checked");
        
    let get_failed_po_mode_list = await inward_po_table.aggregate([
      {
        $match: {
          company_code,
          plant_id,
          document_date,
          total_grn_post_qty: { $gt: 0 },
        },
      },
      {
        $unwind:"$inward_crate_details"
      },
      {
        $group :{
          _id:"$inward_crate_details.mode",
          mode:{$first:"$inward_crate_details.mode"}
        }
      },
      {
        $match :{
          mode :{$in:["vendorinward","autoinward"]}
        }
      },
      {
        $project :{
          _id:0,
          mode:{$cond :{
            if :{
              $eq :["$mode","vendorinward"]
            },
            then :"Vendor",
            else :"Auto"
          }
        }
        }
      }
    ])

  


    if(get_failed_po_mode_list.length) {
      return res.send({status_code:200,message:"Mode list",data:get_failed_po_mode_list})
    }
    else {
      return res.status(400).send({status_code:400,message:"Mode not available!"})
    }


  }
  catch(error){
    return res.status(500).send({
      status_code: 500,
      message:
        error.message || "Some error occurred while retrieving purchase order",
    });
  }
}



// api with mode

exports.get_grn_po_list_with_mode = async (req, res) => {
  try {
    // var { company_code, plant_id, document_date } = req.query;

    // if (!(company_code && plant_id && document_date)) {
    //   return res.send({
    //     status_code: 400,
    //     message: "Missing Parameters!",
    //   });
    // }

    //
    var { company_code, plant_id, document_date, mode } = req.query;

    if (!(company_code && plant_id && document_date && mode)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    if(mode == "Auto"){
      var match_obj ={
        company_code,
        plant_id,
        document_date,
        "inward_crate_details.mode":"autoinward",
        sto_number :{
          $exists:true
        },
        po_grn_status:"pending"
      }

      


      var grp_obj = {
        _id: "$sto_number",
        plant_id: { $first: "$plant_id" },
        sto_number :{$first:"$sto_number"},
        po_no: { $first: "$po_no" },
        po_type: { $first: "$po_type" },
        asn_no:{$first:"$inbound_delivery_number"},
        supplier_no: { $first: "$supplier_no" },
        supplier_name: { $first: "$supplier_name" },
        delivery_date: { $first: "$delivery_date" },
        inward_type:{$first:"$inward_crate_details.mode"},
        total_ordered_qty: { $sum: "$ordered_qty" },
        total_net_qty: { $sum: "$total_net_qty" },
        inward_net_qty: { $sum: "$total_inwarded_qty" },
        total_grn_post_qty: { $sum: "$total_grn_post_qty" },
        po_grn_status: { $addToSet: "$po_grn_status" },
      }
    }
    else {

      var match_obj ={
        company_code,
        plant_id,
        document_date,
        "inward_crate_details.mode":"vendorinward",
        sto_number :{
          $exists:false
        }
  
      }

      var grp_obj = {
        _id:{
          po:"$po_no",
          asn_no:"$inbound_delivery_number"
        },
        plant_id: { $first: "$plant_id" },
        po_no: { $first: "$po_no" },
        asn_no:{$first:"$inbound_delivery_number"},
        sto_number :{$first:"$sto_number"},
        po_type: { $first: "$po_type" },
        supplier_no: { $first: "$supplier_no" },
        supplier_name: { $first: "$supplier_name" },
        delivery_date: { $first: "$delivery_date" },
        inward_type:{$first:"$inward_crate_details.mode"},
        total_ordered_qty: { $sum: "$ordered_qty" },
        total_net_qty: { $sum: "$total_net_qty" },
        inward_net_qty: { $sum: "$total_inwarded_qty" },
        total_grn_post_qty: { $sum: "$total_grn_post_qty" },
        po_grn_status: { $addToSet: "$po_grn_status" },
      }
    }


    //

    let new_grn_po_list = await inward_po_table.aggregate([
      {
        $match: match_obj,
      },
      {
        $group: grp_obj,
      },
      {
        $match: {
          $expr: {
            $not: {
              $gte: ["$total_grn_post_qty","$total_net_qty"],
            },
          },
        },
      },
      // {
      //   $match: {
      //     $expr: { $in: ["pending", "$po_grn_status"] },
      //     // { $in: ["failed", "$po_grn_status"] },
      //   },
      // },
      {
        $project: {
          _id: 0,
          plant_id: 1,
          po_no: 1,
          po_type: 1,
          vendor_code: "$supplier_no",
          vendor_name: "$supplier_name",
          sto_number: { $ifNull: ["$sto_number", "-"] },
          asn_no: { $ifNull: ["$asn_no", "-"] },
          inward_type:{
            $cond :{
              if:{
                $eq :[{ $arrayElemAt: ["$inward_type", 0] },"autoinward"]
              },
              then:"Auto",
              else :"Vendor"
            }
          },
          delivery_date: {
            $dateToString: {
              date: {
                $dateFromString: {
                  dateString: "$delivery_date",
                },
              },
              format: "%d-%m-%Y",
              timezone: "Asia/Kolkata",
              onNull: "",
            },
          },
          grn_status: {
            $cond: {
              if: {
                $gt: ["$total_grn_post_qty", 0],
                // $or: [
                //   { $in: ["success", "$po_grn_status"] },
                //   { $gt: ["$total_grn_post_qty", 0] },
                // ],
              },
              then: "Partially Completed",
              else: "Pending",
            },
          },
        },
      },
    ]);

    // console.log("new_grn_po_list",new_grn_po_list);

    if (new_grn_po_list.length) {
      return res.status(200).send({
        status_code: 200,
        message: "pending and partially completed grn po list",
        count: new_grn_po_list.length,
        data: new_grn_po_list,
      });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "PO not available",
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

exports.get_success_po_list_with_mode = async (req, res) => {
  try {
    var { company_code, plant_id, document_date } = req.query;


    //

    var { company_code, plant_id, document_date, mode } = req.query;

    if (!(company_code && plant_id && document_date && mode)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    if(mode == "Auto"){
      var match_obj ={
        company_code,
        plant_id,
        document_date,
        total_grn_post_qty: { $gt: 0 },
        "inward_crate_details.mode":"autoinward",
        sto_number :{
          $exists:true
        }
      }


      
      var grp_obj = {
        _id: "$sto_number",
        plant_id: { $first: "$plant_id" },
        sto_number :{$first:"$sto_number"},
        po_no: { $first: "$po_no" },
        po_type: { $first: "$po_type" },
        asn_no:{$first:"$inbound_delivery_number"},
        supplier_no: { $first: "$supplier_no" },
        supplier_name: { $first: "$supplier_name" },
        delivery_date: { $first: "$delivery_date" },
        inward_type:{$first:"$inward_crate_details.mode"},
        total_ordered_qty: { $sum: "$ordered_qty" },
        total_net_qty: { $sum: "$total_net_qty" },
        inward_net_qty: { $sum: "$total_inwarded_qty" },
        total_grn_post_qty: { $sum: "$total_grn_post_qty" },
        po_grn_status: { $addToSet: "$po_grn_status" },
        grn_no_list: {
          $addToSet: { $setUnion: "$inward_crate_details.grn_no" },
        }
      }
    }
    else {

      var match_obj ={
        company_code,
        plant_id,
        document_date,
        total_grn_post_qty: { $gt: 0 },
        "inward_crate_details.mode":"vendorinward",
        sto_number :{
          $exists:false
        }
  
      }

      var grp_obj = {
        _id:{
          po:"$po_no",
          asn_no:"$inbound_delivery_number"
        },
        plant_id: { $first: "$plant_id" },
        po_no: { $first: "$po_no" },
        asn_no:{$first:"$inbound_delivery_number"},
        sto_number :{$first:"$sto_number"},
        po_type: { $first: "$po_type" },
        supplier_no: { $first: "$supplier_no" },
        supplier_name: { $first: "$supplier_name" },
        delivery_date: { $first: "$delivery_date" },
        inward_type:{$first:"$inward_crate_details.mode"},
        total_ordered_qty: { $sum: "$ordered_qty" },
        total_net_qty: { $sum: "$total_net_qty" },
        inward_net_qty: { $sum: "$total_inwarded_qty" },
        total_grn_post_qty: { $sum: "$total_grn_post_qty" },
        po_grn_status: { $addToSet: "$po_grn_status" },
        grn_no_list: {
          $addToSet: { $setUnion: "$inward_crate_details.grn_no" },
        }
      }
    }


    //

    let new_grn_po_List = await inward_po_table.aggregate([
      {
        $match: match_obj,
      },
      {
        $group: grp_obj,
      },
      // {
      //   $lookup : {
      //     from: "rapid_sap_logs",
      //     localField: "po_no",
      //     foreignField: "primaryData",
      //     as: "sap_po",
      //   }
      // },
      // {
      //   $match: {
      //     $expr: {
      //       $ne: ["$sap_po", []],
      //     },
      //   },
      // },
      {
        $project: {
          _id:0,
          po_no: 1,
          // po_grn_status: 1,
          // grn_no_list: 1,
          plant_id: 1,
          po_type: 1,
          vendor_code: "$supplier_no",
          vendor_name: "$supplier_name",
          sto_number: { $ifNull: ["$sto_number", "-"] },
          asn_no: { $ifNull: ["$asn_no", "-"] },
          po_type:"$po_type",
          inward_type:{
            $cond :{
              if:{
                $eq :[{ $arrayElemAt: ["$inward_type", 0] },"autoinward"]
              },
              then:"Auto",
              else :"Vendor"
            }
          },
          
          total_ordered_qty: "$total_ordered_qty",
          total_net_qty: "$total_net_qty",
          inward_net_qty: "$inward_net_qty",
          total_grn_post_qty: "$total_grn_post_qty",
          // po_grn_status: "$po_grn_status",
          // grn_no_list: "$grn_no_list",
          delivery_date: {
            $dateToString: {
              date: {
                $dateFromString: {
                  dateString: "$delivery_date",
                },
              },
              format: "%d-%m-%Y",
              timezone: "Asia/Kolkata",
              onNull: "",
            },
          },
          grn_no: {
            $filter: {
              input: {
                $setUnion: {
                  $reduce: {
                    input: "$grn_no_list",
                    initialValue: [],
                    in: { $concatArrays: ["$$value", "$$this"] },
                  },
                },
              },
              as: "num",
              cond: { $ne: ["$$num", null] },
            },
          },
          grn_status: {
            $cond: {
              if: {
                $gte: ["$total_grn_post_qty","$total_net_qty"],
                // $and: [
                //   { $eq: ["$total_net_qty", "$total_grn_post_qty"] },
                //   {
                //     $and: [
                //       { $not: { $in: ["pending", "$po_grn_status"] } },
                //       { $not: { $in: ["failed", "$po_grn_status"] } },
                //     ],
                //   },
                //   // {
                //   //   $not: {
                //   //     $and: [
                //   //       { $in: ["pending", "$po_grn_status"] },
                //   //       { $in: ["failed", "$po_grn_status"] },
                //   //     ],
                //   //   },
                //   // },
                // ],
              },
              then: "Completed",
              else: "Partially Completed",
            },
          },
        },
      },

      {
        $unwind: {
          path: "$grn_no",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $sort: {
          po_no: 1
        }
      }
    ]);

    // return res.send({data:new_grn_po_List})

    if (new_grn_po_List.length) {
      return res.status(200).send({
        status_code: 200,
        message: "GRN Success po list",
        count: new_grn_po_List.length,
        data: new_grn_po_List,
      });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "PO not available",
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

// get grn po item list for success with grn number

exports.get_success_po_item_list_auto = async (req, res) => {
 
  try {
    var { company_code, plant_id, po_no, sto_no, grn_id  } = req.query;

    if (!(company_code && plant_id && po_no && sto_no && grn_id)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }

    let grn_po_item_list = await inward_po_table.aggregate([
      {
        $match:match_obj ,
      },
     
      {
        $unwind :"$inward_crate_details"
      },
      {
        $match:{
          "inward_crate_details.grn_no":grn_id
        }
      },{
        $group :{
          _id:"item_code",
          po_no:{$first:"$po_no"},
          sto_number:{$first:"$sto_number"},
          asn_no:{$first:"$inbound_delivery_number"},
          item_code:{$first:"$item_code"},
          item_name:{$first:"$item_name"},
          uom:{$first:"$uom"},
          grn_posted_qty:{$sum:"$inward_crate_details.net_qty"},
          inward_qty:{$sum:"$inward_crate_details.net_qty"},
          total_net_qty:{$first:"$total_net_qty"},
          total_grn_post_qty:{$first:"$total_grn_post_qty"},
          ordered_qty:{$first:"$ordered_qty"},
        }
      },{
        $project:{

           sto_number: { $ifNull: ["$sto_number", "-"] },
          asn_no: { $ifNull: ["$asn_no", "-"] },
          item_code:"$item_code",
          item_name:"$item_name",
          uom:"$uom",
          grn_posted_qty:"$grn_posted_qty",
          inward_qty:"$inward_qty",
          total_grn_post_qty:"$total_grn_post_qty",
          total_net_qty:"$total_net_qty",
          grn_pending_qty: {
            $cond: {
              if: {
                $ifNull: ["$total_grn_post_qty", false],
                // $not: {
                //   $eq: ["$total_grn_post_qty", null],
                // },
              },
              then: { $subtract: ["$total_net_qty", "$total_grn_post_qty"] },
              else: "$total_net_qty",
            },
            // $subtract: ["$total_net_qty", "$total_grn_post_qty"],
          },
        }
      }
    ]);

    if (grn_po_item_list.length) {
      return res.status(200).send({
        status_code: 200,
        message: "GRN Failed po item list",
        data: grn_po_item_list,
      });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "PO not available",
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

exports.get_success_po_item_list_vendor = async (req, res) => {
  try {
    var { company_code, plant_id, po_no , asn_no, grn_id } = req.query;

    if (!(company_code && plant_id && po_no && grn_id)) {
      return res.send({
        status_code: 400,
        message: "Missing Parameters!",
      });
    }


    if(asn_no){
      var match_obj = {
        company_code,
        plant_id,
        po_no,
        inbound_delivery_number:asn_no,
        "inward_crate_details.grn_no":grn_id
        // po_grn_status: "failed",
      }
    }
    else {
      var match_obj = {
        company_code,
        plant_id,
        po_no,
        "inward_crate_details.grn_no":grn_id
        // po_grn_status: "failed",
      }
    }


    let grn_po_item_list = await inward_po_table.aggregate([
      {
        $match:match_obj ,
      },
     
      {
        $unwind :"$inward_crate_details"
      },
      {
        $match:{
          "inward_crate_details.grn_no":grn_id
        }
      },{
        $group :{
          _id:"item_code",
          po_no:{$first:"$po_no"},
          sto_number:{$first:"$sto_number"},
          asn_no:{$first:"$inbound_delivery_number"},
          item_code:{$first:"$item_code"},
          item_name:{$first:"$item_name"},
          uom:{$first:"$uom"},
          grn_posted_qty:{$sum:"$inward_crate_details.net_qty"},
          inward_qty:{$sum:"$inward_crate_details.net_qty"},
          total_net_qty:{$first:"$total_net_qty"},
          total_grn_post_qty:{$first:"$total_grn_post_qty"},
          ordered_qty:{$first:"$ordered_qty"},
        }
      },{
        $project:{

           sto_number: { $ifNull: ["$sto_number", "-"] },
          asn_no: { $ifNull: ["$asn_no", "-"] },
          item_code:"$item_code",
          item_name:"$item_name",
          uom:"$uom",
          grn_posted_qty:"$grn_posted_qty",
          inward_qty:"$inward_qty",
          total_grn_post_qty:"$total_grn_post_qty",
          total_net_qty:"$total_net_qty",
          grn_pending_qty: {
            $cond: {
              if: {
                $ifNull: ["$total_grn_post_qty", false],
                // $not: {
                //   $eq: ["$total_grn_post_qty", null],
                // },
              },
              then: { $subtract: ["$total_net_qty", "$total_grn_post_qty"] },
              else: "$total_net_qty",
            },
            // $subtract: ["$total_net_qty", "$total_grn_post_qty"],
          },
        }
      }
    ]);

    if (grn_po_item_list.length) {
      return res.status(200).send({
        status_code: 200,
        message: "GRN success po item list",
        data: grn_po_item_list,
      });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "PO not available",
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

