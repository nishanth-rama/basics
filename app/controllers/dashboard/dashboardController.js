const req = require("express/lib/request");
const res = require("express/lib/response");
const { date } = require("joi");
const { find, result } = require("lodash");
const db = require("../../models");
const moment = require("moment");

const purchase_order_table = db.purchaseOrder;
const sales_order_table = db.salesOrder;
const invoice_order_sto_table = db.invoiceSto;
const invoice_masters_table = db.invoicemasters;
const grns_table = db.grn;

const inwardProcess = db.inwardProcess;
const rack = db.racks;
const primaryStorage = db.primary_storage;
const secondaryStorage = db.secondary_storage;
const rackType = db.rack_type;
const jobScheduler = db.JobScheduler;
const palletization = db.palletization;
const weightTolerence = db.product_weight_model;
const so_allocation_table = db.soAllocation;

async function so_quantity_sum(delivery_date, plant_id, company_code) {
  console.log("so_quantity_sum v2", delivery_date, plant_id, company_code);
  var itemsQuantity = 0;
  await so_allocation_table
    .aggregate([
      {
        $match: {
          delivery_date: delivery_date,
          plant_id: plant_id,
          company_code:company_code
        },
      },
      {
        $project: {
          _id: 0,
          order_qty: 1,
        },
      },
      { $group: { _id: "$_id", so_quantity_sum: { $sum: "$order_qty" } } },
    ])
    .then((result) => {
      console.log("result",result);
      result.forEach((items) => {
        itemsQuantity += items.so_quantity_sum;
      });
      // result.forEach(salesOrder=>{
      //     salesOrder.items.forEach(items=>{
      //         // console.log("qty", items.qty,items._id);
      //         if(items.qty)
      //         itemsQuantity+=items.qty;
      //     })
      // })
    })
    .catch((err) => {
      return err;
    });

  return itemsQuantity;
}

async function po_quantity_sum(
  delivery_date,
  po_document_type,
  plant_id,
  company_code
) {
  console.log(
    "po_quantity_sum",
    delivery_date,
    po_document_type,
    plant_id,
    company_code
  );
  var poCount = 0;

  let condition = {};
  condition.delivery_date = delivery_date;
  if (po_document_type == "all") {
    condition.po_document_type = { $nin: ["ZWST", "ZWSI"] };
  } else {
    condition.po_document_type = { $in: po_document_type };
  }
  condition.supplying_plant = plant_id;
  condition.company_code = company_code;

  await purchase_order_table
    .aggregate([
      {
        $match: condition,
      },
      {
        $project: {
          "item.quantity": 1,
        },
      },
    ])
    .then((result) => {
      // console.log(result);
      result.forEach((element) => {
        element.item.forEach((element) => {
          poCount = poCount + parseInt(element.quantity);
        });
      });
    })
    .catch((err) => {
      return err;
    });

  return poCount;
}

async function so_allocated_quantity(delivery_date, plant_id, company_code) {
  console.log("so_allocated_quantity", delivery_date, plant_id, company_code);
  var so_allocated_quantity = 0;

  let condition = {};
  condition.delivery_date = delivery_date;
  condition.plant_id = plant_id;
  condition.company_code = company_code;

  await so_allocation_table
    .aggregate([
      {
        $match: condition,
      },
      {
        $project: {
          allocated_qty: 1,
        },
      },
    ])
    .then((result) => {
      // console.log(result);
      result.forEach((element) => {
        so_allocated_quantity += parseInt(element.allocated_qty);
      });
    })
    .catch((err) => {
      return err;
    });

  return so_allocated_quantity;
}

async function total_po_item_quanities(
  delivery_date,
  plant_id,
  company_code,
  document_type
) {
  console.log(
    "total_po_item_quanities",
    delivery_date,
    plant_id,
    company_code,
    document_type
  );
  var total_po_item_quanities = 0;

  let condition = {};
  condition.delivery_date = delivery_date;
  condition.supplying_plant = plant_id;
  condition.company_code = company_code;
  if (document_type != "all") {
    condition.po_document_type = { $in: document_type.split(",") };
  }
  // console.log("condition",condition);

  await purchase_order_table
    .aggregate([
      {
        $match: condition,
      },
      {
        $project: {
          "item.quantity": 1,
        },
      },
    ])
    .then((result) => {
      // console.log(result);
      result.forEach((element) => {
        element.item.forEach((element) => {
          total_po_item_quanities =
            total_po_item_quanities + parseInt(element.quantity);
        });
      });
    })
    .catch((err) => {
      return err;
    });

  return total_po_item_quanities;
}

