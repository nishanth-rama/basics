const moment = require("moment");
const { promises } = require("nodemailer/lib/xoauth2");

const db = require("../../models");

const Tutorial = db.salesOrder;

const secondary_storage_table = db.secondary_storage;
const _ = require("lodash");
const excelJS = require("exceljs");
var path_module = require('path');

// db.soAllocation

// Create and Save a new Tutorial
exports.create = (req, res) => {
  // Validate request
  if (!req.body) {
    res.status(400).send({ message: "Content can not be empty!" });
    return;
  }

  // Create a Tutorial
  const tutorial = new Tutorial(req.body);

  // Save Tutorial in the database
  tutorial
    .save(tutorial)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while creating the Sales_order.",
      });
    });
};

// Retrieve all Tutorials from the database.
exports.findAll = async (req, res) => {
  // const title = req.query.title;
  // var condition = title ? { title: { $regex: new RegExp(title), $options: "i" } } : {};

  let { page } = req.query;

  console.log("page", page);

  if (page === undefined)
    return res.status(400).send({ message: "Please provide page number" });

  let totalDataCount = await Tutorial.countDocuments();
  let startDataCount = page == 1 ? 0 : page * 10 - 10;
  let endDataCount = page * 10;

  // let startDataCount = 2;
  // let endDataCount = 3

  db.salesOrder
    .find()
    .skip(+startDataCount)
    .limit(+endDataCount)
    .then((data) => {
      res.send({
        totalDataCount: totalDataCount,
        skip: startDataCount,
        pageSize: 10,
        data,
      });
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving sales_order.",
      });
    });
};

// get so on delivery_date

exports.get_sales_order_detail_multi_bin = async (req, res) => {
  console.log("sales order on");
  // let totalDataCount = await Tutorial.countDocuments();

  const { company_code, delivery_date, plant_id, route } = req.query;

  if (!(company_code && delivery_date && plant_id))
    return res.status(400).send({
      status_code: "400",
      message:
        "Please provide all parameters inludes Company Code, Plant Id, Delivery Date.",
    });

  const check = [];

  // {arrayElementName : {$exists:true, $size:0}}
  var condition = {};

  if (req.query.status && req.query.status == "pending") {
    condition.Newwww = [];
  } else if (req.query.status && req.query.status != "pending") {
    condition.Newwww = { $elemMatch: { status: req.query.status } };
  }
  // else {
  //    condition = {};
  // }

  let filter12 = {};

  if (route) {
    filter12 = {
      "data.route_id": route,
    };
  }

  console.log("condition", condition);

  // await Tutorial.find({"$and":[{ "dateOfDelivery": { "$gte": new Date(req.query.dateOfDelivery) } },{ "dateOfDelivery": { "$lt":new Date(sd1)} }]})
  await db.soAllocation
    .aggregate([
      {
        $match: {
          plant_id: { $eq: plant_id },
          company_code: { $eq: company_code },
          // dateOfDelivery: {
          //   $gte: new Date(delivery_date),
          //   $lt: new Date(sd1),
          // },
          delivery_date: { $eq: delivery_date },
        },
      },

      { $group: { _id: "$sales_order_no", data: { $first: "$$ROOT" } } },
      {
        $lookup: {
          from: "rapid_job_schedulers_v2s",
          localField: "data.sales_order_no",
          foreignField: "sales_order_no",
          as: "Newwww",
        },
      },
      { $sort: { _id: -1 } },
      { $match: condition },
      { $match: filter12 },
    ])
    .then((data) => {
      // res.send({data:data})
      // console.log("check_length", data);
      if (data.length > 0) {
        JSON.parse(JSON.stringify(data)).map((item, idx) => {
          // console.log("everything", item.data && item.data.created_at);

          //  console.log("isit",item.data.sales_order_no)

          if (item.data.sales_order_no != undefined) {
            if (item.Newwww && item.Newwww.length > 0) {
              // console.log("popup",item.Newwww)
              let bin_detail_array = [];
              item.Newwww.map((item, idx) => {
                bin_detail_array.push({
                  bin_id: item.bin_id,
                  status: item.status,
                  bin_status: item.bin_status,
                });
              });
              var Bin_Count = item.Newwww.length;
              var Bin_Detail = bin_detail_array;
            } else {
              var Bin_Count = 0;
              var Bin_Detail = [
                {
                  bin_id: "_",
                  status: "pending",
                  bin_status: 0,
                },
              ];
            }

            var created_at_date =
              (item.data && item.data.createdAt) ||
              (item.data && item.data.created_at);

            check.push({
              SrNo: idx + 1,
              _id: item.data._id,
              sales_order_no: item.data.sales_order_no,
              customer_name: item.data.customer_name,
              sales_document_type: item.data.sales_document_type,
              route_id: item.data.route_id,
              // customer_ref_no: item.data.customer_ref_no,
              // cust_ref_date: item.data.cust_ref_date,
              // ship_to_party: item.data.ship_to_party,

              sold_to_party: item.data.customer_code,
              sold_to_party_description: item.data.customer_name,
              dateOfDelivery: moment(item.data.delivery_date).format(
                "DD-MM-YYYY"
              ),

              dateOfOrderPlacing: item.data.order_placing_date
                ? moment(
                  item.data.order_placing_date &&
                    item.data.order_placing_date.includes("T")
                    ? item.data.order_placing_date &&
                    item.data.order_placing_date.split("T")[0]
                    : item.data.order_placing_date &&
                    item.data.order_placing_date.split(" ")[0]
                ).format("DD-MM-YYYY")
                : moment(item.data.delivery_date).format("DD-MM-YYYY"),

              bin_count: Bin_Count,

              bin_detail: Bin_Detail,

              // bin_id: item.Newwww.length > 0 ? item.Newwww[0].bin_id : "_",
              // status:
              //   item.Newwww.length > 0 && item.Newwww[0].bin_id
              //     ? item.Newwww[0].status
              //     : "pending",
              // bin_status:
              //   item.Newwww.length > 0 && item.Newwww[0].bin_status
              //     ? item.Newwww[0].bin_status
              //     : 0,
              // items: item.data.items,
            });
          }
        });

        if (check.length == 0)
          return res.status(200).send({
            status_code: "200",
            message: "Sales order list is not available!",
            totalDataCount: check.length,
            data: check,
          });
        else
          return res.status(200).send({
            status_code: "200",
            message: "Sales order list is available!",
            totalDataCount: check.length,
            data: check,
          });
      } else {
        return res.status(200).send({
          status_code: "200",
          message: "Sales order is not available!",
          data: check,
        });
      }
    })
    .catch((err) => {
      console.log(err);

      res.status(500).send({
        status_code: "500",
        message:
          err.message || "Some error occurred while retrieving tutorials.",
      });
    });
};

