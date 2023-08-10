"use strict";

const { string } = require("joi");
const db = require("../../models");
const { create } = require("../sales_order/sales_order.controller");
const moment = require("moment");
const moment_tz = require("moment-timezone");
const {
  createIndexes,
} = require("../../models/allocation_generate/allocation_generate");
const axios = require("axios");
const { get } = require("lodash");
const rapid_palletization_v2Model = require("../../models/palletization/rapid_palletization_v2.model");
const sap_grn_creation_logs = db.sap_logs_model;

const inwardProcess = db.inwardProcess;
const purchaseOrder = db.purchaseOrder;
const palletization = db.palletization;
const palletization_table_v2 = db.palletizationV2;
const asn_table = db.asnDetails;
const conveyorCommandTable = db.conveyorCommand;
const sap_url = process.env.SAP_URL;
const sap_auth = process.env.SAP_AUTH;
const files_url_details_table = db.files_url_details;

// get all inward process
exports.findAll = async (req, res) => {
  console.log("calling get all inward process details..");

  try {
    let inwardProcessDetails;
    const { page, company_code, plant_id, delivery_date } = req.query;

    if (!(company_code && plant_id && delivery_date))
      return res.status(400).send({
        message: "Missing parameter",
      });

    if (!page) {
      inwardProcessDetails = await inwardProcess.aggregate([
        {
          $match: {
            company_code: company_code,
            plant_id: plant_id,
            delivery_date: delivery_date,
          },
        },
        { $sort: { po_no: 1, item_no: 1 } },
      ]);
    } else {
      let skipCount = page == 1 ? 0 : +page * 25 - 25;
      let dataCount = page * 25;

      inwardProcessDetails = await inwardProcess.aggregate([
        {
          $match: {
            company_code: company_code,
            plant_id: plant_id,
            delivery_date: delivery_date,
          },
        },
        { $sort: { po_no: 1, item_no: 1 } },
        { $skip: skipCount },
        { $limit: dataCount },
      ]);

      serialNo = page == 1 ? 0 : page * 25 - 25;
    }

    let mssge = "Inward details is available";

    if (inwardProcessDetails.length == 0)
      mssge = "Inward details is not available!";

    return res.send({
      message: mssge,
      totalDataCount: inwardProcessDetails.length,
      data: inwardProcessDetails,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message: "Some error occurred while retrieving inward process data",
    });
  }
};

//get specific crate details
exports.getCrateDetails = async (req, res) => {
  console.log("calling get inward crate details api");

  try {
    const id = req.params.id;

    let crateDetails = await inwardProcess.findById(id, {
      _id: 0,
      inward_crate_details: 1,
    });

    let mssge;

    if (crateDetails != null) {
      mssge = "Crate details is available";
      crateDetails = crateDetails.inward_crate_details;
    } else {
      mssge = "Crate details is not available!";
      crateDetails = [];
    }

    return res.send({ message: mssge, data: crateDetails });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .send({ message: "Some error occurred while extracting crate details!" });
  }
};

// get last inserted entry
exports.findLastEntry = async (req, res) => {
  console.log("calling get last inward process details..");

  const plant_id = req.query.plant_id;

  if (!plant_id)
    return res.status(400).send({ message: "Please provide plant id" });

  await inwardProcess
    .find({ plant_id: plant_id })
    .sort({ _id: -1 })
    .limit(1)
    .then((lastInwardProcess) => {
      let data = {};

      if (lastInwardProcess.length != 0) {
        lastInwardProcess = lastInwardProcess[0];

        data = {
          serial_no: 1,
          po_no: lastInwardProcess.po_no,
          item_id: lastInwardProcess.item_code,
          item_name: lastInwardProcess.item_name,
          total_crate: "1",
          total_crate_weight: lastInwardProcess.crate_tare,
          ordered_qty: lastInwardProcess.ordered_qty,
          received_qty: lastInwardProcess.actual_qty,
          inward_qty: lastInwardProcess.ordered_qty,
          free_qty: "-",
          rejected_qty: "-",
          inward_by: "-",
          inward_date: moment(lastInwardProcess.created_at).format(
            "DD-MM-YYYY"
          ),
          update_status: "-",
        };
      }
      return res.send({
        data: data,
      });
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).send({
        message:
          "Some error occurred while retrieving last inserted inward process details.",
      });
    });
};

exports.getItemDetails = async (req, res) => {
  console.log("get particular item details with po pending qty");

  const {
    company_code,
    plant_id,
    delivery_date,
    po_type,
    supplier_no,
    po_no,
    item_no,
    item_code,
  } = req.query;

  if (
    !(
      company_code &&
      plant_id &&
      delivery_date &&
      po_type &&
      supplier_no &&
      po_no &&
      item_no &&
      item_code
    )
  )
    return res.status(400).send({ message: "Provide all required parameters" });

  const vendorNo = supplier_no == plant_id ? "" : supplier_no;

  try {
    let material_details = await db.product_weight_model.findOne({
      company_code: company_code,
      plant_id: plant_id,
      material_code: item_code,
      pallet_capacity: { $exists: true },
      layer_count: { $exists: true },
    });
    if (!material_details) {
      return res
        .status(400)
        .send({ message: "item code does not exist in weight tolerance" });
    }

    let itemDetails = await db.purchaseOrder.aggregate([
      {
        $match: {
          company_code: company_code,
          supplying_plant: plant_id,
          delivery_date: delivery_date,
          po_document_type: po_type,
          vendor_no: vendorNo,
          po_number: po_no,
        },
      },
      { $unwind: "$item" },
      {
        $match: {
          "item.item_no": item_no,
          "item.material_no": item_code,
        },
      },
      {
        $project: {
          _id: 0,
          "item.item_no": 1,
          "item.material_no": 1,
          "item.material_description": 1,
          "item.quantity": 1,
          "item.net_price": 1,
          "item.uom": 1,
        },
      },
    ]);

    const getPendingQty = await inwardProcess.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        delivery_date: delivery_date,
        po_type: po_type,
        supplier_no: supplier_no,
        po_no: po_no,
        item_code: item_code,
        item_no: item_no,
      },
      {
        _id: 0,
        total_pending_qty: 1,
        total_inwarded_qty: 1,
        total_net_qty: 1,
        total_extra_qty: 1,
        invoice_no: 1,
        inward_crate_details: 1,
        total_crates: 1,
      }
    );

    if (itemDetails.length > 0) {
      itemDetails = itemDetails[0];

      if (getPendingQty != null) {
        console.log("entered if");

        itemDetails.total_pending_qty = getPendingQty.total_pending_qty;
        itemDetails.total_inwarded_qty = getPendingQty.total_inwarded_qty;
        itemDetails.total_net_qty = getPendingQty.total_net_qty;
        itemDetails.total_extra_qty = getPendingQty.total_extra_qty;
        itemDetails.invoice_no = getPendingQty.invoice_no;
        itemDetails.crate_tare =
          getPendingQty.inward_crate_details[
            getPendingQty.inward_crate_details.length - 1
          ].crate_tare.toString();
        itemDetails.carrier_count = getPendingQty.total_crates;
        itemDetails.item.act_qty = material_details.qty_in_kg || 0;
      } else {
        console.log("entered else");
        itemDetails.total_pending_qty = itemDetails.item["quantity"];
        itemDetails.total_inwarded_qty = 0;
        itemDetails.total_net_qty = 0;
        itemDetails.total_extra_qty = 0;
        itemDetails.invoice_no = "";
        itemDetails.crate_tare = "";
        itemDetails.carrier_count = 0;
        itemDetails.item.act_qty = material_details.qty_in_kg || 0;
      }

      return res.send({
        message: "Item Details is available",
        data: itemDetails,
      });
    } else
      return res.send({
        message: "Item Details is not available!",
        data: {},
      });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message: "Some error occurred while filtering specific item details",
    });
  }
};

exports.itemDetails_v2 = async (req, res) => {
  console.log("calling get item details api");
  const {
    company_code,
    plant_id,
    document_date,
    po_no,
    po_type,
    supplier_no,
    item_code,
    item_no,
    asn_no,
  } = req.query;
  try {
    if (
      !(
        company_code &&
        document_date &&
        plant_id &&
        po_no &&
        po_type &&
        supplier_no &&
        item_code &&
        item_no &&
        asn_no
      )
    )
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    let mssge = "PO based inward details available";
    let status = 200;
    let data = {};
    let material_details = await db.product_weight_model.findOne({
      company_code: company_code,
      plant_id: plant_id,
      material_code: item_code,
      pallet_capacity: { $exists: true },
      layer_count: { $exists: true },
    });
    if (!material_details) {
      return res
        .status(400)
        .send({ message: "item code does not exist in weight tolerance" });
    }

    let condition = {
      company_code: company_code,
      plant_id: plant_id,
      po_no: po_no,
      po_type: po_type,
      supplier_no: supplier_no,
      item_code: item_code,
      item_no: item_no,
    };

    if (asn_no) {
      condition.inbound_delivery_number = asn_no;
    }

    const inwardDetails = await inwardProcess.findOne(condition, {
      _id: 0,
      item_code: 1,
      item_name: 1,
      item_no: 1,
      uom: 1,
      ordered_qty: 1,
      total_inwarded_qty: 1,
      total_net_qty: 1,
      total_pending_qty: 1,
      total_crates: 1,
      invoice_no: 1,
      delivery_date: 1,
      po_qty: 1,
      purchase_group: 1,
      asn_item_no: 1,
    });
    //console.log("inwardDetails",inwardDetails);
    if (inwardDetails != null)
      data = {
        invoice_no: inwardDetails.invoice_no,
        uom: inwardDetails.uom,
        asn_ordered_qty: inwardDetails.ordered_qty,
        inwarded_qty: inwardDetails.total_inwarded_qty,
        pending_qty: inwardDetails.total_pending_qty,
        net_qty: inwardDetails.total_net_qty,
        crate_count: inwardDetails.total_crates,
        delivery_date: inwardDetails.delivery_date,
        po_order_qty: inwardDetails.po_qty,
        purchase_group: inwardDetails.purchase_group,
        asn_item_no: inwardDetails.asn_item_no ? inwardDetails.asn_item_no : "",
        act_qty: material_details.qty_in_kg || 0,
      };
    else {
      console.log("else");
      const itemDetails = await db.purchaseOrder.aggregate([
        {
          $match: {
            company_code: company_code,
            supplying_plant: plant_id,
            document_date: document_date,
            po_document_type: po_type,
            vendor_no: supplier_no,
            po_number: po_no,
          },
        },
        { $unwind: "$item" },
        {
          $match: {
            "item.item_no": item_no,
            "item.material_no": item_code,
          },
        },
        {
          $project: {
            _id: 0,
            "item.item_no": 1,
            "item.material_no": 1,
            "item.material_description": 1,
            "item.quantity": 1,
            "item.net_price": 1,
            "item.uom": 1,
            delivery_date: 1,
            purchase_group: 1,
          },
        },
      ]);
      console.log(itemDetails);
      if (itemDetails.length > 0) {
        let asn_data = await asn_table.aggregate([
          {
            $match: {
              company_code: company_code,
              po_type: po_type,
              po_number: po_no,
            },
          },
          { $unwind: "$item" },
          {
            $match: {
              "item.inbound_delivery_number": asn_no,
              "item.plant": plant_id,
              "item.material": item_code,
            },
          },
          {
            $limit: 1,
          },
          {
            $project: {
              _id: 0,
              item_no: "$item.po_item",
              item_code: "$item.material",
              item_name: "$item.material_description",
              asn_qty: "$item.inbound_delivery_qty",
              asn_item_no: "$item.inbound_delivery_item_no",
            },
          },
        ]);

        var asn_qty = 0,
          asn_item_no = "";
        if (asn_data.length) {
          asn_qty = asn_data[0].asn_qty;
          asn_item_no = asn_data[0].asn_item_no;
        }

        data = {
          invoice_no: "",
          uom: itemDetails[0].item["uom"],
          asn_ordered_qty: asn_qty ? +asn_qty : 0,
          inwarded_qty: 0,
          net_qty: 0,
          pending_qty:
            asn_qty != undefined ? +asn_qty : itemDetails[0].item["quantity"],
          crate_count: 0,
          delivery_date: itemDetails[0].delivery_date,
          po_order_qty: itemDetails[0].item["quantity"],
          purchase_group: itemDetails[0].purchase_group,
          asn_item_no: asn_item_no ? asn_item_no : "",
          act_qty: material_details.qty_in_kg || 0,
        };
      } else {
        status = 404;
        mssge = "PO based inward details not found!";
      }
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
      message: "Some error occurred while extracting item inward details!",
    });
  }
};