async function invoice_sto_quantity_sum(delivery_date, plant_id, company_code) {
  console.log(
    "invoice_sto_quantity_sum",
    delivery_date,
    plant_id,
    company_code
  );
  var invoice_sto_quantity = 0;
  await db.sapStoInvoice
    .aggregate([
      {
        $match: {
          "invoiceDetails.company_code": +company_code,
          plant_id: plant_id,
          "invoiceDetails.invoiceDate": delivery_date,
        },
      },
      {
        $project: {
          itemSupplied: 1,
        },
      },
    ])
    .then((result) => {
      result.forEach((invoice_sto) => {
        invoice_sto.itemSupplied.forEach((item) => {
          invoice_sto_quantity += parseInt(item.quantity);
        });
      });
    })
    .catch((err) => {
      return err;
    });
  return invoice_sto_quantity;
}

async function invoice_quantity_sum(
  delivery_date,
  end_delivery_date,
  plant_id,
  company_code
) {
  console.log(
    "invoice_quantity_sum",
    delivery_date,
    plant_id,
    company_code,
    end_delivery_date
  );
  var invoice_quantity = 0;
  await invoice_masters_table
    .aggregate([
      {
        $match: {
          invoiceDate: {
            $gte: new Date(
              moment(delivery_date).tz("Asia/Kolkata").format("YYYY-MM-DD") +
                "T00:00:00.000+05:30"
            ),
            $lte: new Date(
              moment(delivery_date).tz("Asia/Kolkata").format("YYYY-MM-DD") +
                "T23:59:59.999+05:30"
            ),
          },
          "invoiceDetails.deliveryFrom": plant_id,
          "invoiceDetails.company_code": parseInt(company_code),
        },
      },
      {
        $project: {
          so_deliveryDate: 1,
          itemSupplied: 1,
        },
      },
    ])
    .then((result) => {
      // console.log("result",result);
      result.forEach((invoice_master) => {
        invoice_master.itemSupplied.forEach((item) => {
          invoice_quantity += parseInt(item.quantity);
        });
      });
    })
    .catch((err) => {
      return err;
    });
  return invoice_quantity;
}

async function grns_quantity_sum(delivery_date, plant_id, company_code) {
  console.log("grns_quantity_sum", plant_id, company_code);
  var grns_quantity = 0;

  await inwardProcess.aggregate([{$match : {
    delivery_date:delivery_date,
    company_code: company_code,
    plant_id: plant_id
  }}, {$unwind: "$inward_crate_details"}, {$match: {"inward_crate_details.grn_status": "success"}}])

  // await db.grnItems.aggregate([{
  //   $match :{
  //     date_of_manufacture:delivery_date,
  //     plant : plant_id
  //   }
  // }])

    // await grns_table
    //   .aggregate([
    //     {
    //       $match: {
    //         document_date: delivery_date,
    //       },
    //     },
    //     {
    //       $lookup: {
    //         from: "rapid_grn_items",
    //         localField: "id",
    //         foreignField: "grn_id",
    //         as: "grn_items",
    //       },
    //     },
    //     {
    //       $match: {
    //         "grn_items.plant": plant_id,
    //       },
    //     },
    //   ])
    .then((data) => {
      data.forEach((grn) => {
        grns_quantity += parseInt(grn.inward_crate_details.inwarded_qty);
        // grn.grn_items.forEach((grn_items) => {
        //   grns_quantity += parseInt(grn_items.quantity);
        // });
      });
    });
  return grns_quantity;
}

async function total_po_count(
  delivery_date,
  plant_id,
  company_code,
  document_type
) {
  let condition = {};
  condition.delivery_date = delivery_date;
  condition.supplying_plant = plant_id;
  condition.company_code = company_code;
  if (document_type != "all") {
    condition.po_document_type = { $in: document_type.split(",") };
  }
  // console.log("condition",condition);

  let total_po_number = await purchase_order_table.aggregate([
    { $match: condition },
    { $group: { _id: "$po_number" } },
  ]);
  // console.log("total_po_count",total_po_number);
  console.log("total_po_count", total_po_number.length);
  return total_po_number.length;
}

