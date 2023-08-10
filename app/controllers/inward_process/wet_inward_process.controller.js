const e = require("express");
const db = require("../../models");
const moment = require("moment");
const moment_tz = require("moment-timezone");
const { values, map } = require("lodash");
const { status } = require("express/lib/response");
const sap_url = process.env.SAP_URL;
const sap_auth = process.env.SAP_AUTH;
const new_sap_url = process.env.NEW_SAP_URL;
const axios = require("axios");
const crypto = require("crypto");
const res = require("express/lib/response");
const { rapid_item_masters } = require("../../models");
const { promises } = require("dns");


const inwardProcess = db.inwardProcess;
const purchase_order_table = db.purchaseOrder;
const purchaseOrder = db.purchaseOrder;
const asn_table = db.asnDetails;
const wetDc_crate_details_table = db.crateDetails;
const sap_grn_creation_logs = db.sap_logs_model;
const so_allocation_table = db.soAllocation;
const stock_summary_table = db.stock_summary;
const item_masters_table = db.itemMasters;
const wdc_item_masters_table = db.rapid_item_masters;
const crate_detail_table = db.crate_management_Details;


async function get_crate_details(
  company_code,
  plant_id,
  crate_barcode_value,
  po_document_date
) {
  console.log("get_crate_details");
  let record = await wetDc_crate_details_table.findOne({
    company_code: company_code,
    dc_id: plant_id,
    crate_id: crate_barcode_value,
    po_document_date: po_document_date,
  });

  if (record) {
    //console.log("record", record, record.order_qty);
    if (!record.allocated) {
      return {
        _id: record._id,
        cc_id: record.cc_id,
        supplier_no: record.supplier_code,
        supplier_name: record.supplier_name,
        po_no: record.po_number,
        po_type: record.po_type,
        item_no: record.item_no,
        item_code: record.item_code,
        item_name: record.item_name,
        invoice_no: "",
        ordered_qty: record.order_qty,
        uom: record.item_uom,
        crate_weight: record.crate_weight,
        po_delivery_date: record.po_delivery_date,
      };
    } else if (record.allocated) {
      //console.log("record.allocated", record.allocated);
      let crate_date = moment_tz(new Date())
        .tz("Asia/Kolkata")
        .format("DD-MM-YYYY");
      const checkForDuplicate = await inwardProcess
        .find({
          company_code: company_code,
          plant_id: plant_id,
          inward_crate_details: {
            $elemMatch: {
              crate_barcode_value: crate_barcode_value,
              inwarded_time: { $regex: crate_date },
              allocated: false,
            },
          },
          cc_id: record.cc_id,
        })
        .countDocuments();
      //console.log("record.allocated", checkForDuplicate);

      if (checkForDuplicate != 0)
        return { message: "Duplicate barcode not allowed!" };
    } else {
      return "";
    }
  }
}

async function get_crate_details_v2(
  company_code,
  plant_id,
  crate_barcode_value,
  po_document_date
) {
  console.log("get_crate_details");
  let record = await wetDc_crate_details_table.findOne({
    company_code: company_code,
    dc_id: plant_id,
    crate_id: crate_barcode_value,
    po_document_date: po_document_date,
  });



  if (record) {
    //console.log("record", record, record.order_qty);
    if (!record.allocated) {

      // pre
      // let inward_filter = {
      //   company_code: company_code,
      //   plant_id: plant_id,
      //   document_date: po_document_date,
      //   po_no: record.po_number,
      //   sto_number: record.delivery_no,
      //   po_type: record.po_type,
      //   supplier_no: record.supplier_code,
      //   item_code: record.item_code,
      //   item_no: record.item_no,
      // };
      // let already_inwarded_data = await inwardProcess.findOne(inward_filter);


      // recent

      let inward_filter = {
        company_code: company_code,
        plant_id: plant_id,
        document_date: po_document_date,
        po_no: record.indent_number,
        sto_number: record.delivery_no,
        po_type: record.po_type,
      };

      let already_inwarded_data = await inwardProcess.find(inward_filter);

      return {
        _id: record._id,
        cc_id: record.cc_id,
        supplier_no: record.supplier_code,
        supplier_name: record.supplier_name,
        po_no: record.indent_number,
        sto_number: record.delivery_no,
        po_type: record.po_type,
        item_no: record.item_no,
        item_code: record.item_code,
        item_name: record.item_name,
        invoice_no: record.invoice_number ? record.invoice_number : "",
        outward_qty: record.order_qty,
        order_qty: record.stopo_order_qty,
        purchase_group: record.purchase_group,
        uom: record.item_uom,
        crate_weight: record.crate_weight,
        po_delivery_date: record.po_delivery_date,
        source_qty: record.crate_weight,
        // total_net_qty: already_inwarded_data ? already_inwarded_data.total_net_qty : 0,
        total_net_qty: already_inwarded_data.length ? already_inwarded_data.reduce((a, b) => a + b.total_net_qty, 0) : 0,
      };
    } else if (record.allocated) {
      //console.log("record.allocated", record.allocated);
      let crate_date = moment_tz(new Date())
        .tz("Asia/Kolkata")
        .format("DD-MM-YYYY");
      const checkForDuplicate = await inwardProcess
        .find({
          company_code: company_code,
          plant_id: plant_id,
          inward_crate_details: {
            $elemMatch: {
              crate_barcode_value: crate_barcode_value,
              inwarded_time: { $regex: crate_date },
              allocated: false,
            },
          },
          cc_id: record.cc_id,
        })
        .countDocuments();
      //console.log("record.allocated", checkForDuplicate);

      if (checkForDuplicate != 0)
        return { message: "Duplicate barcode not allowed!" };
    } else {
      return "";
    }
  }
}

async function insert_crate_details(
  company_code,
  plant_id,
  delivery_date,
  so_delivery_date,
  po_no,
  po_type,
  supplier_no,
  supplier_name,
  item_no,
  item_code,
  item_name,
  invoice_no,
  ordered_qty,
  uom,
  crate_barcode_value,
  crate_type,
  crate_tare,
  inwarded_qty,
  net_qty,
  inwarded_by,
  cc_id,
  mode,
  auto_allocation,
  inbound_delivery_number,
  document_date,
  crate_weight
) {
  console.log("insert_crate_details");
  let insert_data = {};
  const filter = {
    company_code: company_code,
    plant_id: plant_id,
    document_date: document_date,
    po_no: po_no,
    po_type: po_type,
    supplier_no: supplier_no,
    item_code: item_code,
    item_no: item_no,
  };
  if (inbound_delivery_number) {
    filter.inbound_delivery_number = inbound_delivery_number;
  }
  let crate_date = moment_tz(new Date())
    .tz("Asia/Kolkata")
    .format("DD-MM-YYYY");
  const checkForDuplicate = await inwardProcess
    .find({
      company_code: company_code,
      plant_id: plant_id,
      inward_crate_details: {
        $elemMatch: {
          crate_barcode_value: crate_barcode_value,
          inwarded_time: { $regex: crate_date },
          allocated: false,
        },
      },
      cc_id: cc_id,
    })
    .countDocuments();

  if (checkForDuplicate != 0)
    return { message: "Duplicate barcode not allowed!" };

  if (inwarded_qty <= crate_tare) {
    return { message: "Crate tare must be less than actual qty!" };
  }

  if (uom == "EA" && mode == "directscan") {
    inwarded_qty = crate_weight;
  }

  let checkExistingEntry = await inwardProcess.findOne(filter);

  // console.log(checkExistingEntry);

  // before inward getting time in indian
  const inwardedTime = moment_tz(new Date())
    .tz("Asia/Kolkata")
    .format("DD-MM-YYYY HH:mm:ss");

  const lastInwardedTime = moment_tz(new Date())
    .tz("Asia/Kolkata")
    .format("DD-MM-YYYY hh:mm:ss A");

  if (!checkExistingEntry) {
    insert_data.company_code = company_code;
    insert_data.plant_id = plant_id;
    insert_data.document_date = document_date;
    insert_data.delivery_date = delivery_date;
    // insert_data.so_delivery_date = so_delivery_date;
    insert_data.supplier_no = supplier_no;
    insert_data.supplier_name = supplier_name;
    insert_data.po_no = po_no;
    insert_data.po_type = po_type;
    insert_data.item_no = item_no;
    insert_data.item_code = item_code;
    insert_data.item_name = item_name;
    insert_data.invoice_no = invoice_no;
    insert_data.ordered_qty = ordered_qty;
    insert_data.uom = uom;
    insert_data.total_inwarded_qty = inwarded_qty;
    //insert_data.total_extra_qty = total_extra_qty;
    insert_data.total_crates = 1;
    insert_data.total_crates_weight = crate_tare;
    if (uom == "EA" && mode == "directscan") {
      insert_data.total_net_qty = inwarded_qty;
    } else insert_data.total_net_qty = net_qty;
    insert_data.cc_id = cc_id;
    if (uom == "EA" && mode == "directscan") {
      insert_data.total_pending_qty = ordered_qty - inwarded_qty;
    } else insert_data.total_pending_qty = ordered_qty - net_qty;
    insert_data.po_grn_status = "pending";

    insert_data.inventory_net_qty = net_qty;

    //console.log(ordered_qty - net_qty, ordered_qty, net_qty);
    if (inbound_delivery_number) {
      insert_data.inbound_delivery_number = inbound_delivery_number;
    }
    // if (cc_id) {
    // }
    if (insert_data.total_pending_qty < 0) {
      return {
        message: "Exceeded PO Qty!",
      };
    }
    //rejected_qty
    //console.log(mode);
    insert_data.inward_crate_details = [
      {
        crate_barcode_value: crate_barcode_value,
        crate_type: crate_type,
        inwarded_qty: (+inwarded_qty).toFixed(2),
        crate_tare: (+crate_tare).toFixed(2),
        net_qty: (+net_qty).toFixed(2),
        inwarded_by: inwarded_by,
        inwarded_time: inwardedTime,
        mode: mode,
        so_delivery_date: so_delivery_date,
        auto_allocation: auto_allocation,
      },
    ];
    //console.log(insert_data);
    const new_record = new inwardProcess(insert_data);
    let inward_data = await new_record.save();
    return inward_data;
  } else {
    let update_data = {};
    update_data.total_inwarded_qty =
      +checkExistingEntry.total_inwarded_qty + +inwarded_qty;
    // console.log(
    //   "update_data.total_inwarded_qty",
    //   update_data.total_inwarded_qty,
    //   +checkExistingEntry.total_inwarded_qty,
    //   +inwarded_qty,
    //   checkExistingEntry
    // );
    update_data.total_crates = +checkExistingEntry.total_crates + 1;
    update_data.total_crates_weight =
      +checkExistingEntry.total_crates_weight + +crate_tare;
    if (uom == "EA" && mode == "directscan") {
      update_data.total_net_qty =
        +checkExistingEntry.total_net_qty + +inwarded_qty;
    } else
      update_data.total_net_qty = +checkExistingEntry.total_net_qty + +net_qty;
    if (uom == "EA" && mode == "directscan") {
      update_data.total_pending_qty =
        +checkExistingEntry.total_pending_qty - +inwarded_qty;
    } else
      update_data.total_pending_qty =
        +checkExistingEntry.total_pending_qty - +net_qty;

    update_data.inventory_net_qty =
      +checkExistingEntry.inventory_net_qty + +net_qty;
    update_data.po_grn_status = "pending";

    //console.log(mode);
    checkExistingEntry.inward_crate_details.push({
      crate_barcode_value: crate_barcode_value,
      crate_type: crate_type,
      inwarded_qty: (+inwarded_qty).toFixed(2),
      crate_tare: (+crate_tare).toFixed(2),
      net_qty: (+net_qty).toFixed(2),
      inwarded_by: inwarded_by,
      inwarded_time: inwardedTime,
      mode: mode,
      so_delivery_date: so_delivery_date,
      auto_allocation: auto_allocation,
    });
    update_data.inward_crate_details = checkExistingEntry.inward_crate_details;
    if (update_data.total_pending_qty < 0) {
      return {
        message: "Exceeded PO Qty!",
      };
    }
    await inwardProcess.updateOne(
      { _id: checkExistingEntry._id },
      update_data,
      { upsert: false, new: true }
    );
    let inward_data = await inwardProcess.findById(checkExistingEntry._id);
    //console.log(inward_data);
    return inward_data;
  }
}

async function insert_vendor_inward_crate_details_v2(
  company_code,
  plant_id,
  delivery_date,
  so_delivery_date,
  po_no,
  po_type,
  supplier_no,
  supplier_name,
  item_no,
  item_code,
  item_name,
  invoice_no,
  po_qty,
  asn_qty,
  asn_item_no,
  purchase_group,
  uom,
  crate_barcode_value,
  crate_type,
  crate_tare,
  inwarded_qty,
  net_qty,
  inwarded_by,
  mode,
  auto_allocation,
  inbound_delivery_number,
  document_date
) {
  console.log("insert_crate_details");
  let insert_data = {};
  const filter = {
    company_code: company_code,
    plant_id: plant_id,
    document_date: document_date,
    po_no: po_no,
    po_type: po_type,
    supplier_no: supplier_no,
    item_code: item_code,
    item_no: item_no,
  };
  if (inbound_delivery_number) {
    filter.inbound_delivery_number = inbound_delivery_number;
    filter.asn_item_no = asn_item_no;
  }
  let crate_date = moment_tz(new Date())
    .tz("Asia/Kolkata")
    .format("DD-MM-YYYY");
  const checkForDuplicate = await inwardProcess
    .find({
      company_code: company_code,
      plant_id: plant_id,
      inward_crate_details: {
        $elemMatch: {
          crate_barcode_value: crate_barcode_value,
          inwarded_time: { $regex: crate_date },
          allocated: false,
        },
      }
    })
    .countDocuments();

  if (checkForDuplicate != 0)
    return { message: "Duplicate barcode not allowed!" };

  console.log("inwarded_qty", inwarded_qty, crate_tare);
  if (parseFloat(inwarded_qty) <= parseFloat(crate_tare)) {
    return { message: "Crate tare must be less than actual qty!" };
  }

  // if (uom == "EA" && mode == "directscan") {
  //   inwarded_qty = crate_weight;
  // }

  let checkExistingEntry = await inwardProcess.findOne(filter);

  // console.log(checkExistingEntry);

  // before inward getting time in indian
  const inwardedTime = moment_tz(new Date())
    .tz("Asia/Kolkata")
    .format("DD-MM-YYYY HH:mm:ss");

  const lastInwardedTime = moment_tz(new Date())
    .tz("Asia/Kolkata")
    .format("DD-MM-YYYY hh:mm:ss A");

  if (!checkExistingEntry) {
    insert_data.company_code = company_code;
    insert_data.plant_id = plant_id;
    insert_data.document_date = document_date;
    insert_data.delivery_date = delivery_date;
    // insert_data.so_delivery_date = so_delivery_date;
    insert_data.supplier_no = supplier_no;
    insert_data.supplier_name = supplier_name;
    insert_data.po_no = po_no;
    insert_data.po_type = po_type;
    insert_data.item_no = item_no;
    insert_data.item_code = item_code;
    insert_data.item_name = item_name;
    insert_data.invoice_no = invoice_no;
    insert_data.ordered_qty = asn_qty ? asn_qty : po_qty;
    insert_data.po_qty = po_qty;
    insert_data.uom = uom;
    insert_data.total_inwarded_qty = parseFloat(inwarded_qty).toFixed(2);
    //insert_data.total_extra_qty = total_extra_qty;
    insert_data.total_crates = 1;
    insert_data.total_crates_weight = parseFloat(crate_tare).toFixed(2);
    insert_data.total_net_qty = parseFloat(net_qty).toFixed(2);
    //insert_data.cc_id = cc_id;
    insert_data.total_pending_qty = asn_qty ? parseFloat((asn_qty - net_qty)).toFixed(2) : parseFloat((po_qty - net_qty)).toFixed(2);
    insert_data.po_grn_status = "pending";

    insert_data.inventory_net_qty = parseFloat(net_qty).toFixed(2);
    insert_data.purchase_group = purchase_group;

    //console.log(ordered_qty - net_qty, ordered_qty, net_qty);
    if (inbound_delivery_number) {
      insert_data.inbound_delivery_number = inbound_delivery_number;
      insert_data.asn_item_no = asn_item_no;
    }
    // if (cc_id) {
    // }
    if (insert_data.total_pending_qty < 0) {
      return {
        message: "Exceeded PO Qty!",
      };
    }
    //rejected_qty
    //console.log(mode);
    insert_data.inward_crate_details = [
      {
        crate_barcode_value: crate_barcode_value,
        crate_type: crate_type,
        inwarded_qty: (+inwarded_qty).toFixed(2),
        crate_tare: (+crate_tare).toFixed(2),
        net_qty: (+net_qty).toFixed(2),
        inwarded_by: inwarded_by,
        inwarded_time: inwardedTime,
        mode: mode,
        so_delivery_date: so_delivery_date,
        auto_allocation: auto_allocation,
      },
    ];
    //console.log(insert_data);
    const new_record = new inwardProcess(insert_data);
    let inward_data = await new_record.save();
    return inward_data;
  } else {
    let update_data = {};
    update_data.total_inwarded_qty =
      parseFloat((+checkExistingEntry.total_inwarded_qty + +inwarded_qty)).toFixed(2);
    // console.log(
    //   "update_data.total_inwarded_qty",
    //   update_data.total_inwarded_qty,
    //   +checkExistingEntry.total_inwarded_qty,
    //   +inwarded_qty,
    //   checkExistingEntry
    // );
    update_data.total_crates = +checkExistingEntry.total_crates + 1;
    update_data.total_crates_weight =
      parseFloat((+checkExistingEntry.total_crates_weight + +crate_tare)).toFixed(2);
    update_data.total_net_qty = parseFloat((+checkExistingEntry.total_net_qty + +net_qty)).toFixed(2);
    update_data.total_pending_qty =
      parseFloat((+checkExistingEntry.total_pending_qty - +net_qty)).toFixed(2);

    update_data.inventory_net_qty =
      parseFloat((+checkExistingEntry.inventory_net_qty + +net_qty)).toFixed(2);
    update_data.po_grn_status = "pending";

    //console.log(mode);
    checkExistingEntry.inward_crate_details.push({
      crate_barcode_value: crate_barcode_value,
      crate_type: crate_type,
      inwarded_qty: (+inwarded_qty).toFixed(2),
      crate_tare: (+crate_tare).toFixed(2),
      net_qty: (+net_qty).toFixed(2),
      inwarded_by: inwarded_by,
      inwarded_time: inwardedTime,
      mode: mode,
      so_delivery_date: so_delivery_date,
      auto_allocation: auto_allocation,
    });
    update_data.inward_crate_details = checkExistingEntry.inward_crate_details;
    if (update_data.total_pending_qty < 0) {
      return {
        message: "Exceeded PO Qty!",
      };
    }
    await inwardProcess.updateOne(
      { _id: checkExistingEntry._id },
      update_data,
      { upsert: false, new: true }
    );
    let inward_data = await inwardProcess.findById(checkExistingEntry._id);
    //console.log(inward_data);
    return inward_data;
  }
}

async function insert_auto_inward_crate_details_v2(
  company_code,
  plant_id,
  delivery_date,
  so_delivery_date,
  po_no,
  po_type,
  supplier_no,
  supplier_name,
  item_no,
  item_code,
  item_name,
  invoice_no,
  order_qty,
  outward_qty,
  purchase_group,
  sto_number,
  uom,
  crate_barcode_value,
  crate_type,
  crate_tare,
  inwarded_qty,
  net_qty,
  inwarded_by,
  cc_id,
  mode,
  auto_allocation,
  inbound_delivery_number,
  document_date,
  crate_weight
) {
  console.log("insert_crate_details");
  let insert_data = {};
  const filter = {
    company_code: company_code,
    plant_id: plant_id,
    document_date: document_date,
    po_no: po_no,
    sto_number: sto_number,
    po_type: po_type,
    supplier_no: supplier_no,
    item_code: item_code,
    item_no: item_no,
  };
  if (inbound_delivery_number) {
    filter.inbound_delivery_number = inbound_delivery_number;
  }
  let crate_date = moment_tz(new Date())
    .tz("Asia/Kolkata")
    .format("DD-MM-YYYY");
  const checkForDuplicate = await inwardProcess
    .find({
      company_code: company_code,
      plant_id: plant_id,
      inward_crate_details: {
        $elemMatch: {
          crate_barcode_value: crate_barcode_value,
          inwarded_time: { $regex: crate_date },
          allocated: false,
        },
      },
      cc_id: cc_id,
    })
    .countDocuments();

  if (checkForDuplicate != 0)
    return { message: "Duplicate barcode not allowed!" };

  if (parseFloat(inwarded_qty) <= parseFloat(crate_tare)) {
    return { message: "Crate tare must be less than actual qty!" };
  }

  if ((uom == "EA" || uom == "Pcs")) {
    inwarded_qty = crate_weight;
  }

  let checkExistingEntry = await inwardProcess.findOne(filter);

  // console.log(checkExistingEntry);

  let checkGrnCreated = await inwardProcess.findOne({
    sto_number: sto_number,
    company_code: company_code,
    plant_id: plant_id,
    document_date: document_date,
    total_grn_post_qty: { $gt: 0 }
  });

  if (checkGrnCreated)
    return { message: "GRN already created for the STO!" };


  // before inward getting time in indian
  const inwardedTime = moment_tz(new Date())
    .tz("Asia/Kolkata")
    .format("DD-MM-YYYY HH:mm:ss");

  const lastInwardedTime = moment_tz(new Date())
    .tz("Asia/Kolkata")
    .format("DD-MM-YYYY hh:mm:ss A");

  if (!checkExistingEntry) {
    console.log("checkExistingEntry");
    insert_data.company_code = company_code;
    insert_data.plant_id = plant_id;
    insert_data.document_date = document_date;
    insert_data.delivery_date = delivery_date;
    // insert_data.so_delivery_date = so_delivery_date;
    insert_data.supplier_no = supplier_no;
    insert_data.supplier_name = supplier_name;
    insert_data.po_no = po_no;
    insert_data.po_type = po_type;
    insert_data.item_no = item_no;
    insert_data.item_code = item_code;
    insert_data.item_name = item_name;
    insert_data.invoice_no = invoice_no;
    insert_data.ordered_qty = outward_qty;
    insert_data.purchase_group = purchase_group,
      insert_data.sto_number = sto_number,
      insert_data.uom = uom;
    insert_data.total_inwarded_qty = parseFloat(inwarded_qty).toFixed(2);
    //insert_data.total_extra_qty = total_extra_qty;
    insert_data.total_crates = 1;
    console.log("crate_tare", crate_tare);
    insert_data.total_crates_weight = parseFloat(crate_tare).toFixed(2);

    insert_data.po_qty = order_qty;
    if ((uom == "EA" || uom == "Pcs")) {
      insert_data.total_net_qty = parseFloat(inwarded_qty).toFixed(2);
    } else insert_data.total_net_qty = parseFloat(net_qty).toFixed(2);
    insert_data.cc_id = cc_id;
    if ((uom == "EA" || uom == "Pcs")) {
      insert_data.total_pending_qty = parseFloat((outward_qty - inwarded_qty)).toFixed(2);
    } else insert_data.total_pending_qty = parseFloat((outward_qty - net_qty)).toFixed(2);
    insert_data.po_grn_status = "pending";

    insert_data.inventory_net_qty = parseFloat(net_qty).toFixed(2);

    //console.log(ordered_qty - net_qty, ordered_qty, net_qty);
    if (inbound_delivery_number) {
      insert_data.inbound_delivery_number = inbound_delivery_number;
    }
    // if (cc_id) {
    // }
    if (insert_data.total_pending_qty < 0) {
      return {
        message: "Exceeded PO Qty!",
      };
    }
    //rejected_qty
    //console.log(mode);
    insert_data.inward_crate_details = [
      {
        crate_barcode_value: crate_barcode_value,
        crate_type: crate_type,
        inwarded_qty: (+inwarded_qty).toFixed(2),
        crate_tare: (+crate_tare).toFixed(2),
        net_qty: (+net_qty).toFixed(2),
        inwarded_by: inwarded_by,
        inwarded_time: inwardedTime,
        mode: mode,
        so_delivery_date: so_delivery_date,
        auto_allocation: auto_allocation,
      },
    ];
    //console.log(insert_data);
    const new_record = new inwardProcess(insert_data);
    let inward_data = await new_record.save();
    return inward_data;
  } else {
    let update_data = {};
    update_data.total_inwarded_qty =
      parseFloat((+checkExistingEntry.total_inwarded_qty + +inwarded_qty)).toFixed(2);
    // console.log(
    //   "update_data.total_inwarded_qty",
    //   update_data.total_inwarded_qty,
    //   +checkExistingEntry.total_inwarded_qty,
    //   +inwarded_qty,
    //   checkExistingEntry
    // );
    update_data.total_crates = +checkExistingEntry.total_crates + 1;
    update_data.total_crates_weight =
      parseFloat((+checkExistingEntry.total_crates_weight + +crate_tare)).toFixed(2);
    if ((uom == "EA" || uom == "Pcs")) {
      update_data.total_net_qty =
        parseFloat((+checkExistingEntry.total_net_qty + +inwarded_qty)).toFixed(2);
    } else
      update_data.total_net_qty = parseFloat((+checkExistingEntry.total_net_qty + +net_qty)).toFixed(2);
    if ((uom == "EA" || uom == "Pcs")) {
      update_data.total_pending_qty =
        parseFloat((+checkExistingEntry.total_pending_qty - +inwarded_qty)).toFixed(2);
    } else
      update_data.total_pending_qty =
        parseFloat((+checkExistingEntry.total_pending_qty - +net_qty)).toFixed(2);

    update_data.inventory_net_qty =
      parseFloat((+checkExistingEntry.inventory_net_qty + +net_qty)).toFixed(2);
    //update_data.po_grn_status = "pending";

    //console.log(mode);
    checkExistingEntry.inward_crate_details.push({
      crate_barcode_value: crate_barcode_value,
      crate_type: crate_type,
      inwarded_qty: (+inwarded_qty).toFixed(2),
      crate_tare: (+crate_tare).toFixed(2),
      net_qty: (+net_qty).toFixed(2),
      inwarded_by: inwarded_by,
      inwarded_time: inwardedTime,
      mode: mode,
      so_delivery_date: so_delivery_date,
      auto_allocation: auto_allocation,
    });
    update_data.inward_crate_details = checkExistingEntry.inward_crate_details;
    if (update_data.total_pending_qty < 0) {
      return {
        message: "Exceeded PO Qty!",
      };
    }
    await inwardProcess.updateOne(
      { _id: checkExistingEntry._id },
      update_data,
      { upsert: false, new: true }
    );
    let inward_data = await inwardProcess.findById(checkExistingEntry._id);
    //console.log(inward_data);
    return inward_data;
  }
}