exports.get_sales_order_detail_on_sales_order_number_multi_bin = async (
  req,
  res
) => {
  const { company_code, plant_id, sales_order_no } = req.query;

  if (!(company_code && plant_id && sales_order_no))
    return res.status(400).send({
      status_code: "400",
      message:
        "Please provide all parameters inludes Company Code, Plant Id and Sales Order Number",
    });

  //db.soAllocation

  const final_result = {};

  const item_detail_array = [];

  //console.log("get_only_sales_order");

  await db.soAllocation
    .aggregate([
      {
        $match: {
          plant_id: { $eq: plant_id },
          company_code: { $eq: company_code },
          sales_order_no: { $eq: sales_order_no },
        },
      },
      // { $group: { _id: "$sales_order_no", data: { $first: "$$ROOT" } } },
      {
        $lookup: {
          from: "rapid_job_schedulers_v2s",
          localField: "sales_order_no",
          foreignField: "sales_order_no",
          as: "Newwww",
        },
      },
      {
        $lookup: {
          from: "rapid_secondary_storage_new",
          localField: "material_no",
          foreignField: "material_code",
          as: "secondary_discrete_detail",
        },
      },
      { $sort: { _id: -1 } },
    ])

    // Tutorial.find({sales_order_no})
    // console.log("major",Newwww)
    .then(async (data) => {
      //console.log("mail",data);

      // return res.send({data:data})

      if (data.length > 0) {
        // console.log("qwe", data);
        final_result["salesOrderId"] = data[0].sales_order_no;

        final_result["sold_to_party"] = data[0].customer_code;

        final_result["sold_to_party_description"] = data[0].customer_name;

        // final_result["dateOfOrderPlacing"] = data[0].DateOfOrderPlacing;

        // moment( item.data.delivery_date).format("DD-MM-YYYY"),
        // JSON.parse(JSON.stringify(data))

        (final_result["dateOfOrderPlacing"] = data[0].order_placing_date
          ? moment(
            data[0].order_placing_date &&
              JSON.parse(JSON.stringify(data[0])).order_placing_date.includes(
                "T"
              )
              ? data[0].order_placing_date &&
              JSON.parse(
                JSON.stringify(data[0])
              ).order_placing_date.split("T")[0]
              : data[0].order_placing_date &&
              JSON.parse(
                JSON.stringify(data[0])
              ).order_placing_date.split(" ")[0]
          ).format("DD-MM-YYYY")
          : moment(data[0].delivery_date).format("DD-MM-YYYY")),
          //

          (final_result["delivery_date"] = moment(data[0].delivery_date).format(
            "DD-MM-YYYY"
          ));

        const main_data = data.map(async (item, idx) => {
          const discrete_material_data = await secondary_storage_table
            .findOne({ material_code: item.material_no })
            .sort({ createdAt: 1 });

          // if(!_.isEmpty(discrete_material_data)){

          //     console.log(Object.keys(discrete_material_data));
          // }
          // console.log("asd",discrete_material_data[0]["total_stock"])

          item_detail_array.push({
            itemId: item.material_no,
            itemName: item.material_name,
            qty: item.order_qty,
            pending_qty: item.pending_qty,
            allocated_qty: item.allocated_qty,
            secondary_mt: item.secondary_discrete_detail.length
              ? item.secondary_discrete_detail[0].material_code
              : "NA",
            secondary_rack_location: item.secondary_discrete_detail.length
              ? item.secondary_discrete_detail[0].location_id
              : "NA",
            stock_available: item.secondary_discrete_detail.length
              ? item.secondary_discrete_detail[0].current_stock
              : 0,
          });
        });

        await Promise.all(main_data);

        final_result["items"] = item_detail_array;

        if (data[0].Newwww && data[0].Newwww.length > 0) {
          let bin_detail_array = [];
          //console.log(data[0].Newwww)
          data[0].Newwww.map((item, idx) => {
            //console.log(item);
            bin_detail_array.push({
              bin_id: item.bin_id,
              status: item.status,
              bin_status: item.bin_status,
              bin_details: item.bin_detail,
              is_deleted: item.is_deleted,
              job_scheduled_on: item.job_scheduled_on,
            });
          });

          var Bin_Count = data[0].Newwww.length;
          var Bin_Detail = bin_detail_array;
        } else {
          var Bin_Count = 0;
          var Bin_Detail = [
            {
              bin_id: "_",
              status: "pending",
              bin_status: 0,
            },
          ];
        }

        var entry_value = [
          {
            data: final_result,
            bin_count: Bin_Count,
            bin_detail: Bin_Detail,

            //   "bin_id" :
            //   data[0].Newwww.length > 0 ? data[0].Newwww[0].bin_id : "_",

            // "status" :
            //   data[0].Newwww.length > 0 ? data[0].Newwww[0].status : "pending",

            // "bin_status" :
            //   data[0].Newwww.length > 0 ? data[0].Newwww[0].bin_status : 0,
          },
        ];
      }

      // console.log("truee", data[0].Newwww[0].bin_id);

      if (data.length == 0) mssge = "Sales Order Details Is Not Available!";
      else mssge = "Sales Order Details Is Available!";

      return res
        .status(200)
        .send({ status_code: "200", message: mssge, data: entry_value });
    })
    .catch((err) => {
      res.status(500).send({
        status_code: "500",
        message: err.message,
      });
    });
};

// Update a Tutorial by the id in the request
exports.update = (req, res) => {
  if (!req.body) {
    return res.status(400).send({
      message: "Data to update can not be empty!",
    });
  }

  const sales_order_no = req.params.sales_order_no;

  const filter = { sales_order_no: req.params.sales_order_no };

  Tutorial.findOneAndUpdate(filter, req.body, { useFindAndModify: false })
    .then((data) => {
      // console.log("prlase",data)
      if (!data) {
        res.status(404).send({
          message: `Cannot update sales_order with sales_order_no=${sales_order_no}. Maybe sales_order was not found!`,
        });
      } else {
        res.send({ message: "sales_order updated successfully." });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error updating sales_order with id=" + id,
      });
    });
};

