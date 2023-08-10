const { date } = require("joi");
const { find, result } = require("lodash");
const db = require("../../models");
const axios = require("axios").default;
const purchase_order_table = db.purchaseOrder;
const sales_order_table = db.salesOrder;
const invoice_order_sto_table = db.invoiceSto;
const invoice_masters_table = db.invoicemasters;
const grns_table = db.grn;
const moment_tz = require("moment-timezone");
const inwardProcess = db.inwardProcess;
const rack = db.racks;
const primaryStorage = db.primary_storage;
const secondaryStorage = db.secondary_storage;
const rackType = db.rack_type;
const jobScheduler = db.JobScheduler;
const palletization = db.palletization;
const weightTolerence = db.product_weight_model;
const reportEmail = db.reportEmail;
const Joi = require("joi");
// const index_file = require("./report.html")
var path = require("path");
var plant_db = db.plants;
const smtpDetails = db.smtpDetails;
const dashboard_controller = require("./dashboardController.js");
const sendReport = require("../../utils/sendReport");

const fe_base_url = process.env.FE_BASE_URL;

const api_base_url = process.env.BASE_URL;

// dashboard report

exports.get_plant_detail = async (req, res) => {
  try {
    if (!(req.query.company_code && req.query.plant_id)) {
      return res.send({
        status_code: 400,
        message: "please provide company code and plant id",
      });
    }

    const plant_detail = await db.plants.findOne({
      company_code: req.query.company_code,
      plant_id: req.query.plant_id,
    });

    if (!plant_detail) {
      return res.send({
        status_code: 400,
        message: "plant detail not available",
      });
    }

    return res.send({ status_code: 200, data: plant_detail });
  } catch (err) {
    return res.send({ status_code: 500, message: error.message });
  }
};

exports.send_dashboard_report = async (parameters) => {
  // console.log("check", req.params.company_code, req.params.plant_id);
  // Validate request
  // if (!req.body.email) {
  //   return res.status(200).send({ message: "please provide email address" });
  // }

  const {company_code, plant_id } = parameters;


  try {
    function getPreviousDay(date = new Date()) {
      const previous = new Date(date.getTime());
      previous.setDate(date.getDate() - 1);

      return previous;
    }

    const today_date = moment_tz(getPreviousDay(new Date()))
      .tz("Asia/Kolkata")
      .format("DD-MM-YYYY");

    const require_date = moment_tz(getPreviousDay(new Date()))
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD");

    // get all email of given plant id

    // console.log("today_date,require_date", today_date, require_date);

    let plant_detail = await plant_db.findOne({
      plant_id: plant_id,
    });

    if (!plant_detail) {
      return "plant id not available in plant master"
      return res
        .status(400)
        .send({ message: "plant id not available in plant master" });
    }

    const email_list = await reportEmail.findOne({
      plant_id: plant_id,
    });

    if (!email_list) {
      return "email list not available"
      return res.status(400).send({ message: "email list not available" });
    }

    // smtp detail

    let smtp_detail = await smtpDetails.findOne({
      company_code: "1000",
    });

    if (!smtp_detail) {
      return "smtp detail not available"
      return res
        .status(400)
        .send({ message: "smtp detail not available" });
    }

    // console.log("smtp_detail.password", smtp_detail);

    // const decryptedString = cryptr.decrypt(smtp_detail.password);
    // console.log("decryptedString", decryptedString);

    let email_list_array = email_list.email_adddress;

    // let mail_data = await dashboard_controller.getQuantitySum_v2(reqq);

    // console.log("mail_data",mail_data)

    let url_1 = `${api_base_url}api/dashboard/v2/get_quantity_sum?delivery_date=${require_date}&plant_id=${
      plant_id
    }&company_code=${company_code}&document_type=${"all"}`;

    // let url_1 = `https://uat-api-rapid.censanext.com/api/dashboard/v2/get_quantity_sum?delivery_date=${require_date}&plant_id=${
    //   req.params.plant_id
    // }&company_code=${req.params.company_code}&document_type=${"all"}`;
    

    let dashboard_data = await axios.get(url_1);
    

    if (!dashboard_data.data && dashboard_data.data.status != 200) {
      return "dashboard data is not available"
      return res
        .status(400)
        .send({ message: "dashboard data is not available" });
    }

    // console.log("dashboard_data", dashboard_data.data.data);
    // console.log("asds", dashboard_data.data);

    // const schema = Joi.object({ email: Joi.string().email().required() });
    // // console.log("mithasagum",schema)
    // const { error } = schema.validate(email_list_array);
    // if (error)
    //   return res.status(400).send({ message: error.details[0].message });
    // const sap_url = process.env.SAP_URL;
    // console.log("process", process.env.FE_BASE_URL);
    let param_data = {
      today_date: today_date,
      company_code: company_code,
      plant_id: plant_id,
      plant_name: plant_detail.plant_name,
    };

    

    // const link = `https://uat-rapid.censanext.com/dashboard_report/${req.params.company_code}/${req.params.plant_id}`;

    const link = `${fe_base_url}/dashboard_report/${company_code}/${plant_id}`;
    //  const link = `https://uat-rapid.censanext.com/dashboard_report`;
    // console.log(link);
    const sent_val = await sendReport(
      email_list_array,
      `RAPID | Mother Dc | Daily Report | ${today_date}`,
      link,
      dashboard_data.data.data,
      smtp_detail,
      param_data
    );
    // if(send_val){
    //   return res.send({message:"Dashboard report link sent to your email account"});
    // }
    // console.log("sent_val",sent_val)
    if (sent_val == "success") {
      return "Dashboard report link sent to your email account"
      return res
        .status(200)
        .send({ message: "Dashboard report link sent to your email account" });
    } else {
      return sent_val
      return res.status(400).send({ message: sent_val });
    }

    // return res.send("password reset link sent to your email account");
  } catch (error) {
    // console.log("err1", error);
    return error.message || "error while sending report"
    
    return res.send({ message: error.message });
  }
};