exports.getItemDetails_clone = async (req, res) => {
  console.log("calling get item details api");

  const {
    company_code,
    plant_id,
    document_date,
    po_no,
    po_type,
    supplier_no,
    item_code,
    item_no,
    asn_no,
  } = req.query;

  try {
    if (
      !(
        company_code &&
        document_date &&
        plant_id &&
        po_no &&
        po_type &&
        supplier_no &&
        item_code &&
        item_no
      )
    ) {
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });
    }

    let mssge = "PO based inward details available";
    let status = 200;
    let data = {};

    let condition = {
      company_code: company_code,
      plant_id: plant_id,
      po_no: po_no,
      po_type: po_type,
      supplier_no: supplier_no,
      item_code: item_code,
      item_no: item_no,
    };

    if (asn_no) {
      condition.inbound_delivery_number = asn_no;
    }
    let material_details = await db.product_weight_model.findOne({
      company_code: company_code,
      plant_id: plant_id,
      material_code: item_code,
      pallet_capacity: { $exists: true },
      layer_count: { $exists: true },
    });
    if (!material_details) {
      return res
        .status(400)
        .send({ message: "item code does not exist in weight tolerance" });
    }
    const inwardDetails = await inwardProcess.findOne(condition, {
      _id: 0,
      item_code: 1,
      item_name: 1,
      item_no: 1,
      uom: 1,
      ordered_qty: 1,
      total_inwarded_qty: 1,
      total_net_qty: 1,
      total_pending_qty: 1,
      total_crates: 1,
      invoice_no: 1,
      delivery_date: 1,
      po_qty: 1,
      purchase_group: 1,
      asn_item_no: 1,
    });

    if (inwardDetails !== null) {
      data = {
        invoice_no: inwardDetails.invoice_no,
        uom: inwardDetails.uom,
        asn_ordered_qty: inwardDetails.ordered_qty,
        inwarded_qty: inwardDetails.total_inwarded_qty,
        pending_qty: inwardDetails.total_pending_qty,
        net_qty: inwardDetails.total_net_qty,
        crate_count: inwardDetails.total_crates,
        delivery_date: inwardDetails.delivery_date,
        po_order_qty: inwardDetails.po_qty,
        purchase_group: inwardDetails.purchase_group,
        asn_item_no: inwardDetails.asn_item_no ? inwardDetails.asn_item_no : "",
        act_qty: material_details.qty_in_kg || 0,
      };
    } else {
      console.log("else");
      const itemDetails = await db.purchaseOrder.aggregate([
        {
          $match: {
            company_code: company_code,
            supplying_plant: plant_id,
            document_date: document_date,
            po_document_type: po_type,
            vendor_no: supplier_no,
            po_number: po_no,
          },
        },
        { $unwind: "$item" },
        {
          $match: {
            "item.item_no": item_no,
            "item.material_no": item_code,
          },
        },
        {
          $project: {
            _id: 0,
            "item.item_no": 1,
            "item.material_no": 1,
            "item.material_description": 1,
            "item.quantity": 1,
            "item.net_price": 1,
            "item.uom": 1,
            delivery_date: 1,
            purchase_group: 1,
          },
        },
      ]);

      if (itemDetails.length > 0) {
        let asn_data = await asn_table.aggregate([
          {
            $match: {
              company_code: company_code,
              po_type: po_type,
              po_number: po_no,
            },
          },
          { $unwind: "$item" },
          {
            $match: {
              "item.inbound_delivery_number": asn_no,
              "item.plant": plant_id,
              "item.material": item_code,
            },
          },
          {
            $limit: 1,
          },
          {
            $project: {
              _id: 0,
              item_no: "$item.po_item",
              item_code: "$item.material",
              item_name: "$item.material_description",
              asn_qty: "$item.inbound_delivery_qty",
              asn_item_no: "$item.inbound_delivery_item_no",
            },
          },
        ]);

        let asn_qty = 0;
        let asn_item_no = "";

        if (asn_data.length) {
          asn_qty = asn_data[0].asn_qty;
          asn_item_no = asn_data[0].asn_item_no;
        }

        data = {
          invoice_no: "",
          uom: itemDetails[0].item["uom"],
          asn_ordered_qty: asn_qty ? +asn_qty : 0,
          inwarded_qty: 0,
          net_qty: 0,
          pending_qty:
            asn_qty !== undefined ? +asn_qty : itemDetails[0].item["quantity"],
          crate_count: 0,
          delivery_date: itemDetails[0].delivery_date,
          po_order_qty: itemDetails[0].item["quantity"],
          purchase_group: itemDetails[0].purchase_group,
          asn_item_no: asn_item_no ? asn_item_no : "",
          act_qty: material_details.qty_in_kg || 0,
        };
      } else {
        status = 404;
        mssge = "PO based inward details not found!";
      }
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
      message: "Some error occurred while extracting item inward details!",
    });
  }
};

exports.getCarrierCountPerPallet = async (req, res) => {
  console.log("calling get carrier count per pallet api");
  const {
    company_code,
    plant_id,
    delivery_date,
    po_type,
    supplier_no,
    po_no,
    item_no,
    item_code,
    pallet_barcode,
    inbound_delivery_number,
  } = req.query;

  if (
    !(
      company_code &&
      plant_id &&
      delivery_date &&
      po_type &&
      supplier_no &&
      po_no &&
      item_no &&
      item_code &&
      pallet_barcode
    )
  )
    return res.status(400).send({ message: "Provide all required parameters" });

  const vendorNo = supplier_no == plant_id ? "" : supplier_no;

  try {
    const getPalletDetails = await palletization.findOne({
      pallet_barcode_value: pallet_barcode,
      company_code: company_code,
      plant_id: plant_id,
      is_deleted: false,
    });

    // console.log('getPalletDetails',getPalletDetails);

    if (!getPalletDetails) {
      return res.status(404).send({
        message: "Please rescan the pallet!",
        data: {},
      });
    }
    if (getPalletDetails.pallet_status != "Assigned") {
      if (getPalletDetails.po_number != po_no) {
        return res.status(404).send({
          message: "Pallet is used for different po!",
          data: {},
        });
      } else if (getPalletDetails.item_code != item_code) {
        return res.status(404).send({
          message: "Pallet is used for different material!",
          data: {},
        });
      }
    }
    let data = {
      company_code: company_code,
      plant_id: plant_id,
      delivery_date: delivery_date,
      po_type: po_type,
      supplier_no: supplier_no,
      po_no: po_no,
      item_code: item_code,
      item_no: item_no,
    };
    if (inbound_delivery_number) {
      data.inbound_delivery_number = inbound_delivery_number;
    }

    const getCarriers = await inwardProcess.findOne(data, {
      _id: 0,
      inward_crate_details: 1,
    });

    const getPalletCapacity = await db.product_weight_model.findOne(
      {
        company_code: company_code,
        material_code: item_code,
      },
      { _id: 0, pallet_capacity: 1, layer_count: 1 }
    );

    let countPerPallet = {};

    if (getCarriers != null && getPalletCapacity != null) {
      //
      countPerPallet.pallet_capacity = getPalletCapacity.pallet_capacity;

      countPerPallet.crate_count_per_pallet =
        getCarriers.inward_crate_details.filter(
          (crate_details) => crate_details.pallet_barcode == pallet_barcode
        ).length;

      countPerPallet.layer_count = getPalletCapacity.layer_count;

      //
    } else if (getPalletCapacity == null)
      return res.status(404).send({
        message: "Pallet capacity is not available!",
        data: {},
      });
    else {
      countPerPallet.pallet_capacity = getPalletCapacity.pallet_capacity;
      countPerPallet.crate_count_per_pallet = 0;
      countPerPallet.layer_count = getPalletCapacity.layer_count;
    }

    return res.send({
      message: "Carrier count per pallet is available",
      data: countPerPallet,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message: "Some error occurred while extracting carrier count per pallet!",
    });
  }
};
exports.getCarrierCountPerPallet_po = async (req, res) => {
  console.log("calling get carrier count per pallet api");
  const {
    company_code,
    plant_id,
    delivery_date,
    po_type,
    supplier_no,
    po_no,
    item_no,
    item_code,
    pallet_barcode,
  } = req.query;

  if (
    !(
      company_code &&
      plant_id &&
      delivery_date &&
      po_type &&
      supplier_no &&
      po_no &&
      item_no &&
      item_code &&
      pallet_barcode
    )
  )
    return res.status(400).send({ message: "Provide all required parameters" });

  const vendorNo = supplier_no == plant_id ? "" : supplier_no;

  try {
    const getPalletDetails = await palletization.findOne({
      pallet_barcode_value: pallet_barcode,
      company_code: company_code,
      plant_id: plant_id,
      is_deleted: false,
    });

    const getPalletDetails_v2 = await palletization_table_v2.findOne({
      pallet_barcode_value: pallet_barcode,
      company_code: company_code,
      plant_id: plant_id,
      is_deleted: false,
    });

    if (!(getPalletDetails || getPalletDetails_v2)) {
      return res.status(404).send({
        message: "Please rescan the pallet!",
        data: {},
      });
    }
    if (getPalletDetails_v2.pallet_status != "Assigned") {
      if (getPalletDetails_v2.po_number != po_no) {
        return res.status(404).send({
          message: "Pallet is used for different po!",
          data: {},
        });
      }
      // else if (getPalletDetails.item_code != item_code) {
      //   return res.status(404).send({
      //     message: "Pallet is used for different material!",
      //     data: {},
      //   });
      // }
    }

    const getCarriers = await inwardProcess.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          po_type: po_type,
          supplier_no: supplier_no,
          po_no: po_no,
          item_code: item_code,
          item_no: item_no,
        },
      },
      { $match: { "inward_crate_details.pallet_barcode": pallet_barcode } },
    ]);

    let countPerPallet = {};

    if (getCarriers != null) {
      countPerPallet.crate_count_per_pallet = getCarriers.reduce(
        (acc, obj) => acc + obj.total_crates,
        0
      );

      // countPerPallet.layer_count = getPalletCapacity.layer_count;

      //
    } else {
      countPerPallet.pallet_capacity = getPalletCapacity.pallet_capacity;
      countPerPallet.crate_count_per_pallet = 0;
      countPerPallet.layer_count = getPalletCapacity.layer_count;
    }

    return res.send({
      message: "Carrier count per pallet is available",
      data: countPerPallet,
      // data1: getCarriers,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message: "Some error occurred while extracting carrier count per pallet!",
    });
  }
};