async function total_po_quantity(
  delivery_date,
  po_document_type,
  plant_id,
  company_code
) {
  let total_po_number = await purchase_order_table.aggregate([
    {
      $match: {
        delivery_date: delivery_date,
        po_document_type: { $in: po_document_type },
        supplying_plant: plant_id,
        company_code: company_code,
      },
    },
    { $group: { _id: "$po_number" } },
  ]);
  // console.log("total_po_quantity",total_po_number);
  console.log("total_po_quantity", total_po_number.length);
  return total_po_number.length;
}

async function total_vendor(
  delivery_date,
  plant_id,
  company_code,
  document_type
) {
  let condition = {};
  condition.delivery_date = delivery_date;
  condition.supplying_plant = plant_id;
  condition.company_code = company_code;
  if (document_type != "all") {
    condition.po_document_type = { $in: document_type.split(",") };
  }
  // console.log("condition",condition);
  let total_vendor = await purchase_order_table.aggregate([
    { $match: condition },
    { $group: { _id: "$vendor_no" } },
  ]);
  // console.log("total_vendor",total_vendor);
  console.log("total_vendor", total_vendor.length);
  return total_vendor.length;
}

async function total_inward_qty(
  delivery_date,
  plant_id,
  company_code,
  document_type
) {
  console.log("delivery - ", delivery_date);
  let total_inward_qty = 0;
  let condition = {};
  condition.delivery_date = delivery_date;
  condition.plant_id = plant_id;
  condition.company_code = company_code;
  //   if (document_type != "all") {
  //     condition.po_document_type = { $in: document_type.split(",") };
  //   }

  //   await purchase_order_table
  //     .aggregate([
  //       { $match: condition },
  //       {
  //         $lookup: {
  //           from: "rapid_purchase_order_inward_details",
  //           localField: "po_number",
  //           foreignField: "po_no",
  //           as: "inward_details",
  //         },
  //       },
  //       { $project: { po_number: 1, inward_details: 1, _id: 0 } },
  //     ])

  await db.inwardProcess
    .aggregate([
      { $match: condition },
      {
        $project: {
          _id: 0,
          uom:1,
          total_crates:1,
          total_net_qty: 1,
        },
      },
    ])
    .then((result) => {
      result.forEach((po_details) => {
        if(po_details.uom == "PAC")
        {
          total_inward_qty += po_details.total_crates;  
        }
        else
          total_inward_qty += po_details.total_net_qty;
      });
    });
  console.log("total_inward_qty", total_inward_qty);
  // console.log("total_inward_qty",total_inward_qty.length);
  return total_inward_qty;
}

exports.getQuantitySum = async (req, res) => {
  console.log("getQuantitySum");

  let quantitySum = {};
  const po_document_type = ["ZFPO", "ZNFV"];
  const po_sto_document_type = ["ZWST", "ZWSI"];

  if (!(req.query.delivery_date && req.query.plant_id)) {
    return res.status(400).send({ message: "Missing parameter." });
  }

  const start_delivery_date = new Date(req.query.delivery_date);
  const end_delivery_date = start_delivery_date.setHours(
    start_delivery_date.getHours() + 24
  );
  // let result = null;
  try {
    // result = await Promise.all([
    //     po_quantity_sum(req.query.delivery_date,po_document_type),
    //     po_quantity_sum(req.query.delivery_date,po_sto_document_type),
    //     so_quantity_sum(req.query.delivery_date,end_delivery_date),
    //     invoice_sto_quantity_sum(req.query.delivery_date),
    //     invoice_quantity_sum(req.query.delivery_date,end_delivery_date)
    // ]);
    console.log("po_quantity_sum query started", new Date());
    quantitySum.po_quantity_sum = await po_quantity_sum(
      req.query.delivery_date,
      po_document_type,
      req.query.plant_id
    );
    console.log("po_sto_quantity_sum query started", new Date());
    quantitySum.po_sto_quantity_sum = await po_quantity_sum(
      req.query.delivery_date,
      po_sto_document_type,
      req.query.plant_id
    );
    console.log("so_quantity_sum query started", new Date());
    quantitySum.so_quantity_sum = await so_quantity_sum(
      req.query.delivery_date,
      end_delivery_date,
      req.query.plant_id
    );
    console.log("invoice_sto_quantity_sum query started", new Date());
    quantitySum.invoice_sto_quantity_sum = await invoice_sto_quantity_sum(
      req.query.delivery_date,
      req.query.plant_id
    );
    console.log("invoice_quantity_sum query started", new Date());
    quantitySum.invoice_quantity_sum = await invoice_quantity_sum(
      req.query.delivery_date,
      end_delivery_date,
      req.query.plant_id
    );
    console.log("All query ended", new Date(), quantitySum);
    res.status(200).send({ data: quantitySum });
  } catch (err) {
    return res.status(500).send({
      message: err.message || "Some error occurred while retrieving data",
    });
  }
};