// Delete a Tutorial with the specified id in the request
exports.delete = (req, res) => {
  const id = req.params.id;

  Tutorial.findByIdAndRemove(id, { useFindAndModify: false })
    .then((data) => {
      if (!data) {
        res.status(404).send({
          message: `Cannot delete sales_order with id=${id}. Maybe sales_order was not found!`,
        });
      } else {
        res.send({
          message: "sales_order was deleted successfully!",
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Could not delete sales_order with id=" + id,
      });
    });
};

// get salesDocumentType

exports.get_sales_document_type_on_delivery_date = async (req, res) => {
  // let totalDataCount = await Tutorial.countDocuments();
  const { company_code, delivery_date, plant_id } = req.query;

  if (!(company_code && delivery_date && plant_id))
    return res.status(400).send({
      status_code: "400",
      message:
        "Please provide all parameters inludes Company Code, Delivery Date and Plant Id.",
    });

  // const datee = new Date(delivery_date);
  // let sd1 = datee.setHours(datee.getHours() + 24);

  await db.soAllocation
    .aggregate([
      {
        $match: {
          plant_id: { $eq: plant_id },
          // company_code: { $eq: company_code },
          // dateOfDelivery: {
          //   $gte: new Date(delivery_date),
          //   $lt: new Date(sd1),
          // },
          delivery_date: { $eq: delivery_date },
        },
      },
      //   { $group: { _id: { type: "$distributionChannel" } } },
      //  { $group: { _id: "$distributionChannel" }},
      { $project: { sales_document_type: 1 } },
      { $group: { _id: "$sales_document_type" } },
      { $project: { sales_document_type: "$_id", _id: 0 } },
    ])
    .then((data) => {
      if (data.length > 0) {
        return res.status(200).send({
          // totalDataCount: data.length,
          status_code: "200",
          message: "Sales Document Type list is available!",
          data: data,
        });
      } else {
        return res.status(200).send({
          status_code: "200",
          message: "Sales Document Type list is not available!",
          data: data,
        });
      }
    })
    .catch((err) => {
      return res.status(500).send({
        status_code: "500",
        message:
          err.message ||
          "Some error occurred while retrieving Sales Document Type.",
      });
    });
};

// get counts

exports.get_sales_order_count = async (req, res) => {
  // let totalDataCount = await Tutorial.countDocuments();

  // const datee = new Date(req.query.dateOfDelivery);
  // let sd1 = datee.setHours(datee.getHours() + 24);

  const { company_code, delivery_date, plant_id, sales_document_type } =
    req.query;

  console.log("delivery_date", delivery_date);

  if (!(company_code && delivery_date && plant_id && sales_document_type))
    return res.status(400).send({
      status_code: "400",
      message:
        "Please provide all parameters inludes Company Code, Plant Id, Delivery Date and Sales Document Type.",
    });

  // const datee = new Date(delivery_date);
  // let sd1 = datee.setHours(datee.getHours() + 24);

  const final = {};

  let filters;

  if (sales_document_type === "All") {
    filters = [
      {
        $match: {
          plant_id: { $eq: plant_id },
          delivery_date: { $eq: delivery_date },
          company_code: { $eq: company_code },
          // salesDocumentType:{$eq:req.query.doc_type},
          // dateOfDelivery: {
          //   $gte: new Date(delivery_date),
          //   $lt: new Date(sd1),
          // },
        },
      },
      // {$project:{"salesDocumentType":1}},
      // {$group:{_id:{type:"$salesDocumentType"}}}
      //rapid_invoice_qtys

      // {
      //   $project: {
      //     salesDocumentType: 1,
      //     distributionChannel: 1,
      //     sold_to_party: 1,
      //     salesOrderId: 1,
      //     "items.qty": 1,
      //   },
      // },

      {
        $group: {
          _id: {
            so: "$sales_order_no",
            // "emp" : "$distribution_channel"
          },

          // allocated_qty: 1,
          total_qty: {
            $sum: "$order_qty",
          },
          total_allocated_qty: {
            $sum: "$allocated_qty",
          },
          doc: { $first: "$$ROOT" },
        },
      },

      {
        $project: {
          _id: 0,
          total_qty: 1,
          total_allocated_qty: 1,
          sales_order_no: "$doc.sales_order_no",
          distribution_channel: "$doc.distribution_channel",
          customer_code: "$doc.customer_code",
        },
      },

      {
        $lookup: {
          from: "rapid_allocation_invoice_details",
          localField: "sales_order_no",
          foreignField: "sales_order_no",
          as: "invoice_qty",
        },
      },

      // {
      //   $lookup: {
      //     from: "rapid_sales_order_allocations",
      //     localField: "salesOrderId",
      //     foreignField: "sales_order_no",
      //     as: "allocation_qty",
      //   },
      // },

      // {
      //   $lookup: {
      //     from: "rapid_invoice_qtys",
      //     localField: "sales_order_no",
      //     foreignField: "sales_order_no",
      //     as: "invoice",
      //   },
      // },
    ];
  } else {
    filters = [
      {
        $match: {
          plant_id: { $eq: plant_id },

          sales_document_type: { $eq: sales_document_type },
          delivery_date: { $eq: delivery_date },
          // company_code : {$eq : company_code},
          // dateOfDelivery: {
          //   $gte: new Date(delivery_date),
          //   $lt: new Date(sd1),
          // },
        },
      },
      // {$project:{"salesDocumentType":1}},
      // {$group:{_id:{type:"$salesDocumentType"}}}
      //rapid_invoice_qtys
      {
        $group: {
          _id: {
            so: "$sales_order_no",
            // "emp" : "$distribution_channel"
          },

          // allocated_qty: 1,
          total_qty: {
            $sum: "$order_qty",
          },
          total_allocated_qty: {
            $sum: "$allocated_qty",
          },
          doc: { $first: "$$ROOT" },
        },
      },

      {
        $project: {
          _id: 0,
          total_qty: 1,
          total_allocated_qty: 1,
          sales_order_no: "$doc.sales_order_no",
          distribution_channel: "$doc.distribution_channel",
          customer_code: "$doc.customer_code",
        },
      },

      {
        $lookup: {
          from: "rapid_allocation_invoice_details",
          localField: "sales_order_no",
          foreignField: "sales_order_no",
          as: "invoice_qty",
        },
      },

      // {
      //   $lookup: {
      //     from: "rapid_invoice_qtys",
      //     localField: "sales_order_no",
      //     foreignField: "sales_order_no",
      //     as: "invoice",
      //   },
      // },
    ];
  }

  const unique_distribution_channel = []; //total_channel

  const unique_sold_to_party = []; //total_customer

  const unique_salesOrderId = []; //total_order

  let Order_qty_count = 0;

  let allocated_qty = 0;

  let invoice_qty_count = 0;

  // Shortfall_count = Order_qty_count - invoice_qty_count

  await db.soAllocation
    .aggregate([filters])
    .then((data) => {
      console.log("late_n8", data);
      if (data.length > 0) {
        // final["Total_customer_count"] = data.length;

        // final["Total_order"] = data.length;

        // let order_qty_count = 0;

        // let distributionChannel_count = 0;

        // let invoice_qty_count = 0;

        // let picked_qty_count = 0;

        data.map((result, idx) => {
          // console.log(result.salesOrderId)
          if (result.sales_order_no) {
            unique_distribution_channel.push(result.distribution_channel);
            unique_sold_to_party.push(result.customer_code);
            unique_salesOrderId.push(result.sales_order_no);

            Order_qty_count = Order_qty_count + result.total_qty;
            allocated_qty = allocated_qty + result.total_allocated_qty;
          }

          if (result.invoice_qty && result.invoice_qty.length > 0) {
            invoice_qty_count = invoice_qty_count + result.total_allocated_qty;
          }
        });

        // data.map((SO, idx) => {
        //   if (SO.distributionChannel) {
        //     distributionChannel_count += parseInt(SO.distributionChannel);
        //   }

        //   SO.items.map((item, idx) => {
        //     if (item.qty) order_qty_count += item.qty;
        //   });

        //   SO.invoice.map((item, idx) => {
        //     if (item.invoice_qty) invoice_qty_count += item.invoice_qty;
        //   });

        //   SO.picked_qty.map((item, idx) => {
        //     if (item.picked_qty) picked_qty_count += item.picked_qty;
        //   });
        // });

        //[...new Set(numbers)]

        console.log(
          unique_distribution_channel.length,
          unique_sold_to_party.length,
          unique_salesOrderId.length,
          Order_qty_count,
          allocated_qty
        );

        console.log(
          [...new Set(unique_distribution_channel)].length,
          [...new Set(unique_sold_to_party)].length,
          [...new Set(unique_salesOrderId)].length,
          Order_qty_count,
          allocated_qty
        );

        final["Total_customer_count"] = [
          ...new Set(unique_sold_to_party),
        ].length;
        final["Total_order"] = [...new Set(unique_salesOrderId)].length;
        final["Order_qty_count"] = Order_qty_count;
        final["Invoice_qty_count"] = invoice_qty_count;
        final["Picked_qty_count"] = allocated_qty;
        final["Shortfall_count"] =
          final.Order_qty_count - final.Invoice_qty_count;
        final["distributionChannel_count"] = [
          ...new Set(unique_distribution_channel),
        ].length;

        return res.status(200).send({
          status_code: "200",
          message: "Sales Order count list is available!",
          data: final,
        });
      } else {
        final["Total_customer_count"] = 0;
        final["Total_order"] = 0;
        final["Order_qty_count"] = 0;
        final["Invoice_qty_count"] = 0;
        final["Picked_qty_count"] = 0;
        final["Shortfall_count"] = 0;
        final["distributionChannel_count"] = 0;

        res.status(200).send({
          status_code: "200",
          message: "sales order is not available!",
          data: final,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        status_code: "500",
        message: err.message || "Some error occurred while getting count.",
      });
    });
};

// get_skuCustomer_group_onDD

exports.get_customer_group = async (req, res) => {
  // let totalDataCount = await Tutorial.countDocuments();

  const { company_code, delivery_date, plant_id, sales_document_type } =
    req.query;

  if (!(company_code && delivery_date && plant_id && sales_document_type))
    return res.status(400).send({
      status_code: "400",
      message:
        "Please provide all parameters inludes Company Code, Delivery Date,Plant Id and sales_document_type.",
    });

  // const datee = new Date(delivery_date);
  // let sd1 = datee.setHours(datee.getHours() + 24);

  await db.soAllocation
    .aggregate([
      {
        $match: {
          plant_id: { $eq: plant_id },
          company_code: { $eq: company_code },
          delivery_date: delivery_date,
          // delivery_date: {
          //   $gte: new Date(delivery_date),
          //   $lt: new Date(sd1),
          // },
          sales_document_type: sales_document_type,
        },
      },
      //   { $group: { _id: { type: "$distributionChannel" } } },
      // { $group: { _id: "$distribution_channel" } },
      // { $project: { customer_group: "$_id", _id: 0 } },
      {
        $group: {
          _id: "$distribution_channel_description",
          data: { $first: "$$ROOT" },
        },
      },
      {
        $project: {
          customer_group_name: "$data.distribution_channel_description",
          customer_group_code: "$data.distribution_channel",
          _id: 0,
        },
      },
      { $sort: { customer_group_name: 1 } },
      // {$project : {"customer_group.distribution_channel_description":1,"customer_group.distribution_channel":1}}
    ])
    .then((data) => {
      if (data.length > 0) {
        res.status(200).send({
          // totalDataCount: data.length,
          status_code: "200",
          message: "Customer Group list is available!",
          data: data,
        });
      } else {
        res.status(200).send({
          status_code: "200",
          message: "Customer Group is not available!",
          data: data,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        status_code: "500",
        message:
          err.message || "Some error occurred while retrieving Customer Group.",
      });
    });
};

// get_all_skuItem_onCustomerGroup (allocated and non allocated)

exports.get_item_list = async (req, res) => {
  // let totalDataCount = await Tutorial.countDocuments();

  const {
    company_code,
    delivery_date,
    plant_id,
    customer_group,
    sales_document_type,
    all_customers,
  } = req.query;

  if (
    !(
      company_code &&
      delivery_date &&
      plant_id &&
      customer_group &&
      sales_document_type &&
      all_customers
    )
  )
    return res.status(400).send({
      status_code: "400",
      message:
        "Please provide all parameters inludes Company Code, Delivery Date, Plant Id, Customer Group, Sales Document Type and all_customers.",
    });

  console.log("customer_group", typeof customer_group);

  const new_customer_grp = customer_group.split(",");

  console.log(new_customer_grp);

  // const datee = new Date(delivery_date);
  // let sd1 = datee.setHours(datee.getHours() + 24);

  let filter = {};

  // {
  //   plant_id: { $eq: plant_id },
  //   company_code: { $eq: company_code },
  //   delivery_date: {
  //     $gte: new Date(delivery_date),
  //     $lt: new Date(sd1),
  //   },
  //   distribution_channel: { $eq: customer_group },
  //   sales_document_type: sales_document_type,
  // }

  // pending_qty: { $ne: 0 },

  // flase -  default -- non_allocated

  if (all_customers == "true")
    filter = {
      plant_id: { $eq: plant_id },
      company_code: { $eq: company_code },
      delivery_date: delivery_date,
      // delivery_date: {
      //   $gte: new Date(delivery_date),
      //   $lt: new Date(sd1),
      // },
      distribution_channel: { $in: new_customer_grp },
      sales_document_type: sales_document_type,
    };
  else if (all_customers == "false")
    filter = {
      plant_id: { $eq: plant_id },
      company_code: { $eq: company_code },
      delivery_date: delivery_date,
      // delivery_date: {
      //   $gte: new Date(delivery_date),
      //   $lt: new Date(sd1),
      // },
      // distribution_channel: { $in:[ "50" ,customer_group]  },
      distribution_channel: { $in: new_customer_grp },
      sales_document_type: sales_document_type,
      pending_qty: { $ne: 0 },
    };

  const check = [];

  const final_result = [];

  await db.soAllocation
    .aggregate([
      {
        $match: filter,
      },
      //   { $group: { _id: { type: "$distributionChannel" } } },
      {
        $project: {
          // _id: 1,
          // sales_order_no: 1,
          // customer_name: 1,
          material_name: 1,
          material_no: 1,
        },
      },
      { $group: { _id: "$material_name", data: { $first: "$$ROOT" } } },
      // { $project: { data: "$data", _id: 0 } },
      { $sort: { "data.material_name": 1 } },
    ])
    .then((data) => {
      if (data.length > 0) {
        data.map((result, idx) => {
          // final_result.push(result.data)
          final_result.push({
            material_no: result.data.material_no,
            material_description: result.data.material_name,
          });
        });

        return res.status(200).send({
          status_code: "200",
          message: "Item list is available!",
          total_data_count: final_result.length,
          data: final_result,
        });
      } else {
        return res.status(200).send({
          status_code: "200",
          message: "Item list is not available!",
          data: data,
        });
      }
    })
    .catch((err) => {
      return res.status(500).send({
        status_code: "500",
        message:
          err.message || "Some error occurred while retrieving Item list.",
      });
    });
};

exports.getCustomerList = async (req, res) => {
  console.log("get custormer_list with sales_order_no for sku allocation");
  try {
    const {
      delivery_date,
      customer_distribution_channel,
      item_code,
      plant_id,
    } = req.query;

    if (
      !(delivery_date && customer_distribution_channel && item_code && plant_id)
    )
      return res
        .status(400)
        .send({ message: "Please provide required parameters" });

    const dt = new Date(delivery_date + "T00:00:00.000+00:00");

    const customerList = await db.salesOrder.aggregate([
      {
        $match: {
          dateOfDelivery: dt,
          "items.material_no": item_code,
          plant: plant_id,
        },
      },
      {
        $project: {
          _id: 0,
          custmr_and_soNo: {
            $concat: ["$sold_to_party_description", " ", "$sales_order_no"],
          },
        },
      },
      { $sort: { custmr_and_soNo: 1 } },
    ]);

    const uniqueObjects = [
      ...new Map(
        customerList.map((so_no) => [so_no.custmr_and_soNo, so_no])
      ).values(),
    ];

    return res.send({
      message: "Customer_list with sales_order_no for sku allocation",
      data: uniqueObjects,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message:
        "Some error occurred while extracting customer list for sku allocation",
    });
  }
};

exports.itemDetails = async (req, res) => {
  console.log("Particular sales order details for sku allocation");
  try {
    const { so_no, plant_id } = req.query;

    if (!(plant_id && so_no))
      return res
        .status(400)
        .send({ message: "Please provide sales order number and plant id" });

    const customerList = await db.salesOrder.aggregate([
      {
        $match: {
          // sold_to_party_description:customer,
          plant: plant_id,
          sales_order_no: so_no,
        },
      },
      {
        $project: {
          sales_order_no: 1,
          sold_to_party_description: 1,
          distributionChannel: 1,
          items: {
            item_no: 1,
            material_no: 1,
            material_description: 1,
            qty: 1,
            storage_location: 1,
            payment_terms: 1,
            uom: 1,
            mrp_amount: 1,
            discount_amount: 1,
            net_price: 1,
            taxable_value: 1,
            cgst_pr: 1,
            sgst_pr: 1,
            igst_pr: 1,
            ugst_pr: 1,
            total_amount: 1,
          },
          _id: 0,
        },
      },
    ]);

    return res.send({
      message: "Particular sales order details for sku allocation",
      data: customerList,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message:
        "Some error occurred while extracting particular sales order details for sku allocation",
    });
  }
};

exports.get_sales_document_type = async (req, res) => {
  const { company_code, delivery_date, plant_id } = req.query;

  if (!(company_code && delivery_date && plant_id))
    return res.status(400).send({
      status_code: "400",
      message:
        "Please provide all parameters inludes Company Code, Delivery Date and Plant Id.",
    });

  // const datee = new Date(delivery_date);
  // let sd1 = datee.setHours(datee.getHours() + 24);

  await db.soAllocation
    .aggregate([
      {
        $match: {
          plant_id: { $eq: plant_id },
          company_code: { $eq: company_code },
          delivery_date: delivery_date,
          // delivery_date: {
          //   $gte: new Date(delivery_date),
          //   $lt: new Date(sd1),
          // },
        },
      },
      //   { $group: { _id: { type: "$distributionChannel" } } },
      //  { $group: { _id: "$distributionChannel" }},
      { $project: { sales_document_type: 1 } },
      { $group: { _id: "$sales_document_type" } },
      { $project: { sales_document_type: "$_id", _id: 0 } },
    ])
    .then((data) => {
      if (data.length > 0) {
        return res.status(200).send({
          // totalDataCount: data.length,
          status_code: "200",
          message: "Sales Document Type list is available!",
          data: data,
        });
      } else {
        return res.status(200).send({
          status_code: "200",
          message: "Sales Document Type list is not available!",
          data: data,
        });
      }
    })
    .catch((err) => {
      return res.status(500).send({
        status_code: "500",
        message:
          err.message ||
          "Some error occurred while retrieving Sales Document Type.",
      });
    });
};

// on change of customer group get customer and sales order

exports.get_customer_list = async (req, res) => {
  // let totalDataCount = await Tutorial.countDocuments();

  const {
    company_code,
    delivery_date,
    plant_id,
    customer_group,
    sales_document_type,
    all_customers,
  } = req.query;

  if (
    !(
      company_code &&
      delivery_date &&
      plant_id &&
      customer_group &&
      sales_document_type &&
      all_customers
    )
  )
    return res.status(400).send({
      status_code: "400",
      message:
        "Please provide all parameters inludes Company Code, Delivery Date, Plant Id, Customer Group, Sales Document Type & all_customers.",
    });

  // const datee = new Date(delivery_date);
  // let sd1 = datee.setHours(datee.getHours() + 24);

  const check = [];

  const final_result = [];

  // flase -  default -- non_allocated

  const new_customer_grp = customer_group.split(",");

  console.log(new_customer_grp);

  let filter = {};

  // pending_qty: { $ne: 0 }

  if (all_customers == "true")
    filter = {
      plant_id: { $eq: plant_id },
      company_code: { $eq: company_code },
      sales_document_type: sales_document_type,
      delivery_date: delivery_date,
      // delivery_date: {
      //   $gte: new Date(delivery_date),
      //   $lt: new Date(sd1),
      // },
      distribution_channel: { $in: new_customer_grp },
    };
  else if (all_customers == "false")
    filter = {
      plant_id: { $eq: plant_id },
      company_code: { $eq: company_code },
      sales_document_type: sales_document_type,
      delivery_date: delivery_date,
      // delivery_date: {
      //   $gte: new Date(delivery_date),
      //   $lt: new Date(sd1),
      // },
      // distribution_channel: { $eq: customer_group },
      distribution_channel: { $in: new_customer_grp },
      pending_qty: { $ne: 0 },
    };

  // await Tutorial.find({"$and":[{ "dateOfDelivery": { "$gte": new Date(delivery_date) } },{ "dateOfDelivery": { "$lt":new Date(sd1)} }]})
  await db.soAllocation
    .aggregate([
      {
        $match: filter,
      },

      { $project: { customer_code: 1, customer_name: 1, _id: 0 } },
      { $sort: { customer_name: 1 } },
    ])
    .then((data) => {
      if (data.length > 0) {
        data.map((item, idx) => {
          if (item.pending_qty != 0) {
            final_result.push({
              customer_name: item.customer_name,
            });
          }
        });

        // console.log(data)

        const uniqueObjects = [
          ...new Map(data.map((item) => [item.customer_code, item])).values(),
        ];

        return res.status(200).send({
          status_code: "200",
          message: "Customer list is available!",
          total_data_count: uniqueObjects.length,
          data: uniqueObjects,
        });
      } else {
        return res.status(200).send({
          status_code: "200",
          message: "Customer list is not available!",
          data: data,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        status_code: "500",
        message:
          err.message || "Some error occurred while retrieving Customer Group.",
      });
    });
};

exports.itemDetails = async (req, res) => {
  console.log("Particular sales order details for sku allocation");
  try {
    if (!(plant_id && so_no))
      return res
        .status(400)
        .send({ message: "Please provide sales order number and plant id" });

    const customerList = await db.salesOrder.aggregate([
      {
        $match: {
          // sold_to_party_description:customer,
          plant: plant_id,
          sales_order_no: so_no,
        },
      },
      {
        $project: {
          sales_order_no: 1,
          sold_to_party_description: 1,
          sold_to_party: 1,
          distributionChannel: 1,
          items: {
            item_no: 1,
            material_no: 1,
            material_description: 1,
            qty: 1,
            storage_location: 1,
            payment_terms: 1,
            uom: 1,
            mrp_amount: 1,
            discount_amount: 1,
            net_price: 1,
            taxable_value: 1,
            cgst_pr: 1,
            sgst_pr: 1,
            igst_pr: 1,
            ugst_pr: 1,
            total_amount: 1,
          },
          _id: 0,
        },
      },
    ]);

    return res.send({
      message: "Particular sales order details for sku allocation",
      data: customerList,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message:
        "Some error occurred while extracting particular sales order details for sku allocation",
    });
  }
};

exports.itemDetails_site = async (req, res) => {
  console.log("particular item details for site allocation");
  try {
    const {
      company_code,
      plant_id,
      delivery_date,
      doc_type,
      customer_distribution_channel,
      customer_no,
      so_no,
      item_code,
      item_no,
    } = req.query;

    if (
      !(
        company_code &&
        plant_id &&
        delivery_date &&
        doc_type &&
        customer_distribution_channel &&
        customer_no &&
        so_no &&
        item_code &&
        item_no
      )
    )
      return res
        .status(400)
        .send({ message: "Please provide required parameters" });

    const distribution_channel = customer_distribution_channel.split(",");

    const itemDetails = await db.soAllocation.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        delivery_date: delivery_date,
        sales_document_type: doc_type,
        distribution_channel: { $in: distribution_channel },
        customer_code: customer_no,
        sales_order_no: so_no,
        material_no: item_code,
        item_no: item_no,
      },
      {
        _id: 0,
        sales_order_no: 1,
        customer_name: 1,
        customer_code: 1,
        distribution_channel: 1,
        item_no: 1,
        material_no: 1,
        material_name: 1,
        order_qty: 1,
        pending_qty: 1,
        allocated_qty: 1,
        uom: 1,
      }
    );

    let mssge = "Item details is available";

    if (itemDetails == null) mssge = "Item details is not available!";

    return res.send({
      message: mssge,
      data: itemDetails,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message:
        "Some error occurred while extracting particular item details details for site allocation",
    });
  }
};

exports.salesOrderNo_site = async (req, res) => {
  console.log("Sales order number list for site allocation");
  try {
    const {
      company_code,
      plant_id,
      delivery_date,
      doc_type,
      customer_distribution_channel,
      customer_no,
    } = req.query;

    if (
      !(
        company_code &&
        plant_id &&
        delivery_date &&
        doc_type &&
        customer_distribution_channel &&
        customer_no
      )
    )
      return res
        .status(400)
        .send({ message: "Please provide required parameters" });

    const distribution_channel = customer_distribution_channel.split(",");

    const salesOrderNoList = await db.soAllocation
      .find(
        {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          sales_document_type: doc_type,
          distribution_channel: { $in: distribution_channel },
          customer_code: customer_no,
        },
        {
          _id: 0,
          sales_order_no: 1,
        }
      )
      .sort({ material_name: 1 });

    let uniqueObjects = [
      ...new Map(
        salesOrderNoList.map((so_no) => [so_no.sales_order_no, so_no])
      ).values(),
    ];

    let mssge = "Sales order number is available";

    if (uniqueObjects.length == 0)
      mssge = "Sales order number is not available!";

    return res.send({
      message: mssge,
      totalDataCount: uniqueObjects.length,
      data: uniqueObjects,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message:
        "Some error occurred while extracting item name list for site allocation",
    });
  }
};
exports.itemNameList_site = async (req, res) => {
  console.log("customer ordered item name list for site allocation");
  try {
    const {
      all_items,
      company_code,
      plant_id,
      delivery_date,
      doc_type,
      customer_distribution_channel,
      customer_no,
      so_no,
    } = req.query;

    if (
      !(
        all_items &&
        company_code &&
        plant_id &&
        delivery_date &&
        doc_type &&
        customer_distribution_channel &&
        customer_no &&
        so_no
      )
    )
      return res
        .status(400)
        .send({ message: "Please provide required parameters" });

    const distribution_channel = customer_distribution_channel.split(",");

    let filter = {
      company_code: company_code,
      plant_id: plant_id,
      delivery_date: delivery_date,
      sales_document_type: doc_type,
      distribution_channel: { $in: distribution_channel },
      customer_code: customer_no,
      sales_order_no: so_no,
    };

    if (all_items == "true") {
    } else if (all_items == "false") filter.pending_qty = { $ne: 0 };
    else
      return res
        .status(400)
        .send({ message: "Provide either true or false in all_items field" });

    const itemsList = await db.soAllocation
      .find(filter, {
        _id: 0,
        item_no: 1,
        material_no: 1,
        material_name: 1,
      })
      .sort({ material_name: 1 });

    // let uniqueObjects = [
    //   ...new Map(itemsList.map((items) => [items.item_no, items])).values(),
    // ];

    let mssge = "Item name list is available";

    if (itemsList.length == 0) mssge = "Item name list is not available!";

    return res.send({
      message: mssge,
      totalDataCount: itemsList.length,
      data: itemsList,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message:
        "Some error occurred while extracting item name list for site allocation",
    });
  }
};

exports.customerList_sku = async (req, res) => {
  console.log("get custormer_list with sales_order_no for sku allocation");
  try {
    const {
      company_code,
      plant_id,
      all_customers,
      delivery_date,
      customer_distribution_channel,
      item_code,
    } = req.query;

    if (
      !(
        company_code &&
        plant_id &&
        all_customers &&
        delivery_date &&
        customer_distribution_channel &&
        item_code
      )
    )
      return res
        .status(400)
        .send({ message: "Please provide required parameters" });

    const distribution_channel = customer_distribution_channel.split(",");

    let filter = {
      company_code: company_code,
      plant_id: plant_id,
      delivery_date: delivery_date,
      distribution_channel: { $in: distribution_channel },
      material_no: item_code,
    };

    if (all_customers == "true") {
    } else if (all_customers == "false") filter.pending_qty = { $ne: 0 };
    else
      return res.status(400).send({
        message: "Provide either true or false in all_customers field",
      });

    const customerList = await db.soAllocation.aggregate([
      {
        $match: filter,
      },
      {
        $project: {
          _id: 0,
          customer_code: 1,
          customer_and_so_no: {
            $concat: ["$customer_name", "-", "$sales_order_no"],
          },
          item_no: 1,
        },
      },
      { $sort: { customer_and_so_no: 1 } },
    ]);

    // const uniqueObjects = [
    //   ...new Map(
    //     customerList.map((so_no) => [so_no.customer_and_so_no, so_no])
    //   ).values(),
    // ];

    let mssge = "Customer list is available";

    if (customerList.length == 0) mssge = "Customer list is not available!";

    return res.send({
      message: mssge,
      data: customerList,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message:
        "Some error occurred while extracting customer list for sku allocation",
    });
  }
};

exports.itemDetails_sku = async (req, res) => {
  console.log("Particular sales order details for sku allocation");
  try {
    const {
      company_code,
      plant_id,
      delivery_date,
      customer_distribution_channel,
      customer_no,
      so_no,
      item_code,
      item_no,
    } = req.query;

    if (
      !(
        company_code &&
        plant_id &&
        delivery_date &&
        customer_distribution_channel &&
        customer_no &&
        so_no &&
        item_code &&
        item_no
      )
    )
      return res
        .status(400)
        .send({ message: "Please provide required parameters" });

    const distribution_channel = customer_distribution_channel.split(",");

    const itemDetails = await db.soAllocation.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        delivery_date: delivery_date,
        distribution_channel: { $in: distribution_channel },
        customer_code: customer_no,
        sales_order_no: so_no,
        material_no: item_code,
        item_no: item_no,
      },
      {
        _id: 0,
        sales_order_no: 1,
        customer_name: 1,
        customer_code: 1,
        distribution_channel: 1,
        item_no: 1,
        material_no: 1,
        material_name: 1,
        order_qty: 1,
        pending_qty: 1,
        allocated_qty: 1,
        uom: 1,
      }
    );
    let mssge = "item details is available";

    if (itemDetails == null) mssge = "Item details is not available!";

    return res.send({
      message: mssge,
      data: itemDetails,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message:
        "Some error occurred while extracting customer list for sku allocation",
    });
  }
};