// new inward process entry
exports.createOne = async (req, res) => {
  console.log("Insert new inward process");
  const {
    company_code,
    plant_id,
    delivery_date,
    supplier_name,
    supplier_no,
    po_type,
    po_no,
    item_no,
    item_code,
    item_name,
    ordered_qty,
    uom,
    unit_price,
    actual_qty,
    invoice_no,
    crate_tare,
    crate_barcode_value,
    pallet_capacity,
    pallet_barcode,
    inwarded_by,
    // asn_no,
    // asn_qty,
  } = req.body;
  // var ordered_qty = req.body.ordered_qty;

  if (
    !(
      company_code &&
      plant_id &&
      delivery_date &&
      supplier_name &&
      supplier_no &&
      po_type &&
      po_no &&
      item_no &&
      item_code &&
      item_name &&
      ordered_qty != undefined &&
      uom &&
      unit_price &&
      actual_qty != undefined &&
      invoice_no &&
      crate_tare != undefined &&
      crate_barcode_value &&
      pallet_capacity &&
      pallet_barcode &&
      inwarded_by
    )
  )
    return res
      .status(400)
      .send({ message: "Please provide all required parameters" });

  try {
    if (+actual_qty == 0)
      return res.send({ message: "Actual qty should not be 'zero'" });

    if (+actual_qty <= +crate_tare)
      return res.send({
        message: "Crate tare must be less than actual qty!",
      });
    // ordered_qty = asn_no !== "0" ? asn_qty : ordered_qty;

    const filter = {
      company_code: company_code,
      plant_id: plant_id,
      delivery_date: delivery_date,
      po_no: po_no,
      po_type: po_type,
      supplier_no: supplier_no,
      item_code: item_code,
      item_no: item_no,
    };

    // item_no and bar code should be unique
    const checkForDuplicate = await inwardProcess
      .find({
        company_code: company_code,
        plant_id: plant_id,
        "inward_crate_details.crate_barcode_value": crate_barcode_value,
      })
      .countDocuments();

    if (checkForDuplicate != 0)
      return res
        .status(409)
        .send({ message: "Duplicate barcode not allowed!" });

    const tolerance = await db.product_weight_model.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        material_code: item_code,
      },
      { _id: 0, pieces_per_bin: 1, qty_in_kg: 1, qty_in_pack: 1 }
    );

    if (tolerance == null)
      return res.status(404).send({
        message:
          "Weight tolerance data is not available for the selected material code!",
      });

    const checkExistingEntry = await inwardProcess.findOne(filter);

    // before inward getting time in indian
    const inwardedTime = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("DD-MM-YYYY HH:mm:ss");

    const lastInwardedTime = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("DD-MM-YYYY hh:mm:ss A");

    let flag = 0;

    if (checkExistingEntry == null) {
      let newDataEntry = req.body;

      // newDataEntry.ordered_qty = asn_no !== "0" ? asn_qty : ordered_qty;
      //data
      let net_qty = +actual_qty - +crate_tare;

      if (tolerance.pieces_per_bin > 0 && uom == "PAC") {
        newDataEntry.total_inwarded_qty = tolerance.qty_in_pack;

        newDataEntry.total_pending_qty =
          +ordered_qty - 1 * tolerance.qty_in_pack;

        newDataEntry.total_extra_qty = 0;

        //
      } else if (uom == "PAC") {
        newDataEntry.total_inwarded_qty = 1;

        newDataEntry.total_pending_qty = +ordered_qty - 1;

        newDataEntry.total_extra_qty = 0;
      } else {
        newDataEntry.total_inwarded_qty = (+actual_qty).toFixed(2);

        newDataEntry.total_pending_qty = (
          net_qty > +ordered_qty ? 0 : +ordered_qty - net_qty
        ).toFixed(2);
        newDataEntry.total_extra_qty = (
          net_qty > +ordered_qty ? net_qty - +ordered_qty : 0
        ).toFixed(2);
      }
      newDataEntry.total_crates = 1;
      newDataEntry.total_crates_weight = (+crate_tare).toFixed(2);
      newDataEntry.total_net_qty = net_qty.toFixed(2);
      // newDataEntry.pallet_stacked_count = 0;

      newDataEntry.inward_crate_details = [
        {
          crate_barcode_value: crate_barcode_value,
          inwarded_qty: (+actual_qty).toFixed(2),
          crate_tare: (+crate_tare).toFixed(2),
          net_qty: net_qty.toFixed(2),
          pallet_barcode: pallet_barcode,
          inwarded_by: inwarded_by,
          inwarded_time: inwardedTime,
        },
      ];

      // checking for the first entry
      if (
        !(await db.palletization.findOne({
          company_code: company_code,
          plant_id: plant_id,
          pallet_barcode_value: pallet_barcode,
          pallet_status: "Assigned",
        }))
      )
        return res
          .status(409)
          .send({ message: "Provided pallet is not assigned!" });

      await inwardProcess.create(newDataEntry);
      //
    } else {
      if (checkExistingEntry.total_pending_qty <= 0)
        return res.status(309).send({
          message: "Ordered quantity reached!",
        });
      else {
        let totalActaulQty = +checkExistingEntry.total_inwarded_qty;
        let totalCrateWeight = +checkExistingEntry.total_crates_weight;
        let totalNetQty = +checkExistingEntry.total_net_qty;

        let totalCrates = checkExistingEntry.total_crates + 1;

        let net_qty = +actual_qty - +crate_tare;

        let pendingQty = 0;
        let extraQty = 0;
        let totalInwardedQty = 0;
        if (tolerance.pieces_per_bin > 0 && uom == "PAC") {
          totalInwardedQty = (totalActaulQty + tolerance.qty_in_pack).toFixed(
            2
          );
          pendingQty = +ordered_qty - +totalCrates * tolerance.qty_in_pack;
          extraQty = 0;
        } else if (uom == "PAC") {
          totalInwardedQty = totalCrates.toFixed(2);
          pendingQty = +ordered_qty - +totalCrates;
          extraQty = 0;
        } else {
          totalInwardedQty = (totalActaulQty + +actual_qty).toFixed(2);
          pendingQty = (
            totalNetQty + net_qty > +ordered_qty
              ? 0
              : +ordered_qty - (totalNetQty + net_qty)
          ).toFixed(2);
          extraQty = (
            totalNetQty + net_qty > +ordered_qty
              ? totalNetQty + net_qty - +ordered_qty
              : 0
          ).toFixed(2);
        }

        let updateHeader = {
          total_inwarded_qty: totalInwardedQty,
          total_pending_qty: pendingQty,
          total_extra_qty: extraQty,
          total_crates: totalCrates,
          total_crates_weight: (totalCrateWeight + +crate_tare).toFixed(2),
          total_net_qty: (totalNetQty + net_qty).toFixed(2),
        };

        const cratesCountPerPallet =
          checkExistingEntry.inward_crate_details.filter(
            (crate_details) => crate_details.pallet_barcode == pallet_barcode
          ).length;

        if (cratesCountPerPallet + 1 == pallet_capacity) flag = 1;

        // checking new pallet is assigned or not

        if (
          cratesCountPerPallet == pallet_capacity &&
          pallet_barcode ==
            checkExistingEntry.inward_crate_details[
              checkExistingEntry.inward_crate_details.length - 1
            ].pallet_barcode
        )
          return res
            .status(409)
            .send({ message: "New pallet is not assigned!" });

        if (
          cratesCountPerPallet == pallet_capacity ||
          pallet_barcode !=
            checkExistingEntry.inward_crate_details[
              checkExistingEntry.inward_crate_details.length - 1
            ].pallet_barcode
        ) {
          if (
            !(await db.palletization.findOne({
              company_code: company_code,
              plant_id: plant_id,
              pallet_barcode_value: pallet_barcode,
              pallet_status: "Assigned",
            }))
          )
            return res
              .status(409)
              .send({ message: "New pallet is not assigned!" });
        }

        // checkiing every time pallet is in assigned state or not
        // if (
        //   !(await db.palletization.findOne({
        //     company_code: company_code,
        //     plant_id: plant_id,
        //     pallet_barcode_value: pallet_barcode,
        //     pallet_status: "Assigned",
        //   }))
        // )
        //   return res
        //     .status(409)
        //     .send({ message: "Pallet is not in assigned state!" });

        // updating headers
        await inwardProcess.updateOne(filter, {
          $set: updateHeader,
        });

        // pushing into array
        await inwardProcess.updateOne(filter, {
          $push: {
            inward_crate_details: {
              crate_barcode_value: crate_barcode_value,
              inwarded_qty: (+actual_qty).toFixed(2),
              crate_tare: (+crate_tare).toFixed(2),
              net_qty: net_qty.toFixed(2),
              pallet_barcode: pallet_barcode,
              inwarded_by: inwarded_by,
              inwarded_time: inwardedTime,
            },
          },
        });
      }
    }
    if (flag == 1)
      return res.send({
        message: "Pallet capacity reached!",
        data: {
          carrierBarcode: crate_barcode_value,
          lastCarrierInwardedTime: lastInwardedTime,
        },
      });
    else {
      return res.send({
        message:
          "A carrier has been inwarded with barcode: " +
          crate_barcode_value +
          " at " +
          lastInwardedTime,
        data: {
          carrierBarcode: crate_barcode_value,
          lastCarrierInwardedTime: lastInwardedTime,
        },
      });
    }
  } catch (err) {
    console.log(err);

    return res.status(500).send({
      message: "Some error occurred while inwarding a crate",
    });
  }
};