async function get_so_id(
  mode,
  item_code,
  net_qty,
  so_delivery_date,
  company_code,
  plant_id,
  uom,
  crate_weight
) {
  let uom_flag = true;
  if (uom == "EA" && mode == "directscan") {
    let so_ea_id = await so_allocation_table
      .findOne(
        {
          material_no: item_code,
          delivery_date: so_delivery_date,
          pending_qty: { $gte: crate_weight },
          company_code: company_code,
          plant_id: plant_id,
          uom: { $in: ["EA", "Pcs"] },
          route_id: { $ne: "" },
        },
        { _id: 1 }
      )
      .sort({
        _id: 1,
      });
    if (so_ea_id) {
      //console.log("so_ea_id",so_ea_id);
      uom_flag = false;
      return so_ea_id._id;
    }
  }
  if (uom_flag) {
    //console.log("uom_flag",uom_flag);
    let so_id = await so_allocation_table
      .findOne(
        {
          material_no: item_code,
          delivery_date: so_delivery_date,
          pending_qty: { $gte: net_qty },
          company_code: company_code,
          plant_id: plant_id,
          uom: { $in: ["KG"] },
          route_id: { $ne: "" },
        },
        { _id: 1 }
      )
      .sort({
        _id: 1,
      });
    if (so_id) {
      return so_id._id;
    } else {
      return false;
    }
  }
}

async function get_so_id_v2(
  mode,
  item_code,
  net_qty,
  so_delivery_date,
  company_code,
  plant_id,
  uom,
  crate_weight
) {
  let uom_flag = true;
  if ((uom == "EA" || uom == "Pcs") && mode == "directscan") {
    let so_ea_id = await so_allocation_table
      .findOne(
        {
          material_no: item_code,
          delivery_date: so_delivery_date,
          pending_qty: { $gte: crate_weight },
          company_code: company_code,
          plant_id: plant_id,
          uom: { $in: ["EA", "Pcs"] },
          route_id: { $ne: "" },
        },
        { _id: 1 }
      )
      .sort({
        _id: 1,
      });
    if (so_ea_id) {
      //console.log("so_ea_id",so_ea_id);
      uom_flag = false;
      return so_ea_id._id;
    }
  }
  if (uom_flag) {
    //console.log("uom_flag",uom_flag);
    let so_id = await so_allocation_table
      .findOne(
        {
          material_no: item_code,
          delivery_date: so_delivery_date,
          pending_qty: { $gte: net_qty },
          company_code: company_code,
          plant_id: plant_id,
          uom: { $in: ["KG"] },
          route_id: { $ne: "" },
        },
        { _id: 1 }
      )
      .sort({
        _id: 1,
      });
    if (so_id) {
      return so_id._id;
    } else {
      return false;
    }
  }
}

async function get_so_id_v3(
  mode,
  item_code,
  net_qty,
  so_delivery_date,
  company_code,
  plant_id,
  uom,
  crate_weight
) {
  let uom_flag = true;
  if ((uom == "EA" || uom == "Pcs")) {
    let so_ea_id = await so_allocation_table
      .findOne(
        {
          material_no: item_code,
          delivery_date: so_delivery_date,
          pending_qty: { $gte: crate_weight },
          company_code: company_code,
          plant_id: plant_id,
          uom: { $in: ["EA", "Pcs"] },
          route_id: { $ne: "" },
        },
        { _id: 1 }
      )
      .sort({
        _id: 1,
      });
    if (so_ea_id) {
      //console.log("so_ea_id",so_ea_id);
      uom_flag = false;
      return so_ea_id._id;
    }
  }
  if (uom_flag) {
    //console.log("uom_flag",uom_flag);
    let so_id = await so_allocation_table
      .findOne(
        {
          material_no: item_code,
          delivery_date: so_delivery_date,
          pending_qty: { $gte: net_qty },
          company_code: company_code,
          plant_id: plant_id,
          uom: { $in: ["KG"] },
          route_id: { $ne: "" },
        },
        { _id: 1 }
      )
      .sort({
        _id: 1,
      });
    if (so_id) {
      return so_id._id;
    } else {
      return false;
    }
  }
}

async function get_so_summary(
  item_code,
  so_delivery_date,
  company_code,
  plant_id
) {
  let so_details = await so_allocation_table.aggregate([
    {
      $match: {
        material_no: item_code,
        delivery_date: so_delivery_date,
        company_code: company_code,
        plant_id: plant_id,
        route_id: { $ne: "" },
      },
    },
    {
      $group: {
        _id: "$material_no",
        summed_qty: { $sum: "$pending_qty" },
      },
    },
  ]);

  if (so_details.length) {
    return so_details[0].summed_qty;
  } else {
    return false;
  }
}

async function get_so_summary_v2(
  item_code,
  so_delivery_date,
  company_code,
  plant_id,
  uom
) {
  let so_details = await so_allocation_table.aggregate([
    {
      $match: {
        material_no: item_code,
        delivery_date: so_delivery_date,
        company_code: company_code,
        plant_id: plant_id,
        uom: uom,
        pending_qty: { $gt: 0 },
        route_id: { $ne: "" },
      },
    },
    {
      $group: {
        _id: "$material_no",
        summed_qty: { $sum: "$pending_qty" },
      },
    },
  ]);

  if (so_details.length) {
    return so_details[0].summed_qty;
  } else {
    return false;
  }
}

async function get_sku_available_stock(
  item_code,
  item_name,
  company_code,
  plant_id
) {
  let sku_available_stock = await stock_summary_table.aggregate([
    {
      $match: {
        material_no: item_code,
        company_code: company_code,
        plant_id: plant_id,
      },
    },
  ]);

  if (sku_available_stock.length) {
    //console.log("true");
    return sku_available_stock[0].opening_stock;
  } else {
    let insert_data = {};
    insert_data.material_no = item_code;
    insert_data.material_name = item_name;
    insert_data.company_code = company_code;
    insert_data.plant_id = plant_id;
    insert_data.inwarded_qty = 0;
    insert_data.opening_stock = 0;
    insert_data.auto_allocated_qty = 0;
    insert_data.inventory_grn_posted_qty = 0;
    insert_data.inventory_invoice_posted_qty = 0;
    insert_data.total_stock_qty = 0;

    const new_stock_entry = new stock_summary_table(insert_data);

    let previous_stock = await new_stock_entry.save(new_stock_entry);
    //console.log("insert_data",insert_data,updated_entry);
    return 0;
  }
}

async function get_sku_available_stock_v2(
  item_code,
  item_name,
  company_code,
  plant_id,
  uom
) {
  let sku_available_stock = await stock_summary_table.aggregate([
    {
      $match: {
        material_no: item_code,
        company_code: company_code,
        plant_id: plant_id,
        uom: uom,
      },
    },
  ]);

  if (sku_available_stock.length) {
    //console.log("true");
    return sku_available_stock[0].opening_stock;
  } else {
    let insert_data = {};
    insert_data.material_no = item_code;
    insert_data.material_name = item_name;
    insert_data.uom = uom;
    insert_data.company_code = company_code;
    insert_data.plant_id = plant_id;
    insert_data.inwarded_qty = 0;
    insert_data.auto_allocated_qty = 0;
    insert_data.manual_allocated_qty = 0;
    insert_data.total_stock_qty = 0;
    insert_data.opening_stock = 0;
    insert_data.inventory_stock_qty = 0;
    insert_data.inventory_grn_posted_qty = 0;
    insert_data.inventory_invoice_posted_qty = 0;

    const new_stock_entry = new stock_summary_table(insert_data);

    let previous_stock = await new_stock_entry.save(new_stock_entry);
    //console.log("insert_data",insert_data,updated_entry);
    return 0;
  }
}

async function update_stock_summary_table(
  item_code,
  company_code,
  plant_id,
  stock_qty
) {
  await stock_summary_table.updateOne(
    {
      material_no: item_code,
      company_code: company_code,
      plant_id: plant_id,
    },
    { $inc: { inwarded_qty: stock_qty, auto_allocated_qty: stock_qty } }
  );
}

async function update_so_by_id(
  so_id,
  crate_barcode_value,
  inwarded_qty,
  crate_tare,
  allocation_qty,
  mode,
  crate_type
) {
  //console.log("so_id", so_id);
  await so_allocation_table.updateOne(
    { _id: so_id },
    {
      $push: {
        allocation_detail: {
          crate_barcode: crate_barcode_value,
          gross_weight: inwarded_qty,
          tare_weight: crate_tare,
          net_weight: allocation_qty,
          mode: mode,
          crate_type: crate_type,
        },
      },
      allocation_qty,
      $inc: {
        allocated_qty: allocation_qty,
        create_count: 1,
        pending_qty: -allocation_qty,
      },
    }
  );
}

async function update_so_by_id_v2(
  so_id,
  crate_barcode_value,
  inwarded_qty,
  crate_tare,
  allocation_qty,
  mode,
  crate_type,
  so_pending_qty,
  inventory_allocated_qty
) {
  //console.log("so_id", so_id);

  let is_ready_for_invoice_flag = false;
  if (so_pending_qty == 0) {
    is_ready_for_invoice_flag = true;
  }

  let temp_so_data = await so_allocation_table.findById(so_id);
  //console.log("temp_so_data",temp_so_data,temp_so_data.allocated_qty + allocation_qty,+(temp_so_data.allocated_qty + allocation_qty).toFixed(2));
  // parseFloat((+checkExistingEntry.total_inwarded_qty + +inwarded_qty)).toFixed(2);
  let updating_allocated_qty = +((+temp_so_data.allocated_qty + +allocation_qty)).toFixed(2);
  let updating_inventory_allocated_qty = +((+temp_so_data.inventory_allocated_qty + +inventory_allocated_qty)).toFixed(2);
  let updating_pending_qty = +((+temp_so_data.pending_qty - +allocation_qty)).toFixed(2);

  //let temp_so_data = await so_allocation_table
  await so_allocation_table.updateOne(
    { _id: so_id },
    {
      $push: {
        allocation_detail: {
          crate_barcode: crate_barcode_value,
          gross_weight: inwarded_qty,
          tare_weight: crate_tare,
          net_weight: allocation_qty,
          mode: mode,
          crate_type: crate_type,
        },
      },
      allocation_qty,
      $inc: {
        create_count: 1
      },
      $set: {
        is_ready_for_invoice: is_ready_for_invoice_flag,
        allocated_qty: updating_allocated_qty,
        pending_qty: updating_pending_qty,
        inventory_allocated_qty: updating_inventory_allocated_qty,
      },
    }
  );
}

async function update_summary_stock(
  item_code,
  item_name,
  company_code,
  plant_id,
  stock_qty
) {
  let stock_id = await stock_summary_table.findOne(
    {
      material_no: item_code,
      company_code: company_code,
      plant_id: plant_id,
    },
    { _id: 1 }
  );
  if (stock_id) {
    await stock_summary_table.updateOne(
      {
        _id: stock_id._id,
      },
      { $inc: { inwarded_qty: stock_qty, opening_stock: stock_qty } }
    );
  } else {
    let insert_data = {};
    insert_data.material_no = item_code;
    insert_data.material_name = item_name;
    insert_data.company_code = company_code;
    insert_data.plant_id = plant_id;
    insert_data.inwarded_qty = stock_qty;
    insert_data.opening_stock = stock_qty;
    insert_data.auto_allocated_qty = 0;
    insert_data.inventory_grn_posted_qty = 0;
    insert_data.inventory_invoice_posted_qty = 0;
    insert_data.total_stock_qty = 0;

    const new_stock_entry = new stock_summary_table(insert_data);
    await new_stock_entry.save(new_stock_entry);
  }
}

async function update_summary_stock_v2(
  item_code,
  item_name,
  company_code,
  plant_id,
  stock_qty,
  uom
) {
  let stock_id = await stock_summary_table.findOne(
    {
      material_no: item_code,
      company_code: company_code,
      plant_id: plant_id,
      uom: uom,
    },
    { _id: 1, inwarded_qty: 1, total_stock_qty: 1 }
  );
  if (stock_id) {
    console.log("entered stock_id");
    let updating_inwarded_qty = parseFloat(+stock_id.inwarded_qty + +stock_qty).toFixed(2);
    let updating_total_stock_qty = parseFloat(+stock_id.total_stock_qty + +stock_qty).toFixed(2);
    console.log("updating_total_stock_qty", updating_inwarded_qty, updating_total_stock_qty, typeof updating_inwarded_qty, typeof updating_total_stock_qty);

    await stock_summary_table.updateOne(
      {
        _id: stock_id._id,
      },
      { $set: { inwarded_qty: updating_inwarded_qty, total_stock_qty: updating_total_stock_qty } }
    );
  } else {
    let insert_data = {};
    insert_data.material_no = item_code;
    insert_data.material_name = item_name;
    insert_data.uom = uom;
    insert_data.company_code = company_code;
    insert_data.plant_id = plant_id;
    insert_data.inwarded_qty = stock_qty;
    insert_data.auto_allocated_qty = 0;
    insert_data.manual_allocated_qty = 0;
    insert_data.total_stock_qty = stock_qty;
    insert_data.opening_stock = 0;
    insert_data.inventory_stock_qty = 0;
    insert_data.inventory_grn_posted_qty = 0;
    insert_data.inventory_invoice_posted_qty = 0;

    const new_stock_entry = new stock_summary_table(insert_data);
    await new_stock_entry.save(new_stock_entry);
  }
}

async function update_summary_stock_auto_allocation_v2(
  item_code,
  item_name,
  company_code,
  plant_id,
  stock_qty,
  uom
) {
  let stock_id = await stock_summary_table.findOne(
    {
      material_no: item_code,
      company_code: company_code,
      plant_id: plant_id,
      uom: uom,
    },
    { _id: 1, inwarded_qty: 1, auto_allocated_qty: 1 }
  );
  if (stock_id) {
    console.log("enter auto stock_id", stock_id, stock_qty);
    let updating_inwarded_qty = parseFloat(parseFloat(stock_id.inwarded_qty) + parseFloat(stock_qty)).toFixed(2);
    let updating_auto_allocated_qty = parseFloat(parseFloat(stock_id.auto_allocated_qty) + parseFloat(stock_qty)).toFixed(2);
    console.log("updating_total_stock_qty", updating_inwarded_qty, updating_auto_allocated_qty, typeof updating_inwarded_qty, typeof updating_auto_allocated_qty);
    await stock_summary_table.updateOne(
      {
        _id: stock_id._id,
      },
      { $set: { inwarded_qty: updating_inwarded_qty, auto_allocated_qty: updating_auto_allocated_qty } }
    );
  } else {
    let insert_data = {};
    insert_data.material_no = item_code;
    insert_data.material_name = item_name;
    insert_data.uom = uom;
    insert_data.company_code = company_code;
    insert_data.plant_id = plant_id;
    insert_data.inwarded_qty = stock_qty;
    insert_data.auto_allocated_qty = stock_qty;
    insert_data.manual_allocated_qty = 0;
    insert_data.total_stock_qty = 0;
    insert_data.opening_stock = 0;
    insert_data.inventory_stock_qty = 0;
    insert_data.inventory_grn_posted_qty = 0;
    insert_data.inventory_invoice_posted_qty = 0;

    const new_stock_entry = new stock_summary_table(insert_data);
    await new_stock_entry.save(new_stock_entry);
  }
}

async function get_item_master_details(item_code) {
  let response = await wdc_item_masters_table
    .findOne(
      { material_number: item_code },
      { uom: 1, material_type: 1, material_group: 1, material_desc: 1, altuom: 1 }
    )
    .then((data) => {
      //console.log("data", data);
      let uom = data ? data.uom ? data.uom : "" : "";
      let alt_uom = data ? data.altuom ? data.altuom : "" : "";
      //console.log("uom",alt_uom,uom,data);

      if (uom && alt_uom) return true;
      else return false;
    });

  return response;
}