exports.getRouteIds = async (req, res) => {
  console.log("Getting request for route ids");
  const company_code = req.query.company_code;
  const plant_id = req.query.plant_id;
  const delivery_date = req.query.delivery_date;
  if (!(company_code && plant_id && delivery_date)) {
    return res.status(400).send({
      status_code: 400,
      message: "Please provide company code, plant id and delivery date",
    });
  }

  const query = {
    company_code: company_code,
    plant_id: plant_id,
    delivery_date: delivery_date,
  };

  await db.soAllocation
    .find(query)
    .select({ route_id: 1 })
    .then((salesOrderData) => {
      let data = [];
      if (salesOrderData.length != 0) {
        salesOrderData.map((eachDoc) => {
          let resObj = {
            route_id: eachDoc.route_id,
          };
          const indexOfItem = data.findIndex(
            (item) => item.route_id === resObj.route_id
          );
          if (indexOfItem === -1) {
            // not existing
            data.push(resObj);
          }
        });
      }
      if (data.length === 0) {
        resMessage = "list of route ids not found";
      } else {
        resMessage = "list of route ids found";
      }
      return res.status(200).send({
        status_code: 200,
        message: resMessage,
        data: data,
      });
    })
    .catch((err) => {
      return res.status(500).send({
        status_code: 500,
        message: "Internal db error",
      });
    });
};