//manual inward
exports.createOne_manual = async (req, res) => {
  console.log("Insert new inward process");
  const {
    company_code,
    plant_id,
    delivery_date,
    supplier_name,
    supplier_no,
    po_type,
    po_no,
    item_no,
    item_code,
    item_name,
    ordered_qty,
    uom,
    unit_price,
    actual_qty,
    invoice_no,
    crate_tare,
    crate_barcode_value,
    pallet_capacity,
    pallet_barcode,
    inwarded_by,
    // asn_no,
    // asn_qty,
  } = req.body;
  // var ordered_qty = req.body.ordered_qty;

  if (
    !(
      company_code &&
      plant_id &&
      delivery_date &&
      supplier_name &&
      supplier_no &&
      po_type &&
      po_no &&
      item_no &&
      item_code &&
      item_name &&
      ordered_qty != undefined &&
      uom &&
      unit_price &&
      actual_qty != undefined &&
      invoice_no &&
      crate_tare != undefined &&
      crate_barcode_value &&
      pallet_capacity &&
      pallet_barcode &&
      inwarded_by
    )
  )
    return res
      .status(400)
      .send({ message: "Please provide all required parameters" });

  try {
    if (+actual_qty == 0)
      return res.send({ message: "Actual qty should not be 'zero'" });

    if (+actual_qty <= +crate_tare)
      return res.send({
        message: "Crate tare must be less than actual qty!",
      });
    // ordered_qty = asn_no !== "0" ? asn_qty : ordered_qty;

    const filter = {
      company_code: company_code,
      plant_id: plant_id,
      delivery_date: delivery_date,
      po_no: po_no,
      po_type: po_type,
      supplier_no: supplier_no,
      item_code: item_code,
      item_no: item_no,
    };

    // item_no and bar code should be unique
    const checkForDuplicate = await inwardProcess
      .find({
        company_code: company_code,
        plant_id: plant_id,
        "inward_crate_details.crate_barcode_value": crate_barcode_value,
      })
      .countDocuments();

    if (checkForDuplicate != 0)
      return res
        .status(409)
        .send({ message: "Duplicate barcode not allowed!" });

    const tolerance = await db.product_weight_model.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        material_code: item_code,
      },
      { _id: 0, pieces_per_bin: 1, qty_in_kg: 1, qty_in_pack: 1 }
    );

    if (tolerance == null)
      return res.status(404).send({
        message:
          "Weight tolerance data is not available for the selected material code!",
      });

    const checkExistingEntry = await inwardProcess.findOne(filter);

    // before inward getting time in indian
    const inwardedTime = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("DD-MM-YYYY HH:mm:ss");

    const lastInwardedTime = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("DD-MM-YYYY hh:mm:ss A");

    let flag = 0;

    if (checkExistingEntry == null) {
      let newDataEntry = req.body;

      // newDataEntry.ordered_qty = asn_no !== "0" ? asn_qty : ordered_qty;
      //data
      let net_qty = +actual_qty - +crate_tare;

      if (tolerance.pieces_per_bin > 0 && uom == "PAC") {
        newDataEntry.total_inwarded_qty = tolerance.qty_in_pack;

        newDataEntry.total_pending_qty =
          +ordered_qty - 1 * tolerance.qty_in_pack;

        newDataEntry.total_extra_qty = 0;

        //
      } else if (uom == "PAC") {
        newDataEntry.total_inwarded_qty = 1;

        newDataEntry.total_pending_qty = +ordered_qty - 1;

        newDataEntry.total_extra_qty = 0;
      } else {
        newDataEntry.total_inwarded_qty = (+actual_qty).toFixed(2);

        newDataEntry.total_pending_qty = (
          net_qty > +ordered_qty ? 0 : +ordered_qty - net_qty
        ).toFixed(2);
        newDataEntry.total_extra_qty = (
          net_qty > +ordered_qty ? net_qty - +ordered_qty : 0
        ).toFixed(2);
      }
      newDataEntry.total_crates = 1;
      newDataEntry.total_crates_weight = (+crate_tare).toFixed(2);
      newDataEntry.total_net_qty = net_qty.toFixed(2);
      // newDataEntry.pallet_stacked_count = 0;

      newDataEntry.inward_crate_details = [
        {
          crate_barcode_value: crate_barcode_value,
          inwarded_qty: (+actual_qty).toFixed(2),
          crate_tare: (+crate_tare).toFixed(2),
          net_qty: net_qty.toFixed(2),
          pallet_barcode: pallet_barcode,
          inwarded_by: inwarded_by,
          inwarded_time: inwardedTime,
        },
      ];

      // checking for the first entry
      if (
        !(await db.palletization.findOne({
          company_code: company_code,
          plant_id: plant_id,
          pallet_barcode_value: pallet_barcode,
          pallet_status: "Assigned",
        }))
      )
        return res
          .status(409)
          .send({ message: "Provided pallet is not assigned!" });

      await inwardProcess.create(newDataEntry);
      //
    } else {
      if (checkExistingEntry.total_pending_qty <= 0)
        return res.status(309).send({
          message: "Ordered quantity reached!",
        });
      else {
        let totalActaulQty = +checkExistingEntry.inward_crate_details.length;
        let totalCrateWeight = +checkExistingEntry.total_crates_weight;
        let totalNetQty = +checkExistingEntry.total_net_qty;

        let totalCrates = checkExistingEntry.inward_crate_details.length + 1;

        let net_qty = +actual_qty - +crate_tare;

        let pendingQty = 0;
        let extraQty = 0;
        let totalInwardedQty = 0;
        if (tolerance.pieces_per_bin > 0 && uom == "PAC") {
          totalInwardedQty = (totalActaulQty + tolerance.qty_in_pack).toFixed(
            2
          );
          pendingQty = +ordered_qty - +totalCrates * tolerance.qty_in_pack;
          extraQty = 0;
        } else if (uom == "PAC") {
          totalInwardedQty = totalCrates.toFixed(2);
          pendingQty = +ordered_qty - +totalCrates;
          extraQty = 0;
        } else {
          totalInwardedQty = (totalActaulQty + +actual_qty).toFixed(2);
          pendingQty = (
            totalNetQty + net_qty > +ordered_qty
              ? 0
              : +ordered_qty - (totalNetQty + net_qty)
          ).toFixed(2);
          extraQty = (
            totalNetQty + net_qty > +ordered_qty
              ? totalNetQty + net_qty - +ordered_qty
              : 0
          ).toFixed(2);
        }

        let updateHeader = {
          total_inwarded_qty: totalInwardedQty,
          total_pending_qty: pendingQty,
          total_extra_qty: extraQty,
          total_crates: totalCrates,
          total_crates_weight: (totalCrateWeight + +crate_tare).toFixed(2),
          total_net_qty: (totalCrates * net_qty).toFixed(2),
        };

        const cratesCountPerPallet =
          checkExistingEntry.inward_crate_details.filter(
            (crate_details) => crate_details.pallet_barcode == pallet_barcode
          ).length;

        if (cratesCountPerPallet + 1 == pallet_capacity) flag = 1;

        // checking new pallet is assigned or not

        if (
          cratesCountPerPallet == pallet_capacity &&
          pallet_barcode ==
            checkExistingEntry.inward_crate_details[
              checkExistingEntry.inward_crate_details.length - 1
            ].pallet_barcode
        )
          return res
            .status(409)
            .send({ message: "New pallet is not assigned!" });

        if (
          cratesCountPerPallet == pallet_capacity ||
          pallet_barcode !=
            checkExistingEntry.inward_crate_details[
              checkExistingEntry.inward_crate_details.length - 1
            ].pallet_barcode
        ) {
          if (
            !(await db.palletization.findOne({
              company_code: company_code,
              plant_id: plant_id,
              pallet_barcode_value: pallet_barcode,
              pallet_status: "Assigned",
            }))
          )
            return res
              .status(409)
              .send({ message: "New pallet is not assigned!" });
        }

        // checkiing every time pallet is in assigned state or not
        // if (
        //   !(await db.palletization.findOne({
        //     company_code: company_code,
        //     plant_id: plant_id,
        //     pallet_barcode_value: pallet_barcode,
        //     pallet_status: "Assigned",
        //   }))
        // )
        //   return res
        //     .status(409)
        //     .send({ message: "Pallet is not in assigned state!" });

        // updating headers
        await inwardProcess.updateOne(filter, {
          $set: updateHeader,
        });

        // pushing into array
        await inwardProcess.updateOne(filter, {
          $push: {
            inward_crate_details: {
              crate_barcode_value: crate_barcode_value,
              inwarded_qty: (+actual_qty).toFixed(2),
              crate_tare: (+crate_tare).toFixed(2),
              net_qty: net_qty.toFixed(2),
              pallet_barcode: pallet_barcode,
              inwarded_by: inwarded_by,
              inwarded_time: inwardedTime,
            },
          },
        });
      }
    }
    if (flag == 1)
      return res.send({
        message: "Pallet capacity reached!",
        data: {
          carrierBarcode: crate_barcode_value,
          lastCarrierInwardedTime: lastInwardedTime,
        },
      });
    else {
      return res.send({
        message:
          "A carrier has been inwarded with barcode: " +
          crate_barcode_value +
          " at " +
          lastInwardedTime,
        data: {
          carrierBarcode: crate_barcode_value,
          lastCarrierInwardedTime: lastInwardedTime,
        },
      });
    }
  } catch (err) {
    console.log(err);

    return res.status(500).send({
      message: "Some error occurred while inwarding a crate",
    });
  }
};

// new inward process entry
exports.createOne_v2 = async (req, res) => {
  console.log("Insert new inward process");
  const {
    company_code,
    plant_id,
    delivery_date,
    supplier_name,
    supplier_no,
    po_type,
    po_no,
    item_no,
    item_code,
    item_name,
    // ordered_qty,
    uom,
    unit_price,
    actual_qty,
    invoice_no,
    crate_tare,
    crate_barcode_value,
    pallet_capacity,
    pallet_barcode,
    inwarded_by,
    // inbound_delivery_number,
    asn_qty,
  } = req.body;
  var ordered_qty = req.body.ordered_qty;
  let inbound_delivery_number = req.body.inbound_delivery_number;

  if (
    !(
      company_code &&
      plant_id &&
      delivery_date &&
      supplier_name &&
      supplier_no &&
      po_type &&
      po_no &&
      item_no &&
      item_code &&
      item_name &&
      ordered_qty != undefined &&
      uom &&
      unit_price &&
      actual_qty != undefined &&
      invoice_no &&
      crate_tare != undefined &&
      crate_barcode_value &&
      pallet_capacity &&
      pallet_barcode &&
      inwarded_by
    )
  )
    return res
      .status(400)
      .send({ message: "Please provide all required parameters" });

  try {
    if (+actual_qty == 0)
      return res.send({ message: "Actual qty should not be 'zero'" });

    if (+actual_qty <= +crate_tare)
      return res.send({
        message: "Crate tare must be less than actual qty!",
      });
    if (inbound_delivery_number) {
      ordered_qty = inbound_delivery_number !== "" ? asn_qty : ordered_qty;
    }

    const filter = {
      company_code: company_code,
      plant_id: plant_id,
      delivery_date: delivery_date,
      po_no: po_no,
      po_type: po_type,
      supplier_no: supplier_no,
      item_code: item_code,
      item_no: item_no,
    };
    if (inbound_delivery_number) {
      filter.inbound_delivery_number = inbound_delivery_number;
    }

    // item_no and bar code should be unique
    const checkForDuplicate = await inwardProcess
      .find({
        company_code: company_code,
        plant_id: plant_id,
        "inward_crate_details.crate_barcode_value": crate_barcode_value,
      })
      .countDocuments();

    if (checkForDuplicate != 0)
      return res
        .status(409)
        .send({ message: "Duplicate barcode not allowed!" });

    const tolerance = await db.product_weight_model.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        material_code: item_code,
      },
      { _id: 0, pieces_per_bin: 1, qty_in_kg: 1, qty_in_pack: 1 }
    );

    if (tolerance == null)
      return res.status(404).send({
        message:
          "Weight tolerance data is not available for the selected material code!",
      });

    const checkExistingEntry = await inwardProcess.findOne(filter);

    // before inward getting time in indian
    const inwardedTime = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("DD-MM-YYYY HH:mm:ss");

    const lastInwardedTime = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("DD-MM-YYYY hh:mm:ss A");

    let flag = 0;

    if (checkExistingEntry == null) {
      let po_qty = req.body.ordered_qty;
      let newDataEntry = req.body;
      newDataEntry.po_qty = po_qty;

      newDataEntry.ordered_qty = ordered_qty;
      if (inbound_delivery_number) {
        newDataEntry.ordered_qty =
          inbound_delivery_number !== "" ? asn_qty : ordered_qty;
      }

      let net_qty = +actual_qty - +crate_tare;

      if (tolerance.pieces_per_bin > 0 && uom == "PAC") {
        newDataEntry.total_inwarded_qty = tolerance.qty_in_pack;

        newDataEntry.total_pending_qty =
          +ordered_qty - 1 * tolerance.qty_in_pack;

        newDataEntry.total_extra_qty = 0;

        //
      } else if (uom == "PAC") {
        newDataEntry.total_inwarded_qty = 1;

        newDataEntry.total_pending_qty = +ordered_qty - 1;

        newDataEntry.total_extra_qty = 0;
      } else {
        newDataEntry.total_inwarded_qty = (+actual_qty).toFixed(2);

        newDataEntry.total_pending_qty = (
          net_qty > +ordered_qty ? 0 : +ordered_qty - net_qty
        ).toFixed(2);
        newDataEntry.total_extra_qty = (
          net_qty > +ordered_qty ? net_qty - +ordered_qty : 0
        ).toFixed(2);
      }
      newDataEntry.total_crates = 1;
      newDataEntry.total_crates_weight = (+crate_tare).toFixed(2);
      newDataEntry.total_net_qty = net_qty.toFixed(2);
      // newDataEntry.pallet_stacked_count = 0;

      newDataEntry.inward_crate_details = [
        {
          crate_barcode_value: crate_barcode_value,
          inwarded_qty: (+actual_qty).toFixed(2),
          crate_tare: (+crate_tare).toFixed(2),
          net_qty: net_qty.toFixed(2),
          pallet_barcode: pallet_barcode,
          inwarded_by: inwarded_by,
          inwarded_time: inwardedTime,
        },
      ];

      // checking for the first entry
      if (
        !(
          (await db.palletization.findOne({
            company_code: company_code,
            plant_id: plant_id,
            pallet_barcode_value: pallet_barcode,
            pallet_status: "Assigned",
          })) ||
          (await palletization_table_v2.findOne({
            company_code: company_code,
            plant_id: plant_id,
            pallet_barcode_value: pallet_barcode,
            pallet_status: "Assigned",
          }))
        )
      )
        return res
          .status(409)
          .send({ message: "Provided pallet is not assigned!" });

      await inwardProcess.create(newDataEntry);
      //
    } else {
      if (checkExistingEntry.total_pending_qty <= 0)
        return res.status(309).send({
          message: "Ordered quantity reached!",
        });
      else {
        let totalActaulQty = +checkExistingEntry.total_inwarded_qty;
        let totalCrateWeight = +checkExistingEntry.total_crates_weight;
        let totalNetQty = +checkExistingEntry.total_net_qty;

        let totalCrates = checkExistingEntry.total_crates + 1;

        let net_qty = +actual_qty - +crate_tare;

        let pendingQty = 0;
        let extraQty = 0;
        let totalInwardedQty = 0;
        if (tolerance.pieces_per_bin > 0 && uom == "PAC") {
          totalInwardedQty = (totalActaulQty + tolerance.qty_in_pack).toFixed(
            2
          );
          pendingQty = +ordered_qty - +totalCrates * tolerance.qty_in_pack;
          extraQty = 0;
        } else if (uom == "PAC") {
          totalInwardedQty = totalCrates.toFixed(2);
          pendingQty = +ordered_qty - +totalCrates;
          extraQty = 0;
        } else {
          totalInwardedQty = (totalActaulQty + +actual_qty).toFixed(2);
          pendingQty = (
            totalNetQty + net_qty > +ordered_qty
              ? 0
              : +ordered_qty - (totalNetQty + net_qty)
          ).toFixed(2);
          extraQty = (
            totalNetQty + net_qty > +ordered_qty
              ? totalNetQty + net_qty - +ordered_qty
              : 0
          ).toFixed(2);
        }

        let updateHeader = {
          total_inwarded_qty: totalInwardedQty,
          total_pending_qty: pendingQty,
          total_extra_qty: extraQty,
          total_crates: totalCrates,
          total_crates_weight: (totalCrateWeight + +crate_tare).toFixed(2),
          total_net_qty: (totalNetQty + net_qty).toFixed(2),
        };

        const cratesCountPerPallet =
          checkExistingEntry.inward_crate_details.filter(
            (crate_details) => crate_details.pallet_barcode == pallet_barcode
          ).length;

        if (cratesCountPerPallet + 1 == pallet_capacity) flag = 1;

        // checking new pallet is assigned or not

        if (
          cratesCountPerPallet == pallet_capacity &&
          pallet_barcode ==
            checkExistingEntry.inward_crate_details[
              checkExistingEntry.inward_crate_details.length - 1
            ].pallet_barcode
        )
          return res
            .status(409)
            .send({ message: "New pallet is not assigned!" });

        if (
          cratesCountPerPallet == pallet_capacity ||
          pallet_barcode !=
            checkExistingEntry.inward_crate_details[
              checkExistingEntry.inward_crate_details.length - 1
            ].pallet_barcode
        ) {
          if (
            !(
              (await db.palletization.findOne({
                company_code: company_code,
                plant_id: plant_id,
                pallet_barcode_value: pallet_barcode,
                pallet_status: "Assigned",
              })) ||
              (await palletization_table_v2.findOne({
                company_code: company_code,
                plant_id: plant_id,
                pallet_barcode_value: pallet_barcode,
                pallet_status: "Assigned",
              }))
            )
          )
            return res
              .status(409)
              .send({ message: "New pallet is not assigned!" });
        }
        // updating headers
        await inwardProcess.updateOne(filter, {
          $set: updateHeader,
        });

        // pushing into array
        await inwardProcess.updateOne(filter, {
          $push: {
            inward_crate_details: {
              crate_barcode_value: crate_barcode_value,
              inwarded_qty: (+actual_qty).toFixed(2),
              crate_tare: (+crate_tare).toFixed(2),
              net_qty: net_qty.toFixed(2),
              pallet_barcode: pallet_barcode,
              inwarded_by: inwarded_by,
              inwarded_time: inwardedTime,
            },
          },
        });
      }
    }
    if (flag == 1)
      return res.send({
        message: "Pallet capacity reached!",
        data: {
          carrierBarcode: crate_barcode_value,
          lastCarrierInwardedTime: lastInwardedTime,
        },
      });
    else {
      return res.send({
        message:
          "A carrier has been inwarded with barcode: " +
          crate_barcode_value +
          " at " +
          lastInwardedTime,
        data: {
          carrierBarcode: crate_barcode_value,
          lastCarrierInwardedTime: lastInwardedTime,
        },
      });
    }
  } catch (err) {
    console.log(err);

    return res.status(500).send({
      message: "Some error occurred while inwarding a crate",
    });
  }
};