exports.getPurchaseOrderCount = async (req, res) => {
  console.log("getPurchaseOrderCount api been called");
  const po_document_type = ["ZFPO", "ZNFV"];
  var { delivery_date } = req.query;
  if (!delivery_date) {
    let date = new Date();
    delivery_date = date.toISOString().split("T")[0];
  }

  console.log(po_document_type, delivery_date);
  console.log(new date());
  await purchase_order_table
    .aggregate([
      {
        $match: {
          delivery_date: delivery_date,
          po_document_type: { $in: po_document_type },
        },
      },
      {
        $project: {
          "item.quantity": 1,
        },
      },
    ])
    .then((result) => {
      let poCount = 0;
      result.forEach((element) => {
        element.item.forEach((element) => {
          console.log("po quantity", element);
          poCount = poCount + parseInt(element.quantity);
        });
      });

      console.log(new date());

      res.status(200).send({ data: poCount });
    })
    .catch((err) => {
      return res.status(500).send({
        message:
          err.message ||
          "Some error occurred while retrieving Purchase Order Table",
      });
    });
};

exports.getStoPoCount = async (req, res) => {
  console.log("getStoPo api been called");
  const po_document_type = ["ZWST", "ZWSI"];
  var { delivery_date } = req.query;
  if (!delivery_date) {
    let date = new Date();
    delivery_date = date.toISOString().split("T")[0];
  }
  console.log(po_document_type, delivery_date);
  await purchase_order_table
    .aggregate([
      {
        $match: {
          delivery_date: delivery_date,
          po_document_type: { $in: po_document_type },
        },
      },
      {
        $project: {
          "item.quantity": 1,
        },
      },
    ])
    .then((result) => {
      let poCount = 0;
      result.forEach((element) => {
        element.item.forEach((element) => {
          console.log("po quantity", element);
          poCount = poCount + parseInt(element.quantity);
        });
      });
      res.status(200).send({ data: poCount });
    })
    .catch((err) => {
      return res.status(500).send({
        message:
          err.message ||
          "Some error occurred while retrieving Purchase Order Table",
      });
    });
};

exports.getSalesOrderCount = async (req, res) => {
  console.log("getSalesOrderCount api been called");
  var end_delivery_date;
  if (!req.query.delivery_date) {
    return res.status(400).send({ message: "Missing parameter." });
  }
  const start_delivery_date = new Date(req.query.delivery_date);
  end_delivery_date = start_delivery_date.setHours(
    start_delivery_date.getHours() + 24
  );

  await sales_order_table
    .aggregate([
      {
        $match: {
          $and: [
            { dateOfDelivery: { $gte: new Date(req.query.delivery_date) } },
            { dateOfDelivery: { $lt: new Date(end_delivery_date) } },
          ],
        },
      },
      {
        $project: {
          items: 1,
        },
      },
    ])
    .then((result) => {
      let itemsQuantity = 0;
      result.forEach((salesOrder) => {
        salesOrder.items.forEach((items) => {
          // console.log("qty", items.qty,items._id);
          if (items.qty) itemsQuantity += items.qty;
        });
      });
      res.status(200).send({ data: itemsQuantity });
    })
    .catch((err) => {
      return res.status(500).send({
        message:
          err.message ||
          "Some error occurred while retrieving SAles Order Table",
      });
    });
};

exports.getInvoiceStoCount = async (req, res) => {
  console.log("getInvoiceStoCount method called");
  if (!req.query.billing_date) {
    return res.status(400).send({ message: "Missing parameter." });
  }

  await invoice_order_sto_table
    .aggregate([
      {
        $match: {
          billing_date: req.query.billing_date,
        },
      },
      {
        $project: {
          item: 1,
        },
      },
    ])
    .then((result) => {
      let invoice_sto_quantity = 0;
      result.forEach((invoice_sto) => {
        invoice_sto.item.forEach((item) => {
          invoice_sto_quantity += parseInt(item.qty);
        });
      });
      res.status(200).send({ data: invoice_sto_quantity });
    })
    .catch((err) => {
      return res.status(500).send({
        message:
          err.message ||
          "Some error occurred while retrieving Invoice Sto Table",
      });
    });
};

