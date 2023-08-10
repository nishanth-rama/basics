const db = require("../../models");
const so_allocation_detail_table = db.soAllocation;

exports.getSalesOrderDetail = async (req, res) => {
  try {
    // console.log("workk");
    const { sales_order_no } = req.query;
    if (!sales_order_no) {
      return res
        .status(400)
        .send({ status_code: "400", message: "Missing parameter." });
    }

    const salesItems = await so_allocation_detail_table
      .find({
        sales_order_no,
      })
      .select(
        "route_id entry_time sales_order_no item_no material_name material_no allocated_qty so_qty delivery_date plant_id customer_code customer_name sales_document_type uom sales_order_no order_qty plant_id allocated_qty pending_qty lotting_loss"
      )
      .sort({ item_no: 1 })
      .lean();

    if (salesItems.length) {
      msgg = "Sales items available";
    } else {
      msgg = "Sales items not available";
    }

    return res.send({ success: true, message: msgg, data: salesItems });
  } catch (error) {
    return res.status(500).send({
      message:
        error.message ||
        "Some error occurred while retrieving sales orders details",
    });
  }
};

// allocation mode

exports.getAllocationMode = async (req, res) => {
  try {
    const { company_code, plant_id, from_date, to_date } = req.query;

    if (!(company_code && plant_id && from_date && to_date)) {
      return res
        .status(400)
        .send({ status_code: "400", message: "Missing parameter." });
    }

    const allocation_mode = await so_allocation_detail_table.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          create_count: { $ne: 0 },
          delivery_date: { $gte: from_date, $lte: to_date },
        },
      },
      {
        $unwind: "$allocation_detail",
      },
      {
        $project: {
          "allocation_detail.mode": 1,
          "allocation_detail.data_scanner": 1,
        },
      },

      { $group: { _id: "$allocation_detail.mode" } },
      {
        $match: {
          _id: { $ne: null },
        },
      },
      {
        $project: {
          allocation_mode: "$_id",
          _id: 0,
        },
      },
    ]);

    if (allocation_mode.length) {
      msg = "allocation mode list";
    } else {
      msg = "allocation mode is not available";
    }

    return res.send({ status_code: 200, message: msg, data: allocation_mode });
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message ||
        "Some error occurred while retrieving sales orders details",
    });
  }
};

exports.getAllocationReport = async (req, res) => {
  try {
    const { company_code, plant_id, delivery_date, sales_order } = req.query;

    if (!(company_code, plant_id, delivery_date, sales_order)) {
      return res
        .status(400)
        .send({ status_code: "400", message: "Missing parameter." });
    }

    const allocation_report = await so_allocation_detail_table.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          sales_order_no: sales_order,
          // create_count :{$ne:0},
          // delivery_date : { $gte: from_date, $lte: to_date }
        },
      },
      {
        $unwind: "$allocation_detail",
      },
      {
        $match: { "allocation_detail.mode": "ptl" },
      },
      {
        $project: {
          sales_order_no: 1,
          material_no: 1,
          material_name: 1,
          order_qty: 1,
          allocated_qty: 1,
          net_weight: "$allocation_detail.net_weight",
          gross_weight: "$allocation_detail.gross_weight",
          crate_barcode: "$allocation_detail.crate_barcode",
          location_id: "$allocation_detail.location",
          // "allocation_detail.net_weight":1,
          // "allocation_detail.gross_weight":1,
          // "allocation_detail.allocation_detail":1
        },
      },
    ]);

    if (allocation_report.length) {
      msg = "allocation report";
    } else {
      msg = "allocation mode is not available";
    }

    return res.send({
      status_code: 200,
      message: msg,
      data: allocation_report,
    });
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message ||
        "Some error occurred while retrieving sales orders details",
    });
  }
};

exports.list_so_allocated_ptl = async (req, res) => {
  try {
    const { company_code, plant_id, delivery_date } = req.query;

    if (!(company_code, plant_id, delivery_date)) {
      return res
        .status(400)
        .send({ status_code: "400", message: "Missing parameter." });
    }

    const list_so_allocated_ptl = await so_allocation_detail_table.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
        },
      },
      {
        $unwind: "$allocation_detail",
      },
      {
        $match: { "allocation_detail.mode": "ptl" },
      },
      {
        $group: { _id: "$sales_order_no" },
      },
      {
        $project: {
          _id: 0,
          sales_order_no: "$_id",
        },
      },
    ]);

    if (list_so_allocated_ptl.length) {
      msg = "sales order no are available";
    } else {
      msg = "sales order no is not available";
    }

    return res.send({
      status_code: 200,
      message: msg,
      data: list_so_allocated_ptl,
    });
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message ||
        "Some error occurred while retrieving sales orders details",
    });
  }
};