// new inward process entry
exports.createOne_v2_clone = async (req, res) => {
  console.log("Insert new inward process");
  const {
    company_code,
    plant_id,
    delivery_date,
    supplier_name,
    supplier_no,
    po_type,
    po_no,
    item_no,
    item_code,
    item_name,
    // ordered_qty,
    uom,
    unit_price,
    actual_qty,
    invoice_no,
    crate_tare,
    crate_barcode_value,
    pallet_capacity,
    pallet_barcode,
    inwarded_by,
    // inbound_delivery_number,
    asn_qty,
    expiry_date,
  } = req.body;
  var ordered_qty = req.body.ordered_qty;
  let inbound_delivery_number = req.body.inbound_delivery_number;

  if (
    !(
      company_code &&
      plant_id &&
      delivery_date &&
      supplier_name &&
      supplier_no &&
      po_type &&
      po_no &&
      item_no &&
      item_code &&
      item_name &&
      ordered_qty != undefined &&
      uom &&
      unit_price &&
      actual_qty != undefined &&
      invoice_no &&
      crate_tare != undefined &&
      crate_barcode_value &&
      pallet_capacity &&
      pallet_barcode &&
      inwarded_by &&
      expiry_date
    )
  )
    return res
      .status(400)
      .send({ message: "Please provide all required parameters" });

  try {
    if (+actual_qty == 0)
      return res.send({ message: "Actual qty should not be 'zero'" });

    if (+actual_qty <= +crate_tare)
      return res.send({
        message: "Crate tare must be less than actual qty!",
      });
    if (inbound_delivery_number) {
      ordered_qty = inbound_delivery_number !== "" ? asn_qty : ordered_qty;
    }

    const filter = {
      company_code: company_code,
      plant_id: plant_id,
      delivery_date: delivery_date,
      po_no: po_no,
      po_type: po_type,
      supplier_no: supplier_no,
      item_code: item_code,
      item_no: item_no,
      // expiry_date: expiry_date,
    };

    if (inbound_delivery_number) {
      filter.inbound_delivery_number = inbound_delivery_number;
    }

    // item_no and bar code should be unique
    const checkForDuplicate = await inwardProcess
      .find({
        company_code: company_code,
        plant_id: plant_id,
        "inward_crate_details.crate_barcode_value": crate_barcode_value,
      })
      .countDocuments();

    if (checkForDuplicate != 0)
      return res
        .status(409)
        .send({ message: "Duplicate barcode not allowed!" });

    const tolerance = await db.product_weight_model.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        material_code: item_code,
      },
      { _id: 0, pieces_per_bin: 1, qty_in_kg: 1, qty_in_pack: 1 }
    );

    if (tolerance == null)
      return res.status(404).send({
        message:
          "Weight tolerance data is not available for the selected material code!",
      });

    const checkExistingEntry = await inwardProcess.findOne(filter);

    // before inward getting time in indian
    const inwardedTime = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("DD-MM-YYYY HH:mm:ss");

    const lastInwardedTime = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("DD-MM-YYYY hh:mm:ss A");

    let flag = 0;

    if (checkExistingEntry == null) {
      let po_qty = req.body.ordered_qty;
      let newDataEntry = req.body;
      newDataEntry.po_qty = po_qty;

      newDataEntry.ordered_qty = ordered_qty;
      if (inbound_delivery_number) {
        newDataEntry.ordered_qty =
          inbound_delivery_number !== "" ? asn_qty : ordered_qty;
      }

      let net_qty = +actual_qty - +crate_tare;

      if (tolerance.pieces_per_bin > 0 && uom == "PAC") {
        newDataEntry.total_inwarded_qty = tolerance.qty_in_pack;

        newDataEntry.total_pending_qty =
          +ordered_qty - 1 * tolerance.qty_in_pack;

        newDataEntry.total_extra_qty = 0;

        //
      } else if (uom == "PAC") {
        newDataEntry.total_inwarded_qty = 1;

        newDataEntry.total_pending_qty = +ordered_qty - 1;

        newDataEntry.total_extra_qty = 0;
      } else {
        newDataEntry.total_inwarded_qty = (+actual_qty).toFixed(2);

        newDataEntry.total_pending_qty = (
          net_qty > +ordered_qty ? 0 : +ordered_qty - net_qty
        ).toFixed(2);
        newDataEntry.total_extra_qty = (
          net_qty > +ordered_qty ? net_qty - +ordered_qty : 0
        ).toFixed(2);
      }
      newDataEntry.total_crates = 1;
      newDataEntry.total_crates_weight = (+crate_tare).toFixed(2);
      newDataEntry.total_net_qty = net_qty.toFixed(2);
      // newDataEntry.pallet_stacked_count = 0;

      newDataEntry.inward_crate_details = [
        {
          crate_barcode_value: crate_barcode_value,
          inwarded_qty: (+actual_qty).toFixed(2),
          crate_tare: (+crate_tare).toFixed(2),
          net_qty: net_qty.toFixed(2),
          pallet_barcode: pallet_barcode,
          expiry_date: expiry_date,
          inwarded_by: inwarded_by,
          inwarded_time: inwardedTime,
        },
      ];

      // checking for the first entry
      if (
        !(
          (await db.palletization.findOne({
            company_code: company_code,
            plant_id: plant_id,
            pallet_barcode_value: pallet_barcode,
            pallet_status: "Assigned",
          })) ||
          (await palletization_table_v2.findOne({
            company_code: company_code,
            plant_id: plant_id,
            pallet_barcode_value: pallet_barcode,
            pallet_status: "Assigned",
          }))
        )
      )
        return res
          .status(409)
          .send({ message: "Provided pallet is not assigned!" });

      await inwardProcess.create(newDataEntry);
      //
    } else {
      if (checkExistingEntry.total_pending_qty <= 0)
        return res.status(309).send({
          message: "Ordered quantity reached!",
        });
      else {
        let totalActaulQty = +checkExistingEntry.total_inwarded_qty;
        let totalCrateWeight = +checkExistingEntry.total_crates_weight;
        let totalNetQty = +checkExistingEntry.total_net_qty;

        let totalCrates = checkExistingEntry.total_crates + 1;

        let net_qty = +actual_qty - +crate_tare;

        let pendingQty = 0;
        let extraQty = 0;
        let totalInwardedQty = 0;
        if (tolerance.pieces_per_bin > 0 && uom == "PAC") {
          totalInwardedQty = (totalActaulQty + tolerance.qty_in_pack).toFixed(
            2
          );
          pendingQty = +ordered_qty - +totalCrates * tolerance.qty_in_pack;
          extraQty = 0;
        } else if (uom == "PAC") {
          totalInwardedQty = totalCrates.toFixed(2);
          pendingQty = +ordered_qty - +totalCrates;
          extraQty = 0;
        } else {
          totalInwardedQty = (totalActaulQty + +actual_qty).toFixed(2);
          pendingQty = (
            totalNetQty + net_qty > +ordered_qty
              ? 0
              : +ordered_qty - (totalNetQty + net_qty)
          ).toFixed(2);
          extraQty = (
            totalNetQty + net_qty > +ordered_qty
              ? totalNetQty + net_qty - +ordered_qty
              : 0
          ).toFixed(2);
        }

        let updateHeader = {
          total_inwarded_qty: totalInwardedQty,
          total_pending_qty: pendingQty,
          total_extra_qty: extraQty,
          total_crates: totalCrates,
          total_crates_weight: (totalCrateWeight + +crate_tare).toFixed(2),
          total_net_qty: (totalNetQty + net_qty).toFixed(2),
        };

        const existingPallet = checkExistingEntry.inward_crate_details.find(
          (carrier) => carrier.pallet_barcode === pallet_barcode
        );
        if (existingPallet)
          if (existingPallet.expiry_date !== expiry_date) {
            return res.status(400).send({
              message:
                "Expiry date has been modified, please change the pallet",
            });
          }

        const cratesCountPerPallet =
          checkExistingEntry.inward_crate_details.filter(
            (crate_details) => crate_details.pallet_barcode == pallet_barcode
          ).length;

        if (cratesCountPerPallet + 1 == pallet_capacity) flag = 1;

        // checking new pallet is assigned or not

        if (
          cratesCountPerPallet == pallet_capacity &&
          pallet_barcode ==
            checkExistingEntry.inward_crate_details[
              checkExistingEntry.inward_crate_details.length - 1
            ].pallet_barcode
        )
          return res
            .status(409)
            .send({ message: "New pallet is not assigned!" });

        if (
          cratesCountPerPallet == pallet_capacity ||
          pallet_barcode !=
            checkExistingEntry.inward_crate_details[
              checkExistingEntry.inward_crate_details.length - 1
            ].pallet_barcode
        ) {
          if (
            !(
              (await db.palletization.findOne({
                company_code: company_code,
                plant_id: plant_id,
                pallet_barcode_value: pallet_barcode,
                pallet_status: "Assigned",
              })) ||
              (await palletization_table_v2.findOne({
                company_code: company_code,
                plant_id: plant_id,
                pallet_barcode_value: pallet_barcode,
                pallet_status: "Assigned",
              }))
            )
          )
            return res
              .status(409)
              .send({ message: "New pallet is not assigned!" });
        }
        // updating headers
        await inwardProcess.updateOne(filter, {
          $set: updateHeader,
        });

        // pushing into array
        await inwardProcess.updateOne(filter, {
          $push: {
            inward_crate_details: {
              crate_barcode_value: crate_barcode_value,
              inwarded_qty: (+actual_qty).toFixed(2),
              crate_tare: (+crate_tare).toFixed(2),
              net_qty: net_qty.toFixed(2),
              pallet_barcode: pallet_barcode,
              expiry_date: expiry_date,
              inwarded_by: inwarded_by,
              inwarded_time: inwardedTime,
            },
          },
        });
      }
    }
    if (flag == 1)
      return res.send({
        message: "Pallet capacity reached!",
        data: {
          carrierBarcode: crate_barcode_value,
          lastCarrierInwardedTime: lastInwardedTime,
        },
      });
    else {
      return res.send({
        message:
          "A carrier has been inwarded with barcode: " +
          crate_barcode_value +
          " at " +
          lastInwardedTime,
        data: {
          carrierBarcode: crate_barcode_value,
          lastCarrierInwardedTime: lastInwardedTime,
        },
      });
    }
  } catch (err) {
    console.log(err);

    return res.status(500).send({
      message: "Some error occurred while inwarding a crate",
    });
  }
};