exports.getInvoiceCount = async (req, res) => {
  console.log("getInvoiceCount method called");
  if (!req.query.so_delivery_date) {
    return res.status(400).send({ message: "Missing parameter." });
  }
  var end_so_delivery_date;
  const start_so_delivery_date = new Date(req.query.so_delivery_date);
  end_so_delivery_date = start_so_delivery_date.setHours(
    start_so_delivery_date.getHours() + 24
  );
  console.log(
    new Date(req.query.so_delivery_date),
    "====>",
    new Date(end_so_delivery_date)
  );
  await invoice_masters_table
    .aggregate([
      {
        $match: {
          $and: [
            { so_deliveryDate: { $gte: new Date(req.query.so_delivery_date) } },
            { so_deliveryDate: { $lt: new Date(end_so_delivery_date) } },
          ],
        },
      },
      {
        $project: {
          so_deliveryDate: 1,
          itemSupplied: 1,
        },
      },
    ])
    .then((result) => {
      let invoice_quantity = 0;
      result.forEach((invoice_master) => {
        invoice_master.itemSupplied.forEach((item) => {
          invoice_quantity += parseInt(item.quantity);
        });
      });
      res.status(200).send({ data: invoice_quantity });
    })
    .catch((err) => {
      return res.status(500).send({
        message:
          err.message ||
          "Some error occurred while retrieving Invoice Masters Table",
      });
    });
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

exports.getQuantitySum_v2 = async (req, res) => {
  console.log("getQuantitySum_v2");
  const po_document_type = ["ZFPO", "ZNFV"];
  const po_sto_document_type = ["ZWST", "ZWSI"];

  console.log("req.q", req.query);
  console.log(
    "pr",
    req.query.delivery_date,
    req.query.plant_id,
    req.query.company_code,
    req.query.document_type
  );

  if (
    !(req.query.delivery_date && req.query.plant_id && req.query.company_code)
  ) {
    return res.status(400).send({ message: "Missing parameter." });
  }

  const start_delivery_date = new Date(req.query.delivery_date);
  const end_delivery_date = start_delivery_date.setHours(
    start_delivery_date.getHours() + 24
  );
  // let result = null;
  try {
    let result = await Promise.all([
      // added the quantity of purchaseorders collection for the given delivery_date, po_document_type['ZFPO', 'ZNFV'], supplying_plant, company_code
      po_quantity_sum(
        req.query.delivery_date,
        req.query.document_type,
        req.query.plant_id,
        req.query.company_code
      ),
      // added the quantity of purchaseorders collection for the given delivery_date, po_document_type['ZWST', 'ZWSI'], supplying_plant, company_code
      po_quantity_sum(
        req.query.delivery_date,
        po_sto_document_type,
        req.query.plant_id,
        req.query.company_code
      ),
      // added the quantity of salesorders collection for the given delivery_date, plant
      so_quantity_sum(
        req.query.delivery_date,
        req.query.plant_id,
        req.query.company_code
      ),
      // added the quantity of invoice_sto_get collection for the given billing_date, plant, company_code
      invoice_sto_quantity_sum(
        req.query.delivery_date,
        req.query.plant_id,
        req.query.company_code
      ),
      // added the quantity of invoicemasters collection for the given so_deliveryDate, itemSupplied.plant, invoiceDetails.company_code
      invoice_quantity_sum(
        req.query.delivery_date,
        end_delivery_date,
        req.query.plant_id,
        req.query.company_code
      ),
      // added the quantity of rapid_grns & rapid_grn_items collection for the given document_date, grn_items.plant
      grns_quantity_sum(
        req.query.delivery_date,
        req.query.plant_id,
        req.query.company_code
      ),
      // using purchaseorders collection to get total number of po_number for the given delivery_date, supplying_plant, company_code
      total_po_count(
        req.query.delivery_date,
        req.query.plant_id,
        req.query.company_code,
        req.query.document_type
      ),
      // using purchaseorders collection to get total number of po_number for the given delivery_date, po_document_type['ZFPO', 'ZNFV'], supplying_plant, company_code
      total_po_quantity(
        req.query.delivery_date,
        po_document_type,
        req.query.plant_id,
        req.query.company_code
      ),
      // using purchaseorders collection to get total number of vendor_no for the given delivery_date, supplying_plant, company_code
      total_vendor(
        req.query.delivery_date,
        req.query.plant_id,
        req.query.company_code,
        req.query.document_type
      ),
      // using purchaseorders and  rapid_purchase_order_inward_details collection to get sum of total_inwarded_qty for the given delivery_date, supplying_plant, company_code
      total_inward_qty(
        req.query.delivery_date,
        req.query.plant_id,
        req.query.company_code,
        req.query.document_type
      ),
      // added the quantity of purchaseorders collection for the given delivery_date, supplying_plant, company_code
      total_po_item_quanities(
        req.query.delivery_date,
        req.query.plant_id,
        req.query.company_code,
        req.query.document_type
      ),

      so_allocated_quantity(
        req.query.delivery_date,
        req.query.plant_id,
        req.query.company_code
      ),
    ]);

    return res.status(200).send({
      status_code: "200",
      data: {
        po_quantity_sum: result[0],
        po_sto_quantity_sum: result[1],
        so_quantity_sum: result[2],
        invoice_sto_quantity_sum: result[3],
        invoice_quantity_sum: result[4],
        grns_quantity_sum: result[5],
        total_po_count: result[6],
        total_po_quantity: result[7],
        total_vendor: result[8],
        total_inward_qty: result[9],
        total_po_item_quanities: result[10],
        allocated_qty: result[11],
      },
    });
  } catch (err) {
    return res.status(500).send({
      status_code: "500",
      message: err.message || "Some error occurred while retrieving data",
    });
  }
};

exports.getPoDocumentType = async (req, res) => {
  if (
    !(req.query.delivery_date && req.query.plant_id && req.query.company_code)
  ) {
    return res.status(400).send({ message: "Missing parameter." });
  }

  let delivery_date = req.query.delivery_date;
  let plant_id = req.query.plant_id;
  let company_code = req.query.company_code;

  await purchase_order_table
    .aggregate([
      {
        $match: {
          delivery_date: delivery_date,
          supplying_plant: plant_id,
          company_code: company_code,
        },
      },
      {
        $group: { _id: "$po_document_type" },
      },
    ])
    .then((data) => {
      return res.status(200).send({ status_code: "200", data: data });
    })
    .catch((err) => {
      return res.status(500).send({
        status_code: "500",
        message: err.message || "Some error occurred while retrieving data",
      });
    });
};

///////////////////////////////////////////////////////////////////////////////////////////////////////

const primarySkusCount = async (company_code, plant_id) => {
  const getPrimarySkus = await primaryStorage.find(
    { company_code: company_code, plant_id: plant_id },
    { material_code: 1 }
  );

  const priUniqueSkus = [
    ...new Map(getPrimarySkus.map((sku) => [sku.material_code, sku])).values(),
  ];

  return priUniqueSkus.length;
};

const secondarySkusCount = async (company_code, plant_id) => {
  const getSecondarySkus = await secondaryStorage.find(
    { company_code: company_code, plant_id: plant_id, rack_type: "secondary" },
    { material_code: 1 }
  );

  const secUniqueSkus = [
    ...new Map(
      getSecondarySkus.map((sku) => [sku.material_code, sku])
    ).values(),
  ];

  return secUniqueSkus.length;
};

const discreteSkusCount = async (company_code, plant_id) => {
  const getDiscreteSkus = await secondaryStorage.find(
    {
      company_code: company_code,
      plant_id: plant_id,
      rack_type: "secondary_discrete",
    },
    { material_code: 1 }
  );

  const disUniqueSkus = [
    ...new Map(getDiscreteSkus.map((sku) => [sku.material_code, sku])).values(),
  ];
  return disUniqueSkus.length;
};

const dispatchSkusCount = (company_code, plant_id) => {
  return 0;
};

const getInwardInfo = async (company_code, plant_id, delivery_date) => {
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
    totalInwardedKgs.length == 0 ? 0 : +totalInwardedKgs[0].total_kg.toFixed(2);

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

        let time_diff = (end_time.getTime() - start_time.getTime()) / 1000 / 60;

        total_time += time_diff;
      }
    });
  }
  const details = [
    "totalInwardedPOs",
    "totalInwardedKgs",
    "totalInwardedSkus",
    "inwardingRate",
  ];
  // return {
  //   totalInwardedPOs: totalInwardedPOs.length,
  //   totalInwardedKgs: totalKgs,
  //   totalInwardedSkus: totalInwardedSkus.length,
  //   inwardingRate:
  //     (totalKgs == 0 ? 0 : (totalKgs / total_time).toFixed(3)) + " kg/min",
  // };

  return {
    details: details,
    detailsValue: [
      totalInwardedPOs.length,
      totalKgs,
      totalInwardedSkus.length,
      +(totalKgs == 0 ? 0 : (totalKgs / total_time).toFixed(2)),
    ],
  };
};