// single bin so detail

// get so on delivery_date

exports.get_sales_order_detail = async (req, res) => {
  console.log("sales order from");
  // let totalDataCount = await Tutorial.countDocuments();

  const { company_code, delivery_date, plant_id } = req.query;

  if (!(company_code && delivery_date && plant_id))
    return res.status(400).send({
      status_code: "400",
      message:
        "Please provide all parameters inludes Company Code, Plant Id, Delivery Date.",
    });

  const check = [];

  // await Tutorial.find({"$and":[{ "dateOfDelivery": { "$gte": new Date(req.query.dateOfDelivery) } },{ "dateOfDelivery": { "$lt":new Date(sd1)} }]})
  await db.soAllocation
    .aggregate([
      {
        $match: {
          plant_id: { $eq: plant_id },
          // company_code: { $eq: company_code },
          // dateOfDelivery: {
          //   $gte: new Date(delivery_date),
          //   $lt: new Date(sd1),
          // },
          pending_qty: { $ne: 0 },
          delivery_date: { $eq: delivery_date },
        },
      },

      { $group: { _id: "$sales_order_no", data: { $first: "$$ROOT" } } },
      {
        $lookup: {
          from: "rapid_jobschedulers",
          localField: "data.sales_order_no",
          foreignField: "sales_order_no",
          as: "Newwww",
        },
      },
      { $sort: { _id: -1 } },
    ])
    .then((data) => {
      // res.send({data:data})
      // console.log("check_length", data);
      if (data.length > 0) {
        console.log("for_now", data.length);

        JSON.parse(JSON.stringify(data)).map((item, idx) => {
          // console.log("everything", item.data && item.data.created_at);

          //  console.log("isit",item.data.sales_order_no)

          if (item.data.sales_order_no != undefined) {
            var created_at_date =
              (item.data && item.data.createdAt) ||
              (item.data && item.data.created_at);

            check.push({
              SrNo: idx + 1,
              _id: item.data._id,
              sales_order_no: item.data.sales_order_no,
              customer_name: item.data.customer_name,
              sales_document_type: item.data.sales_document_type,
              // customer_ref_no: item.data.customer_ref_no,
              // cust_ref_date: item.data.cust_ref_date,
              // ship_to_party: item.data.ship_to_party,
              sold_to_party: item.data.customer_code,
              sold_to_party_description: item.data.customer_name,
              dateOfDelivery: moment(item.data.delivery_date).format(
                "DD-MM-YYYY"
              ),

              dateOfOrderPlacing: item.data.order_placing_date
                ? moment(
                  item.data.order_placing_date &&
                    item.data.order_placing_date.includes("T")
                    ? item.data.order_placing_date &&
                    item.data.order_placing_date.split("T")[0]
                    : item.data.order_placing_date &&
                    item.data.order_placing_date.split(" ")[0]
                ).format("DD-MM-YYYY")
                : moment(item.data.delivery_date).format("DD-MM-YYYY"),

              binId: item.Newwww.length > 0 ? item.Newwww[0].binId : "_",
              status:
                item.Newwww.length > 0 && item.Newwww[0].binId
                  ? item.Newwww[0].status
                  : "pending",
              bin_status:
                item.Newwww.length > 0 && item.Newwww[0].bin_status
                  ? item.Newwww[0].bin_status
                  : 0,
              items: item.data.items,
            });
          }
        });

        if (check.length == 0)
          return res.status(200).send({
            status_code: "200",
            message: "Sales order list is not available!",
            totalDataCount: check.length,
            data: check,
          });
        else
          return res.status(200).send({
            status_code: "200",
            message: "Sales order list is available!",
            totalDataCount: check.length,
            data: check,
          });
      } else {
        return res.status(200).send({
          status_code: "200",
          message: "Sales order is not available!",
          data: check,
        });
      }
    })
    .catch((err) => {
      console.log(err);

      res.status(500).send({
        status_code: "500",
        message:
          err.message || "Some error occurred while retrieving tutorials.",
      });
    });
};