// get all suppliers list.
exports.findSuppliers = async (req, res) => {
  console.log("getting all supplier list from rapid inward process ..");
  let resMessage = "";
  const { delivery_date, company_code, plant_id } = req.query;
  if (!(delivery_date && company_code && plant_id))
    return res.status(400).send({
      status_code: 400,
      message: "Please provide delivery_date, company_code and plant_id",
    });
  let query = {
    delivery_date: delivery_date,
    company_code: company_code,
    plant_id: plant_id,
  };
  await inwardProcess
    .find(query)
    .then((inwardPoData) => {
      let data = [];
      if (inwardPoData.length != 0) {
        inwardPoData.forEach((eachDoc) => {
          let resObj = {
            supplier_no: eachDoc.supplier_no,
          };

          const indexOfItem = data.findIndex(
            (item) => item.supplier_no === resObj.supplier_no
          );
          if (indexOfItem === -1) {
            // not existing
            data.push(resObj);
          } else {
            console.log(`supplier exist in data ${resObj.supplier_no}`);
          }
        });
      }

      if (data.length === 0) {
        resMessage = "supplier list is not available";
      } else {
        resMessage = "supplier list is available";
      }

      return res.status(200).send({
        status_code: 200,
        message: resMessage,
        data: data,
      });
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).send({
        status_code: 500,
        message:
          "Some error occurred while retrieving supplier list from inward process",
      });
    });
};

// find grn details by filters
exports.findDetailsByFilter = async (req, res) => {
  console.log("getting details of rapid inward process using filters ..");

  const { supplier_no, delivery_date, plant_id, company_code } = req.query;

  if (!(supplier_no && delivery_date && plant_id && company_code)) {
    return res.status(400).send({
      status_code: 400,
      message:
        "Please provide supplier_no, delievery_date, plant_id & company_code",
    });
  }
  const query = {
    supplier_no: supplier_no,
    delivery_date: delivery_date,
    plant_id: plant_id,
    company_code: company_code,
  };

  let resMessage = "";
  await inwardProcess
    .find(query)
    .sort({ created_at: -1 })
    .then((inwardProcessDetails) => {
      let data = [];
      if (inwardProcessDetails.length != 0) {
        inwardProcessDetails.map((eachDoc) => {
          let resObj = {
            company_code: company_code,
            plant_id: plant_id,
            po_num: eachDoc.po_no,
            po_type: eachDoc.po_type,
            supplier_no: eachDoc.supplier_no,
            supplier_name: eachDoc.supplier_name,
            quantity: eachDoc.ordered_qty,
            delivery_date: eachDoc.delivery_date,
          };
          const indexOfItem = data.findIndex(
            (item) => item.po_num === resObj.po_num
          );
          if (indexOfItem === -1) {
            // not existing
            data.push(resObj);
          } else {
            data[indexOfItem].quantity = (
              parseInt(data[indexOfItem].quantity) + parseInt(resObj.quantity)
            ).toString();
          }
        });
      }
      if (data.length === 0) {
        resMessage = "inward grn details is not available";
      } else {
        resMessage = "inward grn details is available";
      }
      return res.status(200).send({
        status_code: 200,
        message: resMessage,
        data: data,
      });
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).send({
        status_code: 500,
        message:
          "Some error occurred while retrieving inward process grn details.",
      });
    });
};

// find grn details by filtersv2
exports.findDetailsByFilterV2 = async (req, res) => {
  console.log("getting details of rapid inward process using filters ..");

  const { supplier_no, delivery_date, plant_id, company_code } = req.query;

  if (!(supplier_no && delivery_date && plant_id && company_code)) {
    return res.status(400).send({
      status_code: 400,
      message:
        "Please provide supplier_no, delievery_date, plant_id & company_code",
    });
  }
  const query = {
    supplier_no: supplier_no,
    delivery_date: delivery_date,
    plant_id: plant_id,
    company_code: company_code,
  };

  let resMessage = "";
  await inwardProcess
    .find(query)
    .sort({ created_at: -1 })
    .then((inwardProcessDetails) => {
      let data = [];
      if (inwardProcessDetails.length != 0) {
        inwardProcessDetails.map((eachDoc) => {
          let resObj = {
            company_code: company_code,
            plant_id: plant_id,
            po_num: eachDoc.po_no,
            asn_no: eachDoc.inbound_delivery_number,
            po_type: eachDoc.po_type,
            supplier_no: eachDoc.supplier_no,
            supplier_name: eachDoc.supplier_name,
            quantity: eachDoc.ordered_qty,
            delivery_date: eachDoc.delivery_date,
          };
          //data.push(resObj);
          const indexOfItem = data.findIndex(
            (item) =>
              item.po_num === resObj.po_num && item.asn_no === resObj.asn_no
          );
          if (indexOfItem === -1) {
            // not existing
            data.push(resObj);
          } else {
            data[indexOfItem].quantity = (
              parseInt(data[indexOfItem].quantity) + parseInt(resObj.quantity)
            ).toString();
          }
        });
      }
      if (data.length === 0) {
        resMessage = "inward grn details is not available";
      } else {
        resMessage = "inward grn details is available";
      }
      return res.status(200).send({
        status_code: 200,
        message: resMessage,
        data: data,
      });
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).send({
        status_code: 500,
        message:
          "Some error occurred while retrieving inward process grn details.",
      });
    });
};

// po details grn get by po no.
exports.findByPO = async (req, res) => {
  console.log("getting detail of purchase order from rapid inward process ..");
  const po_no = req.query.po_no;
  let resMessage = "";
  if (!po_no)
    return res.status(400).send({
      status_code: 400,
      message: "Please provide purchase order number",
    });
  await inwardProcess
    .find({ po_no: po_no })
    .sort({ created_at: -1 })
    .then(async (inwardPoData) => {
      let data = [];
      if (inwardPoData.length != 0) {
        const purchase_order_data = await purchaseOrder
          .find({ po_number: po_no })
          .select({ item: 1 });
        inwardPoData.forEach((eachDoc) => {
          let crate_barcode_values = "",
            grn_post_qty = 0,
            grn_post_pending = 0,
            storage_location = "0";
          eachDoc.inward_crate_details.map((eachCrate) => {
            if (eachCrate.grn_status === "wait") {
              // grn_post_pending = eachCrate.net_qty;
              crate_barcode_values += eachCrate.crate_barcode_value + "_";
            } else {
              grn_post_qty += eachCrate.net_qty;
            }
          });

          console.log("post pending", grn_post_pending);

          crate_barcode_values = crate_barcode_values.slice(
            0,
            crate_barcode_values.length - 1
          );
          if (purchase_order_data.length !== 0) {
            purchase_order_data[0].item.map((eachItem) => {
              console.log(eachItem.item_no);
              if (
                eachItem.material_no === eachDoc.item_code &&
                eachItem.item_no === eachDoc.item_no
              ) {
                storage_location = eachItem.storage_location;
              }
            });
          }
          let itemObj = {};
          if (crate_barcode_values !== "") {
            itemObj = {
              item_no: eachDoc.item_no,
              item_code: eachDoc.item_code,
              item_name: eachDoc.item_name,
              uom: eachDoc.uom,
              order_quanity: eachDoc.ordered_qty,
              received_quanity: eachDoc.total_inwarded_qty,
              total_crates: eachDoc.total_crates,
              total_crate_weight: eachDoc.total_crates_weight,
              inward_qty: eachDoc.total_net_qty,
              pending_qty: eachDoc.total_pending_qty,
              inward_date: eachDoc.delivery_date,
              storage_location: storage_location,
              grn_post_qty: grn_post_qty,
              grn_post_pending: eachDoc.total_net_qty - grn_post_qty,
              crate_barcode_values: crate_barcode_values,
            };
            let resObj = {
              purchase_order_no: eachDoc.po_no,
              supplier_name: eachDoc.supplier_name,
              supplier_code: eachDoc.supplier_no,
              plant_id: eachDoc.plant_id,
              company_code: eachDoc.company_code,
              items: [itemObj],
            };

            const indexOfItem = data.findIndex((item) => {
              item.item_code === resObj.item_code;
            });

            if (indexOfItem === -1) {
              // not existing
              data.push(resObj);
            } else {
              data[indexOfItem].items.push(itemObj);
            }
          }
        });
      }
      if (data.length === 0) {
        resMessage = "Item list is not available";
      } else {
        resMessage = "Item list is available";
      }
      return res.status(200).send({
        status_code: 200,
        message: resMessage,
        data: data,
      });
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).send({
        status_code: 500,
        message: "Some error occurred while retrieving inward po grn detail",
      });
    });
};

// po details grn get by po no.
exports.findByPOAsn = async (req, res) => {
  console.log("getting detail of purchase order from rapid inward process ..");
  const po_no = req.query.po_no;
  const asn_no = req.query.asn_no;
  let resMessage = "";
  if (!po_no)
    return res.status(400).send({
      status_code: 400,
      message: "Please provide purchase order number",
    });
  let filter = {};
  filter.po_no = po_no;
  if (asn_no) {
    filter.inbound_delivery_number = asn_no;
  }
  await inwardProcess
    .find(filter)
    .sort({ created_at: -1 })
    .then(async (inwardPoData) => {
      //console.log("inwardPoData",inwardPoData);
      let data = [];
      if (inwardPoData.length != 0) {
        const purchase_order_data = await purchaseOrder
          .find({ po_number: po_no })
          .select({ item: 1 });
        inwardPoData.forEach((eachDoc) => {
          let crate_barcode_values = "",
            grn_post_qty = 0,
            grn_post_pending = 0,
            storage_location = "0";
          eachDoc.inward_crate_details.map((eachCrate) => {
            if (eachCrate.grn_status === "wait") {
              // grn_post_pending = eachCrate.net_qty;
              crate_barcode_values += eachCrate.crate_barcode_value + "_";
            } else {
              if (eachDoc.uom != "kg") grn_post_qty++;
              else grn_post_qty += eachCrate.net_qty;
            }
          });

          console.log("post pending", grn_post_pending);

          crate_barcode_values = crate_barcode_values.slice(
            0,
            crate_barcode_values.length - 1
          );
          if (purchase_order_data.length !== 0) {
            purchase_order_data[0].item.map((eachItem) => {
              console.log(eachItem.item_no);
              if (
                eachItem.material_no === eachDoc.item_code &&
                eachItem.item_no === eachDoc.item_no
              ) {
                storage_location = eachItem.storage_location;
              }
            });
          }
          let itemObj = {};
          if (crate_barcode_values !== "") {
            itemObj = {
              item_no: eachDoc.item_no,
              item_code: eachDoc.item_code,
              item_name: eachDoc.item_name,
              uom: eachDoc.uom,
              order_quanity: eachDoc.ordered_qty,
              received_quanity: eachDoc.total_inwarded_qty,
              total_crates: eachDoc.total_crates,
              total_crate_weight: eachDoc.total_crates_weight,
              inward_qty:
                eachDoc.uom != "kg"
                  ? eachDoc.total_inwarded_qty
                  : eachDoc.total_net_qty,
              pending_qty: eachDoc.total_pending_qty,
              inward_date: eachDoc.delivery_date,
              storage_location: storage_location,
              grn_post_qty: grn_post_qty,
              grn_post_pending:
                eachDoc.uom != "kg"
                  ? eachDoc.total_inwarded_qty - grn_post_qty
                  : eachDoc.total_net_qty - grn_post_qty,
              crate_barcode_values: crate_barcode_values,
              asn_item_no: eachDoc.asn_item_no,
            };
            let resObj = {
              purchase_order_no: eachDoc.po_no,
              supplier_name: eachDoc.supplier_name,
              supplier_code: eachDoc.supplier_no,
              plant_id: eachDoc.plant_id,
              company_code: eachDoc.company_code,
              items: [itemObj],
            };

            const indexOfItem = data.findIndex((item) => {
              item.item_code === resObj.item_code;
            });

            if (indexOfItem === -1) {
              // not existing
              data.push(resObj);
            } else {
              data[indexOfItem].items.push(itemObj);
            }
          }
        });
      }
      if (data.length === 0) {
        resMessage = "Item list is not available";
      } else {
        resMessage = "Item list is available";
      }
      return res.status(200).send({
        status_code: 200,
        message: resMessage,
        data: data,
      });
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).send({
        status_code: 500,
        message: "Some error occurred while retrieving inward po grn detail",
      });
    });
};