const getRackInfo = async (company_code, plant_id) => {
  let storages = ["primary", "secondary", "secondary_discrete", "dispatch"];

  let availableRacks = [];
  let usedRacks = [];
  let totalRacks = [];

  for (let i = 0; i < storages.length; i++) {
    const getAvailableRacks = await rack.countDocuments({
      company_code: company_code,
      plant_id: plant_id,
      active_status: 1,
      // locked: false, check
      rack_type: storages[i],
      status: "unoccupied",
    });
    availableRacks.push(getAvailableRacks);

    const getUsedRacks = await rack.countDocuments({
      company_code: company_code,
      plant_id: plant_id,
      active_status: 1,
      // locked: false, check
      rack_type: storages[i],
      status: "occupied",
    });
    usedRacks.push(getUsedRacks);

    const getTotalRacks = await rack.countDocuments({
      company_code: company_code,
      plant_id: plant_id,
      active_status: 1,
      rack_type: storages[i],
    });
    totalRacks.push(getTotalRacks);
  }

  const skusCount = await Promise.all([
    primarySkusCount(company_code, plant_id),
    secondarySkusCount(company_code, plant_id),
    discreteSkusCount(company_code, plant_id),
    dispatchSkusCount(company_code, plant_id),
  ]);

  ///////////////////////////////////////////////////////////////////////////////

  // const getRackTypes = await rackType.find(
  //   {
  //     company_code: company_code,
  //     plant_id: plant_id,
  //   },
  //   { _id: 0, rack_type: 1, approximate_capacity: 1 }
  // );

  // const getTypeWiseRacksCount = await rack.aggregate([
  //   { $group: { _id: "$rack_type", totalRacksCount: { $count: {} } } },
  // ]);

  // var totalRacksCapacity = 0;

  // getRackTypes.map((type) => {
  //   getTypeWiseRacksCount.map((count) => {
  //     totalRacksCapacity +=
  //       type.rack_type == count._id
  //         ? type.approximate_capacity * count.totalRacksCount
  //         : 0;
  //   });
  // });
  // // uom kgs....
  // const getPrimaryKgStocks = await primaryStorage.aggregate([
  //   { $match: { company_code: company_code, plant_id: plant_id, uom: "KG" } },
  //   { $group: { _id: "$plant_id", totalStocks: { $sum: "$total_stock" } } },
  // ]);

  // const getSecondaryKgStocks = await secondaryStorage.aggregate([
  //   { $match: { company_code: company_code, plant_id: plant_id, uom: "KG" } },
  //   { $group: { _id: "$plant_id", totalStocks: { $sum: "$total_stock" } } },
  // ]);

  // // uom packs....
  // const getPrimaryPacStocks = await primaryStorage.find(
  //   { company_code: company_code, plant_id: plant_id, uom: "PAC" },
  //   { _id: 0, material_code: 1, total_stock: 1 }
  // );

  // const getSecondaryPacStocks = await secondaryStorage.find(
  //   { company_code: company_code, plant_id: plant_id, uom: "PAC" },
  //   { _id: 0, material_code: 1, total_stock: 1 }
  // );
  // let pacStocksArr = getPrimaryPacStocks.concat(getSecondaryPacStocks);

  // let totalQtyInKgs = 0;

  // for (let i = 0; i < pacStocksArr.length; i++) {
  //   let getInKgs = await weightTolerence.findOne(
  //     {
  //       company_code: company_code,
  //       plant_id: plant_id,
  //       material_code: pacStocksArr[i].material_code,
  //     },
  //     { _id: 0, material_code: 1, qty_in_kg: 1 }
  //   );

  //   if (getInKgs != null) {
  //     console.log("-- ", totalQtyInKgs);
  //     totalQtyInKgs += pacStocksArr[i].total_stock * getInKgs.qty_in_kg;
  //   } else {
  //     return {
  //       totalAvailableRacks: getAvailableRacks,
  //       totalUsedRacks: getUsedRacks,
  //       totalRacks: getTotalRacks,
  //       noOfSkusStacked: uniqueSkus.length,
  //     };
  //   }
  // }
  // console.log(
  //   "3 -",
  //   totalQtyInKgs,
  //   getPrimaryKgStocks[0].totalStocks,
  //   getSecondaryKgStocks[0].totalStocks
  // );

  // totalQtyInKgs +=
  //   getPrimaryKgStocks[0].totalStocks + getSecondaryKgStocks[0].totalStocks;

  // const getDiscreteStocks = await primaryStorage.find(
  //   {
  //     company_code: company_code,
  //     plant_id: plant_id,
  //     rack_type: "secondary_dsicrete",
  //   },
  //   { _id: 0, total_stock: 1, uom: 1 }
  // );
  // console.log(totalQtyInKgs, totalRacksCapacity);
  ///////////////////////////////////////////////////////

  return {
    storageOrder: storages,
    totalAvailableRacks: availableRacks,
    totalUsedRacks: usedRacks,
    totalRacks: totalRacks,
    noOfSkusStacked: skusCount,
    // currentCapacityUtilization: totalQtyInKgs / totalRacksCapacity,
  };
};