exports.insert_direct_scan_inwarded_crates = async (req, res) => {
  console.log("insert_inwarded_crates");

  let inwarded_by = req.body.inwarded_by;
  let crate_barcode_value = req.body.crate_barcode_value;
  let crate_type = req.body.crate_type;
  if (req.body.actual_qty && req.body.crate_tare) {
    var inwarded_qty = req.body.actual_qty.toFixed(2);
    var crate_tare = req.body.crate_tare.toFixed(2);
    var net_qty = (+inwarded_qty - +crate_tare).toFixed(2);
  }

  let plant_id = req.body.plant_id;
  let company_code = req.body.company_code;
  let so_delivery_date = req.body.so_delivery_date;
  let document_date = req.body.document_date;
  let mode = req.body.mode;
  let auto_allocation = req.body.auto_allocation;
  if (
    !(
      mode &&
      company_code &&
      plant_id &&
      crate_barcode_value &&
      crate_type &&
      inwarded_by &&
      document_date &&
      so_delivery_date &&
      crate_tare != null &&
      inwarded_qty != null
    )
  ) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }
  try {
    const inwardedTime = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("DD-MM-YYYY HH:mm:ss");

    let create_details = await get_crate_details(
      company_code,
      plant_id,
      crate_barcode_value,
      document_date
    );
    //console.log("create_details", create_details);

    if (!create_details) {
      //console.log("create_details",create_details);
      return res.status(400).send({
        status_code: "400",
        status_message: "crate barcode not available",
      });
    }

    let cc_id = create_details.cc_id;
    let supplier_no = create_details.supplier_no;
    let supplier_name = create_details.supplier_name;
    let po_no = create_details.po_no;
    let po_type = create_details.po_type;
    let item_no = create_details.item_no;
    let item_code = create_details.item_code;
    let item_name = create_details.item_name;
    let invoice_no = create_details.invoice_no;
    let ordered_qty = create_details.ordered_qty;
    let uom = create_details.uom;
    let crate_weight = create_details.crate_weight;
    let delivery_date = create_details.po_delivery_date;
    //console.log(delivery_date,create_details);
    //console.log(ordered_qty, po_type, create_details);
    let data = await insert_crate_details(
      company_code,
      plant_id,
      delivery_date,
      so_delivery_date,
      po_no,
      po_type,
      supplier_no,
      supplier_name,
      item_no,
      item_code,
      item_name,
      invoice_no,
      ordered_qty,
      uom,
      crate_barcode_value,
      crate_type,
      crate_tare,
      inwarded_qty,
      net_qty,
      inwarded_by,
      cc_id,
      mode,
      auto_allocation,
      "",
      document_date
    );

    //console.log(crate_weight);

    if (data.message == "Crate tare must be less than actual qty!") {
      return res.send({
        message: "Crate tare must be less than actual qty!",
      });
    } else if (data.message == "Duplicate barcode not allowed!") {
      return res
        .status(409)
        .send({ message: "Duplicate barcode not allowed!" });
    } else if (data.message == "Exceeded PO Qty!") {
      return res.status(309).send({
        message: "‘Exceeded PO Qty!",
      });
    } else {
      var final_data = {};
      final_data.company_code = data.company_code;
      final_data.unit_price = data.unit_price;
      final_data.total_extra_qty = data.total_extra_qty;
      final_data.rejected_qty = data.rejected_qty;
      final_data.created_at = data.created_at;
      final_data.updated_at = data.updated_at;
      final_data._id = data._id;
      final_data.plant_id = data.plant_id;
      final_data.delivery_date = data.delivery_date;
      final_data.supplier_no = data.supplier_no;
      final_data.supplier_name = data.supplier_name;
      final_data.po_no = data.po_no;
      final_data.po_type = data.po_type;
      final_data.item_no = data.item_no;
      final_data.item_code = data.item_code;
      final_data.item_name = data.item_name;
      final_data.invoice_no = data.invoice_no;
      final_data.ordered_qty = data.ordered_qty;
      final_data.uom = data.uom;
      final_data.total_inwarded_qty = data.total_inwarded_qty;
      final_data.total_crates = data.total_crates;
      final_data.total_crates_weight = data.total_crates_weight;
      final_data.total_net_qty = data.total_net_qty;
      final_data.total_pending_qty = data.total_pending_qty;
      final_data.cc_id = data.cc_id;
      final_data.inward_crate_details = data.inward_crate_details;
      final_data.createdAt = data.createdAt;
      final_data.updatedAt = data.updatedAt;
      final_data.__v = data.__v;
      final_data.source_qty = crate_weight ? crate_weight : 0;
      final_data.inwarded_time = inwardedTime;
      return res.status(200).send({
        status_code: "200",
        message: "Crate Inserted Successfully",
        data: final_data,
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

exports.insert_direct_scan_inwarded_crates_v2 = async (req, res) => {
  console.log("insert_inwarded_crates");

  let inwarded_by = req.body.inwarded_by;
  let crate_barcode_value = req.body.crate_barcode_value;
  let crate_type = req.body.crate_type;
  if (req.body.actual_qty && req.body.crate_tare) {
    var inwarded_qty = req.body.actual_qty.toFixed(2);
    var crate_tare = req.body.crate_tare.toFixed(2);
    var net_qty = (+inwarded_qty - +crate_tare).toFixed(2);
  }

  let plant_id = req.body.plant_id;
  let company_code = req.body.company_code;
  let so_delivery_date = req.body.so_delivery_date;
  let document_date = req.body.document_date;
  let mode = req.body.mode;
  let auto_allocation = req.body.auto_allocation;
  if (
    !(
      mode &&
      company_code &&
      plant_id &&
      crate_barcode_value &&
      crate_type &&
      inwarded_by &&
      document_date &&
      so_delivery_date &&
      crate_tare != null &&
      inwarded_qty != null
    )
  ) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }
  try {
    const inwardedTime = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("DD-MM-YYYY HH:mm:ss");

    let create_details = await get_crate_details(
      company_code,
      plant_id,
      crate_barcode_value,
      document_date
    );
    //console.log("create_details", create_details);

    if (!create_details) {
      //console.log("create_details",create_details);
      return res.status(400).send({
        status_code: "400",
        status_message: "crate barcode not available",
      });
    }

    let cc_id = create_details.cc_id;
    let supplier_no = create_details.supplier_no;
    let supplier_name = create_details.supplier_name;
    let po_no = create_details.po_no;
    let po_type = create_details.po_type;
    let item_no = create_details.item_no;
    let item_code = create_details.item_code;
    let item_name = create_details.item_name;
    let invoice_no = create_details.invoice_no;
    let ordered_qty = create_details.ordered_qty;
    let uom = create_details.uom;
    let crate_weight = create_details.crate_weight;
    let delivery_date = create_details.po_delivery_date;
    //console.log(delivery_date,create_details);
    //console.log(ordered_qty, po_type, create_details);

    if (auto_allocation) {
      var so_id = await get_so_id(
        item_code,
        net_qty,
        so_delivery_date,
        company_code,
        plant_id
      );
      //console.log("so_id", so_id);
      let flag = true;

      if (!so_id) {
        auto_allocation = false;
        flag = false;
      }

      if (flag) {
        var so_summed_pending_qty = await get_so_summary(
          item_code,
          so_delivery_date,
          company_code,
          plant_id
        );
        //console.log("so_details", so_summed_pending_qty);

        var sku_available_stock = await get_sku_available_stock(
          item_code,
          item_name,
          company_code,
          plant_id
        );
        //console.log("sku_available_stock", sku_available_stock);

        if (!(so_summed_pending_qty > sku_available_stock + net_qty))
          auto_allocation = false;
      }
    }

    let data = await insert_crate_details(
      company_code,
      plant_id,
      delivery_date,
      so_delivery_date,
      po_no,
      po_type,
      supplier_no,
      supplier_name,
      item_no,
      item_code,
      item_name,
      invoice_no,
      ordered_qty,
      uom,
      crate_barcode_value,
      crate_type,
      crate_tare,
      inwarded_qty,
      net_qty,
      inwarded_by,
      cc_id,
      mode,
      auto_allocation,
      "",
      document_date
    );

    //console.log(crate_weight);

    if (data.message == "Crate tare must be less than actual qty!") {
      return res.send({
        message: "Crate tare must be less than actual qty!",
      });
    } else if (data.message == "Duplicate barcode not allowed!") {
      return res
        .status(409)
        .send({ message: "Duplicate barcode not allowed!" });
    } else if (data.message == "Exceeded PO Qty!") {
      return res.status(309).send({
        message: "‘Exceeded PO Qty!",
      });
    } else {
      var final_data = {};
      final_data.company_code = data.company_code;
      final_data.unit_price = data.unit_price;
      final_data.total_extra_qty = data.total_extra_qty;
      final_data.rejected_qty = data.rejected_qty;
      final_data.created_at = data.created_at;
      final_data.updated_at = data.updated_at;
      final_data._id = data._id;
      final_data.plant_id = data.plant_id;
      final_data.delivery_date = data.delivery_date;
      final_data.supplier_no = data.supplier_no;
      final_data.supplier_name = data.supplier_name;
      final_data.po_no = data.po_no;
      final_data.po_type = data.po_type;
      final_data.item_no = data.item_no;
      final_data.item_code = data.item_code;
      final_data.item_name = data.item_name;
      final_data.invoice_no = data.invoice_no;
      final_data.ordered_qty = data.ordered_qty;
      final_data.uom = data.uom;
      final_data.total_inwarded_qty = data.total_inwarded_qty;
      final_data.total_crates = data.total_crates;
      final_data.total_crates_weight = data.total_crates_weight;
      final_data.total_net_qty = data.total_net_qty;
      final_data.total_pending_qty = data.total_pending_qty;
      final_data.cc_id = data.cc_id;
      final_data.inward_crate_details = data.inward_crate_details;
      final_data.createdAt = data.createdAt;
      final_data.updatedAt = data.updatedAt;
      final_data.__v = data.__v;
      final_data.source_qty = crate_weight ? crate_weight : 0;
      final_data.inwarded_time = inwardedTime;

      if (auto_allocation) {
        var so_details_by_id = await update_so_by_id(
          so_id,
          crate_barcode_value,
          inwarded_qty,
          crate_tare,
          net_qty,
          mode
        );
        var update_stock_summary = await update_stock_summary_table(
          item_code,
          company_code,
          plant_id,
          net_qty
        );
      } else {
        await update_summary_stock(
          item_code,
          item_name,
          company_code,
          plant_id,
          net_qty
        );
      }

      return res.status(200).send({
        status_code: "200",
        message: "Crate Inserted Successfully",
        data: final_data,
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

exports.insert_direct_scan_inwarded_crates_v3 = async (req, res) => {
  console.log("insert_inwarded_crates");

  let inwarded_by = req.body.inwarded_by;
  let crate_barcode_value = req.body.crate_barcode_value;
  let crate_type = req.body.crate_type;
  if (req.body.actual_qty && req.body.crate_tare) {
    var inwarded_qty = req.body.actual_qty.toFixed(2);
    var crate_tare = req.body.crate_tare.toFixed(2);
    var net_qty = (+inwarded_qty - +crate_tare).toFixed(2);
  }

  let plant_id = req.body.plant_id;
  let company_code = req.body.company_code;
  let so_delivery_date = req.body.so_delivery_date;
  let document_date = req.body.document_date;
  let mode = req.body.mode;
  let auto_allocation = req.body.auto_allocation;
  if (
    !(
      mode &&
      company_code &&
      plant_id &&
      crate_barcode_value &&
      crate_type &&
      inwarded_by &&
      document_date &&
      so_delivery_date &&
      crate_tare != null &&
      inwarded_qty != null
    )
  ) {
    return res
      .status(400)
      .send({ status_code: "400", message: "Missing parameter." });
  }
  try {
    const inwardedTime = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("DD-MM-YYYY HH:mm:ss");

    let create_details = await get_crate_details(
      company_code,
      plant_id,
      crate_barcode_value,
      document_date
    );
    //console.log("create_details", create_details);

    if (!create_details) {
      //console.log("create_details",create_details);
      return res.status(400).send({
        status_code: "400",
        message: "Crate id is not available",
      });
    } else if (create_details.message == "Duplicate barcode not allowed!") {
      return res.status(400).send({
        status_code: "400",
        message: "Crate id is already inwarded",
      });
    }

    //return res.send(create_details);

    let cc_id = create_details.cc_id;
    let supplier_no = create_details.supplier_no;
    let supplier_name = create_details.supplier_name;
    let po_no = create_details.po_no;
    let po_type = create_details.po_type;
    let item_no = create_details.item_no;
    let item_code = create_details.item_code;
    let item_name = create_details.item_name;
    let invoice_no = create_details.invoice_no;
    let ordered_qty = create_details.ordered_qty;
    let uom = create_details.uom;
    let crate_weight = create_details.crate_weight;
    let delivery_date = create_details.po_delivery_date;
    //console.log(delivery_date,create_details);
    //console.log(ordered_qty, po_type, create_details);

    if (auto_allocation) {
      var so_id = await get_so_id(
        mode,
        item_code,
        net_qty,
        so_delivery_date,
        company_code,
        plant_id,
        uom,
        crate_weight
      );

      //return res.send(so_id);

      let flag = true;

      if (!so_id) {
        auto_allocation = false;
        flag = false;
      }

      if (uom != "EA" && flag) {
        var so_summed_pending_qty = await get_so_summary(
          item_code,
          so_delivery_date,
          company_code,
          plant_id
        );
        //console.log("so_summed_pending_qty", so_summed_pending_qty);

        var sku_available_stock = await get_sku_available_stock(
          item_code,
          item_name,
          company_code,
          plant_id
        );
        //console.log("sku_available_stock", sku_available_stock);

        //console.log("stock_temp_qty",stock_temp_qty);
        //console.log("(so_summed_pending_qty > (sku_available_stock + stock_temp_qty))",sku_available_stock + stock_temp_qty,so_summed_pending_qty,(so_summed_pending_qty > (sku_available_stock + stock_temp_qty)))

        if (!(so_summed_pending_qty >= sku_available_stock + net_qty)) {
          console.log("auto_allocation", auto_allocation);
          auto_allocation = false;
        }
      }
    }

    //console.log("so_id",so_id,auto_allocation);
    //return res.send("hello");
    let data = await insert_crate_details(
      company_code,
      plant_id,
      delivery_date,
      so_delivery_date,
      po_no,
      po_type,
      supplier_no,
      supplier_name,
      item_no,
      item_code,
      item_name,
      invoice_no,
      ordered_qty,
      uom,
      crate_barcode_value,
      crate_type,
      crate_tare,
      inwarded_qty,
      net_qty,
      inwarded_by,
      cc_id,
      mode,
      auto_allocation,
      "",
      document_date,
      crate_weight
    );

    //console.log(crate_weight);

    if (data.message == "Crate tare must be less than actual qty!") {
      return res.send({
        message: "Crate tare must be less than actual qty!",
      });
    } else if (data.message == "Duplicate barcode not allowed!") {
      return res.status(409).send({ message: "Crate id is already inwarded" });
    } else if (data.message == "Exceeded PO Qty!") {
      return res.status(309).send({
        message: "‘Exceeded PO Qty!",
      });
    } else {
      var final_data = {};
      final_data.company_code = data.company_code;
      final_data.unit_price = data.unit_price;
      final_data.total_extra_qty = data.total_extra_qty;
      final_data.rejected_qty = data.rejected_qty;
      final_data.created_at = data.created_at;
      final_data.updated_at = data.updated_at;
      final_data._id = data._id;
      final_data.plant_id = data.plant_id;
      final_data.delivery_date = data.delivery_date;
      final_data.supplier_no = data.supplier_no;
      final_data.supplier_name = data.supplier_name;
      final_data.po_no = data.po_no;
      final_data.po_type = data.po_type;
      final_data.item_no = data.item_no;
      final_data.item_code = data.item_code;
      final_data.item_name = data.item_name;
      final_data.invoice_no = data.invoice_no;
      final_data.ordered_qty = data.ordered_qty;
      final_data.uom = data.uom;
      final_data.total_inwarded_qty = data.total_inwarded_qty;
      final_data.total_crates = data.total_crates;
      final_data.total_crates_weight = data.total_crates_weight;
      final_data.total_net_qty = data.total_net_qty;
      final_data.total_pending_qty = data.total_pending_qty;
      final_data.cc_id = data.cc_id;
      final_data.inward_crate_details = data.inward_crate_details;
      final_data.createdAt = data.createdAt;
      final_data.updatedAt = data.updatedAt;
      final_data.__v = data.__v;
      final_data.source_qty = crate_weight ? crate_weight : 0;
      final_data.inwarded_time = inwardedTime;

      if (auto_allocation) {
        let allocation_qty = net_qty;
        var so_id_details = await so_allocation_table.findById(so_id);
        if (so_id_details.uom == "EA" || so_id_details.uom == "Pcs") {
          allocation_qty = crate_weight;
        }

        var so_details_by_id = await update_so_by_id(
          so_id,
          crate_barcode_value,
          inwarded_qty,
          crate_tare,
          allocation_qty,
          mode,
          crate_type
        );

        let stock_qty = net_qty;
        // if (uom == "EA") {
        //   stock_qty = crate_weight;
        // }

        var update_stock_summary = await update_stock_summary_table(
          item_code,
          company_code,
          plant_id,
          stock_qty
        );
      } else {
        let stock_qty = net_qty;
        // if (uom == "EA") {
        //   stock_qty = crate_weight;
        // }

        await update_summary_stock(
          item_code,
          item_name,
          company_code,
          plant_id,
          stock_qty
        );
      }

      let _id = create_details._id;
      await wetDc_crate_details_table.updateOne(
        {
          _id: _id,
        },
        { allocated: true },
        { upsert: false }
      );

      return res.status(200).send({
        status_code: "200",
        message: "Crate Inserted Successfully",
        data: final_data,
      });
    }
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

exports.insert_direct_scan_inwarded_crates_v4 = async (req, res) => {
  console.log("insert_inwarded_crates");

  let inwarded_by = req.body.inwarded_by;
  let crate_barcode_value = req.body.crate_barcode_value;
  let crate_type = req.body.crate_type;
  if (req.body.actual_qty && req.body.crate_tare) {
    var inwarded_qty = req.body.actual_qty.toFixed(2);
    var crate_tare = req.body.crate_tare.toFixed(2);
    var net_qty = (+inwarded_qty - +crate_tare).toFixed(2);
  }

  let plant_id = req.body.plant_id;
  let company_code = req.body.company_code;
  let so_delivery_date = req.body.so_delivery_date;
  let document_date = req.body.document_date;
  let mode = req.body.mode;
  let auto_allocation = req.body.auto_allocation;
  if (
    !(
      mode &&
      company_code &&
      plant_id &&
      crate_barcode_value &&
      crate_type &&
      inwarded_by &&
      document_date &&
      so_delivery_date &&
      crate_tare != null &&
      inwarded_qty != null
    )
  ) {
    return res
      .status(400)
      .send({ status_code: "400", message: "Missing parameter." });
  }
  try {
    const inwardedTime = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("DD-MM-YYYY HH:mm:ss");

    let create_details = await get_crate_details(
      company_code,
      plant_id,
      crate_barcode_value,
      document_date
    );
    //console.log("create_details", create_details);

    if (!create_details) {
      //console.log("create_details",create_details);
      return res.status(400).send({
        status_code: "400",
        message: "Crate id is not available",
      });
    } else if (create_details.message == "Duplicate barcode not allowed!") {
      return res.status(400).send({
        status_code: "400",
        message: "Crate id is already inwarded",
      });
    }

    let cc_id = create_details.cc_id;
    let supplier_no = create_details.supplier_no;
    let supplier_name = create_details.supplier_name;
    let po_no = create_details.po_no;
    let po_type = create_details.po_type;
    let item_no = create_details.item_no;
    let item_code = create_details.item_code;
    let item_name = create_details.item_name;
    let invoice_no = create_details.invoice_no;
    let ordered_qty = create_details.ordered_qty;
    let uom = create_details.uom;
    let crate_weight = create_details.crate_weight;
    let delivery_date = create_details.po_delivery_date;
    //console.log(delivery_date,create_details);
    //console.log(ordered_qty, po_type, create_details);

    let multiple_uom_flag = await get_item_master_details(item_code);
    //console.log("item_master_details", multiple_uom_flag);

    if (auto_allocation) {
      var so_id = await get_so_id_v2(
        mode,
        item_code,
        net_qty,
        so_delivery_date,
        company_code,
        plant_id,
        uom,
        crate_weight
      );

      //return res.send(so_id);

      let flag = true;

      if (!so_id) {
        auto_allocation = false;
        flag = false;
      }

      if (flag && !multiple_uom_flag) {
        var so_summed_pending_qty = await get_so_summary_v2(
          item_code,
          so_delivery_date,
          company_code,
          plant_id,
          uom
        );
        //console.log("so_summed_pending_qty", so_summed_pending_qty);

        var sku_available_stock = await get_sku_available_stock_v2(
          item_code,
          item_name,
          company_code,
          plant_id,
          uom
        );
        //console.log("sku_available_stock", sku_available_stock);

        //console.log("stock_temp_qty",stock_temp_qty);
        //console.log("(so_summed_pending_qty > (sku_available_stock + stock_temp_qty))",sku_available_stock + stock_temp_qty,so_summed_pending_qty,(so_summed_pending_qty > (sku_available_stock + stock_temp_qty)))

        let temp_qty = net_qty;
        if (uom == "EA" || uom == "Pcs") {
          temp_qty = crate_weight;
        }
        if (!(so_summed_pending_qty >= sku_available_stock + temp_qty)) {
          console.log("auto_allocation", auto_allocation);
          auto_allocation = false;
        }
      }
    }

    //console.log("so_id",so_id,auto_allocation);
    //return res.send("hello");
    let data = await insert_crate_details(
      company_code,
      plant_id,
      delivery_date,
      so_delivery_date,
      po_no,
      po_type,
      supplier_no,
      supplier_name,
      item_no,
      item_code,
      item_name,
      invoice_no,
      ordered_qty,
      uom,
      crate_barcode_value,
      crate_type,
      crate_tare,
      inwarded_qty,
      net_qty,
      inwarded_by,
      cc_id,
      mode,
      auto_allocation,
      "",
      document_date,
      crate_weight
    );

    //console.log(crate_weight);

    if (data.message == "Crate tare must be less than actual qty!") {
      return res.send({
        message: "Crate tare must be less than actual qty!",
      });
    } else if (data.message == "Duplicate barcode not allowed!") {
      return res.status(409).send({ message: "Crate id is already inwarded" });
    } else if (data.message == "Exceeded PO Qty!") {
      return res.status(309).send({
        message: "‘Exceeded PO Qty!",
      });
    } else {
      var final_data = {};
      final_data.company_code = data.company_code;
      final_data.unit_price = data.unit_price;
      final_data.total_extra_qty = data.total_extra_qty;
      final_data.rejected_qty = data.rejected_qty;
      final_data.created_at = data.created_at;
      final_data.updated_at = data.updated_at;
      final_data._id = data._id;
      final_data.plant_id = data.plant_id;
      final_data.delivery_date = data.delivery_date;
      final_data.supplier_no = data.supplier_no;
      final_data.supplier_name = data.supplier_name;
      final_data.po_no = data.po_no;
      final_data.po_type = data.po_type;
      final_data.item_no = data.item_no;
      final_data.item_code = data.item_code;
      final_data.item_name = data.item_name;
      final_data.invoice_no = data.invoice_no;
      final_data.ordered_qty = data.ordered_qty;
      final_data.uom = data.uom;
      final_data.total_inwarded_qty = data.total_inwarded_qty;
      final_data.total_crates = data.total_crates;
      final_data.total_crates_weight = data.total_crates_weight;
      final_data.total_net_qty = data.total_net_qty;
      final_data.total_pending_qty = data.total_pending_qty;
      final_data.cc_id = data.cc_id;
      final_data.inward_crate_details = data.inward_crate_details;
      final_data.createdAt = data.createdAt;
      final_data.updatedAt = data.updatedAt;
      final_data.__v = data.__v;
      final_data.source_qty = crate_weight ? crate_weight : 0;
      final_data.inwarded_time = inwardedTime;

      if (auto_allocation) {
        let allocation_qty = net_qty;
        var so_id_details = await so_allocation_table.findById(so_id);
        if (so_id_details.uom == "EA" || so_id_details.uom == "Pcs") {
          allocation_qty = crate_weight;
        }

        let so_pending_qty = so_id_details.pending_qty - allocation_qty;
        let inventory_allocated_qty = net_qty;
        if (!multiple_uom_flag && (uom == "EA" || uom == "Pcs")) {
          inventory_allocated_qty = crate_weight;
        }

        var so_details_by_id = await update_so_by_id_v2(
          so_id,
          crate_barcode_value,
          inwarded_qty,
          crate_tare,
          allocation_qty,
          mode,
          crate_type,
          so_pending_qty,
          inventory_allocated_qty
        );
        let temp_stock_qty = net_qty;
        if ((uom == "EA" || uom == "Pcs") && !multiple_uom_flag) {
          temp_stock_qty = crate_weight;
        }

        if (multiple_uom_flag) {
          uom = "KG";
        }

        await update_summary_stock_auto_allocation_v2(
          item_code,
          item_name,
          company_code,
          plant_id,
          temp_stock_qty,
          uom
        );
      } else {
        let temp_stock_qty = net_qty;
        if ((uom == "EA" || uom == "Pcs") && !multiple_uom_flag) {
          temp_stock_qty = crate_weight;
        }

        if (multiple_uom_flag) {
          uom = "KG";
        }

        await update_summary_stock_v2(
          item_code,
          item_name,
          company_code,
          plant_id,
          temp_stock_qty,
          uom
        );
      }

      let _id = create_details._id;
      await wetDc_crate_details_table.updateOne(
        {
          _id: _id,
        },
        { allocated: true },
        { upsert: false }
      );

      return res.status(200).send({
        status_code: "200",
        message: "Crate Inserted Successfully",
        data: final_data,
      });
    }
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

exports.insert_auto_inwarded_crates_v5 = async (req, res) => {
  console.log("insert_auto_inwarded_crates_v5");

  let inwarded_by = req.body.inwarded_by;
  let crate_barcode_value = req.body.crate_barcode_value;
  let crate_type = req.body.crate_type;
  if (req.body.actual_qty && req.body.crate_tare) {
    var inwarded_qty = req.body.actual_qty.toFixed(2);
    var crate_tare = req.body.crate_tare.toFixed(2);
    var net_qty = (+inwarded_qty - +crate_tare).toFixed(2);
  }

  let plant_id = req.body.plant_id;
  let company_code = req.body.company_code;
  let so_delivery_date = req.body.so_delivery_date;
  let document_date = req.body.document_date;
  let mode = req.body.mode;
  let auto_allocation = req.body.auto_allocation;
  if (
    !(
      mode &&
      company_code &&
      plant_id &&
      crate_barcode_value &&
      crate_type &&
      inwarded_by &&
      document_date &&
      so_delivery_date &&
      crate_tare != null &&
      inwarded_qty != null
    )
  ) {
    return res
      .status(400)
      .send({ status_code: "400", message: "Missing parameter." });
  }
  try {
    const inwardedTime = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("DD-MM-YYYY HH:mm:ss");

    let create_details = await get_crate_details_v2(
      company_code,
      plant_id,
      crate_barcode_value,
      document_date
    );
    console.log("create_details", create_details);

    if (!create_details) {
      //console.log("create_details",create_details);
      return res.status(400).send({
        status_code: "400",
        message: "Crate id is not available",
      });
    } else if (create_details.message == "Duplicate barcode not allowed!") {
      return res.status(400).send({
        status_code: "400",
        message: "Crate id is already inwarded",
      });
    }

    //return res.send(create_details);

    let cc_id = create_details.cc_id;
    let supplier_no = create_details.supplier_no;
    let supplier_name = create_details.supplier_name;
    let po_no = create_details.po_no;
    let po_type = create_details.po_type;
    let item_no = create_details.item_no;
    let item_code = create_details.item_code;
    let item_name = create_details.item_name;
    let invoice_no = create_details.invoice_no;
    let order_qty = create_details.order_qty;
    let outward_qty = create_details.outward_qty;
    let purchase_group = create_details.purchase_group;
    let sto_number = create_details.sto_number;
    let uom = create_details.uom;
    let crate_weight = create_details.crate_weight;
    let delivery_date = create_details.po_delivery_date;
    //console.log(delivery_date,create_details);
    //console.log(ordered_qty, po_type, create_details);

    let multiple_uom_flag = await get_item_master_details(item_code);
    //console.log("item_master_details", multiple_uom_flag);

    if (auto_allocation) {
      var so_id = await get_so_id_v3(
        mode,
        item_code,
        net_qty,
        so_delivery_date,
        company_code,
        plant_id,
        uom,
        crate_weight
      );

      //return res.send(so_id);

      let flag = true;

      if (!so_id) {
        auto_allocation = false;
        flag = false;
      }

      if (flag && !multiple_uom_flag) {
        var so_summed_pending_qty = await get_so_summary_v2(
          item_code,
          so_delivery_date,
          company_code,
          plant_id,
          uom
        );
        //console.log("so_summed_pending_qty", so_summed_pending_qty);

        var sku_available_stock = await get_sku_available_stock_v2(
          item_code,
          item_name,
          company_code,
          plant_id,
          uom
        );
        //console.log("sku_available_stock", sku_available_stock);

        //console.log("stock_temp_qty",stock_temp_qty);
        //console.log("(so_summed_pending_qty > (sku_available_stock + stock_temp_qty))",sku_available_stock + stock_temp_qty,so_summed_pending_qty,(so_summed_pending_qty > (sku_available_stock + stock_temp_qty)))

        let temp_qty = net_qty;
        if (uom == "EA" || uom == "Pcs") {
          temp_qty = crate_weight;
        }
        if (!(so_summed_pending_qty >= sku_available_stock + temp_qty)) {
          console.log("auto_allocation", auto_allocation);
          auto_allocation = false;
        }
      }
    }

    //console.log("so_id",so_id,auto_allocation);
    //return res.send("hello");
    let data = await insert_auto_inward_crate_details_v2(
      company_code,
      plant_id,
      delivery_date,
      so_delivery_date,
      po_no,
      po_type,
      supplier_no,
      supplier_name,
      item_no,
      item_code,
      item_name,
      invoice_no,
      order_qty,
      outward_qty,
      purchase_group,
      sto_number,
      uom,
      crate_barcode_value,
      crate_type,
      crate_tare,
      inwarded_qty,
      net_qty,
      inwarded_by,
      cc_id,
      mode,
      auto_allocation,
      "",
      document_date,
      crate_weight
    );

    //console.log(crate_weight);

    if (data.message == "Crate tare must be less than actual qty!") {
      return res.send({
        message: "Crate tare must be less than actual qty!",
      });
    } else if (data.message == "Duplicate barcode not allowed!") {
      return res.status(409).send({ message: "Crate id is already inwarded" });
    } else if (data.message == "Exceeded PO Qty!") {
      return res.status(309).send({
        message: "‘Exceeded PO Qty!",
      });
    } else if (data.message == "GRN already created for the STO!") {
      return res.status(309).send({
        message: 'Inward restricted for this STO since GRN is already created',
      });
    } else {
      var final_data = {};
      final_data.company_code = data.company_code;
      final_data.unit_price = data.unit_price;
      final_data.total_extra_qty = data.total_extra_qty;
      final_data.rejected_qty = data.rejected_qty;
      final_data.created_at = data.created_at;
      final_data.updated_at = data.updated_at;
      final_data._id = data._id;
      final_data.plant_id = data.plant_id;
      final_data.delivery_date = data.delivery_date;
      final_data.supplier_no = data.supplier_no;
      final_data.supplier_name = data.supplier_name;
      final_data.po_no = data.po_no;
      final_data.po_type = data.po_type;
      final_data.item_no = data.item_no;
      final_data.item_code = data.item_code;
      final_data.item_name = data.item_name;
      final_data.invoice_no = data.invoice_no;
      final_data.order_qty = data.ordered_qty;
      final_data.outward_qty = data.outward_qty;
      final_data.sto_number = data.sto_number;
      final_data.purchase_group = data.purchase_group;
      final_data.uom = data.uom;
      final_data.total_inwarded_qty = data.total_inwarded_qty;
      final_data.total_crates = data.total_crates;
      final_data.total_crates_weight = data.total_crates_weight;
      final_data.total_net_qty = data.total_net_qty;
      final_data.total_pending_qty = data.total_pending_qty;
      final_data.cc_id = data.cc_id;
      final_data.inward_crate_details = data.inward_crate_details;
      final_data.createdAt = data.createdAt;
      final_data.updatedAt = data.updatedAt;
      final_data.__v = data.__v;
      final_data.source_qty = crate_weight ? crate_weight : 0;
      final_data.inwarded_time = inwardedTime;

      if (auto_allocation) {
        let allocation_qty = net_qty;
        var so_id_details = await so_allocation_table.findById(so_id);
        if (so_id_details.uom == "EA" || so_id_details.uom == "Pcs") {
          allocation_qty = crate_weight;
        }

        let so_pending_qty = so_id_details.pending_qty - allocation_qty;
        let inventory_allocated_qty = net_qty;
        if (!multiple_uom_flag && (uom == "EA" || uom == "Pcs")) {
          inventory_allocated_qty = crate_weight;
        }

        var so_details_by_id = await update_so_by_id_v2(
          so_id,
          crate_barcode_value,
          inwarded_qty,
          crate_tare,
          allocation_qty,
          mode,
          crate_type,
          so_pending_qty,
          inventory_allocated_qty
        );
        let temp_stock_qty = net_qty;
        if ((uom == "EA" || uom == "Pcs") && !multiple_uom_flag) {
          temp_stock_qty = crate_weight;
        }

        if (multiple_uom_flag) {
          uom = "KG";
        }

        await update_summary_stock_auto_allocation_v2(
          item_code,
          item_name,
          company_code,
          plant_id,
          temp_stock_qty,
          uom
        );
      } else {
        let temp_stock_qty = net_qty;
        if ((uom == "EA" || uom == "Pcs") && !multiple_uom_flag) {
          temp_stock_qty = crate_weight;
        }

        if (multiple_uom_flag) {
          uom = "KG";
        }

        await update_summary_stock_v2(
          item_code,
          item_name,
          company_code,
          plant_id,
          temp_stock_qty,
          uom
        );
      }

      let _id = create_details._id;
      await wetDc_crate_details_table.updateOne(
        {
          _id: _id,
        },
        { allocated: true },
        { upsert: false }
      );

      return res.status(200).send({
        status_code: "200",
        message: "Crate Inserted Successfully",
        data: final_data,
      });
    }
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

async function crate_master_findOne(company_code, crate_barcode_value) {

  return await crate_detail_table.aggregate([
    {
      $match: {
        company_code: company_code,
      }
    },
    {
      $unwind: "$bar_codes_array"
    },
    {
      $match: {
        "bar_codes_array.bar_code": crate_barcode_value
      }
    },
    {
      $limit: 1
    },
    {
      $project: {
        _id: 0,
        "crate_type": "$color",
        "crate_barcode_value": "$bar_codes_array.bar_code",
        "tare_weight": "$bar_codes_array.weight",
      }
    }
  ])
}

exports.insert_auto_inwarded_crates_v6 = async (req, res) => {
  console.log("insert_auto_inwarded_crates_v5");

  let inwarded_by = req.body.inwarded_by;
  let crate_barcode_value = req.body.crate_barcode_value;
  let crate_type = req.body.crate_type;
  var crate_tare = req.body.crate_tare;

  if (req.body.actual_qty)
    var inwarded_qty = req.body.actual_qty.toFixed(2);

  let plant_id = req.body.plant_id;
  let company_code = req.body.company_code;
  let so_delivery_date = req.body.so_delivery_date;
  let document_date = req.body.document_date;
  let mode = req.body.mode;
  let auto_allocation = req.body.auto_allocation;
  if (
    !(
      mode &&
      company_code &&
      plant_id &&
      crate_barcode_value &&
      //crate_type &&
      inwarded_by &&
      document_date &&
      so_delivery_date &&
      //crate_tare != null &&
      inwarded_qty != null
    )
  ) {
    return res
      .status(400)
      .send({ status_code: "400", message: "Missing parameter." });
  }
  try {
    const inwardedTime = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("DD-MM-YYYY HH:mm:ss");

    let create_details = await get_crate_details_v2(
      company_code,
      plant_id,
      crate_barcode_value,
      document_date
    );
    //console.log("create_details", create_details);

    if (!create_details) {
      //console.log("create_details",create_details);
      return res.status(400).send({
        status_code: "400",
        message: "Crate id is not available",
      });
    } else if (create_details.message == "Duplicate barcode not allowed!") {
      return res.status(400).send({
        status_code: "400",
        message: "Crate id is already inwarded",
      });
    }

    //create_details.source_qty = create_details.crate_weight ? create_details.crate_weight : 0;
    if (crate_tare == null) {
      let crate_master_details = await crate_master_findOne(company_code, crate_barcode_value);
      if (!(crate_master_details.length)) {
        return res.status(404).send({
          status_code: "404",
          message: "Please enter crate tare weight!",
          data: create_details
        });
      }
      else {
        crate_tare = crate_master_details[0].tare_weight;
        crate_type = crate_master_details[0].crate_type;
      }
    }

    if (crate_tare != null) {
      console.log("crate_tare", crate_tare);
      crate_tare = parseFloat(crate_tare).toFixed(2);
      var net_qty = (+inwarded_qty - +crate_tare).toFixed(2);
    }
    // else {
    //   return res
    //   .status(400)
    //   .send({ status_code: "400", message: "crate_tare must be greater than zero " });
    // }

    let cc_id = create_details.cc_id;
    let supplier_no = create_details.supplier_no;
    let supplier_name = create_details.supplier_name;
    let po_no = create_details.po_no;
    let po_type = create_details.po_type;
    let item_no = create_details.item_no;
    let item_code = create_details.item_code;
    let item_name = create_details.item_name;
    let invoice_no = create_details.invoice_no;
    let order_qty = create_details.order_qty;
    let outward_qty = create_details.outward_qty;
    let purchase_group = create_details.purchase_group;
    let sto_number = create_details.sto_number;
    let uom = create_details.uom;
    let crate_weight = create_details.crate_weight;
    let delivery_date = create_details.po_delivery_date;
    //console.log(delivery_date,create_details);
    //console.log(ordered_qty, po_type, create_details);

    let multiple_uom_flag = await get_item_master_details(item_code);
    //console.log("item_master_details", multiple_uom_flag);

    if (auto_allocation) {
      var so_id = await get_so_id_v3(
        mode,
        item_code,
        net_qty,
        so_delivery_date,
        company_code,
        plant_id,
        uom,
        crate_weight
      );

      //return res.send(so_id);

      let flag = true;

      if (!so_id) {
        auto_allocation = false;
        flag = false;
      }

      if (flag && !multiple_uom_flag) {
        var so_summed_pending_qty = await get_so_summary_v2(
          item_code,
          so_delivery_date,
          company_code,
          plant_id,
          uom
        );
        //console.log("so_summed_pending_qty", so_summed_pending_qty);

        var sku_available_stock = await get_sku_available_stock_v2(
          item_code,
          item_name,
          company_code,
          plant_id,
          uom
        );
        //console.log("sku_available_stock", sku_available_stock);

        //console.log("stock_temp_qty",stock_temp_qty);
        //console.log("(so_summed_pending_qty > (sku_available_stock + stock_temp_qty))",sku_available_stock + stock_temp_qty,so_summed_pending_qty,(so_summed_pending_qty > (sku_available_stock + stock_temp_qty)))

        let temp_qty = net_qty;
        if (uom == "EA" || uom == "Pcs") {
          temp_qty = crate_weight;
        }
        if (!(so_summed_pending_qty >= sku_available_stock + temp_qty)) {
          console.log("auto_allocation", auto_allocation);
          auto_allocation = false;
        }
      }
    }

    //console.log("so_id",so_id,auto_allocation);
    //return res.send("hello");
    let data = await insert_auto_inward_crate_details_v2(
      company_code,
      plant_id,
      delivery_date,
      so_delivery_date,
      po_no,
      po_type,
      supplier_no,
      supplier_name,
      item_no,
      item_code,
      item_name,
      invoice_no,
      order_qty,
      outward_qty,
      purchase_group,
      sto_number,
      uom,
      crate_barcode_value,
      crate_type,
      crate_tare,
      inwarded_qty,
      net_qty,
      inwarded_by,
      cc_id,
      mode,
      auto_allocation,
      "",
      document_date,
      crate_weight
    );

    //console.log(crate_weight);

    if (data.message == "Crate tare must be less than actual qty!") {
      return res.status(400).send({
        status_code: "400",
        message: "Crate tare must be less than actual qty!",
      });
    } else if (data.message == "Duplicate barcode not allowed!") {
      return res.status(409).send({
        status_code: "409",
        message: "Crate id is already inwarded"
      });
    } else if (data.message == "Exceeded PO Qty!") {
      return res.status(309).send({
        status_code: "309",
        message: "‘Exceeded PO Qty!",
      });
    } else if (data.message == "GRN already created for the STO!") {
      return res.status(309).send({
        status_code: "309",
        message: 'Inward restricted for this STO since GRN is already created',
      });
    } else {
      var final_data = {};
      final_data.company_code = data.company_code;
      final_data.unit_price = data.unit_price;
      final_data.total_extra_qty = data.total_extra_qty;
      final_data.rejected_qty = data.rejected_qty;
      final_data.created_at = data.created_at;
      final_data.updated_at = data.updated_at;
      final_data._id = data._id;
      final_data.plant_id = data.plant_id;
      final_data.delivery_date = data.delivery_date;
      final_data.supplier_no = data.supplier_no;
      final_data.supplier_name = data.supplier_name;
      final_data.po_no = data.po_no;
      final_data.po_type = data.po_type;
      final_data.item_no = data.item_no;
      final_data.item_code = data.item_code;
      final_data.item_name = data.item_name;
      final_data.invoice_no = data.invoice_no;
      final_data.order_qty = data.ordered_qty;
      final_data.outward_qty = data.outward_qty;
      final_data.sto_number = data.sto_number;
      final_data.purchase_group = data.purchase_group;
      final_data.uom = data.uom;
      final_data.total_inwarded_qty = data.total_inwarded_qty;
      final_data.total_crates = data.total_crates;
      final_data.total_crates_weight = data.total_crates_weight;
      final_data.total_net_qty = data.total_net_qty;
      final_data.total_pending_qty = data.total_pending_qty;
      final_data.cc_id = data.cc_id;
      final_data.inward_crate_details = data.inward_crate_details;
      final_data.createdAt = data.createdAt;
      final_data.updatedAt = data.updatedAt;
      final_data.__v = data.__v;
      final_data.source_qty = crate_weight ? crate_weight : 0;
      final_data.inwarded_time = inwardedTime;
      final_data.crate_tare = crate_tare;
      final_data.crate_type = crate_type;
      final_data.last_crate_net_qty = net_qty;

      if (auto_allocation) {
        let allocation_qty = net_qty;
        var so_id_details = await so_allocation_table.findById(so_id);
        if (so_id_details.uom == "EA" || so_id_details.uom == "Pcs") {
          allocation_qty = crate_weight;
        }

        let so_pending_qty = so_id_details.pending_qty - allocation_qty;
        let inventory_allocated_qty = net_qty;
        if (!multiple_uom_flag && (uom == "EA" || uom == "Pcs")) {
          inventory_allocated_qty = crate_weight;
        }

        var so_details_by_id = await update_so_by_id_v2(
          so_id,
          crate_barcode_value,
          inwarded_qty,
          crate_tare,
          allocation_qty,
          mode,
          crate_type,
          so_pending_qty,
          inventory_allocated_qty
        );
        let temp_stock_qty = net_qty;
        if ((uom == "EA" || uom == "Pcs") && !multiple_uom_flag) {
          temp_stock_qty = crate_weight;
        }

        if (multiple_uom_flag) {
          uom = "KG";
        }

        await update_summary_stock_auto_allocation_v2(
          item_code,
          item_name,
          company_code,
          plant_id,
          temp_stock_qty,
          uom
        );
      } else {
        let temp_stock_qty = net_qty;
        if ((uom == "EA" || uom == "Pcs") && !multiple_uom_flag) {
          temp_stock_qty = crate_weight;
        }

        if (multiple_uom_flag) {
          uom = "KG";
        }

        await update_summary_stock_v2(
          item_code,
          item_name,
          company_code,
          plant_id,
          temp_stock_qty,
          uom
        );
      }

      let _id = create_details._id;
      await wetDc_crate_details_table.updateOne(
        {
          _id: _id,
        },
        { allocated: true },
        { upsert: false }
      );

      return res.status(200).send({
        status_code: "200",
        message: "Crate Inserted Successfully",
        data: final_data,
      });
    }
  } catch (err) {
    console.log("err", err);
    return res.status(400).send({
      status_code: "400",
      message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

exports.insert_auto_inwarded_crates = async (req, res) => {
  const mode = req.body.mode;
  const company_code = req.body.company_code;
  const plant_id = req.body.plant_id;
  const delivery_date = req.body.delivery_date;
  const document_date = req.body.document_date;
  const so_delivery_date = req.body.so_delivery_date;
  const po_no = req.body.po_no;
  const po_type = req.body.po_type;
  const supplier_no = req.body.supplier_no;
  const supplier_name = req.body.supplier_name;
  const item_no = req.body.item_no;
  const item_code = req.body.item_code;
  const item_name = req.body.item_name;
  const invoice_no = req.body.invoice_no ? req.body.invoice_no : "";
  const ordered_qty = req.body.ordered_qty;
  const uom = req.body.uom;
  const crate_barcode_value = req.body.crate_barcode_value;
  const crate_type = req.body.crate_type;
  let inwarded_qty = req.body.inwarded_qty.toFixed(2);
  let crate_tare = req.body.crate_tare.toFixed(2);
  const net_qty = (+inwarded_qty - +crate_tare).toFixed(2);
  const inwarded_by = req.body.inwarded_by;
  let auto_allocation = req.body.auto_allocation;
  let inbound_delivery_number = req.body.inbound_delivery_number;

  // console.log(mode);
  if (
    !(
      mode &&
      company_code &&
      plant_id &&
      delivery_date &&
      document_date &&
      so_delivery_date &&
      po_no &&
      po_type &&
      supplier_no &&
      supplier_name &&
      item_no &&
      item_code &&
      item_name &&
      ordered_qty != null &&
      uom &&
      crate_barcode_value &&
      crate_type &&
      inwarded_by &&
      crate_tare != null &&
      inwarded_qty != null
    )
  ) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }
  try {
    const inwardedTime = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("DD-MM-YYYY HH:mm:ss");

    let data = await insert_crate_details(
      company_code,
      plant_id,
      delivery_date,
      so_delivery_date,
      po_no,
      po_type,
      supplier_no,
      supplier_name,
      item_no,
      item_code,
      item_name,
      invoice_no,
      ordered_qty,
      uom,
      crate_barcode_value,
      crate_type,
      crate_tare,
      inwarded_qty,
      net_qty,
      inwarded_by,
      "",
      mode,
      auto_allocation,
      inbound_delivery_number,
      document_date
    );

    if (data.message == "Crate tare must be less than actual qty!") {
      return res.send({
        message: "Crate tare must be less than actual qty!",
      });
    } else if (data.message == "Duplicate barcode not allowed!") {
      return res
        .status(409)
        .send({ message: "Duplicate barcode not allowed!" });
    } else if (data.message == "Exceeded PO Qty!") {
      return res.status(309).send({
        message: "‘Exceeded PO Qty!",
      });
    } else {
      var final_data = {};
      final_data.company_code = data.company_code;
      final_data.unit_price = data.unit_price;
      final_data.total_extra_qty = data.total_extra_qty;
      final_data.rejected_qty = data.rejected_qty;
      final_data.created_at = data.created_at;
      final_data.updated_at = data.updated_at;
      final_data._id = data._id;
      final_data.plant_id = data.plant_id;
      final_data.delivery_date = data.delivery_date;
      final_data.supplier_no = data.supplier_no;
      final_data.supplier_name = data.supplier_name;
      final_data.po_no = data.po_no;
      final_data.po_type = data.po_type;
      final_data.item_no = data.item_no;
      final_data.item_code = data.item_code;
      final_data.item_name = data.item_name;
      final_data.invoice_no = data.invoice_no;
      final_data.ordered_qty = data.ordered_qty;
      final_data.uom = data.uom;
      final_data.total_inwarded_qty = data.total_inwarded_qty;
      final_data.total_crates = data.total_crates;
      final_data.total_crates_weight = data.total_crates_weight;
      final_data.total_net_qty = data.total_net_qty;
      final_data.total_pending_qty = data.total_pending_qty;
      //final_data.cc_id = data.cc_id;
      final_data.inward_crate_details = data.inward_crate_details;
      final_data.createdAt = data.createdAt;
      final_data.updatedAt = data.updatedAt;
      final_data.__v = data.__v;
      //final_data.source_qty = crate_weight ? crate_weight : 0;
      final_data.inwarded_time = inwardedTime;

      return res.status(200).send({
        status_code: "200",
        message: "Crate Inserted Successfully",
        data: final_data,
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

exports.insert_auto_inwarded_crates_v2 = async (req, res) => {
  const mode = req.body.mode;
  const company_code = req.body.company_code;
  const plant_id = req.body.plant_id;
  const delivery_date = req.body.delivery_date;
  const document_date = req.body.document_date;
  const so_delivery_date = req.body.so_delivery_date;
  const po_no = req.body.po_no;
  const po_type = req.body.po_type;
  const supplier_no = req.body.supplier_no;
  const supplier_name = req.body.supplier_name;
  const item_no = req.body.item_no;
  const item_code = req.body.item_code;
  const item_name = req.body.item_name;
  const invoice_no = req.body.invoice_no ? req.body.invoice_no : "";
  const ordered_qty = req.body.ordered_qty;
  const uom = req.body.uom;
  const crate_barcode_value = req.body.crate_barcode_value;
  const crate_type = req.body.crate_type;
  let inwarded_qty = req.body.inwarded_qty.toFixed(2);
  let crate_tare = req.body.crate_tare.toFixed(2);
  const net_qty = (+inwarded_qty - +crate_tare).toFixed(2);
  const inwarded_by = req.body.inwarded_by;
  let auto_allocation = req.body.auto_allocation;
  let inbound_delivery_number = req.body.inbound_delivery_number;

  // console.log(mode);
  if (
    !(
      mode &&
      company_code &&
      plant_id &&
      delivery_date &&
      document_date &&
      so_delivery_date &&
      po_no &&
      po_type &&
      supplier_no &&
      supplier_name &&
      item_no &&
      item_code &&
      item_name &&
      ordered_qty != null &&
      uom &&
      crate_barcode_value &&
      crate_type &&
      inwarded_by &&
      crate_tare != null &&
      inwarded_qty != null
    )
  ) {
    return res
      .status(400)
      .send({ status_code: "400", message: "Missing parameter." });
  }
  try {
    const inwardedTime = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("DD-MM-YYYY HH:mm:ss");

    if (auto_allocation) {
      var so_id = await get_so_id(
        mode,
        item_code,
        net_qty,
        so_delivery_date,
        company_code,
        plant_id
      );
      //console.log("so_id", so_id);
      let flag = true;

      if (!so_id) {
        auto_allocation = false;
        flag = false;
      }

      if (flag) {
        var so_summed_pending_qty = await get_so_summary(
          item_code,
          so_delivery_date,
          company_code,
          plant_id
        );
        //console.log("so_details", so_summed_pending_qty);

        var sku_available_stock = await get_sku_available_stock(
          item_code,
          item_name,
          company_code,
          plant_id
        );
        //console.log("sku_available_stock", sku_available_stock);

        if (!(so_summed_pending_qty >= sku_available_stock + net_qty))
          auto_allocation = false;
      }
    }

    let data = await insert_crate_details(
      company_code,
      plant_id,
      delivery_date,
      so_delivery_date,
      po_no,
      po_type,
      supplier_no,
      supplier_name,
      item_no,
      item_code,
      item_name,
      invoice_no,
      ordered_qty,
      uom,
      crate_barcode_value,
      crate_type,
      crate_tare,
      inwarded_qty,
      net_qty,
      inwarded_by,
      "",
      mode,
      auto_allocation,
      inbound_delivery_number,
      document_date
    );

    if (data.message == "Crate tare must be less than actual qty!") {
      return res.send({
        message: "Crate tare must be less than actual qty!",
      });
    } else if (data.message == "Duplicate barcode not allowed!") {
      return res.status(409).send({ message: "Crate id is already inwarded" });
    } else if (data.message == "Exceeded PO Qty!") {
      return res.status(309).send({
        message: "‘Exceeded PO Qty!",
      });
    } else {
      var final_data = {};
      final_data.company_code = data.company_code;
      final_data.unit_price = data.unit_price;
      final_data.total_extra_qty = data.total_extra_qty;
      final_data.rejected_qty = data.rejected_qty;
      final_data.created_at = data.created_at;
      final_data.updated_at = data.updated_at;
      final_data._id = data._id;
      final_data.plant_id = data.plant_id;
      final_data.delivery_date = data.delivery_date;
      final_data.supplier_no = data.supplier_no;
      final_data.supplier_name = data.supplier_name;
      final_data.po_no = data.po_no;
      final_data.po_type = data.po_type;
      final_data.item_no = data.item_no;
      final_data.item_code = data.item_code;
      final_data.item_name = data.item_name;
      final_data.invoice_no = data.invoice_no;
      final_data.ordered_qty = data.ordered_qty;
      final_data.uom = data.uom;
      final_data.total_inwarded_qty = data.total_inwarded_qty;
      final_data.total_crates = data.total_crates;
      final_data.total_crates_weight = data.total_crates_weight;
      final_data.total_net_qty = data.total_net_qty;
      final_data.total_pending_qty = data.total_pending_qty;
      //final_data.cc_id = data.cc_id;
      final_data.inward_crate_details = data.inward_crate_details;
      final_data.createdAt = data.createdAt;
      final_data.updatedAt = data.updatedAt;
      final_data.__v = data.__v;
      //final_data.source_qty = crate_weight ? crate_weight : 0;
      final_data.inwarded_time = inwardedTime;

      if (auto_allocation) {
        var so_details_by_id = await update_so_by_id(
          so_id,
          crate_barcode_value,
          inwarded_qty,
          crate_tare,
          net_qty,
          mode,
          crate_type
        );
        var update_stock_summary = await update_stock_summary_table(
          item_code,
          company_code,
          plant_id,
          net_qty
        );
      } else {
        await update_summary_stock(
          item_code,
          item_name,
          company_code,
          plant_id,
          net_qty
        );
      }
      return res.status(200).send({
        status_code: "200",
        message: "Crate Inserted Successfully",
        data: final_data,
      });
    }
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

exports.insert_auto_inwarded_crates_v3 = async (req, res) => {
  const mode = req.body.mode;
  const company_code = req.body.company_code;
  const plant_id = req.body.plant_id;
  const delivery_date = req.body.delivery_date;
  const document_date = req.body.document_date;
  const so_delivery_date = req.body.so_delivery_date;
  const po_no = req.body.po_no;
  const po_type = req.body.po_type;
  const supplier_no = req.body.supplier_no;
  const supplier_name = req.body.supplier_name;
  const item_no = req.body.item_no;
  const item_code = req.body.item_code;
  const item_name = req.body.item_name;
  const invoice_no = req.body.invoice_no ? req.body.invoice_no : "";
  const ordered_qty = req.body.ordered_qty;
  const uom = req.body.uom;
  const crate_barcode_value = req.body.crate_barcode_value;
  const crate_type = req.body.crate_type;
  let inwarded_qty = req.body.inwarded_qty.toFixed(2);
  let crate_tare = req.body.crate_tare.toFixed(2);
  const net_qty = (+inwarded_qty - +crate_tare).toFixed(2);
  const inwarded_by = req.body.inwarded_by;
  let auto_allocation = req.body.auto_allocation;
  let inbound_delivery_number = req.body.inbound_delivery_number;

  // console.log(mode);
  if (
    !(
      mode &&
      company_code &&
      plant_id &&
      delivery_date &&
      document_date &&
      so_delivery_date &&
      po_no &&
      po_type &&
      supplier_no &&
      supplier_name &&
      item_no &&
      item_code &&
      item_name &&
      ordered_qty != null &&
      uom &&
      crate_barcode_value &&
      crate_type &&
      inwarded_by &&
      crate_tare != null &&
      inwarded_qty != null
    )
  ) {
    return res
      .status(400)
      .send({ status_code: "400", message: "Missing parameter." });
  }

  if (uom != "KG") {
    return res
      .status(400)
      .send({ status_code: "400", message: "Invalid UOM!" });
  }
  try {
    const inwardedTime = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("DD-MM-YYYY HH:mm:ss");

    let multiple_uom_flag = await get_item_master_details(item_code);
    //console.log("item_master_details", multiple_uom_flag);

    if (auto_allocation) {
      var so_id = await get_so_id_v2(
        mode,
        item_code,
        net_qty,
        so_delivery_date,
        company_code,
        plant_id,
        uom
      );
      //console.log("so_id", so_id);
      let flag = true;

      if (!so_id) {
        auto_allocation = false;
        flag = false;
      }

      if (flag && !multiple_uom_flag) {
        var so_summed_pending_qty = await get_so_summary_v2(
          item_code,
          so_delivery_date,
          company_code,
          plant_id,
          uom
        );
        //console.log("so_details", so_summed_pending_qty);

        var sku_available_stock = await get_sku_available_stock_v2(
          item_code,
          item_name,
          company_code,
          plant_id,
          uom
        );
        //console.log("sku_available_stock", sku_available_stock);

        if (!(so_summed_pending_qty >= sku_available_stock + net_qty))
          auto_allocation = false;
      }
    }

    let data = await insert_crate_details(
      company_code,
      plant_id,
      delivery_date,
      so_delivery_date,
      po_no,
      po_type,
      supplier_no,
      supplier_name,
      item_no,
      item_code,
      item_name,
      invoice_no,
      ordered_qty,
      uom,
      crate_barcode_value,
      crate_type,
      crate_tare,
      inwarded_qty,
      net_qty,
      inwarded_by,
      "",
      mode,
      auto_allocation,
      inbound_delivery_number,
      document_date
    );

    if (data.message == "Crate tare must be less than actual qty!") {
      return res.send({
        message: "Crate tare must be less than actual qty!",
      });
    } else if (data.message == "Duplicate barcode not allowed!") {
      return res.status(409).send({ message: "Crate id is already inwarded" });
    } else if (data.message == "Exceeded PO Qty!") {
      return res.status(309).send({
        message: "‘Exceeded PO Qty!",
      });
    } else {
      var final_data = {};
      final_data.company_code = data.company_code;
      final_data.unit_price = data.unit_price;
      final_data.total_extra_qty = data.total_extra_qty;
      final_data.rejected_qty = data.rejected_qty;
      final_data.created_at = data.created_at;
      final_data.updated_at = data.updated_at;
      final_data._id = data._id;
      final_data.plant_id = data.plant_id;
      final_data.delivery_date = data.delivery_date;
      final_data.supplier_no = data.supplier_no;
      final_data.supplier_name = data.supplier_name;
      final_data.po_no = data.po_no;
      final_data.po_type = data.po_type;
      final_data.item_no = data.item_no;
      final_data.item_code = data.item_code;
      final_data.item_name = data.item_name;
      final_data.invoice_no = data.invoice_no;
      final_data.ordered_qty = data.ordered_qty;
      final_data.uom = data.uom;
      final_data.total_inwarded_qty = data.total_inwarded_qty;
      final_data.total_crates = data.total_crates;
      final_data.total_crates_weight = data.total_crates_weight;
      final_data.total_net_qty = data.total_net_qty;
      final_data.total_pending_qty = data.total_pending_qty;
      //final_data.cc_id = data.cc_id;
      final_data.inward_crate_details = data.inward_crate_details;
      final_data.createdAt = data.createdAt;
      final_data.updatedAt = data.updatedAt;
      final_data.__v = data.__v;
      //final_data.source_qty = crate_weight ? crate_weight : 0;
      final_data.inwarded_time = inwardedTime;

      if (auto_allocation) {
        var so_id_details = await so_allocation_table.findById(so_id);
        let so_pending_qty = so_id_details.pending_qty - net_qty;
        let inventory_allocated_qty = net_qty;
        var so_details_by_id = await update_so_by_id_v2(
          so_id,
          crate_barcode_value,
          inwarded_qty,
          crate_tare,
          net_qty,
          mode,
          crate_type,
          so_pending_qty,
          inventory_allocated_qty
        );

        await update_summary_stock_auto_allocation_v2(
          item_code,
          item_name,
          company_code,
          plant_id,
          net_qty,
          uom
        );
      } else {
        await update_summary_stock_v2(
          item_code,
          item_name,
          company_code,
          plant_id,
          net_qty,
          uom
        );
      }
      return res.status(200).send({
        status_code: "200",
        message: "Crate Inserted Successfully",
        data: final_data,
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(400).send({
      status_code: "400",
      message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

exports.insert_vendor_inwarded_crates_v4 = async (req, res) => {
  const mode = req.body.mode;
  const company_code = req.body.company_code;
  const plant_id = req.body.plant_id;
  const delivery_date = req.body.delivery_date;
  const document_date = req.body.document_date;
  const so_delivery_date = req.body.so_delivery_date;
  const po_no = req.body.po_no;
  const po_type = req.body.po_type;
  const supplier_no = req.body.supplier_no;
  const supplier_name = req.body.supplier_name;
  const item_no = req.body.item_no;
  const item_code = req.body.item_code;
  const item_name = req.body.item_name;
  const invoice_no = req.body.invoice_no ? req.body.invoice_no : "";
  const po_qty = req.body.po_qty;
  const asn_qty = req.body.ordered_qty;
  const asn_item_no = req.body.asn_item_no;
  let inbound_delivery_number = req.body.inbound_delivery_number;
  const purchase_group = req.body.purchase_group;
  const uom = req.body.uom;
  const crate_barcode_value = req.body.crate_barcode_value;
  const crate_type = req.body.crate_type;
  let inwarded_qty = req.body.inwarded_qty.toFixed(2);
  let crate_tare = req.body.crate_tare.toFixed(2);
  const net_qty = (+inwarded_qty - +crate_tare).toFixed(2);
  const inwarded_by = req.body.inwarded_by;
  let auto_allocation = req.body.auto_allocation;

  // console.log(mode);
  if (
    !(
      mode &&
      company_code &&
      plant_id &&
      delivery_date &&
      document_date &&
      so_delivery_date &&
      po_no &&
      po_type &&
      supplier_no &&
      supplier_name &&
      item_no &&
      item_code &&
      item_name &&
      po_qty != null &&
      uom &&
      crate_barcode_value &&
      crate_type &&
      inwarded_by &&
      purchase_group &&
      crate_tare != null &&
      inwarded_qty != null
    )
  ) {
    return res
      .status(400)
      .send({ status_code: "400", message: "Missing parameter." });
  }

  if (uom != "KG") {
    return res
      .status(400)
      .send({ status_code: "400", message: "Invalid UOM!" });
  }

  if (!invoice_no) {
    return res
      .status(400)
      .send({ status_code: "400", message: "Please Enter Invoice Number!" });
  }
  try {

    const inwardedTime = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("DD-MM-YYYY HH:mm:ss");

    let multiple_uom_flag = await get_item_master_details(item_code);
    //console.log("item_master_details", multiple_uom_flag);

    if (auto_allocation) {
      var so_id = await get_so_id_v3(
        mode,
        item_code,
        net_qty,
        so_delivery_date,
        company_code,
        plant_id,
        uom
      );
      //console.log("so_id", so_id);
      let flag = true;

      if (!so_id) {
        auto_allocation = false;
        flag = false;
      }

      if (flag && !multiple_uom_flag) {
        var so_summed_pending_qty = await get_so_summary_v2(
          item_code,
          so_delivery_date,
          company_code,
          plant_id,
          uom
        );
        //console.log("so_details", so_summed_pending_qty);

        var sku_available_stock = await get_sku_available_stock_v2(
          item_code,
          item_name,
          company_code,
          plant_id,
          uom
        );
        //console.log("sku_available_stock", sku_available_stock);

        if (!(so_summed_pending_qty >= sku_available_stock + net_qty))
          auto_allocation = false;
      }
    }

    let data = await insert_vendor_inward_crate_details_v2(
      company_code,
      plant_id,
      delivery_date,
      so_delivery_date,
      po_no,
      po_type,
      supplier_no,
      supplier_name,
      item_no,
      item_code,
      item_name,
      invoice_no,
      po_qty,
      asn_qty,
      asn_item_no,
      purchase_group,
      uom,
      crate_barcode_value,
      crate_type,
      crate_tare,
      inwarded_qty,
      net_qty,
      inwarded_by,
      mode,
      auto_allocation,
      inbound_delivery_number,
      document_date
    );

    if (data.message == "Crate tare must be less than actual qty!") {
      return res.status(400).send({
        status_code: "400",
        message: "Crate tare must be less than actual qty!",
      });
    } else if (data.message == "Duplicate barcode not allowed!") {
      return res.status(409).send({
        status_code: "409",
        message: "Crate id is already inwarded"
      });
    } else if (data.message == "Exceeded PO Qty!") {
      return res.status(309).send({
        status_code: "309",
        message: "‘Exceeded PO Qty!",
      });
    } else {
      var final_data = {};
      final_data.company_code = data.company_code;
      final_data.unit_price = data.unit_price;
      final_data.total_extra_qty = data.total_extra_qty;
      final_data.rejected_qty = data.rejected_qty;
      final_data.created_at = data.created_at;
      final_data.updated_at = data.updated_at;
      final_data._id = data._id;
      final_data.plant_id = data.plant_id;
      final_data.delivery_date = data.delivery_date;
      final_data.supplier_no = data.supplier_no;
      final_data.supplier_name = data.supplier_name;
      final_data.po_no = data.po_no;
      final_data.po_type = data.po_type;
      final_data.item_no = data.item_no;
      final_data.item_code = data.item_code;
      final_data.item_name = data.item_name;
      final_data.invoice_no = data.invoice_no;
      final_data.ordered_qty = data.ordered_qty;
      final_data.uom = data.uom;
      final_data.total_inwarded_qty = data.total_inwarded_qty;
      final_data.total_crates = data.total_crates;
      final_data.total_crates_weight = data.total_crates_weight;
      final_data.total_net_qty = data.total_net_qty;
      final_data.total_pending_qty = data.total_pending_qty;
      //final_data.cc_id = data.cc_id;
      final_data.inward_crate_details = data.inward_crate_details;
      final_data.createdAt = data.createdAt;
      final_data.updatedAt = data.updatedAt;
      final_data.__v = data.__v;
      //final_data.source_qty = crate_weight ? crate_weight : 0;
      final_data.inwarded_time = inwardedTime;

      if (auto_allocation) {
        var so_id_details = await so_allocation_table.findById(so_id);
        let so_pending_qty = so_id_details.pending_qty - net_qty;
        let inventory_allocated_qty = net_qty;
        var so_details_by_id = await update_so_by_id_v2(
          so_id,
          crate_barcode_value,
          inwarded_qty,
          crate_tare,
          net_qty,
          mode,
          crate_type,
          so_pending_qty,
          inventory_allocated_qty
        );

        await update_summary_stock_auto_allocation_v2(
          item_code,
          item_name,
          company_code,
          plant_id,
          net_qty,
          uom
        );
      } else {
        await update_summary_stock_v2(
          item_code,
          item_name,
          company_code,
          plant_id,
          net_qty,
          uom
        );
      }
      return res.status(200).send({
        status_code: "200",
        message: "Crate Inserted Successfully",
        data: final_data,
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(400).send({
      status_code: "400",
      message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

exports.realTimeInwardedDetails = async (req, res) => {
  console.log("calling po based inwarded details api");
  const { company_code, plant_id, po_no, mode } = req.query;
  try {
    if (!(company_code && plant_id && po_no && mode))
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    const getInwardDetails = await inwardProcess
      .find(
        {
          company_code: company_code,
          plant_id: plant_id,
          po_no: po_no,
          "inward_crate_details.mode": mode,
        },
        {
          _id: 0,
          item_code: 1,
          item_name: 1,
          item_no: 1,
          uom: 1,
          ordered_qty: 1,
          total_inwarded_qty: 1,
          total_pending_qty: 1,
          total_net_qty: 1,
          total_crates: 1,
        }
      )
      .sort({ _id: -1 });

    let mssge = "PO based inward details available";
    let status = 200;
    let final_response = [];

    getInwardDetails.forEach((element) => {
      let x = {};
      x.item_code = element.item_code ? element.item_code : "";
      x.item_name = element.item_name ? element.item_name : "";
      x.item_no = element.item_no ? element.item_no : "";
      x.ordered_qty = element.ordered_qty ? element.ordered_qty : 0;
      x.uom = element.uom ? element.uom : "";
      x.total_inwarded_qty = element.total_inwarded_qty
        ? element.total_inwarded_qty
        : 0;
      x.total_net_qty = element.total_net_qty ? element.total_net_qty : 0;
      x.total_pending_qty = element.total_pending_qty
        ? element.total_pending_qty
        : 0;
      x.total_crates = element.total_crates ? element.total_crates : 0;
      if (element.total_pending_qty) {
        x.status = "Partially Completed";
      } else {
        x.status = "Completed";
      }
      //console.log(element,x);
      final_response.push(x);
    });

    if (final_response.length == 0) {
      status = 404;
      mssge = "PO based inward details not available!";
    }
    return res.status(status).send({
      status_code: status,
      message: mssge,
      data: final_response,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        "Some error occurred while extracting real time inwarding details!",
    });
  }
};

exports.real_time_auto_inward_details = async (req, res) => {
  console.log("calling po based inwarded details api");
  const { company_code, plant_id, sto_number, mode } = req.query;
  try {
    if (!(company_code && plant_id && sto_number && mode))
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    const getInwardDetails = await inwardProcess
      .find(
        {
          company_code: company_code,
          plant_id: plant_id,
          sto_number: sto_number,
          "inward_crate_details.mode": mode,
        },
        {
          _id: 0,
          item_code: 1,
          item_name: 1,
          item_no: 1,
          uom: 1,
          ordered_qty: 1,
          total_inwarded_qty: 1,
          total_pending_qty: 1,
          total_net_qty: 1,
          total_crates: 1,
          po_qty: 1,
        }
      )
      .sort({ _id: -1 });

    let mssge = "PO based inward details available";
    let status = 200;
    let final_response = [];

    getInwardDetails.forEach((element) => {
      console.log("element", element);
      let x = {};
      x.item_code = element.item_code ? element.item_code : "";
      x.item_name = element.item_name ? element.item_name : "";
      x.item_no = element.item_no ? element.item_no : "";
      x.ordered_qty = element.po_qty ? element.po_qty : 0;
      x.outward_qty = element.ordered_qty ? element.ordered_qty : 0;
      x.uom = element.uom ? element.uom : "";
      x.total_inwarded_qty = element.total_inwarded_qty
        ? element.total_inwarded_qty
        : 0;
      x.total_net_qty = element.total_net_qty ? element.total_net_qty : 0;
      x.total_pending_qty = element.total_pending_qty
        ? element.total_pending_qty
        : 0;
      x.total_crates = element.total_crates ? element.total_crates : 0;
      if (element.total_pending_qty) {
        x.status = "Partially Completed";
      } else {
        x.status = "Completed";
      }
      //console.log(element,x);
      final_response.push(x);
    });

    if (final_response.length == 0) {
      status = 404;
      mssge = "PO based inward details not available!";
    }
    return res.status(status).send({
      status_code: status,
      message: mssge,
      data: final_response,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        "Some error occurred while extracting real time inwarding details!",
    });
  }
};

exports.real_time_vendor_inward_details = async (req, res) => {
  console.log("calling po based inwarded details api");
  const { company_code, plant_id, po_no, asn_no, mode } = req.query;
  try {
    if (!(company_code && plant_id && po_no && mode))
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    let inward_filter = {};
    inward_filter.company_code = company_code;
    inward_filter.plant_id = plant_id;
    inward_filter.po_no = po_no;
    if (asn_no)
      inward_filter.inbound_delivery_number = asn_no;
    inward_filter["inward_crate_details.mode"] = mode;


    const getInwardDetails = await inwardProcess
      .find(
        inward_filter,
        {
          _id: 0,
          item_code: 1,
          item_name: 1,
          item_no: 1,
          uom: 1,
          ordered_qty: 1,
          po_qty: 1,
          total_inwarded_qty: 1,
          total_pending_qty: 1,
          total_net_qty: 1,
          total_crates: 1,
        }
      )
      .sort({ _id: -1 });

    let mssge = "PO based inward details available";
    let status = 200;
    let final_response = [];

    getInwardDetails.forEach((element) => {
      let x = {};
      x.item_code = element.item_code ? element.item_code : "";
      x.item_name = element.item_name ? element.item_name : "";
      x.item_no = element.item_no ? element.item_no : "";
      x.ordered_qty = element.po_qty ? element.po_qty : 0;
      x.asn_qty = element.ordered_qty == element.po_qty ? 0 : element.ordered_qty;
      x.uom = element.uom ? element.uom : "";
      x.total_inwarded_qty = element.total_inwarded_qty
        ? element.total_inwarded_qty
        : 0;
      x.total_net_qty = element.total_net_qty ? element.total_net_qty : 0;
      x.total_pending_qty = element.total_pending_qty
        ? element.total_pending_qty
        : 0;
      x.total_crates = element.total_crates ? element.total_crates : 0;
      if (element.total_pending_qty) {
        x.status = "Partially Completed";
      } else {
        x.status = "Completed";
      }
      //console.log(element,x);
      final_response.push(x);
    });

    if (final_response.length == 0) {
      status = 404;
      mssge = "PO based inward details not available!";
    }
    return res.status(status).send({
      status_code: status,
      message: mssge,
      data: final_response,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        "Some error occurred while extracting real time inwarding details!",
    });
  }
};

exports.itemDetailsForManual = async (req, res) => {
  console.log("calling po based item details for manual inward api");
  const { company_code, plant_id, document_date, po_no, asn_no } = req.query;
  try {
    if (!(company_code && plant_id && document_date && po_no))
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    let mssge = "Item details available";
    let status = 200;
    let data = [];

    const itemDetails = await db.purchaseOrder.findOne(
      {
        company_code: company_code,
        supplying_plant: plant_id,
        document_date: document_date,
        po_number: po_no,
      },

      { _id: 0, item: 1 }
    );

    const inwardedDetails = await inwardProcess.find(
      {
        company_code: company_code,
        plant_id: plant_id,
        po_no: po_no,
      },
      {
        _id: 0,
        item_code: 1,
        item_name: 1,
        item_no: 1,
        uom: 1,
        ordered_qty: 1,
        total_inwarded_qty: 1,
        total_pending_qty: 1,
        total_crates: 1,
      }
    );

    let asnDetails = [];
    if (asn_no) {
      asnDetails = await asn_table.aggregate([
        {
          $match: {
            company_code: company_code,
            po_number: po_no,
          },
        },
        { $unwind: "$item" },
        {
          $match: { "item.inbound_delivery_number": asn_no },
        },
        {
          $project: {
            _id: 0,
            "item.po_item": 1,
            "item.material": 1,
            "item.material_description": 1,
            "item.inbound_delivery_qty": 1,
            "item.inbound_delivery_date": 1,
          },
        },
      ]);
    }

    let flag = 0;

    if (itemDetails != null) {
      console.log("entered po order available");

      let details = itemDetails.item;

      if (asnDetails.length > 0) {
        console.log("entered asn details available");

        for (let i = 0; i < asnDetails.length; i++) {
          for (let j = 0; j < details.length; j++) {
            if (
              asnDetails[i].item["material"] == details[j]["material_no"] &&
              asnDetails[i].item["po_item"] == details[j]["item_no"]
            ) {
              data.push({
                item_name: details[j]["material_description"],
                item_code: details[j]["material_no"],
                item_no: details[j]["item_no"],
                uom: details[j]["uom"],
                pending_qty: asnDetails[i].item["inbound_delivery_qty"],
                ordered_qty: asnDetails[i].item["inbound_delivery_qty"],
              });
            }
          }
        }

        for (let k = 0; k < data.length; k++) {
          for (let l = 0; l < inwardedDetails.length; l++) {
            if (
              data[i]["item_code"] == inwardedDetails[j]["item_no"] &&
              data[i]["item_no"] == inwardedDetails[j]["item_no"]
            ) {
              if (data[i].total_pending_qty == 0) {
              } else {
                data[i].pending_qty = inwardedDetails[j].total_pending_qty;
                data[i].ordered_qty = inwardedDetails[j].ordered_qty;
              }
            }
          }
        }
      } else {
        console.log("entered no asn details");

        for (let i = 0; i < details.length; i++) {
          for (let j = 0; j < inwardedDetails.length; j++) {
            if (
              details[i]["material_no"] == inwardedDetails[j].item_code &&
              details[i]["item_no"] == inwardedDetails[j].item_no
            ) {
              data.push({
                item_name: details[i]["material_description"],
                item_code: details[i]["material_no"],
                item_no: details[i]["item_no"],
                uom: details[i]["uom"],
                pending_qty: inwardedDetails[j].total_pending_qty,
                ordered_qty: inwardedDetails[j].ordered_qty,
              });

              details.slice(i, 1);

              i = i != 0 ? i - 1 : i;

              flag = 1;
            }
          }

          if (flag == 0)
            data.push({
              item_name: details[i]["material_description"],
              item_code: details[i]["material_no"],
              item_no: details[i]["item_no"],
              uom: details[i]["uom"],
              pending_qty: details[i]["quantity"],
              ordered_qty: details[i]["quantity"],
            });

          flag = 0;
        }
      }
    } else {
      status = 404;
      mssge = "Item details not found!";
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
      message:
        "Some error occurred while extracting real time inwarding details!",
    });
  }
};

exports.itemDetails = async (req, res) => {
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
    )
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

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
    });
    //console.log("inwardDetails",inwardDetails);
    if (inwardDetails != null)
      data = {
        invoice_no: inwardDetails.invoice_no,
        uom: inwardDetails.uom,
        ordered_qty: inwardDetails.ordered_qty,
        inwarded_qty: inwardDetails.total_inwarded_qty,
        pending_qty: inwardDetails.total_pending_qty,
        net_qty: inwardDetails.total_net_qty,
        crate_count: inwardDetails.total_crates,
        delivery_date: inwardDetails.delivery_date,
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
          },
        },
      ]);
      //console.log(itemDetails);
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
            },
          },
        ]);

        var asn_qty = 0;
        if (asn_data.length) {
          asn_qty = asn_data[0].asn_qty;
        }

        console.log("asn_data", asn_data, asn_qty);

        data = {
          invoice_no: "",
          uom: itemDetails[0].item["uom"],
          ordered_qty: asn_qty ? +asn_qty : itemDetails[0].item["quantity"],
          inwarded_qty: 0,
          net_qty: 0,
          pending_qty:
            asn_qty != undefined ? +asn_qty : itemDetails[0].item["quantity"],
          crate_count: 0,
          delivery_date: itemDetails[0].delivery_date,
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

exports.itemDetailsV2 = async (req, res) => {
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
    )
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

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
      inward_crate_details: 1
    });




    //console.log("inwardDetails",inwardDetails);
    if (inwardDetails != null) {



      let crate_detail = inwardDetails.inward_crate_details ? inwardDetails.inward_crate_details.slice(-1) : 0;

      data = {
        invoice_no: inwardDetails.invoice_no,
        uom: inwardDetails.uom,
        ordered_qty: inwardDetails.ordered_qty,
        inwarded_qty: inwardDetails.total_inwarded_qty,
        pending_qty: inwardDetails.total_pending_qty,
        net_qty: inwardDetails.total_net_qty,
        last_crate_net_qty: crate_detail ? crate_detail[0].net_qty : 0,
        crate_count: inwardDetails.total_crates,
        delivery_date: inwardDetails.delivery_date,
        po_order_qty: inwardDetails.po_qty,
        purchase_group: inwardDetails.purchase_group,
        asn_item_no: inwardDetails.asn_item_no ? inwardDetails.asn_item_no : ""
      };
    }
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
            "purchase_group": 1
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

        var asn_qty = 0, asn_item_no = "";
        if (asn_data.length) {
          asn_qty = asn_data[0].asn_qty;
          asn_item_no = asn_data[0].asn_item_no;
        }

        console.log("asn_data", asn_data, asn_qty);

        data = {
          invoice_no: "",
          uom: itemDetails[0].item["uom"],
          ordered_qty: asn_qty ? +asn_qty : itemDetails[0].item["quantity"],
          inwarded_qty: 0,
          net_qty: 0,
          last_crate_net_qty: 0,
          pending_qty:
            asn_qty != undefined ? +asn_qty : itemDetails[0].item["quantity"],
          crate_count: 0,
          delivery_date: itemDetails[0].delivery_date,
          po_order_qty: itemDetails[0].item["quantity"],
          purchase_group: itemDetails[0].purchase_group,
          asn_item_no: asn_item_no ? asn_item_no : "",
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

exports.get_item_list = async (req, res) => {
  console.log("calling get item list");

  const { company_code, plant_id, document_date, po_document_type, vendor_no } =
    req.query;

  if (
    !(
      company_code &&
      plant_id &&
      document_date &&
      po_document_type &&
      vendor_no
    )
  )
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });

  if (req.query.asn_no && req.query.po_number) {
    //console.log("asn number condition");
    await asn_table
      .aggregate([
        {
          $match: {
            company_code: company_code,
            po_type: po_document_type,
            po_number: req.query.po_number,
          },
        },
        { $unwind: "$item" },
        {
          $match: {
            "item.inbound_delivery_number": req.query.asn_no,
            "item.plant": plant_id,
          },
        },
        {
          $group: {
            _id: "$item.material",
            item_no: { $first: "$item.po_item" },
            item_code: { $first: "$item.material" },
            item_name: { $first: "$item.material_description" },
            asn_qty: { $first: "$item.inbound_delivery_qty" },
          },
        },
        {
          $project: {
            _id: 0,
            item_no: "$item_no",
            item_code: "$item_code",
            item_name: "$item_name",
            asn_qty: "$asn_qty",
          },
        },
      ])
      .then((item_list) => {
        let mssge = "Item list is available";
        if (item_list.length == 0) mssge = "Item list is not available!";
        return res.status(200).send({
          status_code: "200",
          status_message: mssge,
          data: item_list,
        });
      })
      .catch((err) => {
        return res.status(400).send({
          status_code: "400",
          status_message:
            err.message || "Some error occurred while creating the customer.",
        });
      });
  } else if (req.query.po_number) {
    console.log("po number condition");

    await purchase_order_table
      .find(
        {
          company_code: company_code,
          supplying_plant: plant_id,
          document_date: document_date,
          po_document_type: po_document_type,
          vendor_no: vendor_no,
          po_number: req.query.po_number,
        },
        { _id: 0, item: 1 }
      )
      .then((item_list) => {
        let itemList = [];

        item_list = item_list.map((ele) => {
          return {
            item: ele.item.map((ele) => {
              itemList.push({
                item_no: ele.item_no,
                item_code: ele.material_no,
                item_name: ele.material_description,
              });
            }),
          };
        });

        // console.log(item_list,itemList);

        const uniqueObjects = [
          ...new Map(itemList.map((code) => [code.item_code, code])).values(),
        ];

        let mssge = "Item list is available";
        if (uniqueObjects.length == 0) mssge = "Item list is not available!";

        return res.status(200).send({
          status_code: "200",
          status_message: mssge,
          data: uniqueObjects,
        });
      })
      .catch((err) => {
        return res.status(400).send({
          status_code: "400",
          status_message:
            err.message || "Some error occurred while creating the customer.",
        });
      });
  } else {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }
};

//get supplier list
exports.get_vendor_list = async (req, res) => {
  console.log("calling get vendor list api");

  const { company_code, plant_id, document_date, po_document_type } = req.query;

  if (!(company_code && plant_id && document_date && po_document_type))
    return res
      .status(400)
      .send({ status_code: 400, message: "Missing parameter" });

  await purchaseOrder
    .find(
      {
        company_code: company_code,
        supplying_plant: plant_id,
        document_date: document_date,
        po_document_type: po_document_type,
      },
      { _id: 0, vendor_name: 1, vendor_no: 1, supplying_plant: 1 }
    )
    .then((vendor_list) => {
      let vendorList = vendor_list.map((id) => {
        if (!(id.vendor_no && id.vendor_name))
          return {
            vendor_no: id.supplying_plant,
            vendor_name: id.supplying_plant + " - Own Brand",
          };
        else
          return {
            vendor_no: id.vendor_no,
            vendor_name: id.vendor_name,
          };
      });
      console.log("vendorList", vendorList);
      const uniqueObjects = [
        ...new Map(
          vendorList.map((vndr_list) => [vndr_list.vendor_no, vndr_list])
        ).values(),
      ];

      let mssge = "Supplier list is available";
      let status = 200;

      if (uniqueObjects.length == 0) {
        status = 404;
        mssge = "Supplier list is not available!";
      }

      return res.send({
        status_code: status,
        message: mssge,
        data: uniqueObjects,
      });
    })

    .catch((err) => {
      return res.status(500).send({
        status_code: 500,
        message: "Some error occurred while extracting supplier list",
      });
    });
};

//get po number
exports.get_po_number_list = async (req, res) => {
  console.log("calling get po number api");

  const { company_code, plant_id, document_date, po_document_type, vendor_no } =
    req.query;

  if (
    !(
      company_code &&
      plant_id &&
      document_date &&
      po_document_type &&
      vendor_no
    )
  )
    return res
      .status(400)
      .send({ status_code: 400, message: "Missing parameter" });

  const vendorNo = vendor_no == plant_id ? "" : vendor_no;

  await purchaseOrder
    .find(
      {
        company_code: company_code,
        supplying_plant: plant_id,
        document_date: document_date,
        po_document_type: po_document_type,
        vendor_no: vendorNo,
      },
      { _id: 0, po_number: 1 }
    )
    .then((po_number) => {
      const uniqueObjects = [
        ...new Map(po_number.map((po_no) => [po_no.po_number, po_no])).values(),
      ];

      let mssge = "PO number list is available";
      let status = 200;

      if (uniqueObjects.length == 0) {
        status = 404;
        mssge = "PO number list is not available!";
      }

      return res.send({
        status_code: status,
        message: mssge,
        data: uniqueObjects,
      });
    })
    .catch((err) => {
      return res.status(500).send({
        status_code: 500,
        message: "Some error occurred while extracting po number list",
      });
    });
};

const autoGenerateCrates = (carrierCount, qty, inwarded_by) => {
  console.log("entered auto generate crates");
  let cratesArr = [];

  for (let i = 0; i < carrierCount; i++) {
    cratesArr.push({
      inwarded_time: moment().format("DD-MM-YYYY HH:mm:ss"),
      allocated: false,
      crate_barcode_value: crypto.randomBytes(8).toString("hex"),
      // crate_type: "Standard", //doubt
      inwarded_qty: qty,
      net_qty: qty,
      crate_tare: 0,
      inwarded_by: inwarded_by,
      mode: "manual",
      // so_delivery_date: , doubt
      auto_allocation: false,
    });
  }

  return cratesArr;
};

// exports.saveManualInward = async (req, res) => {
//   console.log("calling get item list");

//   const {
//     company_code,
//     plant_id,
//     inwarded_by,
//     delivery_date,
//     po_no,
//     inwardDetailsArr,
//   } = req.body;

//   try {
//     if (
//       !(
//         company_code &&
//         plant_id &&
//         inwarded_by &&
//         delivery_date &&
//         po_no &&
//         inwardDetailsArr
//       )
//     )
//       return res.status(400).send({
//         status_code: "400",
//         status_message: "Please provide required parameters!",
//       });

//     for (let i = 0; i < inwardDetailsArr.length; i++) {
//       let item_name = inwardDetailsArr[i].item_name;
//       let item_code = inwardDetailsArr[i].item_code;
//       let item_no = inwardDetailsArr[i].item_no;
//       let uom = inwardDetailsArr[i].uom;
//       let order_qty = inwardDetailsArr[i].order_qty;
//       let pending_qty = inwardDetailsArr[i].pending_qty;
//       let actual_qty = inwardDetailsArr[i].actual_qty;

//       if (
//         !(
//           item_name &&
//           item_code &&
//           item_no &&
//           uom &&
//           order_qty &&
//           pending_qty &&
//           actual_qty
//         )
//       )
//         return res.status(400).send({
//           status_code: "400",
//           status_message:
//             "Please provide required parameters for the material - " +
//             item_code,
//         });

//       const tolerance = await db.product_weight_model.findOne(
//         {
//           company_code: company_code,
//           plant_id: plant_id,
//           material_code: item_code,
//         },
//         { _id: 0, pieces_per_bin: 1, qty_in_kg: 1, qty_in_pack: 1 }
//       );

//       if (tolerance == null)
//         return res.status(404).send({
//           status_code: 404,
//           message:
//             "Weight tolerance data is not available for the material - " +
//             item_code,
//         });

//       const filter = {
//         company_code: company_code,
//         plant_id: plant_id,
//         delivery_date: delivery_date,
//         po_no: po_no,
//         item_code: item_code,
//         item_no: item_no,
//       };

//       const checkExistingEntry = await inwardProcess.findOne(filter);

//       let crateCount = 0;
//       let actualQty = 0;

//       if (checkExistingEntry == null) {
//         console.log("No entry is available");

//         if (actual_qty > order_qty)
//           return res.status(422).send({
//             status_code: 422,
//             message:
//               "Actual qty should be less or equal to order qty for the material - " +
//               item_code,
//           });

//         const getPoDetails = await purchaseOrder.aggregate([
//           {
//             $match: {
//               company_code: company_code,
//               supplying_plant: plant_id,
//               po_number: po_no,
//               delivery_date: delivery_date,
//             },
//           },
//           {
//             $unwind: "$item",
//           },
//           {
//             $match: {
//               "item.material_no": item_code,
//               "item.item_no": item_no,
//             },
//           },
//         ]);
//         // console.log(getPoDetails);
//         if (getPoDetails.length == 0) {
//           console.log("unable to find PO!");
//           return res.status(404).send({
//             status_code: 404,
//             message: "Unable to find PO for the material - " + item_code,
//           });
//         } else {
//           let newDataEntry = {
//             company_code: company_code,
//             plant_id: plant_id,
//             delivery_date: delivery_date,
//             supplier_name: getPoDetails[0].vendor_name,
//             supplier_no: getPoDetails[0].vendor_no,
//             po_type: getPoDetails[0].po_document_type,
//             po_no: po_no,
//             item_code: item_code,
//             item_no: item_no,
//             item_name: getPoDetails[0].item["material_description"],
//             ordered_qty: getPoDetails[0].item["quantity"],
//             uom: getPoDetails[0].item["uom"],
//             unit_price: getPoDetails[0].item["net_price"],
//             actual_qty: actual_qty,
//             invoice_no: "",
//             total_crates_weight: 0,
//             total_extra_qty: 0,
//             inwarded_by: inwarded_by,
//           };

//           if (tolerance.pieces_per_bin > 0 && uom == "PAC") {
//             console.log("PACK item");

//             if (
//               (actual_qty / tolerance.qty_in_pack).toString().split(".")
//                 .length == 2
//             )
//               return res.status(422).send({
//                 status_code: 422,
//                 message:
//                   "Actual qty should be multiple of " +
//                   tolerance.qty_in_pack +
//                   " for the material - " +
//                   item_code,
//               });

//             newDataEntry.total_inwarded_qty = +actual_qty;
//             newDataEntry.total_net_qty = +actual_qty;
//             newDataEntry.total_pending_qty = +order_qty - +actual_qty;
//             newDataEntry.total_crates = +actual_qty / tolerance.qty_in_pack;

//             crateCount = +actual_qty / tolerance.qty_in_pack;
//             actualQty = tolerance.qty_in_kg;

//             //
//           } else if (tolerance.pieces_per_bin == 0 && uom == "PAC") {
//             console.log("KG item in pack order");

//             newDataEntry.total_inwarded_qty = +actual_qty;
//             newDataEntry.total_net_qty = (
//               +actual_qty * tolerance.qty_in_kg
//             ).toFixed(2);
//             newDataEntry.total_pending_qty = +order_qty - +actual_qty;
//             newDataEntry.total_crates = +actual_qty;

//             crateCount = +actual_qty;
//             actualQty = tolerance.qty_in_kg;
//             //
//           } else if (uom == "KG") {
//             console.log("KG item");

//             if (
//               (actual_qty / tolerance.qty_in_kg).toString().split(".")
//                 .lengtgh == 2
//             )
//               return res.status(422).send({
//                 status_code: 422,
//                 message:
//                   "For material - " +
//                   item_code +
//                   ", Actual qty should be multiple of " +
//                   tolerance.qty_in_kg,
//               });

//             newDataEntry.total_inwarded_qty = (+actual_qty).toFixed(2);
//             newDataEntry.total_net_qty = (+actual_qty).toFixed(2);
//             newDataEntry.total_pending_qty = (+order_qty - +actual_qty).toFixed(
//               2
//             );
//             newDataEntry.total_crates = +actual_qty / tolerance.qty_in_kg;

//             crateCount = +actual_qty / tolerance.qty_in_kg;
//             actualQty = tolerance.qty_in_kg;
//           } else {
//             console.log("Other than KG and PACK item");

//             newDataEntry.total_inwarded_qty = actual_qty;
//             newDataEntry.total_net_qty = actual_qty;
//             newDataEntry.total_pending_qty = order_qty - actual_qty;
//             newDataEntry.total_crates = +actual_qty;

//             crateCount = +actual_qty;
//             actualQty = tolerance.qty_in_kg;
//           }

//           newDataEntry.inward_crate_details = autoGenerateCrates(
//             crateCount,
//             actual_qty,
//             inwarded_by
//           );

//           await inwardProcess.create(newDataEntry);
//         }
//       } else {
//         console.log("entry is available");

//         if (checkExistingEntry.total_pending_qty == 0)
//           return res.status(309).send({
//             status_code: 309,
//             message:
//               "For material - " +
//               item_code +
//               ", ordered quantity already reached!",
//           });

//         let totalInwardedQty = +checkExistingEntry.total_inwarded_qty;
//         let totalNetQty = +checkExistingEntry.total_net_qty;
//         let totalCrates = +checkExistingEntry.total_crates;

//         if (totalInwardedQty + +actual_qty > order_qty)
//           return res.status(422).send({
//             status_code: 422,
//             message:
//               "For material - " +
//               item_code +
//               ", Actual qty should be less or equal to pending qty!",
//           });

//         if (tolerance.pieces_per_bin > 0 && uom == "PAC") {
//           console.log("PACK item");

//           totalNetQty = totalNetQty + +actual_qty * tolerance.qty_in_pack;
//           totalCrates = totalCrates + +actual_qty / tolerance.qty_in_pack;

//           crateCount = +actual_qty / tolerance.qty_in_pack;
//           actualQty = tolerance.qty_in_kg;
//           //
//         } else if (tolerance.pieces_per_bin == 0 && uom == "PAC") {
//           console.log("KG item in pack order");
//           totalNetQty = totalNetQty + +actual_qty;
//           totalCrates = totalCrates + +actual_qty;

//           crateCount = +actual_qty;
//           actualQty = tolerance.qty_in_kg;
//           //
//         } else if (uom == "KG") {
//           console.log("KG item");
//           totalNetQty = (totalNetQty + +actual_qty).toFixed(2);
//           totalCrates = totalCrates + +actual_qty / tolerance.qty_in_kg;

//           crateCount = +actual_qty / tolerance.qty_in_kg;
//           actualQty = tolerance.qty_in_kg;
//           //
//         } else {
//           console.log("Other than KG and PACK item");
//           totalNetQty = totalNetQty + +actual_qty;
//           totalCrates = totalCrates + +actual_qty;

//           crateCount = +actual_qty;
//           actualQty = tolerance.qty_in_kg;
//         }

//         let crates = autoGenerateCrates(crateCount, actual_qty, inwarded_by);

//         await inwardProcess.updateOne(filter, {
//           $set: {
//             total_inwarded_qty: totalInwardedQty + +actual_qty,
//             total_pending_qty:
//               checkExistingEntry.total_pending_qty - +actual_qty,
//             total_crates: totalCrates,
//             total_net_qty: totalNetQty,
//           },
//         });

//         await inwardProcess.updateOne(filter, {
//           $push: { inward_crate_details: { $each: crates } },
//         });
//       }
//     }

//     return res.send({
//       status_code: 200,
//       message: "Manual inward details added successfully",
//     });
//   } catch (err) {
//     console.log(err);
//     return res.status(500).send({
//       status_code: 500,
//       message: "Some error occurred while saving manual inward process!",
//     });
//   }
// };

exports.saveManualInwardV1 = async (req, res) => {
  console.log("calling save manual inward process api");

  const {
    company_code,
    plant_id,
    inwarded_by,
    delivery_date,
    po_no,
    inwardDetailsArr,
  } = req.body;

  try {
    if (
      !(
        company_code &&
        plant_id &&
        inwarded_by &&
        delivery_date &&
        po_no &&
        inwardDetailsArr
      )
    )
      return res.status(400).send({
        status_code: 400,
        status_message: "Please provide required parameters!",
      });

    for (let i = 0; i < inwardDetailsArr.length; i++) {
      let item_name = inwardDetailsArr[i].item_name;
      let item_code = inwardDetailsArr[i].item_code;
      let item_no = inwardDetailsArr[i].item_no;
      let uom = inwardDetailsArr[i].uom;
      let order_qty = inwardDetailsArr[i].ordered_qty;
      let pending_qty = inwardDetailsArr[i].total_pending_qty;
      let actual_qty = inwardDetailsArr[i].actual_qty;
      let carrier_count = inwardDetailsArr[i].carrier_count;

      if (
        !(
          (item_name && item_code && item_no && uom && order_qty && pending_qty)
          // actual_qty &&
          // carrier_count
        )
      )
        return res.status(400).send({
          status_code: 400,
          status_message:
            "Please provide required parameters for the material - " +
            item_code,
        });

      if (!(actual_qty && carrier_count))
        return res.status(400).send({
          status_code: 400,
          status_message:
            "Please provide actual quantity and crate count - " + item_code,
        });

      if (+actual_qty == 0)
        return res.status(422).send({
          status_code: 422,
          message:
            "Actual quantity should not be zero for the provided material - " +
            item_code,
        });

      if (+carrier_count == 0)
        return res.status(422).send({
          status_code: 422,
          message:
            "Carrier count should not be zero for the provided material - " +
            item_code,
        });

      const filter = {
        company_code: company_code,
        plant_id: plant_id,
        delivery_date: delivery_date,
        po_no: po_no,
        item_code: item_code,
        item_no: item_no,
      };

      const checkExistingEntry = await inwardProcess.findOne(filter);

      let perCrateNetQty = 0;

      if (checkExistingEntry == null) {
        console.log("No entry is available");

        if (+actual_qty > +order_qty)
          return res.status(422).send({
            status_code: 422,
            message:
              "Actual qty should be less or equal to order qty for the material - " +
              item_code,
          });

        const getPoDetails = await purchaseOrder.aggregate([
          {
            $match: {
              company_code: company_code,
              supplying_plant: plant_id,
              po_number: po_no,
              delivery_date: delivery_date,
            },
          },
          {
            $unwind: "$item",
          },
          {
            $match: {
              "item.material_no": item_code,
              "item.item_no": item_no,
            },
          },
        ]);
        // console.log(getPoDetails);
        if (getPoDetails.length == 0) {
          console.log("unable to find PO!");
          return res.status(404).send({
            status_code: 404,
            message: "Unable to find PO for the material - " + item_code,
          });
        } else {
          perCrateNetQty = +(+actual_qty / +carrier_count).toFixed(2);

          let newDataEntry = {
            company_code: company_code,
            plant_id: plant_id,
            delivery_date: delivery_date,
            supplier_name: getPoDetails[0].vendor_name,
            supplier_no: getPoDetails[0].vendor_no,
            po_type: getPoDetails[0].po_document_type,
            po_no: po_no,
            item_code: item_code,
            item_no: item_no,
            item_name: getPoDetails[0].item["material_description"],
            ordered_qty: getPoDetails[0].item["quantity"],
            uom: getPoDetails[0].item["uom"],
            unit_price: getPoDetails[0].item["net_price"],
            actual_qty: actual_qty,
            invoice_no: "",
            total_crates_weight: 0,
            total_extra_qty: 0,
            inwarded_by: inwarded_by,
            total_inwarded_qty: +actual_qty.toFixed(2),
            total_net_qty: +actual_qty.toFixed(2),
            total_pending_qty: +(+order_qty - +actual_qty).toFixed(2),
            total_crates: +carrier_count,
          };

          newDataEntry.inward_crate_details = autoGenerateCrates(
            +carrier_count,
            perCrateNetQty,
            inwarded_by
          );

          await inwardProcess.create(newDataEntry);
        }
      } else {
        console.log("entry is available");

        if (checkExistingEntry.total_pending_qty == 0)
          return res.status(309).send({
            status_code: 309,
            message:
              "For material - " +
              item_code +
              ", ordered quantity already reached!",
          });

        let totalInwardedQty = +(+checkExistingEntry.total_net_qty + +actual_qty).toFixed(2);

        if (totalInwardedQty > +order_qty)
          return res.status(422).send({
            status_code: 422,
            message:
              "For material - " +
              item_code +
              ", Actual qty should be less or equal to pending qty!",
          });

        perCrateNetQty = +(+actual_qty / +carrier_count).toFixed(2);

        let crates = autoGenerateCrates(
          +carrier_count,
          perCrateNetQty,
          inwarded_by
        );

        await inwardProcess.updateOne(filter, {
          $set: {
            total_inwarded_qty:
              (checkExistingEntry.total_inwarded_qty + +actual_qty).toFixed(2),
            po_grn_status: "pending",
            total_pending_qty:
              (checkExistingEntry.total_pending_qty - +actual_qty).toFixed(2),
            total_crates: checkExistingEntry.total_crates + +carrier_count,
            total_net_qty: (checkExistingEntry.total_net_qty + +actual_qty).toFixed(2),
          },
        });

        await inwardProcess.updateOne(filter, {
          $push: { inward_crate_details: { $each: crates } },
        });
      }
    }

    return res.send({
      status_code: 200,
      message: "Manual inward details added successfully",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while saving manual inward process!",
    });
  }
};

exports.save_manual_vendor_inward_process_v2 = async (req, res) => {
  console.log("calling save manual inward process api");

  const {
    company_code,
    plant_id,
    inwarded_by,
    delivery_date,
    po_no,
    asn_no,
    inwardDetailsArr,
  } = req.body;

  try {
    if (
      !(
        company_code &&
        plant_id &&
        inwarded_by &&
        delivery_date &&
        po_no &&
        inwardDetailsArr
      )
    )
      return res.status(400).send({
        status_code: 400,
        status_message: "Please provide required parameters!",
      });

    for (let i = 0; i < inwardDetailsArr.length; i++) {
      let item_name = inwardDetailsArr[i].item_name;
      let item_code = inwardDetailsArr[i].item_code;
      let item_no = inwardDetailsArr[i].item_no;
      let uom = inwardDetailsArr[i].uom;
      let asn_qty = inwardDetailsArr[i].asn_qty;
      let order_qty = asn_qty != "0" ? asn_qty : inwardDetailsArr[i].ordered_qty;
      let pending_qty = inwardDetailsArr[i].total_pending_qty;
      let actual_qty = inwardDetailsArr[i].actual_qty;
      let carrier_count = inwardDetailsArr[i].carrier_count;

      if (
        !(
          (item_name && item_code && item_no && uom && order_qty && pending_qty)
          // actual_qty &&
          // carrier_count
        )
      )
        return res.status(400).send({
          status_code: 400,
          status_message:
            "Please provide required parameters for the material - " +
            item_code,
        });

      if (!(actual_qty && carrier_count))
        return res.status(400).send({
          status_code: 400,
          status_message:
            "Please provide actual quantity and crate count - " + item_code,
        });

      if (+actual_qty == 0)
        return res.status(422).send({
          status_code: 422,
          message:
            "Actual quantity should not be zero for the provided material - " +
            item_code,
        });

      if (+carrier_count == 0)
        return res.status(422).send({
          status_code: 422,
          message:
            "Carrier count should not be zero for the provided material - " +
            item_code,
        });

      const filter = {
        company_code: company_code,
        plant_id: plant_id,
        delivery_date: delivery_date,
        po_no: po_no,
        item_code: item_code,
        item_no: item_no,
      };

      if (asn_no)
        filter.inbound_delivery_number = asn_no;

      const checkExistingEntry = await inwardProcess.findOne(filter);

      let perCrateNetQty = 0;

      if (checkExistingEntry == null) {
        console.log("No entry is available");

        if (+actual_qty > +order_qty)
          return res.status(422).send({
            status_code: 422,
            message:
              "Actual qty should be less or equal to order qty for the material - " +
              item_code,
          });

        const getPoDetails = await purchaseOrder.aggregate([
          {
            $match: {
              company_code: company_code,
              supplying_plant: plant_id,
              po_number: po_no,
              delivery_date: delivery_date,
            },
          },
          {
            $unwind: "$item",
          },
          {
            $match: {
              "item.material_no": item_code,
              "item.item_no": item_no,
            },
          },
        ]);
        // console.log(getPoDetails);
        if (getPoDetails.length == 0) {
          console.log("unable to find PO!");
          return res.status(404).send({
            status_code: 404,
            message: "Unable to find PO for the material - " + item_code,
          });
        } else {
          perCrateNetQty = +(+actual_qty / +carrier_count).toFixed(2);

          let newDataEntry = {
            company_code: company_code,
            plant_id: plant_id,
            delivery_date: delivery_date,
            supplier_name: getPoDetails[0].vendor_name,
            supplier_no: getPoDetails[0].vendor_no,
            po_type: getPoDetails[0].po_document_type,
            po_no: po_no,
            item_code: item_code,
            item_no: item_no,
            item_name: getPoDetails[0].item["material_description"],
            ordered_qty: getPoDetails[0].item["quantity"],
            uom: getPoDetails[0].item["uom"],
            unit_price: getPoDetails[0].item["net_price"],
            actual_qty: actual_qty,
            invoice_no: "",
            total_crates_weight: 0,
            total_extra_qty: 0,
            inwarded_by: inwarded_by,
            total_inwarded_qty: +actual_qty.toFixed(2),
            total_net_qty: +actual_qty.toFixed(2),
            total_pending_qty: +(+order_qty - +actual_qty).toFixed(2),
            total_crates: +carrier_count,
          };

          newDataEntry.inward_crate_details = autoGenerateCrates(
            +carrier_count,
            perCrateNetQty,
            inwarded_by
          );

          await inwardProcess.create(newDataEntry);
        }
      } else {
        console.log("entry is available");

        if (checkExistingEntry.total_pending_qty == 0)
          return res.status(309).send({
            status_code: 309,
            message:
              "For material - " +
              item_code +
              ", ordered quantity already reached!",
          });

        let totalInwardedQty = +(+checkExistingEntry.total_net_qty + +actual_qty).toFixed(2);

        if (totalInwardedQty > +order_qty)
          return res.status(422).send({
            status_code: 422,
            message:
              "For material - " +
              item_code +
              ", Actual qty should be less or equal to pending qty!",
          });

        perCrateNetQty = +(+actual_qty / +carrier_count).toFixed(2);

        let crates = autoGenerateCrates(
          +carrier_count,
          perCrateNetQty,
          inwarded_by
        );

        await inwardProcess.updateOne(filter, {
          $set: {
            total_inwarded_qty:
              (checkExistingEntry.total_inwarded_qty + +actual_qty).toFixed(2),
            po_grn_status: "pending",
            total_pending_qty:
              (checkExistingEntry.total_pending_qty - +actual_qty).toFixed(2),
            total_crates: checkExistingEntry.total_crates + +carrier_count,
            total_net_qty: (checkExistingEntry.total_net_qty + +actual_qty).toFixed(2),
          },
        });

        await inwardProcess.updateOne(filter, {
          $push: { inward_crate_details: { $each: crates } },
        });
      }
    }

    return res.send({
      status_code: 200,
      message: "Manual inward details added successfully",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while saving manual inward process!",
    });
  }
};


exports.saveManualInwardV2 = async (req, res) => {
  console.log("calling save manual inward process api");

  const {
    company_code,
    plant_id,
    inwarded_by,
    delivery_date,
    sto_no,
    inwardDetailsArr,
  } = req.body;

  try {
    if (
      !(
        company_code &&
        plant_id &&
        inwarded_by &&
        delivery_date &&
        sto_no &&
        inwardDetailsArr
      )
    )
      return res.status(400).send({
        status_code: 400,
        status_message: "Please provide required parameters!",
      });

    for (let i = 0; i < inwardDetailsArr.length; i++) {
      let item_name = inwardDetailsArr[i].item_name;
      let item_code = inwardDetailsArr[i].item_code;
      let item_no = inwardDetailsArr[i].item_no;
      let uom = inwardDetailsArr[i].uom;
      let order_qty = inwardDetailsArr[i].ordered_qty;
      let outward_qty = inwardDetailsArr[i].outward_qty;
      let pending_qty = inwardDetailsArr[i].total_pending_qty;
      let actual_qty = inwardDetailsArr[i].actual_qty;
      let carrier_count = inwardDetailsArr[i].carrier_count;

      if (
        !(
          (item_name && item_code && item_no && uom && outward_qty && pending_qty)
          // actual_qty &&
          // carrier_count
        )
      )
        return res.status(400).send({
          status_code: 400,
          status_message:
            "Please provide required parameters for the material - " +
            item_code,
        });

      if (!(actual_qty && carrier_count))
        return res.status(400).send({
          status_code: 400,
          status_message:
            "Please provide actual quantity and crate count - " + item_code,
        });

      if (+actual_qty == 0)
        return res.status(422).send({
          status_code: 422,
          message:
            "Actual quantity should not be zero for the provided material - " +
            item_code,
        });

      if (+carrier_count == 0)
        return res.status(422).send({
          status_code: 422,
          message:
            "Carrier count should not be zero for the provided material - " +
            item_code,
        });

      const filter = {
        company_code: company_code,
        plant_id: plant_id,
        delivery_date: delivery_date,
        sto_number: sto_no,
        item_code: item_code,
        item_no: item_no,
      };

      const checkExistingEntry = await inwardProcess.findOne(filter);

      let perCrateNetQty = 0;

      if (checkExistingEntry == null) {
        return res.status(400).send({
          status_code: 400,
          message: "Please Inward",
        });
      }
      //   console.log("No entry is available");

      //   if (+actual_qty > +order_qty)
      //     return res.status(422).send({
      //       status_code: 422,
      //       message:
      //         "Actual qty should be less or equal to order qty for the material - " +
      //         item_code,
      //     });

      //   const getPoDetails = await purchaseOrder.aggregate([
      //     {
      //       $match: {
      //         company_code: company_code,
      //         supplying_plant: plant_id,
      //         po_number: po_no,
      //         delivery_date: delivery_date,
      //       },
      //     },
      //     {
      //       $unwind: "$item",
      //     },
      //     {
      //       $match: {
      //         "item.material_no": item_code,
      //         "item.item_no": item_no,
      //       },
      //     },
      //   ]);
      //   // console.log(getPoDetails);
      //   if (getPoDetails.length == 0) {
      //     console.log("unable to find PO!");
      //     return res.status(404).send({
      //       status_code: 404,
      //       message: "Unable to find PO for the material - " + item_code,
      //     });
      //   } else {
      //     perCrateNetQty = +(+actual_qty / +carrier_count).toFixed(2);

      //     let newDataEntry = {
      //       company_code: company_code,
      //       plant_id: plant_id,
      //       delivery_date: delivery_date,
      //       supplier_name: getPoDetails[0].vendor_name,
      //       supplier_no: getPoDetails[0].vendor_no,
      //       po_type: getPoDetails[0].po_document_type,
      //       po_no: po_no,
      //       item_code: item_code,
      //       item_no: item_no,
      //       item_name: getPoDetails[0].item["material_description"],
      //       ordered_qty: getPoDetails[0].item["quantity"],
      //       uom: getPoDetails[0].item["uom"],
      //       unit_price: getPoDetails[0].item["net_price"],
      //       actual_qty: actual_qty,
      //       invoice_no: "",
      //       total_crates_weight: 0,
      //       total_extra_qty: 0,
      //       inwarded_by: inwarded_by,
      //       total_inwarded_qty: +actual_qty.toFixed(2),
      //       total_net_qty: +actual_qty.toFixed(2),
      //       total_pending_qty: +(+order_qty - +actual_qty).toFixed(2),
      //       total_crates: +carrier_count,
      //     };

      //     newDataEntry.inward_crate_details = autoGenerateCrates(
      //       +carrier_count,
      //       perCrateNetQty,
      //       inwarded_by
      //     );

      //     await inwardProcess.create(newDataEntry);
      //   }
      // } else {
      console.log("entry is available");

      if (checkExistingEntry.total_pending_qty == 0)
        return res.status(309).send({
          status_code: 309,
          message:
            "For material - " +
            item_code +
            ", ordered quantity already reached!",
        });

      let totalInwardedQty = +(+checkExistingEntry.total_net_qty + +actual_qty).toFixed(2);

      if (totalInwardedQty > +outward_qty)
        return res.status(422).send({
          status_code: 422,
          message:
            "For material - " +
            item_code +
            ", Actual qty should be less or equal to pending qty!",
        });

      perCrateNetQty = +(+actual_qty / +carrier_count).toFixed(2);

      let crates = autoGenerateCrates(
        +carrier_count,
        perCrateNetQty,
        inwarded_by
      );

      await inwardProcess.updateOne(filter, {
        $set: {
          total_inwarded_qty:
            (checkExistingEntry.total_inwarded_qty + +actual_qty).toFixed(2),
          po_grn_status: "pending",
          total_pending_qty:
            (checkExistingEntry.total_pending_qty - +actual_qty).toFixed(2),
          total_crates: checkExistingEntry.total_crates + +carrier_count,
          total_net_qty: (checkExistingEntry.total_net_qty + +actual_qty).toFixed(2),
        },
      });

      await inwardProcess.updateOne(filter, {
        $push: { inward_crate_details: { $each: crates } },
      });
    }


    return res.send({
      status_code: 200,
      message: "Manual inward details added successfully",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while saving manual inward process!",
    });
  }
};

exports.getPoNoList = async (req, res) => {
  console.log("calling po number list api");
  const { company_code, plant_id, delivery_date, document_date, mode } =
    req.query;
  try {
    if (!(company_code && plant_id && delivery_date && mode))
      if (!(company_code && plant_id && document_date && mode))
        return res.status(400).send({
          status_code: 400,
          message: "Provide all required parameters!",
        });

    let filter = {};
    if (delivery_date)
      filter = {
        company_code: company_code,
        plant_id: plant_id,
        delivery_date: delivery_date,
      };
    else
      filter = {
        company_code: company_code,
        plant_id: plant_id,
        document_date: document_date,
        "inward_crate_details.mode": mode,
      };

    const poNumbers = (
      await inwardProcess.aggregate([
        { $match: filter },
        { $sort: { updatedAt: -1 } },
        {
          $group: {
            _id: "$po_no",
            pending_qty: { $sum: "$total_pending_qty" },
            total_grn_post_qty: { $sum: "$total_grn_post_qty" },
            total_net_qty: { $sum: "$total_net_qty" },
            updated_at: { $first: "$updatedAt" },
          },
        },
        { $sort: { updated_at: -1 } },
      ])
    ).map((no) => {
      let flag = 0,
        grn_flag = 1,
        direct_scan_flag = 1;
      if (no.pending_qty) flag = 1;

      //console.log("no",no);

      if (no.total_grn_post_qty == no.total_net_qty) grn_flag = 0;

      if (no.total_grn_post_qty) direct_scan_flag = 0;

      return {
        po_number: no._id,
        manual_inward: flag,
        grn_status: grn_flag,
        stin_flag: direct_scan_flag,
      };
    });

    let status = 200;
    let mssge = "PO Number list available";

    if (poNumbers.length == 0) {
      status = 404;
      mssge = "PO number list not available!";
    }

    return res.status(status).send({
      status_code: status,
      message: mssge,
      data: poNumbers,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting PO number list!",
    });
  }
};

exports.sto_no_list = async (req, res) => {
  console.log("calling po number list api");
  const { company_code, plant_id, delivery_date, document_date, mode } =
    req.query;
  try {
    if (!(company_code && plant_id && delivery_date && mode))
      if (!(company_code && plant_id && document_date && mode))
        return res.status(400).send({
          status_code: 400,
          message: "Provide all required parameters!",
        });

    let filter = {};
    if (delivery_date)
      filter = {
        company_code: company_code,
        plant_id: plant_id,
        delivery_date: delivery_date,
      };
    else
      filter = {
        company_code: company_code,
        plant_id: plant_id,
        document_date: document_date,
        "inward_crate_details.mode": mode,
      };

    const poNumbers = (
      await inwardProcess.aggregate([
        { $match: filter },
        { $sort: { updatedAt: -1 } },
        {
          $group: {
            _id: "$sto_number",
            pending_qty: { $sum: "$total_pending_qty" },
            total_grn_post_qty: { $sum: "$total_grn_post_qty" },
            total_net_qty: { $sum: "$total_net_qty" },
            updated_at: { $first: "$updatedAt" },
          },
        },
        { $match: { total_grn_post_qty: { $eq: 0 } } },
        { $sort: { updated_at: -1 } },
      ])
    ).map((no) => {
      let flag = 0,
        // grn_flag = 1,
        direct_scan_flag = 1;
      if (no.pending_qty) flag = 1;

      //console.log("no",no);

      // if (no.total_grn_post_qty == no.total_net_qty) grn_flag = 0;

      if (no.total_grn_post_qty) direct_scan_flag = 0;

      return {
        sto_number: no._id,
        manual_inward: flag,
        // grn_status: grn_flag,
        stin_flag: direct_scan_flag,
      };
    });

    let status = 200;
    let mssge = "STO Number list available";

    if (poNumbers.length == 0) {
      status = 404;
      mssge = "STO number list not available!";
    }

    return res.status(status).send({
      status_code: status,
      message: mssge,
      data: poNumbers,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting PO number list!",
    });
  }
};

exports.po_asn_list = async (req, res) => {
  console.log("calling po number list api");
  const { company_code, plant_id, delivery_date, document_date, mode } =
    req.query;
  try {
    if (!(company_code && plant_id && delivery_date && mode))
      if (!(company_code && plant_id && document_date && mode))
        return res.status(400).send({
          status_code: 400,
          message: "Provide all required parameters!",
        });

    let filter = {};
    if (delivery_date)
      filter = {
        company_code: company_code,
        plant_id: plant_id,
        delivery_date: delivery_date,
      };
    else
      filter = {
        company_code: company_code,
        plant_id: plant_id,
        document_date: document_date,
        "inward_crate_details.mode": mode,
      };

    const poNumbers = (
      await inwardProcess.aggregate([
        { $match: filter },
        { $sort: { updatedAt: -1 } },
        {
          $group: {
            _id: { po_no: "$po_no", asn_no: "$inbound_delivery_number" },
            pending_qty: { $sum: "$total_pending_qty" },
            total_grn_post_qty: { $sum: "$total_grn_post_qty" },
            total_net_qty: { $sum: "$total_net_qty" },
            updated_at: { $first: "$updatedAt" },
          },
        },
        { $sort: { updated_at: -1 } },
      ])
    ).map((no) => {
      let flag = 0,
        grn_flag = 1,
        direct_scan_flag = 1;
      if (no.pending_qty) flag = 1;

      //console.log("no",no);

      if (no.total_grn_post_qty == no.total_net_qty) grn_flag = 0;

      if (no.total_grn_post_qty) direct_scan_flag = 0;

      return {
        po_number: no._id['po_no'],
        asn_no: no._id['asn_no'] ? no._id['asn_no'] : "",
        manual_inward: flag,
        grn_status: grn_flag,
        stin_flag: direct_scan_flag,
      };
    });

    let status = 200;
    let mssge = "PO Number list available for Real Time Summary";

    if (poNumbers.length == 0) {
      status = 404;
      mssge = "PO Number list not available for Real Time Summary";
    }

    return res.status(status).send({
      status_code: status,
      message: mssge,
      data: poNumbers,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting PO number list!",
    });
  }
};


exports.getPoTypeList = async (req, res) => {
  console.log("calling get po type list api, only vendor present");
  const { company_code, plant_id, document_date } = req.query;
  try {
    if (!(company_code && plant_id && document_date))
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    const poTypes = (
      await purchase_order_table.aggregate([
        {
          $match: {
            company_code: company_code,
            supplying_plant: plant_id,
            document_date: document_date,
            vendor_no: { $ne: "" },
          },
        },
        {
          $group: { _id: "$po_document_type" },
        },
        { $sort: { _id: 1 } },
      ])
    ).map((type) => {
      return type._id;
    });

    let status = 200;
    let mssge = "PO type list found for Vendor Inward";

    if (poTypes.length == 0) {
      status = 404;
      mssge = "PO type list not found for Vendor Inward";
    }

    return res.status(status).send({
      status_code: status,
      message: mssge,
      data: poTypes,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting PO document type list!",
    });
  }
};

function randomInteger(min, max) {
  return (Math.random() * (max - min) + min).toFixed(0);
}
async function get_ordered_item(po_number) {
  console.log("get_ordered_item");
  let orderItems = [];
  await inwardProcess
    .find({ po_no: po_number })
    .sort({ created_at: -1 })
    .then(async (inwardPoData) => {
      if (inwardPoData.length != 0) {
        const purchase_order_data = await purchaseOrder
          .find({ po_number: po_number })
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

          //console.log("post pending", grn_post_pending);

          crate_barcode_values = crate_barcode_values.slice(
            0,
            crate_barcode_values.length - 1
          );
          if (purchase_order_data.length !== 0) {
            purchase_order_data[0].item.map((eachItem) => {
              //console.log(eachItem.item_no);
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
              crate_id: crate_barcode_values,
              item_code: eachDoc.item_code,
              item_no: eachDoc.item_no,
              storage_location: storage_location,
              qty: eachDoc.total_net_qty - grn_post_qty,
            };
            orderItems.push(itemObj);
          }
        });
      }
      //console.log("orderItems", orderItems);
    })
    .catch((err) => {
      return err;
    });
  return orderItems;
}

async function generate_grn(orderItems, plant_id, company_code, po_number) {
  console.log("generate_grn");
  let item_numbers = [],
    item_codes = [],
    crate_bar_codes = [],
    requestBody = {};

  requestBody["posting_date"] = moment(new Date()).format("YYYY-MM-DD");
  requestBody["document_date"] = moment(new Date()).format("YYYY-MM-DD");
  requestBody["referance_document_no"] = randomInteger(1000000000, 10000000000);
  requestBody["bill_of_lading"] = randomInteger(1000000000, 10000000000);
  requestBody["header_txt"] = [];
  requestBody["Item"] = [];
  orderItems.forEach((order) => {
    //console.log(order);
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

  let data = { request: requestBody };
  //console.log(data);
  var options = {
    method: "post",
    url: `${sap_url}/goods_receipt_note_creation`,
    // headers: { },
    data: data,
  };

  let sap_response = await axios
    .request(options)
    .then(async (response) => {
      let responseData = response.data.response;
      let sapData = {};
      //console.log("res : ", responseData);
      sapData.request = requestBody;
      sapData.response = responseData;
      sapData.company_code = company_code;
      sapData.primaryData = po_number;
      sapData.type = "Goods Receipts Note";
      sapData.plant_id = plant_id;
      const new_sap_grn_creation_logs = new sap_grn_creation_logs(sapData);
      await new_sap_grn_creation_logs.save();
      if (responseData.flag === "S" && responseData.material_document_no) {
        //console.log("true");
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
            //console.log("data",data);
            data.map(async (each) => {
              //console.log("each",each);
              if (each.inward_crate_details) {
                let _id = each._id;
                await inwardProcess.updateOne(
                  { _id: _id },
                  {
                    $set: {
                      "inward_crate_details.$[x].grn_status": "success",
                      "inward_crate_details.$[x].grn_no":
                        responseData.material_document_no,
                    },
                  },
                  {
                    arrayFilters: [
                      { "x.crate_barcode_value": { $in: crate_bar_codes } },
                    ],
                    multi: true,
                  }
                );
              }
            });
            return "Grn created and updated successfully.";
          });
      } else {
        console.log("falied grn");
        return "Grn failed";
      }
    })
    .catch(function (error) {
      return err;
    });
  return po_number + " " + sap_response;
}

async function create_grn(po_number, plant_id, company_code) {
  console.log("create_grn");
  let orderItems = await get_ordered_item(po_number);
  //console.log(orderItems);
  if (orderItems.length !== 0) {
    let generated_grn_response = await generate_grn(
      orderItems,
      plant_id,
      company_code,
      po_number
    );
    console.log("generated_grn_response", generated_grn_response);
    return {
      message: generated_grn_response ? generated_grn_response : "",
    };
  } else {
    return {
      message: "No data to generate GRN for the PO " + po_number,
    };
  }
}

// exports.grnCreation = async (req, res) => {
//   if (!req.body) {
//     return res.status(400).send({
//       status_code: 400,
//       message: "Missing request Body!",
//     });
//   }
//   let po_number = req.body.po_number;
//   let item_numbers = [],
//     item_codes = [],
//     crate_bar_codes = [],
//     requestBody = {};

//   if (!po_number) {
//     return res.status(400).send({
//       status_code: 400,
//       message: "Please provide po number and order items!",
//     });
//   } else {
//     let orderItems = [];
//     const plant_id = req.body.plant_id;
//     const company_code = req.body.company_code;
//     await inwardProcess
//       .find({ po_no: po_number })
//       .sort({ created_at: -1 })
//       .then(async (inwardPoData) => {
//         if (inwardPoData.length != 0) {
//           const purchase_order_data = await purchaseOrder
//             .find({ po_number: po_number })
//             .select({ item: 1 });
//           inwardPoData.forEach((eachDoc) => {
//             let crate_barcode_values = "",
//               grn_post_qty = 0,
//               grn_post_pending = 0,
//               storage_location = "0";
//             eachDoc.inward_crate_details.map((eachCrate) => {
//               if (eachCrate.grn_status === "wait") {
//                 // grn_post_pending = eachCrate.net_qty;
//                 crate_barcode_values += eachCrate.crate_barcode_value + "_";
//               } else {
//                 grn_post_qty += eachCrate.net_qty;
//               }
//             });

//             //console.log("post pending", grn_post_pending);

//             crate_barcode_values = crate_barcode_values.slice(
//               0,
//               crate_barcode_values.length - 1
//             );
//             if (purchase_order_data.length !== 0) {
//               purchase_order_data[0].item.map((eachItem) => {
//                 //console.log(eachItem.item_no);
//                 if (
//                   eachItem.material_no === eachDoc.item_code &&
//                   eachItem.item_no === eachDoc.item_no
//                 ) {
//                   storage_location = eachItem.storage_location;
//                 }
//               });
//             }
//             let itemObj = {};
//             if (crate_barcode_values !== "") {
//               itemObj = {
//                 crate_id: crate_barcode_values,
//                 item_code: eachDoc.item_code,
//                 item_no: eachDoc.item_no,
//                 storage_location: storage_location,
//                 qty: eachDoc.total_net_qty - grn_post_qty,
//               };
//               orderItems.push(itemObj);
//             }
//           });
//         }
//       })
//       .catch((err) => {
//         console.log(err);
//         return res.status(500).send({
//           status_code: 500,
//           message: "Some error occurred while retrieving inward po grn detail",
//         });
//       });
//     //console.log("orderItems",orderItems);
//     //return res.send(orderItems);
//     if (orderItems.length !== 0) {
//       //console.log(orderItems);
//       requestBody["posting_date"] = moment(new Date()).format("YYYY-MM-DD");
//       requestBody["document_date"] = moment(new Date()).format("YYYY-MM-DD");
//       requestBody["referance_document_no"] = randomInteger(
//         1000000000,
//         10000000000
//       );
//       requestBody["bill_of_lading"] = randomInteger(1000000000, 10000000000);
//       requestBody["header_txt"] = [];
//       requestBody["Item"] = [];
//       orderItems.forEach((order) => {
//         //console.log(order);
//         if (order.qty !== 0) {
//           item_numbers.push(order.item_no);
//           item_codes.push(order.item_code);
//           let crate_id_arr = order.crate_id.split("_");
//           for (let i = 0; i < crate_id_arr.length; i++) {
//             crate_bar_codes.push(crate_id_arr[i]);
//           }

//           let itemObj = {
//             material_no: order.item_code,
//             movement_type: [],
//             quantity: order.qty,
//             po_number: po_number,
//             po_item: order.item_no,
//             plant: plant_id,
//             storage_location: order.storage_location,
//           };
//           requestBody.Item.push(itemObj);
//         }
//       });

//       let data = { request: requestBody };
//       //console.log(data);
//       var options = {
//         method: "post",
//         url: `${sap_url}/goods_receipt_note_creation`,
//         // headers: { },
//         data: data,
//       };

//       await axios
//         .request(options)
//         .then(async (response) => {
//           let responseData = response.data.response;
//           let sapData = {};
//           //console.log("res : ", responseData);
//           sapData.request = requestBody;
//           sapData.response = responseData;
//           sapData.company_code = company_code;
//           sapData.primaryData = po_number;
//           sapData.type = "Goods Receipts Note";
//           sapData.plant_id = plant_id;
//           const new_sap_grn_creation_logs = new sap_grn_creation_logs(sapData);
//           await new_sap_grn_creation_logs.save();
//           if (responseData.flag === "S" && responseData.material_document_no) {
//             //console.log("true");
//             await inwardProcess
//               .find({
//                 po_no: po_number,
//                 inward_crate_details: {
//                   $elemMatch: {
//                     crate_barcode_value: {
//                       $in: crate_bar_codes,
//                     },
//                   },
//                 },
//               })
//               .then(async (data) => {
//                 //console.log("data",data);
//                 data.map(async (each) => {
//                   //console.log("each",each);
//                   if (each.inward_crate_details) {
//                     let inward_crate_details_updated = [];
//                     await each.inward_crate_details.map((items, index) => {
//                       //console.log("inward_crate_details",each.inward_crate_details);
//                       let update_data = {};
//                       if (crate_bar_codes.includes(items.crate_barcode_value)) {
//                         update_data.inwarded_time = items.inwarded_time;
//                         update_data.grn_no = responseData.material_document_no;
//                         update_data.grn_status = "success";
//                         update_data._id = items._id;
//                         update_data.crate_barcode_value =
//                           items.crate_barcode_value;
//                         update_data.inwarded_qty = items.inwarded_qty;
//                         update_data.crate_tare = items.crate_tare;
//                         update_data.net_qty = items.net_qty;
//                         update_data.inwarded_by = items.inwarded_by;
//                         if (items.crate_type)
//                           update_data.crate_type = items.crate_type;
//                         if (items.mode) update_data.mode = items.mode;
//                         if (items.so_delivery_date)
//                           update_data.so_delivery_date = items.so_delivery_date;
//                         update_data.auto_allocation = items.auto_allocation
//                           ? items.auto_allocation
//                           : false;
//                       } else {
//                         update_data.inwarded_time = items.inwarded_time;
//                         update_data.grn_no = items.grn_no;
//                         update_data.grn_status = items.grn_status;
//                         update_data._id = items._id;
//                         update_data.crate_barcode_value =
//                           items.crate_barcode_value;
//                         update_data.inwarded_qty = items.inwarded_qty;
//                         update_data.crate_tare = items.crate_tare;
//                         update_data.net_qty = items.net_qty;
//                         update_data.inwarded_by = items.inwarded_by;
//                         if (items.crate_type)
//                           update_data.crate_type = items.crate_type;
//                         if (items.mode) update_data.mode = items.mode;
//                         if (items.so_delivery_date)
//                           update_data.so_delivery_date = items.so_delivery_date;
//                         update_data.auto_allocation = items.auto_allocation
//                           ? items.auto_allocation
//                           : false;
//                       }
//                       inward_crate_details_updated.push(update_data);
//                     });
//                     each.inward_crate_details = inward_crate_details_updated;
//                     let _id = each._id;
//                     await inwardProcess
//                       .updateOne({ _id: _id }, each)
//                       .then((result) => {
//                         return res.status(200).send({
//                           status_code: 200,
//                           message: "Grn created and updated successfully.",
//                         });
//                       });
//                   }
//                 });
//               });
//           } else {
//             return res.status(400).send({
//               status_code: 400,
//               message: "Grn failed",
//             });
//           }
//         })
//         .catch(function (error) {
//           console.log(error);
//           return res.status(500).send({
//             status_code: 500,
//             message: error,
//           });
//         });
//     } else {
//       return res.status(400).send({
//         status_code: 400,
//         message: "No data to generate GRN",
//       });
//     }
//   }
// };

exports.grnCreation = async (req, res) => {
  if (!req.body) {
    return res.status(400).send({
      status_code: 400,
      message: "Missing request Body!",
    });
  }
  let po_number = req.body.po_number;
  let item_numbers = [],
    item_codes = [],
    crate_bar_codes = [],
    requestBody = {};

  if (!po_number) {
    return res.status(400).send({
      status_code: 400,
      message: "Please provide po number and order items!",
    });
  } else {
    let orderItems = [];
    const plant_id = req.body.plant_id;
    const company_code = req.body.company_code;
    await inwardProcess
      .find({ po_no: po_number })
      .sort({ created_at: -1 })
      .then(async (inwardPoData) => {
        if (inwardPoData.length != 0) {
          const purchase_order_data = await purchaseOrder
            .find({ po_number: po_number })
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

            //console.log("post pending", grn_post_pending);

            crate_barcode_values = crate_barcode_values.slice(
              0,
              crate_barcode_values.length - 1
            );
            if (purchase_order_data.length !== 0) {
              purchase_order_data[0].item.map((eachItem) => {
                //console.log(eachItem.item_no);
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
                crate_id: crate_barcode_values,
                item_code: eachDoc.item_code,
                item_no: eachDoc.item_no,
                storage_location: storage_location,
                qty: eachDoc.total_net_qty - grn_post_qty,
              };
              orderItems.push(itemObj);
            }
          });
        }
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).send({
          status_code: 500,
          message: "Some error occurred while retrieving inward po grn detail",
        });
      });
    //console.log("orderItems",orderItems);
    //return res.send(orderItems);
    if (orderItems.length !== 0) {
      //console.log(orderItems);
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
        //console.log(order);
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

      let data = { request: requestBody };
      //console.log(data);
      var options = {
        method: "post",
        url: `${sap_url}/goods_receipt_note_creation`,
        // headers: { },
        data: data,
      };

      await axios
        .request(options)
        .then(async (response) => {
          let responseData = response.data.response;
          let sapData = {};
          //console.log("res : ", responseData);
          sapData.request = requestBody;
          sapData.response = responseData;
          sapData.company_code = company_code;
          sapData.primaryData = po_number;
          sapData.type = "Goods Receipts Note";
          sapData.plant_id = plant_id;
          const new_sap_grn_creation_logs = new sap_grn_creation_logs(sapData);
          await new_sap_grn_creation_logs.save();
          if (responseData.flag === "S" && responseData.material_document_no) {
            //console.log("true");
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
                //console.log("data",data);
                data.map(async (each) => {
                  //console.log("each",each);
                  if (each.inward_crate_details) {
                    let _id = each._id;
                    await inwardProcess.updateOne(
                      { _id: _id },
                      {
                        $set: {
                          "inward_crate_details.$[x].grn_status": "success",
                          "inward_crate_details.$[x].grn_no":
                            responseData.material_document_no,
                        },
                      },
                      {
                        arrayFilters: [
                          { "x.crate_barcode_value": { $in: crate_bar_codes } },
                        ],
                        multi: true,
                      }
                    );
                  }
                });
                return res.status(200).send({
                  status_code: 200,
                  message: "Grn created and updated successfully.",
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
          console.log(error);
          return res.status(500).send({
            status_code: 500,
            message: error,
          });
        });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "No data to generate GRN",
      });
    }
  }
};

exports.grnCreationMultiplePo = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).send({
        status_code: 400,
        message: "Missing request Body!",
      });
    }
    let po_number = req.body.po_number;
    const plant_id = req.body.plant_id;
    const company_code = req.body.company_code;

    if (!po_number.length) {
      return res.status(400).send({
        status_code: 400,
        message: "Please provide po number!",
      });
    }

    //console.log(po_number.length);
    var result_array = await Promise.all(
      po_number.map(async (po_number, idx) => {
        let x = await create_grn(po_number, plant_id, company_code);
        return x;
      })
    );

    return res.status(200).send({
      status_code: 200,
      message: "Records updated Please check!",
    });
  } catch (error) {
    return res.status(400).send({
      status_code: 400,
      message: error,
    });
  }
};

async function get_ordered_item_v3(po_number, plant_id, company_code) {
  console.log("get_ordered_item_v3");
  let orderItems = [];
  let response = await inwardProcess
    .find({ po_no: po_number, plant_id: plant_id, company_code: company_code })
    .sort({ created_at: -1 })
    .then(async (inwardPoData) => {
      if (inwardPoData.length != 0) {
        const purchase_order_data = await purchaseOrder
          .find({
            po_number: po_number,
            supplying_plant: plant_id,
            company_code: company_code,
          })
          .select({ item: 1 });
        console.log("purchase_order_data", purchase_order_data);
        inwardPoData.forEach((eachDoc) => {
          //console.log("eachDoc",eachDoc);
          let grn_post_qty = eachDoc.total_grn_post_qty,
            storage_location = "0";
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

            let itemObj = {};
            if (grn_post_qty != eachDoc.total_net_qty) {
              console.log(
                grn_post_qty,
                eachDoc.total_net_qty,
                eachDoc.inventory_grn_posted_qty,
                eachDoc.inventory_net_qty
              );
              itemObj = {
                _id: eachDoc._id,
                item_code: eachDoc.item_code,
                item_no: eachDoc.item_no,
                storage_location: storage_location,
                qty: eachDoc.total_net_qty - grn_post_qty,
                inventory_qty:
                  eachDoc.inventory_net_qty - eachDoc.inventory_grn_posted_qty,
              };
              orderItems.push(itemObj);
            }
          }
        });
      }
      //console.log("orderItems",orderItems);
      return orderItems;
    })
    .catch(function (error) {
      //console.log("catch",error);
      return error.message;
    });
  //console.log("response",response);
  return response;
}

async function get_ordered_item_v4(po_number, asn_no, plant_id, company_code) {
  console.log("get_ordered_item_v3", po_number, asn_no, plant_id, company_code);
  let orderItems = [];
  let inward_filter = {};
  inward_filter.po_no = po_number;
  if (asn_no)
    inward_filter.inbound_delivery_number = asn_no;
  inward_filter.plant_id = plant_id;
  inward_filter.company_code = company_code;

  let response = await inwardProcess
    .find(inward_filter)
    .sort({ created_at: -1 })
    .then(async (inwardPoData) => {
      if (inwardPoData.length != 0) {
        const purchase_order_data = await purchaseOrder
          .find({
            po_number: po_number,
            supplying_plant: plant_id,
            company_code: company_code,
          })
          .select({ item: 1 });
        console.log("purchase_order_data", purchase_order_data);
        inwardPoData.forEach((eachDoc) => {
          //console.log("eachDoc",eachDoc);
          let grn_post_qty = eachDoc.total_grn_post_qty,
            storage_location = "0";
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

            let itemObj = {};
            if (grn_post_qty != eachDoc.total_net_qty) {
              console.log(
                grn_post_qty,
                eachDoc.total_net_qty,
                eachDoc.inventory_grn_posted_qty,
                eachDoc.inventory_net_qty
              );
              itemObj = {
                _id: eachDoc._id,
                item_code: eachDoc.item_code,
                item_no: eachDoc.item_no,
                storage_location: storage_location,
                qty: eachDoc.total_net_qty - grn_post_qty,
                inventory_qty:
                  eachDoc.inventory_net_qty - eachDoc.inventory_grn_posted_qty,
                asn_number: eachDoc.inbound_delivery_number,
                asn_item_no: eachDoc.asn_item_no,
              };
              orderItems.push(itemObj);
            }
          }
        });
      }
      //console.log("orderItems",orderItems);
      return orderItems;
    })
    .catch(function (error) {
      //console.log("catch",error);
      return error.message;
    });
  //console.log("response",response);
  return response;
}

async function generate_grn_v3(orderItems, plant_id, company_code, po_number) {
  console.log("generate_grn");
  let item_numbers = [],
    item_codes = [],
    //crate_bar_codes = [],
    requestBody = {};

  requestBody["posting_date"] = moment(new Date()).format("YYYY-MM-DD");
  requestBody["document_date"] = moment(new Date()).format("YYYY-MM-DD");
  requestBody["referance_document_no"] = randomInteger(1000000000, 10000000000);
  requestBody["bill_of_lading"] = randomInteger(1000000000, 10000000000);
  requestBody["header_txt"] = [];
  requestBody["Item"] = [];
  orderItems.forEach((order) => {
    //console.log(order);
    if (order.qty !== 0) {
      item_numbers.push(order.item_no);
      item_codes.push(order.item_code);
      // let crate_id_arr = order.crate_id.split("_");
      // for (let i = 0; i < crate_id_arr.length; i++) {
      //   crate_bar_codes.push(crate_id_arr[i]);
      // }

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

  let data = { request: requestBody };
  //console.log(data);
  //console.log("auth",sap_auth,sap_url);
  var options = {
    method: "post",
    url: `${sap_url}/goods_receipt_note_creation`,
    headers: { Authorization: `${sap_auth}` },
    data: data,
  };

  console.log("options", options);

  let sap_response = await axios
    .request(options)
    .then(async (response) => {
      console.log("response", response);
      let responseData = response.data.response;
      let sapData = {};
      //console.log("res : ", responseData);
      sapData.request = requestBody;
      sapData.response = responseData;
      sapData.company_code = company_code;
      sapData.primaryData = po_number;
      sapData.type = "Goods Receipts Note";
      sapData.plant_id = plant_id;
      const new_sap_grn_creation_logs = new sap_grn_creation_logs(sapData);
      await new_sap_grn_creation_logs.save();
      if (responseData.flag === "S" && responseData.material_document_no) {
        //console.log("true");
        orderItems.map(async (each) => {
          //console.log(_id);
          let _id = each._id;
          let qty = each.qty;
          let inventory_qty = each.inventory_qty;
          console.log(_id, qty);
          if (qty) {
            await inwardProcess.updateOne(
              { _id: _id },
              {
                $set: {
                  "inward_crate_details.$[x].grn_status": "success",
                  "inward_crate_details.$[x].grn_no":
                    responseData.material_document_no,
                },
              },
              {
                arrayFilters: [{ "x.grn_status": "wait" }],
                multi: true,
              }
            );
            await inwardProcess.updateOne(
              { _id: _id },
              {
                $inc: {
                  total_grn_post_qty: qty,
                  inventory_grn_posted_qty: inventory_qty,
                },
                $set: { po_grn_status: "success" },
              },
              { upsert: false }
            );

            await stock_summary_table.updateOne(
              {
                material_no: each.item_code,
                plant_id: plant_id,
                company_code: company_code,
              },
              {
                $inc: {
                  inventory_grn_posted_qty: inventory_qty,
                  inventory_stock_qty: inventory_qty,
                },
              }
            );
          }
        });

        return "GRN created and updated successfully.";
      } else {
        //console.log("falied grn");

        orderItems.map(async (each) => {
          //console.log(_id);
          let _id = each._id;
          let qty = each.qty;
          console.log(_id, qty);
          if (qty) {
            await inwardProcess.updateOne(
              { _id: _id },
              { $set: { po_grn_status: "failed" } },
              { upsert: false }
            );
          }
        });
        return "GRN failed";
      }
    })
    .catch(function (error) {
      return error;
    });
  return po_number + " " + sap_response;
}

async function generate_grn_v4(orderItems, plant_id, company_code, po_number) {
  console.log("generate_grn");
  let item_numbers = [],
    item_codes = [],
    //crate_bar_codes = [],
    requestBody = {};

  requestBody["posting_date"] = moment(new Date()).format("YYYY-MM-DD");
  requestBody["document_date"] = moment(new Date()).format("YYYY-MM-DD");
  requestBody["referance_document_no"] = randomInteger(1000000000, 10000000000);
  requestBody["bill_of_lading"] = randomInteger(1000000000, 10000000000);
  requestBody["header_txt"] = [];
  requestBody["Item"] = [];
  orderItems.forEach((order) => {
    //console.log(order);
    if (order.qty > 0) {
      item_numbers.push(order.item_no);
      item_codes.push(order.item_code);
      // let crate_id_arr = order.crate_id.split("_");
      // for (let i = 0; i < crate_id_arr.length; i++) {
      //   crate_bar_codes.push(crate_id_arr[i]);
      // }

      let itemObj = {
        material_no: order.item_code,
        movement_type: order.asn_number ? "101" : [],
        quantity: parseFloat(order.qty).toFixed(2),
        po_number: order.asn_number ? "" : po_number,
        po_item: order.asn_number ? "" : order.item_no,
        plant: plant_id,
        storage_location: order.asn_number ? "" : order.storage_location,
        asn_number: order.asn_number ? order.asn_number : "",
        asn_item_no: order.asn_item_no ? order.asn_item_no : ""
      };
      requestBody.Item.push(itemObj);
    }
  });

  //hello

  let data = { request: requestBody };
  //console.log(data);
  //console.log("auth",sap_auth,sap_url);
  var options = {
    method: "post",
    url: `${sap_url}/goods_receipt_note_creation`,
    headers: { Authorization: `${sap_auth}` },
    data: data,
  };

  console.log("options", options);

  let sap_response = await axios
    .request(options)
    .then(async (response) => {
      console.log("response", response);
      let responseData = response.data.response;
      let sapData = {};
      //console.log("res : ", responseData);
      sapData.request = requestBody;
      sapData.response = responseData;
      sapData.company_code = company_code;
      sapData.primaryData = po_number;
      sapData.type = "Goods Receipts Note";
      sapData.plant_id = plant_id;
      const new_sap_grn_creation_logs = new sap_grn_creation_logs(sapData);
      await new_sap_grn_creation_logs.save();
      if (responseData.flag === "S" && responseData.material_document_no) {
        //console.log("true");
        orderItems.map(async (each) => {
          //console.log(_id);
          let _id = each._id;
          let qty = each.qty;
          let inventory_qty = each.inventory_qty;
          console.log(_id, qty);
          if (qty) {
            await inwardProcess.updateOne(
              { _id: _id },
              {
                $set: {
                  "inward_crate_details.$[x].grn_status": "success",
                  "inward_crate_details.$[x].grn_no":
                    responseData.material_document_no,
                },
              },
              {
                arrayFilters: [{ "x.grn_status": "wait" }],
                multi: true,
              }
            );
            await inwardProcess.updateOne(
              { _id: _id },
              {
                $inc: {
                  total_grn_post_qty: qty,
                  inventory_grn_posted_qty: inventory_qty,
                },
                $set: { po_grn_status: "success" },
              },
              { upsert: false }
            );

            await stock_summary_table.updateOne(
              {
                material_no: each.item_code,
                plant_id: plant_id,
                company_code: company_code,
              },
              {
                $inc: {
                  inventory_grn_posted_qty: inventory_qty,
                  inventory_stock_qty: inventory_qty,
                },
              }
            );
          }
        });

        return "GRN created and updated successfully.";
      } else {
        //console.log("falied grn");

        orderItems.map(async (each) => {
          //console.log(_id);
          let _id = each._id;
          let qty = each.qty;
          console.log(_id, qty);
          if (qty) {
            await inwardProcess.updateOne(
              { _id: _id },
              { $set: { po_grn_status: "failed" } },
              { upsert: false }
            );
          }
        });
        return "GRN has been failed";
      }
    })
    .catch(async function (error) {
      let catchResponseData = error;
      console.log("error", error);
      let catchSapData = {};
      //console.log("res : ", responseData);
      catchSapData.request = requestBody;
      catchSapData.response = catchResponseData;
      catchSapData.company_code = company_code;
      catchSapData.primaryData = po_number;
      catchSapData.type = "Goods Receipts Note";
      catchSapData.plant_id = plant_id;
      const new_sap_grn_creation_logs = new sap_grn_creation_logs(catchSapData);
      await new_sap_grn_creation_logs.save();
      return error;
    });
  return sap_response;
}

async function generate_grn_v5(orderItems, plant_id, company_code, po_number, asn_no) {
  console.log("generate_grn v5");
  let item_numbers = [],
    item_codes = [],
    //crate_bar_codes = [],
    requestBody = {};

  requestBody["posting_date"] = moment(new Date()).format("YYYY-MM-DD");
  requestBody["document_date"] = moment(new Date()).format("YYYY-MM-DD");
  requestBody["referance_document_no"] = randomInteger(1000000000, 10000000000);
  requestBody["bill_of_lading"] = randomInteger(1000000000, 10000000000);
  requestBody["header_txt"] = [];
  requestBody["Item"] = [];
  orderItems.forEach((order) => {
    //console.log(order);
    if (order.qty > 0) {
      item_numbers.push(order.item_no);
      item_codes.push(order.item_code);
      // let crate_id_arr = order.crate_id.split("_");
      // for (let i = 0; i < crate_id_arr.length; i++) {
      //   crate_bar_codes.push(crate_id_arr[i]);
      // }

      var itemObj = {
        material_no: order.item_code,
        movement_type: order.asn_number ? "101" : [],
        quantity: parseFloat(order.qty).toFixed(2),
        //po_number: order.asn_number ? "" : po_number,
        //po_item: order.asn_number ? "" : order.item_no,
        plant: plant_id,
        //storage_location: order.asn_number ? "" : order.storage_location,
        //asn_number: order.asn_number ? order.asn_number : "",
        //asn_item_no: order.asn_item_no ? order.asn_item_no : ""
      };

      if (!(asn_no)) {
        itemObj.po_number = po_number;
        itemObj.po_item = order.item_no;
        itemObj.storage_location = "";
      }
      else{
        itemObj.po_number = "";
        itemObj.po_item = "";
        itemObj.storage_location = order.storage_location;
        itemObj.asn_number = order.asn_number;
        itemObj.asn_item_no = order.asn_item_no;
      }
      requestBody.Item.push(itemObj);
    }
  });

  //hello

  let data = { request: requestBody };
  console.log("data", data, data.request.Item);
  //console.log("auth",sap_auth,sap_url);
  var options = {};

  if (!(asn_no)) {
    options = {
      method: "post",
      url: `${new_sap_url}/farmConnect/goods_receipt_note_creation`,
      headers: { },
      data: data,
    };
  }
  else {
    options = {
      method: "post",
      url: `${new_sap_url}/asn_goods_receipt_note_creation`,
      headers: { },
      data: data,
    };
  }

  //console.log("options", options);

  let sap_response = await axios
    .request(options)
    .then(async (response) => {
      //console.log("response", response);
      let responseData = asn_no ? response.data.response : response.data.data.response;
      let sapData = {};
      //console.log("res : ", responseData);
      sapData.request = requestBody;
      sapData.response = responseData;
      sapData.company_code = company_code;
      sapData.primaryData = po_number;
      sapData.type = "Goods Receipts Note";
      sapData.plant_id = plant_id;
      const new_sap_grn_creation_logs = new sap_grn_creation_logs(sapData);
      await new_sap_grn_creation_logs.save();
      if (responseData.flag === "S" && responseData.material_document_no) {
        //console.log("true");
        orderItems.map(async (each) => {
          //console.log(_id);
          let _id = each._id;
          let qty = each.qty;
          let inventory_qty = each.inventory_qty;
          console.log(_id, qty);
          if (qty) {
            await inwardProcess.updateOne(
              { _id: _id },
              {
                $set: {
                  "inward_crate_details.$[x].grn_status": "success",
                  "inward_crate_details.$[x].grn_no":
                    responseData.material_document_no,
                },
              },
              {
                arrayFilters: [{ "x.grn_status": "wait" }],
                multi: true,
              }
            );
            await inwardProcess.updateOne(
              { _id: _id },
              {
                $inc: {
                  total_grn_post_qty: qty,
                  inventory_grn_posted_qty: inventory_qty,
                },
                $set: { po_grn_status: "success" },
              },
              { upsert: false }
            );

            await stock_summary_table.updateOne(
              {
                material_no: each.item_code,
                plant_id: plant_id,
                company_code: company_code,
              },
              {
                $inc: {
                  inventory_grn_posted_qty: inventory_qty,
                  inventory_stock_qty: inventory_qty,
                },
              }
            );
          }
        });

        return "GRN created and updated successfully.";
      } else {
        console.log("falied grn");

        orderItems.map(async (each) => {
          //console.log(_id);
          let _id = each._id;
          let qty = each.qty;
          console.log(_id, qty);
          if (qty) {
            await inwardProcess.updateOne(
              { _id: _id },
              { $set: { po_grn_status: "failed" } },
              { upsert: false }
            );
          }
        });
        return "GRN has been failed";
      }
    })
    .catch(async function (error) {
      // let catchResponseData = error;
      //console.log("error", error);
      // let catchSapData = {};
      // //console.log("res : ", responseData);
      // catchSapData.request = requestBody;
      // catchSapData.response = catchResponseData;
      // catchSapData.company_code = company_code;
      // catchSapData.primaryData = po_number;
      // catchSapData.type = "Goods Receipts Note";
      // catchSapData.plant_id = plant_id;
      // const new_sap_grn_creation_logs = new sap_grn_creation_logs(catchSapData);
      // await new_sap_grn_creation_logs.save();
      return error;
    });
  //console.log("sap_response", sap_response);
  return sap_response;

}


async function create_grn_v3(po_number, plant_id, company_code) {
  console.log("create_grn_v3");
  let orderItems = await get_ordered_item_v3(po_number, plant_id, company_code);
  //return orderItems;
  //console.log("orderItems",orderItems);
  if (Array.isArray(orderItems)) {
    if (orderItems.length !== 0) {
      let generated_grn_response = await generate_grn_v3(
        orderItems,
        plant_id,
        company_code,
        po_number
      );
      console.log("generated_grn_response", generated_grn_response);
      return {
        message: generated_grn_response ? generated_grn_response : "",
      };
    } else {
      return {
        message: "No data to generate GRN for the PO " + po_number,
      };
    }
  }
  //return orderItems;
  else return { err: orderItems };
}

exports.grnCreationV3 = async (req, res) => {
  const po_number = req.body.po_number;
  const plant_id = req.body.plant_id;
  const company_code = req.body.company_code;

  if (!(po_number && plant_id && company_code)) {
    return res.status(400).send({
      status_code: 400,
      message: "Missing Parameters!",
    });
  }

  try {
    var result_array = [];

    for (let i = 0; i < po_number.length; i++) {
      console.log("map", po_number, plant_id, company_code);
      let grn_creation_response = await create_grn_v3(po_number[i], plant_id, company_code);
      //console.log("x",x);
      result_array.push(grn_creation_response);
    }

    return res.status(200).send({
      status_code: 200,
      message: "Data updated successfully",
      data: result_array,
    });
  } catch (error) {
    return res.status(400).send({
      status_code: 400,
      message: error,
    });
  }
};

async function create_grn_v4(po_number, plant_id, company_code) {
  console.log("create_grn_v3");
  let po_no = po_number["po_no"];
  let asn_no = po_number["asn_no"];
  let orderItems = await get_ordered_item_v4(po_no, asn_no, plant_id, company_code);
  //return orderItems;
  console.log("orderItems", orderItems);
  if (Array.isArray(orderItems)) {
    if (orderItems.length !== 0) {
      let generated_grn_response = await generate_grn_v4(
        orderItems,
        plant_id,
        company_code,
        po_no
      );
      console.log("generated_grn_response", generated_grn_response);
      return {
        message: generated_grn_response ? generated_grn_response : "",
      };
    } else {
      return {
        message: "No data to generate GRN for the PO " + po_number,
      };
    }
  }
  //return orderItems;
  else return { err: orderItems };
}

async function create_grn_v5(po_number, plant_id, company_code) {
  console.log("create_grn_v3");
  let po_no = po_number["po_no"];
  let asn_no = po_number["asn_no"];
  let orderItems = await get_ordered_item_v4(po_no, asn_no, plant_id, company_code);
  //return orderItems;
  console.log("orderItems", orderItems);
  if (Array.isArray(orderItems)) {
    if (orderItems.length !== 0) {
      let generated_grn_response = await generate_grn_v5(
        orderItems,
        plant_id,
        company_code,
        po_no,
        asn_no
      );
      console.log("generated_grn_response", generated_grn_response);
      return {
        message: generated_grn_response ? generated_grn_response : "",
      };
    } else {
      return {
        message: "No data to generate GRN for the PO",
      };
    }
  }
  //return orderItems;
  else return { err: orderItems };
}

exports.grnCreationV4 = async (req, res) => {
  console.log("grnCreationV4");
  const po_number = req.body.request;
  const plant_id = req.body.plant_id;
  const company_code = req.body.company_code;

  if (!(po_number && plant_id && company_code)) {
    return res.status(400).send({
      status_code: 400,
      message: "Missing Parameters!",
    });
  }

  try {
    var result_array = [];

    for (let i = 0; i < po_number.length; i++) {
      console.log("map", po_number, plant_id, company_code);
      // let request_data = po_number[i];
      // console.log("request_data",request_data["po_no"])
      await inwardProcess.updateMany(
        {
          po_no: po_number[i]["po_no"],
          company_code: company_code,
          plant_id: plant_id
        },
        { $set: { grn_posted: true } }
      );

      let grn_creation_response = await create_grn_v4(po_number[i], plant_id, company_code);
      //console.log("x",x);
      result_array.push(grn_creation_response);
    }

    return res.status(200).send({
      status_code: 200,
      message: "Data updated successfully",
      data: result_array,
    });
  } catch (error) {
    console.log("error", error);
    return res.status(400).send({
      status_code: 400,
      message: error,
    });
  }
};

exports.grnCreationV5 = async (req, res) => {
  console.log("grnCreationV4");
  const po_number = req.body.request;
  const plant_id = req.body.plant_id;
  const company_code = req.body.company_code;

  if (!(po_number && plant_id && company_code)) {
    return res.status(400).send({
      status_code: 400,
      message: "Missing Parameters!",
    });
  }

  try {
    var result_array = [];

    for (let i = 0; i < po_number.length; i++) {
      console.log("map", po_number, plant_id, company_code);
      // let request_data = po_number[i];
      // console.log("request_data",request_data["po_no"])
      await inwardProcess.updateMany(
        {
          po_no: po_number[i]["po_no"],
          company_code: company_code,
          plant_id: plant_id
        },
        { $set: { grn_posted: true } }
      );

      let grn_creation_response = await create_grn_v5(po_number[i], plant_id, company_code);
      //console.log("x",x);
      result_array.push(grn_creation_response);
    }

    return res.status(200).send({
      status_code: 200,
      message: "Data updated successfully",
      data: result_array,
    });
  } catch (error) {
    console.log("error", error);
    return res.status(400).send({
      status_code: 400,
      message: error,
    });
  }
};


exports.manual_grn_sync = async (req, res) => {
  let company_code = req.body.company_code;
  let plant_id = req.body.plant_id;

  let get_grn_posted_data = await inwardProcess.aggregate([
    {
      $match: {
        plant_id: plant_id,
        company_code: company_code,
        grn_posted: true,
        "inward_crate_details.grn_status": "wait",
      }
    },
    { $project: { _id: 0, po_no: 1 } },
    {
      $lookup: {
        from: "rapid_grns",
        localField: "po_no",
        foreignField: "po_number",
        pipeline: [{
          $lookup:
          {
            from: "rapid_grn_items",
            localField: "id",
            foreignField: "grn_id",
            as: "rapid_grn_items"
          }
        },
        {
          $project: {
            _id: 0,
            id: 1,
            material_document_no: 1,
            "rapid_grn_items.material_no": 1,
            "rapid_grn_items.quantity": 1,
            "rapid_grn_items.po_item": 1
          }
        }],
        as: "rapid_grns",
      }
    },
    { $unwind: "$rapid_grns" },
    { $unwind: "$rapid_grns.rapid_grn_items" },
    {
      $project: {
        po_no: "$po_no",
        grn_no: "$rapid_grns.material_document_no",
        po_item: "$rapid_grns.rapid_grn_items.po_item",
        grn_qty: "$rapid_grns.rapid_grn_items.quantity"
      }
    }
  ]);

  console.log("get_grn_posted_data", get_grn_posted_data);

  if (get_grn_posted_data.length) {

    let updated_grn_data = get_grn_posted_data.map(async (element, idx) => {
      let po_no = element.po_no;
      let grn_no = element.grn_no;
      let po_item = element.po_item;
      let grn_qty = element.grn_qty;
      console.log("po_no", po_no, grn_no, po_item, grn_qty);
      //return "hello";
      let x = await inwardProcess.findOne({ po_no: po_no, item_no: po_item });
      if (x) {
        await inwardProcess.updateOne(
          {
            po_no: po_no,
            item_no: po_item,
            "inward_crate_details.grn_no": { $ne: grn_no }
          },
          {
            $set:
            {
              "inward_crate_details.0.grn_no": grn_no,
              "inward_crate_details.0.grn_status": "success"
            },
            $inc: {
              total_grn_post_qty: grn_qty
            }
          },
          { "multi": false })
        return { message: "data updated" }
      }

    })
    var response = await Promise.all(updated_grn_data);
    return res.send({ data: response });
  }
  else {
    return res.send({ data: "no records found" });
  }
}

exports.insert_article_conversion_factor = async (req, res) => {
  let plant_id = req.body.plant_id;
  let page_no = req.body.page_no;
  let size = req.body.size;
  let company_code = req.body.company_code;

  var options = {
    method: "get",
    url: "https://wfpplspoprd.waycool.in:50101/RESTAdapter/waycool_prod/article_master_get",
    headers: { Authorization: "Basic UElDT05ORUNUOldjc3Q1NDMyMQ==" },
    data: {
      page_no: page_no,
      request: {
        //"material_number": "BN0101000001500114"
        //"material_number": "WC0000000000110004",
        //"material_number": "WC0000000000230047"
        plant: plant_id,
        //"updated_on": "2022-04-26 00:00:00"
      },
    },
  };

  console.log("options", options);

  let data = await axios.request(options);
  let total_page_no = data.data.pagination.total_page_no;
  console.log(total_page_no);
  //res.send(data.data.response);

  let final_response = [];
  for (let i = parseInt(page_no); i <= size; i++) {
    let temp_options = {
      method: "get",
      url: "https://wfpplspoprd.waycool.in:50101/RESTAdapter/waycool_prod/article_master_get",
      headers: { Authorization: "Basic UElDT05ORUNUOldjc3Q1NDMyMQ==" },
      data: {
        page_no: i,
        request: {
          //"material_number": "BN0101000001500114"
          //"material_number": "WC0000000000110004",
          //"material_number": "WC0000000000230047"
          plant: plant_id,
          //"updated_on": "2022-04-26 00:00:00"
        },
      },
    };
    console.log("temp_options", temp_options);
    let temp_data = await axios.request(temp_options);
    temp_data.data.response.forEach((element) => {
      // if(i==18)
      // {
      //   console.log("element.altuom",element.altuom,element.material_number);
      // }
      if (
        element.material_number != "BN3710000001000046" &&
        element.material_number != "BN3710000001000056"
      )
        final_response.push({
          material_type: element.material_type,
          material_number: element.material_number,
          material_desc: element.material_desc,
          uom: element.uom ? element.uom.trim() : "",
          alt_uom: element.altuom ? element.altuom.trim() : "",
          order_uom: element.order_UOM,
        });
    });
  }

  let x = final_response.map(async (element) => {
    let insert_record = {};
    insert_record.material_type = element.material_type;
    insert_record.material_no = element.material_number;
    insert_record.material_name = element.material_desc;
    insert_record.order_uom = element.order_uom;
    insert_record.company_code = company_code;
    insert_record.plant_id = plant_id;
    insert_record.inwarded_qty = 0;
    insert_record.opening_stock = 0;
    insert_record.auto_allocated_qty = 0;
    insert_record.manual_allocated_qty = 0;
    insert_record.inventory_grn_posted_qty = 0;
    insert_record.inventory_invoice_posted_qty = 0;
    insert_record.total_stock_qty = 0;
    if (element.uom && element.alt_uom) {
      insert_record.uom = element.uom;
      insert_record.alt_uom = element.alt_uom;
      insert_record.multiple_uom = true;
    } else if (element.uom || element.alt_uom) {
      insert_record.uom = element.uom ? element.uom : element.alt_uom;
      insert_record.alt_uom = "";
      insert_record.multiple_uom = false;
    }
    //await stock_summary_table.insert(insert_record);
    const new_stock_summary = new stock_summary_table(insert_record);
    await new_stock_summary.save(new_stock_summary);
  });

  await Promise.all(x);

  res.send({ final_response: final_response });
  // let final_data = [];
  // for(let i=1;i<=total_page_no;i++)
  // {
  //   let temp_options = {
  //     method: "get",
  //     url: "https://wfpplspoprd.waycool.in:50101/RESTAdapter/waycool_prod/article_master_get",
  //     headers: { Authorization: "Basic UElDT05ORUNUOldjc3Q1NDMyMQ==" },
  //     data: {
  //       page_no: i.toString(),
  //       request: {
  //         //"material_number": "BN0101000001500114"
  //         //"material_number": "WC0000000000110004",
  //         //"material_number": "WC0000000000230047"
  //         plant: plant,
  //         //"updated_on": "2022-04-26 00:00:00"
  //       },
  //     },
  //   };
  //   let new_data = await axios.request(temp_options);
  //   final_data.push(new_data);
  //   break;
  // }
  // console.log("final_data",final_data);
  //res.send({final_data:final_data});
  // .then(async (response) => {
  //   //console.log("response",response);
  //   let response_data = [];
  //   response.data.response.forEach((element) => {
  //     response_data.push({
  //       material_type: element.material_type,
  //       material_number: element.material_number,
  //       uom:element.uom,
  //       altuom: element.altuom,
  //       order_UOM: element.order_UOM,
  //     });
  //   });
  //   res.send({data:response_data,length:response_data.length});
  // });
  // // .catch((err) => {
  //   console.log("err", err);
  //   res.send(err);
  // });
  //res.send(data);
};

async function get_sku_details(index) {
  let push_array = [];
  let current_index = parseInt(index + 1);
  var options = {
    method: "get",
    url: "https://wfpplspoprd.waycool.in:50101/RESTAdapter/waycool_prod/article_master_get",
    headers: { Authorization: "Basic UElDT05ORUNUOldjc3Q1NDMyMQ==" },
    data: {
      page_no: current_index,
      request: {
        //"material_number": "BN0101000001500114"
        //"material_number": "WC0000000000110004",
        //"material_number": "WC0000000000230047"
        plant: 1000,
        //"updated_on": "2022-04-26 00:00:00"
      },
    },
  };

  console.log("options", options);
  let data = await axios.request(options);
  //console.log(data);
  data.data.response.forEach((element) => {
    //console.log("element",element);
    // if(i==18)
    // {
    //   console.log("element.altuom",element.altuom,element.material_number);
    // }
    push_array.push(element);
  });
  return push_array;
}
exports.insert_article_conversion_factor_v2 = async (req, res) => {
  console.log("insert_article_conversion_factor_v2");
  let plant_id = req.body.plant_id;
  let page_no = req.body.page_no;
  let size = req.body.size;
  let company_code = req.body.company_code;

  let x = new Array(10).fill(undefined).map((val, idx) => idx);
  //console.log(x);

  let final_sku_data = [];
  for (let i = 1; i <= 55; i++) {
    let y = x.map(async (element, index) => {
      if (i != 1) index = (i - 1) * 10 + index;
      //console.log("index",index);
      //final_sku_data.push(index);
      let sku_data = await get_sku_details(index);
      sku_data.forEach((element) => {
        final_sku_data.push(element);
      });
    });
    await Promise.all(y);
  }
  res.send({ x: final_sku_data, total_length: final_sku_data.length });
};

async function get_article_master_details(total_page_no) {
  //console.log(total_page_no);
  const today_date = moment_tz(new Date())
    .tz("Asia/Kolkata")
    .format("YYYY-MM-DD");
  let complete_results = [];
  for (let i = 1; i <= total_page_no; i++) {
    var options = {
      method: "get",
      url: "https://wfpplspoprd.waycool.in:50101/RESTAdapter/waycool_prod/article_master_get",
      headers: { Authorization: "Basic UElDT05ORUNUOldjc3Q1NDMyMQ==" },
      data: {
        page_no: i,
        request: {
          //"material_number": "WC0101000001461150",
          //"distr_channel": "55"
          //"distrubition_centre": ""
          //"purchasing_org": "1000"
          "updated_on": today_date
        },
      },
    };
    let sap_data = await axios.request(options);
    sap_data.data.response.forEach(element => {
      complete_results.push(element);
    })
  }
  return complete_results;
}

exports.sync_rapid_wdc_item_masters = async (req, res) => {

  try {
    const today_date = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD");

    var options = {
      method: "get",
      url: "https://wfpplspoprd.waycool.in:50101/RESTAdapter/waycool_prod/article_master_get",
      headers: { Authorization: "Basic UElDT05ORUNUOldjc3Q1NDMyMQ==" },
      data: {
        page_no: 1,
        request: {
          //"material_number": "WC0101000001461150",
          //"distr_channel": "55"
          //"distrubition_centre": ""
          //"purchasing_org": "1000"
          "updated_on": today_date
        },
      },
    };
    let data = await axios.request(options);

    if (data.data.pagination.total_article) {
      let total_page_no = data.data.pagination.total_page_no;
      //console.log("total_page_no", total_page_no);
      let x = await get_article_master_details(total_page_no);
      let y = x.map(async element => {
        if (element.uom == " ")
          element.uom = element.uom.trim();
        if (element.altuom == " ")
          element.altuom = element.altuom.trim();

        let item_master_data = await wdc_item_masters_table.findOne({ material_number: element.material_number });
        //console.log("item_master_data",item_master_data);
        if (item_master_data) {
          //console.log("true");
          await wdc_item_masters_table.deleteMany({
            material_number: element.material_number
          });
        }
        const new_item_master_data = new wdc_item_masters_table(element);
        await new_item_master_data.save();
      })
      await Promise.all(y);
      return "Item Master Records Updated Successfully";
    }


  } catch (error) {
    console.log(error);
    return res.status(400).send({
      status_code: 400,
      message: error.message,
    });
  }

};