function randomInteger(min, max) {
  return (Math.random() * (max - min) + min).toFixed(0);
}

exports.grnCreation = async (req, res) => {
  if (!req.body) {
    return res.status(400).send({
      status_code: 400,
      message: "Missing request Body!",
    });
  }
  let po_number = req.body.po_number;
  let invoice_url = req.body.invoice_url;
  let invoice_no = req.body.invoice_no;
  let invoice_date = req.body.invoice_date;
  let item_numbers = [],
    item_codes = [],
    crate_bar_codes = [],
    requestBody = {};

  if (!(po_number && req.body.order_items)) {
    return res.status(400).send({
      status_code: 400,
      message: "Please provide po number and order items!",
    });
  } else {
    let insert_files_data = {};
    insert_files_data.company_code = req.body.company_code;
    insert_files_data.plant_id = req.body.plant_id;
    insert_files_data.po_number = req.body.po_number;
    insert_files_data.invoice_url = req.body.invoice_url;
    insert_files_data.invoice_no = req.body.invoice_no;
    insert_files_data.invoice_date = req.body.invoice_date;

    const orderItems = req.body.order_items;
    const plant_id = req.body.plant_id;
    const company_code = req.body.company_code;
    if (orderItems.length !== 0) {
      requestBody["posting_date"] = moment(new Date()).format("YYYY-MM-DD");
      requestBody["document_date"] = moment(new Date()).format("YYYY-MM-DD");
      requestBody["referance_document_no"] = randomInteger(
        1000000000,
        10000000000
      );
      requestBody["bill_of_lading"] = randomInteger(1000000000, 10000000000);
      requestBody["header_txt"] = [];
      requestBody["Item"] = [];
      orderItems.forEach((order) => {
        if (order.qty !== 0) {
          item_numbers.push(order.item_no);
          item_codes.push(order.item_code);
          let crate_id_arr = order.crate_id.split("_");
          for (let i = 0; i < crate_id_arr.length; i++) {
            crate_bar_codes.push(crate_id_arr[i]);
          }

          let itemObj = {
            material_no: order.item_code,
            movement_type: [],
            quantity: order.qty,
            po_number: po_number,
            po_item: order.item_no,
            plant: plant_id,
            storage_location: order.storage_location,
          };
          requestBody.Item.push(itemObj);
        }
      });
    }
    let data = { request: requestBody };
    console.log(data);
    var options = {
      method: "post",
      url: `${sap_url}/goods_receipt_note_creation`,
      headers: { Authorization: `${sap_auth}` },
      // headers: { },
      data: data,
    };

    await axios
      .request(options)
      .then(async (response) => {
        let responseData = response.data.response;
        let sapData = {};
        console.log("res : ", responseData);
        sapData.request = requestBody;
        sapData.response = responseData;
        sapData.company_code = company_code;
        sapData.primaryData = po_number;
        sapData.type = "Goods Receipts Note";
        sapData.plant_id = plant_id;
        const new_sap_grn_creation_logs = new sap_grn_creation_logs(sapData);
        await new_sap_grn_creation_logs.save();
        if (responseData.flag === "S" && responseData.material_document_no) {
          insert_files_data.grn_no = responseData.material_document_no;
          const files_url_details = new files_url_details_table(
            insert_files_data
          );

          let files_detail = await files_url_details.save();
          //return res.send(files_detail);

          await inwardProcess
            .find({
              po_no: po_number,
              inward_crate_details: {
                $elemMatch: {
                  crate_barcode_value: {
                    $in: crate_bar_codes,
                  },
                },
              },
            })
            .then(async (data) => {
              data.map(async (each) => {
                if (each.inward_crate_details) {
                  let inward_crate_details_updated = [];
                  await each.inward_crate_details.map((items, index) => {
                    let update_data = {};
                    if (crate_bar_codes.includes(items.crate_barcode_value)) {
                      update_data.inwarded_time = items.inwarded_time;
                      update_data.grn_no = responseData.material_document_no;
                      update_data.grn_status = "success";
                      update_data._id = items._id;
                      update_data.crate_barcode_value =
                        items.crate_barcode_value;
                      update_data.inwarded_qty = items.inwarded_qty;
                      update_data.crate_tare = items.crate_tare;
                      update_data.net_qty = items.net_qty;
                      update_data.inwarded_by = items.inwarded_by;
                      if (items.crate_type)
                        update_data.crate_type = items.crate_type;
                      if (items.mode) update_data.mode = items.mode;
                      if (items.so_delivery_date)
                        update_data.so_delivery_date = items.so_delivery_date;
                      update_data.auto_allocation = items.auto_allocation
                        ? items.auto_allocation
                        : false;
                    } else {
                      update_data.inwarded_time = items.inwarded_time;
                      update_data.grn_no = items.grn_no;
                      update_data.grn_status = items.grn_status;
                      update_data._id = items._id;
                      update_data.crate_barcode_value =
                        items.crate_barcode_value;
                      update_data.inwarded_qty = items.inwarded_qty;
                      update_data.crate_tare = items.crate_tare;
                      update_data.net_qty = items.net_qty;
                      update_data.inwarded_by = items.inwarded_by;
                      if (items.crate_type)
                        update_data.crate_type = items.crate_type;
                      if (items.mode) update_data.mode = items.mode;
                      if (items.so_delivery_date)
                        update_data.so_delivery_date = items.so_delivery_date;
                      update_data.auto_allocation = items.auto_allocation
                        ? items.auto_allocation
                        : false;
                    }
                    inward_crate_details_updated.push(update_data);
                  });
                  each.inward_crate_details = inward_crate_details_updated;
                  let _id = each._id;
                  await inwardProcess
                    .updateOne({ _id: _id }, each)
                    .then((result) => {
                      return res.status(200).send({
                        status_code: 200,
                        message: "Grn created and updated successfully.",
                      });
                    });
                }
              });
            });
        } else {
          return res.status(400).send({
            status_code: 400,
            message: "Grn failed",
          });
        }
      })
      .catch(function (error) {
        console.log("error.message", error.message);
        return res.status(500).send({
          status_code: 500,
          message: error.message || "Internal api failed",
        });
      });
  }
};

//added asn no
exports.grnCreationV2 = async (req, res) => {
  if (!req.body) {
    return res.status(400).send({
      status_code: 400,
      message: "Missing request Body!",
    });
  }
  let po_number = req.body.po_number;
  let asn_no = req.body.asn_no;
  let invoice_url = req.body.invoice_url;
  let invoice_no = req.body.invoice_no;
  let invoice_date = req.body.invoice_date;
  let item_numbers = [],
    item_codes = [],
    crate_bar_codes = [],
    requestBody = {};

  if (!(po_number && req.body.order_items)) {
    return res.status(400).send({
      status_code: 400,
      message: "Please provide po number and order items!",
    });
  } else {
    let insert_files_data = {};
    insert_files_data.company_code = req.body.company_code;
    insert_files_data.plant_id = req.body.plant_id;
    insert_files_data.po_number = req.body.po_number;
    insert_files_data.invoice_url = req.body.invoice_url;
    insert_files_data.invoice_no = req.body.invoice_no;
    insert_files_data.invoice_date = req.body.invoice_date;

    const orderItems = req.body.order_items;
    const plant_id = req.body.plant_id;
    const company_code = req.body.company_code;
    if (orderItems.length !== 0) {
      requestBody["posting_date"] = moment(new Date()).format("YYYY-MM-DD");
      requestBody["document_date"] = moment(new Date()).format("YYYY-MM-DD");
      requestBody["referance_document_no"] = randomInteger(
        1000000000,
        10000000000
      );
      requestBody["bill_of_lading"] = randomInteger(1000000000, 10000000000);
      requestBody["header_txt"] = [];
      requestBody["Item"] = [];
      orderItems.forEach((order) => {
        if (order.qty !== 0) {
          item_numbers.push(order.item_no);
          item_codes.push(order.item_code);
          let crate_id_arr = order.crate_id.split("_");
          for (let i = 0; i < crate_id_arr.length; i++) {
            crate_bar_codes.push(crate_id_arr[i]);
          }

          console.log("asn_no", asn_no, po_number);

          let itemObj = {
            material_no: order.item_code,
            movement_type: asn_no ? "101" : [],
            quantity: parseFloat(order.qty).toFixed(2),
            po_number: asn_no ? "" : po_number,
            po_item: asn_no ? "" : order.item_no,
            plant: plant_id,
            storage_location: asn_no ? "" : order.storage_location,
            asn_number: asn_no ? asn_no : "",
            asn_item_no: order.asn_item_no ? order.asn_item_no : "",
          };

          // let itemObj = {
          //   material_no: order.item_code,
          //   movement_type: [],
          //   quantity: order.qty,
          //   po_number: po_number,
          //   po_item: order.item_no,
          //   plant: plant_id,
          //   storage_location: order.storage_location,
          // };
          requestBody.Item.push(itemObj);
        }
      });
    }
    let data = { request: requestBody };
    console.log(data);
    var options = {
      method: "post",
      url: `${sap_url}/goods_receipt_note_creation`,
      headers: { Authorization: `${sap_auth}` },
      // headers: { },
      data: data,
    };

    await axios
      .request(options)
      .then(async (response) => {
        let responseData = response.data.response;
        let sapData = {};
        console.log("res : ", responseData);
        sapData.request = requestBody;
        sapData.response = responseData;
        sapData.company_code = company_code;
        sapData.primaryData = po_number;
        sapData.type = "Goods Receipts Note";
        sapData.plant_id = plant_id;
        const new_sap_grn_creation_logs = new sap_grn_creation_logs(sapData);
        await new_sap_grn_creation_logs.save();
        if (responseData.flag === "S" && responseData.material_document_no) {
          insert_files_data.grn_no = responseData.material_document_no;
          const files_url_details = new files_url_details_table(
            insert_files_data
          );

          let files_detail = await files_url_details.save();
          //return res.send(files_detail);

          await inwardProcess
            .find({
              po_no: po_number,
              inward_crate_details: {
                $elemMatch: {
                  crate_barcode_value: {
                    $in: crate_bar_codes,
                  },
                },
              },
            })
            .then(async (data) => {
              data.map(async (each) => {
                if (each.inward_crate_details) {
                  let inward_crate_details_updated = [];
                  await each.inward_crate_details.map((items, index) => {
                    let update_data = {};
                    if (crate_bar_codes.includes(items.crate_barcode_value)) {
                      update_data.inwarded_time = items.inwarded_time;
                      update_data.grn_no = responseData.material_document_no;
                      update_data.grn_status = "success";
                      update_data._id = items._id;
                      update_data.crate_barcode_value =
                        items.crate_barcode_value;
                      update_data.inwarded_qty = items.inwarded_qty;
                      update_data.crate_tare = items.crate_tare;
                      update_data.net_qty = items.net_qty;
                      update_data.inwarded_by = items.inwarded_by;
                      if (items.crate_type)
                        update_data.crate_type = items.crate_type;
                      if (items.mode) update_data.mode = items.mode;
                      if (items.so_delivery_date)
                        update_data.so_delivery_date = items.so_delivery_date;
                      update_data.auto_allocation = items.auto_allocation
                        ? items.auto_allocation
                        : false;
                    } else {
                      update_data.inwarded_time = items.inwarded_time;
                      update_data.grn_no = items.grn_no;
                      update_data.grn_status = items.grn_status;
                      update_data._id = items._id;
                      update_data.crate_barcode_value =
                        items.crate_barcode_value;
                      update_data.inwarded_qty = items.inwarded_qty;
                      update_data.crate_tare = items.crate_tare;
                      update_data.net_qty = items.net_qty;
                      update_data.inwarded_by = items.inwarded_by;
                      if (items.crate_type)
                        update_data.crate_type = items.crate_type;
                      if (items.mode) update_data.mode = items.mode;
                      if (items.so_delivery_date)
                        update_data.so_delivery_date = items.so_delivery_date;
                      update_data.auto_allocation = items.auto_allocation
                        ? items.auto_allocation
                        : false;
                    }
                    inward_crate_details_updated.push(update_data);
                  });
                  each.inward_crate_details = inward_crate_details_updated;
                  let _id = each._id;
                  await inwardProcess
                    .updateOne({ _id: _id }, each)
                    .then((result) => {
                      return res.status(200).send({
                        status_code: 200,
                        message: "Grn created and updated successfully.",
                      });
                    });
                }
              });
            });
        } else {
          return res.status(400).send({
            status_code: 400,
            message: "Grn failed",
          });
        }
      })
      .catch(function (error) {
        console.log("error.message", error.message);
        return res.status(500).send({
          status_code: 500,
          message: error.message || "Internal api failed",
        });
      });
  }
};