const getMMInfo = async (company_code, plant_id, date) => {
  const noOfJobsAllocated = await jobScheduler.countDocuments({
    company_code: company_code,
    plant_id: plant_id,
    job_scheduled_on: date,
  });

  const start_date = new Date(date);
  const end_date = start_date.setHours(start_date.getHours() + 24);

  const materialMovedInKgs = await palletization.aggregate([
    {
      $match: {
        company_code: company_code,
        plant_id: plant_id,
        $and: [
          {
            updatedAt: {
              $gte: new Date(date),
            },
          },
          {
            updatedAt: {
              $lt: new Date(end_date),
            },
          },
        ],
      },
    },
    {
      $project: {
        company_code: 1,
        plant_id: 1,
        "carrier_detail.net_weight": 1,
      },
    },
    { $unwind: "$carrier_detail" },
    {
      $group: {
        _id: "$plant_id",
        totalInKg: { $sum: "$carrier_detail.net_weight" },
      },
    },
  ]);
  const details = ["noOfJobsAllocated", "totalMaterialMovedInKg"];
  // return {
  //   noOfJobsAllocated: noOfJobsAllocated,
  //   totalMaterialMovedInKg:
  //     materialMovedInKgs.length == 0 ? 0 : materialMovedInKgs[0].totalInKg,
  // };

  return {
    details: details,
    detailsValue: [
      noOfJobsAllocated,
      materialMovedInKgs.length == 0
        ? 0
        : +materialMovedInKgs[0].totalInKg.toFixed(2),
    ],
  };
};

