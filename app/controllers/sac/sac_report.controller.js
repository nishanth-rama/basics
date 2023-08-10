const db = require("../../models");
const inward_po_table = db.inwardProcess;
const purchase_order_table = db.purchaseOrder;
const sales_order_table = db.soAllocation;
const sac_so_table = db.sacSoDetail;
const sac_po_table = db.sacPoDetail;
const moment_tz = require("moment-timezone");

exports.get_sac_po_report = async (req, res) => {
  try {
    const { delivery_date, plant_id, company_code, creation_date } = req.query;

    if (!creation_date) {
      return res.send({
        status_code: 400,
        message: "Please provide the document creation date!",
      });
    }

    let condition = {
      created_at: creation_date,
      company_code: company_code ? company_code : { $ne: null },
      plant_id: plant_id ? plant_id : { $ne: null },
      po_delivery_date: delivery_date ? delivery_date : { $ne: null },
    };

    let sac_po_detail = await sac_po_table.aggregate([
      {
        $match: condition,
      },
      {
        $project: {
          _id: 0,
          company_code: "$company_code",
          plant_id: "$plant_id",
          po_number: "$po_number",
          po_delivery_date: "$po_delivery_date",
          po_document_type: "$po_document_type",
          vendor_code: "$vendor_code",
          vendor_name: "$vendor_name",
          created_at: "$created_at",
          item_detail: "$item_detail",
        },
      },
    ]);

    if (sac_po_detail.length) {
      return res.send({ status_code: 200, data: sac_po_detail });
    } else {
      return res.status(400).send({
        status_code: 400,
        status_message: "sac purchase order not available",
      });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      status_message:
        error.message ||
        "Some error occurred while retrieving sac purchase order",
    });
  }
};

exports.get_sac_so_report = async (req, res) => {
  try {
    const { delivery_date, plant_id, company_code, creation_date } = req.query;

    if (!creation_date) {
      return res.send({
        status_code: 400,
        message: "Please provide the document creation date!",
      });
    }

    let condition = {
      created_at: creation_date,
      company_code: company_code ? company_code : { $ne: null },
      plant_id: plant_id ? plant_id : { $ne: null },
      sales_delivery_date: delivery_date ? delivery_date : { $ne: null },
    };

    let sac_so_detail = await sac_so_table.aggregate([
      {
        $match: condition,
      },
      {
        $project: {
          _id: 0,
          company_code: "$company_code",
          plant_id: "$plant_id",
          sales_order_no: "$sales_order_no",
          sales_document_type: "$sales_document_type",
          sales_delivery_date: "$sales_delivery_date",
          customer_code: "$customer_code",
          customer_name: "$customer_name",
          created_at: "$created_at",
          items_detail: "$items_detail",
        },
      },
    ]);

    if (sac_so_detail.length) {
      return res.send({ status_code: 200, data: sac_so_detail });
    } else {
      return res.status(400).send({
        status_code: 400,
        status_message: "sac sales order not available",
      });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      status_message:
        error.message || "Some error occurred while retrieving sac sales order",
    });
  }
};