exports.getConveyorCommand = async (req, res) => {
  console.log("calling get conveyor commmand api");
  try {
    const { company_code, plant_id, type, device_id } = req.query;

    if (!(company_code && plant_id && type && device_id))
      return res.status(400).send({ message: "Missing parameter" });

    const command = await db.conveyorCommand.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        type: type,
        device_id: device_id,
      },
      { _id: 0, command_line: 1 }
    );

    let mssge = "Conveyor command is available";
    if (command == null) mssge = "Conveyor command is not available!";

    return res.send({ message: mssge, data: command });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message: "Some error occurred while extracting conveyor command",
    });
  }
};

exports.getTestConveyorCommand = async (req, res) => {
  console.log("calling get conveyor commmand api");
  try {
    let data = [
      "{ID=1,CMD=ON,CONVEYOR_ID=ALL}",
      "{ID=1,STATUS=ON,CONVEYOR_ID=CC2}",
      "{ID=1,STATUS=ON,CONVEYOR_ID=MWC}",
      "{ID=1,STATUS=ON,CONVEYOR_ID=MC}",
      "{ID=1,STATUS=ON,CONVEYOR_ID=CC1}",
      "{ID=1,CMD=OFF,CONVEYOR_ID=ALL}",
      "{ID=1,STATUS=OFF,CONVEYOR_ID=CC2}",
      "{ID=1,STATUS=OFF,CONVEYOR_ID=MWC}",
      "{ID=1,STATUS=OFF,CONVEYOR_ID=MC}",
      "{ID=1,,CMD=FWD,CONVEYOR_ID=1}",
    ];

    return res.send({
      message: "Conveyor command is available",
      data: data,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message: "Some error occurred while extracting conveyor command",
    });
  }
};

exports.addConveyorCommand = async (req, res) => {
  let company_code = req.body.company_code;
  let plant_id = req.body.plant_id;
  let device_id = req.body.device_id;
  let type = req.body.type;
  let command_line = req.body.command_line;

  if (!(device_id && plant_id && company_code && type && command_line)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing Parameter!" });
  }

  //insert new pallet to palletization collection
  let insert_new_command = {};
  insert_new_command.company_code = company_code;
  insert_new_command.plant_id = plant_id;
  insert_new_command.device_id = device_id;
  insert_new_command.type = type;
  insert_new_command.command_line = command_line;
  try {
    let conveyorCommandExist = await conveyorCommandTable.findOne({
      company_code: company_code,
      plant_id: plant_id,
      type: type,
      device_id: device_id,
    });

    if (conveyorCommandExist) {
      return res.status(400).send({
        status_code: "400",
        status_message: "Conveyor type is already available for the given type",
      });
    }

    const new_conveyor_command = new conveyorCommandTable(insert_new_command);

    await new_conveyor_command.save(new_conveyor_command);

    return res.status(200).send({
      status_code: "200",
      status_message: "Conveyor command added successfully",
    });
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some Error Occurred While Creating The Customer.",
    });
  }
};

exports.getInwardDashboardInfo = async (req, res) => {
  console.log("Calling get inward dashboard details api");

  const { company_code, plant_id, delivery_date } = req.query;

  try {
    if (!(company_code && plant_id && delivery_date))
      return res.status(400).send({
        status_code: 400,
        message: "Please send all required parameters!",
      });

    const filter = {
      company_code: company_code,
      plant_id: plant_id,
      delivery_date: delivery_date,
    };

    const totalInwardedPOs = await inwardProcess.aggregate([
      {
        $match: filter,
      },
      { $group: { _id: "$po_no" } },
    ]);

    const totalInwardedKgs = await inwardProcess.aggregate([
      {
        $match: filter,
      },
      {
        $group: { _id: "$delivery_date", total_kg: { $sum: "$total_net_qty" } },
      },
    ]);

    const totalKgs =
      totalInwardedKgs.length == 0 ? 0 : totalInwardedKgs[0].total_kg;

    const totalInwardedSkus = await inwardProcess.aggregate([
      {
        $match: filter,
      },
      {
        $group: { _id: "$item_code" },
      },
    ]);

    let total_time = 0;

    const totalInwardingRate = await inwardProcess.find(filter, {
      _id: 0,
      inward_crate_details: 1,
    });
    if (totalInwardingRate.length > 0) {
      //
      //
      totalInwardingRate.map((t) => {
        //
        if (t.inward_crate_details.length > 1) {
          //
          let start_time = t.inward_crate_details[0].inwarded_time.substring(
            11,
            t.inward_crate_details[0].inwarded_time.length
          );

          let end_time = t.inward_crate_details[
            t.inward_crate_details.length - 1
          ].inwarded_time.substring(
            11,
            t.inward_crate_details[t.inward_crate_details.length - 1]
              .inwarded_time.length
          );

          let [d1, m1, y1] = t.inward_crate_details[0].inwarded_time
            .substring(0, 10)
            .split("-");

          let [d2, m2, y2] = t.inward_crate_details[
            t.inward_crate_details.length - 1
          ].inwarded_time
            .substring(0, 10)
            .split("-");

          start_time = new Date(
            y1 + "-" + m1 + "-" + d1 + "T" + start_time + ".000Z"
          );
          end_time = new Date(
            y2 + "-" + m2 + "-" + d2 + "T" + end_time + ".000Z"
          );

          let time_diff =
            (end_time.getTime() - start_time.getTime()) / 1000 / 60;

          total_time += time_diff;
        }
      });
    }
    res.send({
      status_code: 200,
      message: "Inward dashboard details",
      data: {
        totalInwardedPOs: totalInwardedPOs.length,
        totalInwardedKgs: totalKgs,
        totalInwardedSkus: totalInwardedSkus.length,
        inwardingRate:
          (totalKgs == 0 ? 0 : (totalKgs / total_time).toFixed(3)) + " kg/min",
      },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting inward dashboard details!",
    });
  }
};

exports.getInwardDetails = async (req, res) => {
  console.log("getInwardDetails");
  const { company_code, plant_id, from_date, to_date, page_no, type } =
    req.query;
  try {
    if (!(company_code && plant_id && from_date && to_date && page_no))
      return res.status(400).send({
        status_code: 400,
        status_message: "Please send all required parameters!",
      });

    const datee = new Date(req.query.to_date);
    let sd1 = datee.setHours(datee.getHours() + 24);
    // console.log(new Date(sd1));

    if (!req.query.type) {
      return res.status(400).send({
        status_code: 400,
        status_message: "Please select createdAt or delivery_date ",
      });
    }

    let condition = {};
    condition.plant_id = plant_id;
    condition.company_code = company_code;
    if (type) {
      switch (type) {
        case "createdAt":
          console.log("type :createdAt");
          condition.createdAt = {
            $gte: moment(new Date(req.query.from_date)),
            $lt: new Date(sd1),
          };
          break;

        case "delivery_date":
          console.log("delivery_date");
          condition.delivery_date = {
            // $gte: moment(new Date(req.query.from_date)).subtract(1, 'day').toISOString(),
            $gte: req.query.from_date,
            $lt: moment(new Date(req.query.to_date)).add(1, "day"),
          };
          break;
        default:
          break;
      }
    }
    // console.log(moment(new Date(req.query.from_date)).subtract(1, 'day').toISOString(),);

    let total_inward_details = await inwardProcess.find(condition);
    let status_message =
      total_inward_details.length > 0
        ? "Listing the Inward Details"
        : "No Records available!";
    let page_size = req.query.page_size ? parseInt(req.query.page_size) : 25;
    let skip_count = page_no == 1 ? 0 : +page_no * page_size - page_size;

    let inward_details = await inwardProcess
      .find(condition)
      .sort({ po_no: 1, item_no: 1 })
      .skip(skip_count)
      .limit(page_size);

    if (inward_details) {
      inward_details.forEach((element) => {
        if (element.uom == "PAC") {
          element.total_net_qty = element.total_crates;
        }
      });
    }

    return res.status(200).send({
      status_code: "200",
      status_message: status_message,
      total_data_count: total_inward_details.length,
      data: inward_details,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: "500",
      status_message:
        err.message || "Some Error Occurred While Creating The Customer.",
    });
  }
};

exports.getInwardDetailsById = async (req, res) => {
  console.log("getInwardDetailsById");

  try {
    let id = req.params.id;
    let inward_data = await inwardProcess.findById(id);
    if (!inward_data) {
      return res.status(400).send({
        status_code: "400",
        status_message: "Invalid Id received!",
      });
    } else {
      if (inward_data.uom == "PAC") {
        inward_data.total_net_qty = inward_data.total_crates;
      }
    }
    return res.status(200).send({
      status_code: "200",
      status_message: "Inward details",
      data: inward_data,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: "500",
      status_message:
        err.message || "Some Error Occurred While Creating The Customer.",
    });
  }
};

exports.getInwardDetails_v2 = async (req, res) => {
  const { company_code, plant_id, from_date, to_date, page_no, type } =
    req.query;
  try {
    if (!(company_code && plant_id && from_date && to_date && page_no))
      return res.status(400).send({
        status_code: 400,
        status_message: "Please send all required parameters!",
      });

    const datee = new Date(req.query.to_date);
    let sd1 = datee.setHours(datee.getHours() + 24);
    // console.log(new Date(sd1));

    if (!req.query.type) {
      return res.status(400).send({
        status_code: 400,
        status_message: "Please select createdAt or delivery_date ",
      });
    }

    let condition = {};
    condition.plant_id = plant_id;
    condition.company_code = company_code;
    if (type) {
      switch (type) {
        case "createdAt":
          console.log("type :createdAt");
          condition.createdAt = {
            $gte: new Date(req.query.from_date),
            $lt: new Date(sd1),
          };
          break;

        case "delivery_date":
          console.log("delivery_date");
          condition.delivery_date = {
            // $gte: moment(new Date(req.query.from_date)).subtract(1, 'day').toISOString(),
            $gte: req.query.from_date,
            $lt: moment(new Date(req.query.to_date))
              .add(1, "day")
              .format("YYYY-MM-DD"),
          };
          break;
        default:
          break;
      }
    }
    // console.log(moment(new Date(req.query.from_date)).subtract(1, 'day').toISOString(),);

    let total_inward_details = await inwardProcess.find(condition);
    let status_message =
      total_inward_details.length > 0
        ? "Listing the Inward Details"
        : "No Records available!";
    let page_size = req.query.page_size ? parseInt(req.query.page_size) : 25;
    let skip_count = page_no == 1 ? 0 : +page_no * page_size - page_size;

    // let inward_details = await inwardProcess
    //   .find(condition)
    //   .sort({ po_no: 1, item_no: 1 })
    //   .skip(skip_count)
    //   .limit(page_size);

    let inward_details_aggregate = await inwardProcess.aggregate([
      {
        $match: condition,
      },
      {
        $addFields: {
          mode: {
            $cond: {
              if: {
                $in: ["autoinward", "$inward_crate_details.mode"],
              },
              then: "Auto",
              else: "Vendor",
            },
          },
        },
      },
      {
        $sort: {
          po_no: 1,
          item_no: 1,
        },
      },
      {
        $skip: skip_count,
      },
      {
        $limit: page_size,
      },
    ]);

    if (inward_details_aggregate) {
      inward_details_aggregate.forEach((element) => {
        if (element.uom == "PAC") {
          element.total_net_qty = element.total_crates;
        }
      });
    }

    return res.status(200).send({
      status_code: "200",
      status_message: status_message,
      total_data_count: total_inward_details.length,
      data: inward_details_aggregate,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: "500",
      status_message:
        err.message || "Some Error Occurred While Creating The Customer.",
    });
  }
};