async function so_quantity_sum(delivery_date, plant_id, company_code) {
  var itemsQuantity = 0;
  await sales_order_table
    .aggregate([
      {
        $match: {
          delivery_date: delivery_date,
          plant: plant_id,
        },
      },
      {
        $project: {
          _id: 0,
          items: 1,
        },
      },
      { $unwind: "$items" },
      { $group: { _id: "$_id", so_quantity_sum: { $sum: "$items.qty" } } },
    ])
    .then((result) => {
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

  // console.log("po_quantity_sum",poCount)
  return poCount;
}

async function total_po_item_quanities(
  delivery_date,
  plant_id,
  company_code,
  document_type
) {
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
  var invoice_sto_quantity = 0;
  await invoice_order_sto_table
    .aggregate([
      {
        $match: {
          billing_date: delivery_date,
          plant: plant_id,
          company_code: company_code,
        },
      },
      {
        $project: {
          item: 1,
        },
      },
    ])
    .then((result) => {
      result.forEach((invoice_sto) => {
        invoice_sto.item.forEach((item) => {
          invoice_sto_quantity += parseInt(item.qty);
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
  // console.log("as",new Date(delivery_date),new Date(end_delivery_date))

  var invoice_quantity = 0;
  await invoice_masters_table
    .aggregate([
      {
        $match: {
          $and: [
            { so_deliveryDate: { $gte: new Date(delivery_date) } },
            { so_deliveryDate: { $lt: new Date(end_delivery_date) } },
            { "itemSupplied.plant": plant_id },
            { "invoiceDetails.company_code": company_code },
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
  var grns_quantity = 0;

  // await db.grnItems
  //   .aggregate([
  //     {
  //       $match: {
  //         date_of_manufacture: delivery_date,
  //         plant: plant_id,
  //       },
  //     },
  //   ])
  await inwardProcess
    .aggregate([
      {
        $match: {
          delivery_date: delivery_date,
          company_code: company_code,
          plant_id: plant_id,
        },
      },
      { $unwind: "$inward_crate_details" },
      { $match: { "inward_crate_details.grn_status": "success" } },
    ])

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
        //old
        // grns_quantity += parseInt(grn.quantity);
        grns_quantity += parseInt(grn.inward_crate_details.inwarded_qty);
        // grn.grn_items.forEach((grn_items) => {
        //   grns_quantity += parseInt(grn_items.quantity);
        // });
      });
    });

  // console.log("grns_quantity_sum",grns_quantity)
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

  return total_vendor.length;
}

async function total_inward_qty(
  delivery_date,
  plant_id,
  company_code,
  document_type
) {
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

  // old
  // await db.inwardProcess
  //   .aggregate([
  //     { $match: condition },
  //     {
  //       $project: {
  //         _id: 0,
  //         total_net_qty: 1,
  //       },
  //     },
  //   ])
  //   .then((result) => {
  //     result.forEach((po_details) => {
  //       total_inward_qty += po_details.total_net_qty;
  //     });
  //   });

  // // console.log("total_inward_qty",total_inward_qty.length);
  // // console.log("total_inward_qty",total_inward_qty)
  // return total_inward_qty;

  await db.inwardProcess
    .aggregate([
      { $match: condition },
      {
        $project: {
          _id: 0,
          uom: 1,
          total_crates: 1,
          total_net_qty: 1,
        },
      },
    ])
    .then((result) => {
      result.forEach((po_details) => {
        if (po_details.uom == "PAC") {
          total_inward_qty += po_details.total_crates;
        } else total_inward_qty += po_details.total_net_qty;
      });
    });
  // console.log("total_inward_qty", total_inward_qty);
  // console.log("total_inward_qty",total_inward_qty.length);
  return total_inward_qty;
}

exports.getQuantitySum_v2_of_week = async (req, res) => {
  // console.log("getQuantitySum_v2");
  const po_document_type = ["ZFPO", "ZNFV"];
  const po_sto_document_type = ["ZWST", "ZWSI"];

  if (
    !(req.query.delivery_date && req.query.plant_id && req.query.company_code)
  ) {
    return res.status(400).send({ message: "Missing parameter." });
  }

  // const week_ago_date = new Date(new Date(req.query.delivery_date).setDate(new Date(req.query.delivery_date).getDate() - 6))

  try {
    // let result_array = []

    var date_array = [];
    var po_quantity_sum_array = [];
    var po_sto_quantity_sum_array = [];
    var grns_quantity_sum_array = [];
    var total_inward_qty_array = [];
    // var so_quantity_sum_array = []
    // var invoice_sto_quantity_sum_array = []
    // var invoice_quantity_sum_array = []

    // var total_po_count_array = []
    // var total_po_quantity_array = []
    // var total_vendor_array = []

    // var total_po_item_quanities_array = []

    for (let i = 6; i >= 0; i--) {
      // console.log("aa",i)

      const start_delivery_date = new Date(req.query.delivery_date);

      const start_week_ago_date = new Date(
        new Date(req.query.delivery_date).setDate(
          new Date(req.query.delivery_date).getDate() - i
        )
      );

      const week_date_str = moment_tz(start_week_ago_date)
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DD");

      const end_delivery_date = start_week_ago_date.setHours(
        start_delivery_date.getHours() + 24
      );

      // console.log("----------i-----------",week_date_str)

      let result = await Promise.all([
        // added the quantity of purchaseorders collection for the given delivery_date, po_document_type['ZFPO', 'ZNFV'], supplying_plant, company_code
        po_quantity_sum(
          // req.query.delivery_date,
          week_date_str,
          req.query.document_type,
          req.query.plant_id,
          req.query.company_code
        ),
        // added the quantity of purchaseorders collection for the given delivery_date, po_document_type['ZWST', 'ZWSI'], supplying_plant, company_code
        po_quantity_sum(
          // req.query.delivery_date,
          week_date_str,
          po_sto_document_type,
          req.query.plant_id,
          req.query.company_code
        ),
        // added the quantity of salesorders collection for the given delivery_date, plant
        // so_quantity_sum(
        //   // req.query.delivery_date,
        //   week_date_str,
        //   req.query.plant_id,
        //   req.query.company_code,

        // ),
        // added the quantity of invoice_sto_get collection for the given billing_date, plant, company_code
        // invoice_sto_quantity_sum(
        //   // req.query.delivery_date,
        //   week_date_str,
        //   req.query.plant_id,
        //   req.query.company_code,

        // ),
        // added the quantity of invoicemasters collection for the given so_deliveryDate, itemSupplied.plant, invoiceDetails.company_code
        // invoice_quantity_sum(
        //   // req.query.delivery_date,
        //   week_date_str,
        //   end_delivery_date,
        //   req.query.plant_id,
        //   req.query.company_code,

        // ),
        // added the quantity of rapid_grns & rapid_grn_items collection for the given document_date, grn_items.plant
        grns_quantity_sum(
          // req.query.delivery_date,
          week_date_str,
          req.query.plant_id,
          req.query.company_code
        ),
        // using purchaseorders collection to get total number of po_number for the given delivery_date, supplying_plant, company_code
        // total_po_count(
        //   // req.query.delivery_date,
        //   week_date_str,
        //   req.query.plant_id,
        //   req.query.company_code,
        //   req.query.document_type,

        // ),
        // using purchaseorders collection to get total number of po_number for the given delivery_date, po_document_type['ZFPO', 'ZNFV'], supplying_plant, company_code
        // total_po_quantity(
        //   // req.query.delivery_date,
        //   week_date_str,
        //   po_document_type,
        //   req.query.plant_id,
        //   req.query.company_code,

        // ),
        // using purchaseorders collection to get total number of vendor_no for the given delivery_date, supplying_plant, company_code
        // total_vendor(
        //   // req.query.delivery_date,
        //   week_date_str,
        //   req.query.plant_id,
        //   req.query.company_code,
        //   req.query.document_type,

        // ),
        // using purchaseorders and  rapid_purchase_order_inward_details collection to get sum of total_inwarded_qty for the given delivery_date, supplying_plant, company_code
        total_inward_qty(
          // req.query.delivery_date,
          week_date_str,
          req.query.plant_id,
          req.query.company_code,
          req.query.document_type
        ),
        // added the quantity of purchaseorders collection for the given delivery_date, supplying_plant, company_code
        // total_po_item_quanities(
        //   // req.query.delivery_date,
        //   week_date_str,
        //   req.query.plant_id,
        //   req.query.company_code,
        //   req.query.document_type,

        // ),
      ]);

      let week_date_str_formated = moment_tz(week_date_str)
        .tz("Asia/Kolkata")
        .format("DD-MM-YYYY");

      // console.log("cc",week_date_str_formated)

      // let data =  {
      //   data_date : week_date_str,
      //   data_date_format : week_date_str_formated,
      //   po_quantity_sum : result[0],
      //   po_sto_quantity_sum : result[1],
      //   so_quantity_sum : result[2],
      //   invoice_sto_quantity_sum : result[3],
      //   invoice_quantity_sum : result[4],
      //   grns_quantity_sum : result[5],
      //   total_po_count : result[6],
      //   total_po_quantity : result[7],
      //   total_vendor : result[8],
      //   total_inward_qty : result[9],
      //   total_po_item_quanities : result[10],
      // }

      // console.log("result",result)

      date_array.push(week_date_str_formated);
      po_quantity_sum_array.push(Number(result[0].toFixed(2)));
      po_sto_quantity_sum_array.push(Number(result[1].toFixed(2)));
      grns_quantity_sum_array.push(Number(result[2].toFixed(2)));
      total_inward_qty_array.push(Number(result[3].toFixed(2)));
      // so_quantity_sum_array.push(result[2])
      // invoice_sto_quantity_sum_array.push(result[3])
      // invoice_quantity_sum_array.push(result[4])

      // total_po_count_array.push(result[6])
      // total_po_quantity_array.push(result[7])
      // total_vendor_array.push(result[8])

      // total_po_item_quanities_array.push(result[10])

      // result_array.push(data)
    }

    var final_array = [
      {
        name: "PO Qty",
        data: po_quantity_sum_array,
      },
      {
        name: "Inward Qty",
        data: total_inward_qty_array,
      },
      {
        name: "GRN Qty",
        data: grns_quantity_sum_array,
      },
      {
        name: "STOPO Qty",
        data: po_sto_quantity_sum_array,
      },
    ];

    let final_obj = {
      weekseriesArray: final_array,
      categories: date_array,
    };

    res.status(200).send({
      status_code: "200",
      data: final_obj,
    });
  } catch (err) {
    return res.status(500).send({
      status_code: "500",
      message: err.message || "Some error occurred while retrieving data",
    });
  }
};