exports.getDashboardInfo = async (req, res) => {
  console.log("Calling get dashboard details api");

  const { company_code, plant_id, date } = req.query;

  try {
    if (!(company_code && plant_id && date))
      return res.status(400).send({
        status_code: 400,
        message: "Please send all required parameters!",
      });

    const data = await Promise.all([
      getInwardInfo(company_code, plant_id, date),
      getRackInfo(company_code, plant_id),
      getMMInfo(company_code, plant_id, date),
    ]);

    return res.send({
      status_code: 200,
      message: "Dashboard details",
      data: {
        inwardDetails: data[0],
        rackDetails: data[1],
        materialMovementInfo: data[2],
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

// getRackGraphData
exports.getRackGraphData = async (req, res) => {
  console.log("calling api to get rack graph information");
  const { company_code, plant_id } = req.query;
  try {
    if (!(company_code && plant_id))
      return res.status(400).send({
        status_code: 400,
        message: "Provide company code and plant id to proceed!",
      });

    let getRackGraphData = await getRackInfo(company_code, plant_id);

    delete getRackGraphData.noOfSkusStacked;

    // storageOrder: storages,
    // totalAvailableRacks: availableRacks,
    // totalUsedRacks: usedRacks,
    // totalRacks: totalRacks,
    // noOfSkusStacked: skusCount,

    res.send({
      status_code: 200,
      message: "Racks graph information",
      data: getRackGraphData,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting rack graph data!",
    });
  }
};