// get sales order w/o check of pending qty

exports.get_all_sales_order_detail = async (req, res) => {
  console.log("sales order from");
  // let totalDataCount = await Tutorial.countDocuments();

  const { company_code, delivery_date, plant_id } = req.query;

  if (!(company_code && delivery_date && plant_id))
    return res.status(400).send({
      status_code: "400",
      message:
        "Please provide all parameters inludes Company Code, Plant Id, Delivery Date.",
    });

  const check = [];

  // await Tutorial.find({"$and":[{ "dateOfDelivery": { "$gte": new Date(req.query.dateOfDelivery) } },{ "dateOfDelivery": { "$lt":new Date(sd1)} }]})
  await db.soAllocation
    .aggregate([
      {
        $match: {
          plant_id: { $eq: plant_id },
          company_code: { $eq: company_code },
          // dateOfDelivery: {
          //   $gte: new Date(delivery_date),
          //   $lt: new Date(sd1),
          // },
          // pending_qty: { $ne: 0 },
          delivery_date: { $eq: delivery_date },
        },
      },

      { $group: { _id: "$sales_order_no", lotting_loss: { $sum: "$lotting_loss" }, data: { $first: "$$ROOT" } } },
      {
        $lookup: {
          from: "rapid_jobschedulers",
          localField: "data.sales_order_no",
          foreignField: "sales_order_no",
          as: "Newwww",
        },
      },
      { $sort: { _id: -1 } },
    ])
    .then((data) => {
      // res.send({data:data})
      // console.log("check_length", data);
      if (data.length > 0) {
        // console.log("for_now", data.length);

        JSON.parse(JSON.stringify(data)).map((item, idx) => {
          // console.log("everything", item.data && item.data.created_at);

          //  console.log("isit",item.data.sales_order_no)

          if (item.data.sales_order_no != undefined) {
            var created_at_date =
              (item.data && item.data.createdAt) ||
              (item.data && item.data.created_at);

            check.push({
              SrNo: idx + 1,
              _id: item.data._id,
              sales_order_no: item.data.sales_order_no,
              lotting_loss: item.lotting_loss,
              customer_name: item.data.customer_name,
              sales_document_type: item.data.sales_document_type,
              // customer_ref_no: item.data.customer_ref_no,
              // cust_ref_date: item.data.cust_ref_date,
              // ship_to_party: item.data.ship_to_party,
              distribution_channel: item.data.distribution_channel,
              distribution_channel_description:
                item.data.distribution_channel_description,
              route_id: item.data.route_id,
              sold_to_party: item.data.customer_code,
              sold_to_party_description: item.data.customer_name,
              dateOfDelivery: moment(item.data.delivery_date).format(
                "DD-MM-YYYY"
              ),

              dateOfOrderPlacing: item.data.order_placing_date
                ? moment(
                  item.data.order_placing_date &&
                    item.data.order_placing_date.includes("T")
                    ? item.data.order_placing_date &&
                    item.data.order_placing_date.split("T")[0]
                    : item.data.order_placing_date &&
                    item.data.order_placing_date.split(" ")[0]
                ).format("DD-MM-YYYY")
                : moment(item.data.delivery_date).format("DD-MM-YYYY"),

              binId: item.Newwww.length > 0 ? item.Newwww[0].binId : "_",
              status:
                item.Newwww.length > 0 && item.Newwww[0].binId
                  ? item.Newwww[0].status
                  : "pending",
              bin_status:
                item.Newwww.length > 0 && item.Newwww[0].bin_status
                  ? item.Newwww[0].bin_status
                  : 0,
              items: item.data.items,
            });
          }
        });

        if (check.length == 0)
          return res.status(200).send({
            status_code: "200",
            message: "Sales order list is not available!",
            totalDataCount: check.length,
            data: check,
          });
        else
          return res.status(200).send({
            status_code: "200",
            message: "Sales order list is available!",
            totalDataCount: check.length,
            data: check,
          });
      } else {
        return res.status(200).send({
          status_code: "200",
          message: "Sales order is not available!",
          data: check,
        });
      }
    })
    .catch((err) => {
      console.log(err);

      res.status(500).send({
        status_code: "500",
        message:
          err.message || "Some error occurred while retrieving tutorials.",
      });
    });
};

exports.get_all_sales_order_detail_v2 = async (req, res) => {
  console.log("sales order from");
  // let totalDataCount = await Tutorial.countDocuments();

  const { company_code, delivery_date, plant_id, route_id } = req.query;

  if (!(company_code && delivery_date && plant_id))
    return res.status(400).send({
      status_code: "400",
      message:
        "Please provide all parameters inludes Company Code, Plant Id, Delivery Date, Route Id.",
    });

  const check = [];
  let condition = {};
  condition.plant_id = { $eq: plant_id };
  condition.company_code = { $eq: company_code };
  condition.delivery_date = { $eq: delivery_date };

  if (route_id){
    let route_id_array  = route_id.split(",")
    condition.route_id = { $in: route_id_array };
  }
  

  // await Tutorial.find({"$and":[{ "dateOfDelivery": { "$gte": new Date(req.query.dateOfDelivery) } },{ "dateOfDelivery": { "$lt":new Date(sd1)} }]})
  await db.soAllocation
    .aggregate([
      {
        $match: condition
      },

      { $group: { _id: "$sales_order_no", lotting_loss: { $sum: "$lotting_loss" }, data: { $first: "$$ROOT" } } },
      {
        $lookup: {
          from: "rapid_jobschedulers",
          localField: "data.sales_order_no",
          foreignField: "sales_order_no",
          as: "Newwww",
        },
      },
      { $sort: { _id: -1 } },
    ])
    .then((data) => {
      // res.send({data:data})
      // console.log("check_length", data);
      if (data.length > 0) {
        // console.log("for_now", data.length);

        JSON.parse(JSON.stringify(data)).map((item, idx) => {
          // console.log("everything", item.data && item.data.created_at);

          //  console.log("isit",item.data.sales_order_no)

          if (item.data.sales_order_no != undefined) {
            var created_at_date =
              (item.data && item.data.createdAt) ||
              (item.data && item.data.created_at);

            check.push({
              SrNo: idx + 1,
              _id: item.data._id,
              sales_order_no: item.data.sales_order_no,
              lotting_loss: item.lotting_loss,
              customer_name: item.data.customer_name,
              sales_document_type: item.data.sales_document_type,
              // customer_ref_no: item.data.customer_ref_no,
              // cust_ref_date: item.data.cust_ref_date,
              // ship_to_party: item.data.ship_to_party,
              distribution_channel: item.data.distribution_channel,
              distribution_channel_description:
                item.data.distribution_channel_description,
              route_id: item.data.route_id,
              sold_to_party: item.data.customer_code,
              sold_to_party_description: item.data.customer_name,
              dateOfDelivery: moment(item.data.delivery_date).format(
                "DD-MM-YYYY"
              ),

              dateOfOrderPlacing: item.data.order_placing_date
                ? moment(
                  item.data.order_placing_date &&
                    item.data.order_placing_date.includes("T")
                    ? item.data.order_placing_date &&
                    item.data.order_placing_date.split("T")[0]
                    : item.data.order_placing_date &&
                    item.data.order_placing_date.split(" ")[0]
                ).format("DD-MM-YYYY")
                : moment(item.data.delivery_date).format("DD-MM-YYYY"),

              binId: item.Newwww.length > 0 ? item.Newwww[0].binId : "_",
              status:
                item.Newwww.length > 0 && item.Newwww[0].binId
                  ? item.Newwww[0].status
                  : "pending",
              bin_status:
                item.Newwww.length > 0 && item.Newwww[0].bin_status
                  ? item.Newwww[0].bin_status
                  : 0,
              items: item.data.items,
            });
          }
        });

        if (check.length == 0)
          return res.status(200).send({
            status_code: "200",
            message: "Sales order list is not available!",
            totalDataCount: check.length,
            data: check,
          });
        else
          return res.status(200).send({
            status_code: "200",
            message: "Sales order list is available!",
            totalDataCount: check.length,
            data: check,
          });
      } else {
        return res.status(200).send({
          status_code: "200",
          message: "Sales order is not available!",
          data: check,
        });
      }
    })
    .catch((err) => {
      console.log(err);

      res.status(500).send({
        status_code: "500",
        message:
          err.message || "Some error occurred while retrieving tutorials.",
      });
    });
};

exports.download_all_sales_order_detail = async (req, res) => {
  console.log("download_all_sales_order_detail");
  // let totalDataCount = await Tutorial.countDocuments();

  const { company_code, delivery_date, plant_id } = req.query;

  if (!(company_code && delivery_date && plant_id))
    return res.status(400).send({
      status_code: "400",
      message:
        "Please provide all parameters inludes Company Code, Plant Id, Delivery Date.",
    });

  const check = [];

  // await Tutorial.find({"$and":[{ "dateOfDelivery": { "$gte": new Date(req.query.dateOfDelivery) } },{ "dateOfDelivery": { "$lt":new Date(sd1)} }]})
  await db.soAllocation
    .aggregate([
      {
        $match: {
          plant_id: { $eq: plant_id },
          company_code: { $eq: company_code },
          // dateOfDelivery: {
          //   $gte: new Date(delivery_date),
          //   $lt: new Date(sd1),
          // },
          // pending_qty: { $ne: 0 },
          delivery_date: { $eq: delivery_date },
        },
      },

      { $group: { _id: "$sales_order_no", data: { $first: "$$ROOT" } } },
      {
        $lookup: {
          from: "rapid_jobschedulers",
          localField: "data.sales_order_no",
          foreignField: "sales_order_no",
          as: "Newwww",
        },
      },
      { $sort: { _id: -1 } },
    ])
    .then(async (data) => {
      // res.send({data:data})
      // console.log("check_length", data);
      if (data.length > 0) {
        // console.log("for_now", data.length);

        JSON.parse(JSON.stringify(data)).map((item, idx) => {
          // console.log("everything", item.data && item.data.created_at);

          //  console.log("isit",item.data.sales_order_no)

          if (item.data.sales_order_no != undefined) {
            var created_at_date =
              (item.data && item.data.createdAt) ||
              (item.data && item.data.created_at);

            check.push({
              SrNo: idx + 1,
              _id: item.data._id,
              sales_order_no: item.data.sales_order_no,
              customer_name: item.data.customer_name,
              sales_document_type: item.data.sales_document_type,
              // customer_ref_no: item.data.customer_ref_no,
              // cust_ref_date: item.data.cust_ref_date,
              // ship_to_party: item.data.ship_to_party,
              distribution_channel: item.data.distribution_channel,
              distribution_channel_description:
                item.data.distribution_channel_description,
              route_id: item.data.route_id,
              sold_to_party: item.data.customer_code,
              sold_to_party_description: item.data.customer_name,
              dateOfDelivery: moment(item.data.delivery_date).format(
                "DD-MM-YYYY"
              ),

              dateOfOrderPlacing: item.data.order_placing_date
                ? moment(
                  item.data.order_placing_date &&
                    item.data.order_placing_date.includes("T")
                    ? item.data.order_placing_date &&
                    item.data.order_placing_date.split("T")[0]
                    : item.data.order_placing_date &&
                    item.data.order_placing_date.split(" ")[0]
                ).format("DD-MM-YYYY")
                : moment(item.data.delivery_date).format("DD-MM-YYYY"),

              binId: item.Newwww.length > 0 ? item.Newwww[0].binId : "_",
              status:
                item.Newwww.length > 0 && item.Newwww[0].binId
                  ? item.Newwww[0].status
                  : "pending",
              bin_status:
                item.Newwww.length > 0 && item.Newwww[0].bin_status
                  ? item.Newwww[0].bin_status
                  : 0,
              items: item.data.items,
            });
          }
        });

        if (check.length == 0)
          return res.status(200).send({
            status_code: "200",
            message: "Sales order list is not available!",
            totalDataCount: check.length,
            data: check,
          });
        else {
          const workbook = new excelJS.Workbook(); // Create a new workbook
          const worksheet = workbook.addWorksheet("SO List"); // New Worksheet
          const path = "./app/downloads"; // Path to download excel

          // Column for data in excel. key must match data key
          worksheet.columns = [
            { header: "SrNo", key: "SrNo", width: 10 },
            { header: "_id", key: "_id", width: 10 },
            { header: "sales_order_no", key: "sales_order_no", width: 10 },
            { header: "customer_name", key: "customer_name", width: 10 },
            {
              header: "sales_document_type",
              key: "sales_document_type",
              width: 10,
            },
            {
              header: "distribution_channel",
              key: "distribution_channel",
              width: 10,
            },
            {
              header: "distribution_channel_description",
              key: "distribution_channel_description",
              width: 10,
            },
            { header: "route_id", key: "route_id", width: 10 },
            { header: "sold_to_party", key: "sold_to_party", width: 10 },
            {
              header: "sold_to_party_description",
              key: "sold_to_party_description",
              width: 10,
            },
            { header: "dateOfDelivery", key: "dateOfDelivery", width: 10 },
            {
              header: "dateOfOrderPlacing",
              key: "dateOfOrderPlacing",
              width: 10,
            },
            { header: "binId", key: "binId", width: 10 },
            { header: "status", key: "status", width: 10 },
            { header: "bin_status", key: "bin_status", width: 10 },
          ];

          check.forEach((element) => {
            worksheet.addRow(element); // Add data in worksheet
          });

          // Making first line in excel bold
          worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true };
          });

          res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          );
          res.setHeader(
            "Content-Disposition",
            "attachment; filename=" + "tutorials.xlsx"
          );

          // return workbook.xlsx.write(res).then(function () {
          //   res.status(200).end();
          // });

          await workbook.xlsx.writeFile(`${path}/so_list.xlsx`)

          let reqPath = path_module.join(__dirname, '../../../')
          console.log("reqPath", reqPath)

          return res.status(200).send({
            status_code: "200",
            message: "Sales order list is available for download!",
            totalDataCount: check.length
          });
        }
      } else {
        return res.status(200).send({
          status_code: "200",
          message: "Sales order is not available!",
          data: check,
        });
      }
    })
    .catch((err) => {
      console.log(err);

      res.status(500).send({
        status_code: "500",
        message:
          err.message || "Some error occurred while retrieving tutorials.",
      });
    });
};

// Find a single Tutorial with an id
exports.get_sales_order_detail_on_sales_order_number = async (req, res) => {
  const { company_code, plant_id, sales_order_no } = req.query;

  if (!(company_code && plant_id && sales_order_no))
    return res.status(400).send({
      status_code: "400",
      message:
        "Please provide all parameters inludes Company Code, Plant Id and Sales Order Number",
    });

  //db.soAllocation

  const final_result = {};

  const item_detail_array = [];

  await db.soAllocation
    .aggregate([
      {
        $match: {
          plant_id: { $eq: plant_id },
          // company_code: { $eq: company_code },
          sales_order_no: { $eq: sales_order_no },
        },
      },
      {
        $addFields: {
          convertedQty: { $toInt: "$item_no" },
        },
      },
      // { $group: { _id: "$sales_order_no", data: { $first: "$$ROOT" } } },
      {
        $lookup: {
          from: "rapid_jobschedulers",
          localField: "sales_order_no",
          foreignField: "sales_order_no",
          as: "Newwww",
        },
      },
      {
        $lookup: {
          from: "rapid_secondary_storages",
          localField: "material_no",
          foreignField: "material_code",
          as: "secondary_discrete_detail",
        },
      },
      { $sort: { convertedQty: 1 } },
    ])

    // Tutorial.find({sales_order_no})

    .then((data) => {
      // console.log("RECENT",data)
      // console.log(data);

      if (data.length > 0) {
        final_result["salesOrderId"] = data[0].sales_order_no;

        final_result["sold_to_party"] = data[0].customer_code;

        final_result["sold_to_party_description"] = data[0].customer_name;

        // final_result["dateOfOrderPlacing"] = data[0].DateOfOrderPlacing;

        // moment( item.data.delivery_date).format("DD-MM-YYYY"),
        // JSON.parse(JSON.stringify(data))

        (final_result["dateOfOrderPlacing"] = data[0].order_placing_date
          ? moment(
            data[0].order_placing_date &&
              JSON.parse(JSON.stringify(data[0])).order_placing_date.includes(
                "T"
              )
              ? data[0].order_placing_date &&
              JSON.parse(
                JSON.stringify(data[0])
              ).order_placing_date.split("T")[0]
              : data[0].order_placing_date &&
              JSON.parse(
                JSON.stringify(data[0])
              ).order_placing_date.split(" ")[0]
          ).format("DD-MM-YYYY")
          : moment(data[0].delivery_date).format("DD-MM-YYYY")),
          //

          (final_result["delivery_date"] = moment(data[0].delivery_date).format(
            "DD-MM-YYYY"
          ));

        // add following code to remove non discrete item from get sales order detail api
        // const discrete_item_detail = await db.discrete_item.find({
        //   company_code: req.query.company_code,
        //   plant_id: req.query.plant_id,
        // });

        // var discrete_item_number_array = [];

        // const discrete_item_number = await discrete_item_detail.map(
        //   (item, idx) => {
        //     discrete_item_number_array.push(item.item_code);
        //   }
        // );

        // if(discrete_item_number_array.includes(item.material_no)){
        //   item_detail_array.push({
        //     itemId: item.material_no,
        //     itemName: item.material_name,
        //     qty: item.order_qty,
        //     pending_qty: item.pending_qty,
        //   });
        // }

        data.map((item, idx) => {
          // console.log("ASdasdasd",item)
          item_detail_array.push({
            itemId: item.material_no,
            itemName: item.material_name,
            qty: item.order_qty,
            pending_qty: item.pending_qty,
            allocated_qty: item.allocated_qty,
            secondary_mt: item.secondary_discrete_detail.length
              ? item.secondary_discrete_detail[0].material_code
              : "NA",
            secondary_rack_location: item.secondary_discrete_detail.length
              ? item.secondary_discrete_detail[0].location_id
              : "NA",
            stock_available: item.secondary_discrete_detail.length
              ? item.secondary_discrete_detail[0].total_stock
              : 0,
          });
        });

        final_result["items"] = item_detail_array;

        var entry_value = [
          {
            data: final_result,
            binId: data[0].Newwww.length > 0 ? data[0].Newwww[0].binId : "_",

            status:
              data[0].Newwww.length > 0 ? data[0].Newwww[0].status : "pending",

            bin_status:
              data[0].Newwww.length > 0 ? data[0].Newwww[0].bin_status : 0,
          },
        ];
      }

      if (data.length == 0) mssge = "Sales Order Details Is Not Available!";
      else mssge = "Sales Order Details Is Available!";

      return res
        .status(200)
        .send({ status_code: "200", message: mssge, data: entry_value });
    })
    .catch((err) => {
      res.status(500).send({
        status_code: "500",
        message: err.message,
      });
    });
};
