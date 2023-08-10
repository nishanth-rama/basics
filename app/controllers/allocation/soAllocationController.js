const db = require("../../models");
const moment = require("moment");
const { update } = require("lodash");
const so_allocation_table = db.soAllocation;
const trips_table = db.trips;
const axios = require("axios");
const moment_tz = require("moment-timezone");
const unwind = require("javascript-unwind");
const base_url = process.env.BASE_URL;
//const mongoose = require("mongoose");
const ObjectId = require("mongodb").ObjectId;
const { product_weight_model } = require("../../models");

exports.summary_report = async (req, res) => {
  console.log("summary_report");
  const { company_code, plant_id, from_date, to_date } = req.query;

  try {
    if (!(company_code && plant_id && from_date && to_date))
      return res.status(400).send({
        status_code: 400,
        message:
          "Provide all parameters like company code, plant id, from date and to date",
      });

    var condition = {};
    if (req.query.mode) {
      // console.log("true");
      condition = {
        "allocation_detail.mode": req.query.mode,
      };
    }
    (condition.company_code = company_code),
      (condition.plant_id = plant_id),
      (condition.delivery_date = { $gte: from_date, $lte: to_date });

    // let result = await Promise.all([
    //   so_allocation_table.aggregate([{$match: condition},{$group:{_id: "$route_id"}}]),
    //   so_allocation_table.aggregate([{$match: condition},{$group:{_id: "$sales_order_no"}}]),
    //   so_allocation_table.aggregate([{$match: condition},{$group:{_id: "$material_no"}}]),
    //   so_allocation_table.aggregate([{$match: condition},{$group:{_id: "$plant_id", allocated_qty: {$sum: "$allocated_qty"},order_qty:{$sum: "$order_qty"}}}]),
    //   so_allocation_table.aggregate([{$match: condition},{$unwind: "$allocation_detail"},{$sort: {"allocation_detail.entry_time":1}},{$limit:1}]),
    //   so_allocation_table.aggregate([{$match: condition},{$unwind: "$allocation_detail"},{$sort: {"allocation_detail.entry_time":-1}},{$limit:1}])
    // ]);

    // // console.log(result);

    // let routes_list = result[0];
    // let sales_order_no_list = result[1];
    // let sku_list = result[2];
    // let summed_qty = result[3];
    // let starting_time = result[4];
    // let ending_time = result[5];

    let routes_list = await so_allocation_table.aggregate([
      { $match: condition },
      { $group: { _id: "$route_id" } },
    ]);
    let sales_order_no_list = await so_allocation_table.aggregate([
      { $match: condition },
      { $group: { _id: "$sales_order_no" } },
    ]);
    let sku_list = await so_allocation_table.aggregate([
      { $match: condition },
      { $group: { _id: "$material_no" } },
    ]);
    let summed_qty = await so_allocation_table.aggregate([
      { $match: condition },
      {
        $group: {
          _id: "$plant_id",
          allocated_qty: { $sum: "$allocated_qty" },
          order_qty: { $sum: "$order_qty" },
        },
      },
    ]);
    let starting_time = await so_allocation_table.aggregate([
      { $match: condition },
      { $unwind: "$allocation_detail" },
      { $sort: { "allocation_detail.entry_time": 1 } },
      { $limit: 1 },
    ]);
    let ending_time = await so_allocation_table.aggregate([
      { $match: condition },
      { $unwind: "$allocation_detail" },
      { $sort: { "allocation_detail.entry_time": -1 } },
      { $limit: 1 },
    ]);
    let exact_starting_time = starting_time[0].allocation_detail;
    let exact_ending_time = ending_time[0].allocation_detail;
    // console.log(exact_ending_time.entry_time,exact_starting_time.entry_time);

    var resnd =
      Math.abs(exact_ending_time.entry_time - exact_starting_time.entry_time) /
      1000;
    // get total days between two dates
    var days = Math.floor(resnd / 86400);
    // console.log("days",days);

    // get hours
    var hours = Math.floor(resnd / 3600) % 24;
    // console.log("days",hours);

    // get minutes
    var minutes = Math.floor(resnd / 60) % 60;
    // console.log("days",minutes);

    // get seconds
    var seconds = Math.floor(resnd % 60);
    // console.log("days",seconds);

    let days_in_seconds = days * 86400;
    let hours_in_seconds = hours * 3600;
    let minutes_in_seconds = minutes * 60;
    let total_seconds =
      days_in_seconds + hours_in_seconds + minutes_in_seconds + seconds;
    let total_hours = Math.floor(total_seconds / 3600);
    // console.log("total_seconds",total_seconds,total_hours,summed_qty[0].allocated_qty,(summed_qty[0].allocated_qty/total_seconds)*3600);

    let response = {};
    response.routes_count = routes_list.length;
    response.sales_order_no_count = sales_order_no_list.length;
    response.sku_list = sku_list.length;
    response.summed_ordered_qty = summed_qty[0].order_qty;
    response.summed_allocated_qty = summed_qty[0].allocated_qty;
    response.total_hours_used = total_hours + ":" + minutes + ":" + seconds;
    response.allocated_qty_per_hour = (
      (summed_qty[0].allocated_qty / total_seconds) *
      3600
    ).toFixed(3);

    return res.status(200).send({
      status_code: "200",
      status_message: "Allocation Summary Report",
      data: response,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        err.message ||
        "Some error occurred while retrieving allocation details.",
    });
  }
};

exports.addAllocation = async (req, res) => {
  try {
    if (
      !(
        req.body.sales_order_no &&
        req.body.customer_code &&
        req.body.item_no &&
        req.body.material_no &&
        req.body.plant_id &&
        req.body.company_code &&
        req.body.crate_barcode &&
        req.body.user_name
      )
    ) {
      return res
        .status(400)
        .send({ status_code: "400", message: "Missing parameter." });
    }

    let so_allocation_condition = {
      sales_order_no: req.body.sales_order_no,
      customer_code: req.body.customer_code,
      item_no: req.body.item_no,
      material_no: req.body.material_no,
      plant_id: req.body.plant_id,
      company_code: req.body.company_code,
    };

    let allocation_data = await so_allocation_table.findOne(
      so_allocation_condition
    );

    if (!allocation_data) {
      return res.status(400).send({
        status_code: "400",
        message: "Invalid Conditions received",
      });
    }
    if (
      parseFloat(allocation_data.order_qty) <
      parseFloat(allocation_data.allocated_qty) +
        parseFloat(req.body.net_weight)
    ) {
      return res.status(400).send({
        status_code: "400",
        message: "Could Not Allocate More than the Ordered Quantity",
      });
    }

    let crate_barcode_used_status = allocation_data.allocation_detail.find(
      (element) => element.crate_barcode == req.body.crate_barcode
    );
    if (crate_barcode_used_status)
      return res.status(400).send({
        status_code: "400",
        message: "Could Not Allocate with the same Crate Barcode",
      });
    else {
      let allocation_id = allocation_data._id;
      let update_data = {};
      // console.log(typeof(allocation_data.allocated_qty));
      // console.log(typeof(parseFloat(req.body.net_weight)));
      update_data.allocated_qty =
        parseFloat(allocation_data.allocated_qty) +
        parseFloat(req.body.net_weight);
      update_data.pending_qty =
        parseFloat(allocation_data.pending_qty) -
        parseFloat(req.body.net_weight);
      update_data.create_count = allocation_data.create_count + 1;
      update_data.allocation_detail = allocation_data.allocation_detail;

      push_data = {};
      push_data.user_name = req.body.user_name;
      push_data.crate_barcode = req.body.crate_barcode;
      push_data.tare_weight = parseFloat(req.body.tare_weight);
      push_data.gross_weight = parseFloat(req.body.gross_weight);
      push_data.net_weight = parseFloat(req.body.net_weight);
      push_data.entry_time = new Date();

      update_data.allocation_detail.push(push_data);

      let updated_data = await so_allocation_table.findByIdAndUpdate(
        { _id: allocation_id },
        update_data,
        { useFindAndModify: false }
      );

      let temp_url = `${base_url}api/allocation/get_sku_based_allocation?sales_order_no=`;
      temp_url += req.body.sales_order_no;
      temp_url += "&customer_code=";
      temp_url += req.body.customer_code;
      temp_url += "&distribution_channel=";
      temp_url += allocation_data.distribution_channel;
      temp_url += "&material_no=";
      temp_url += req.body.material_no;
      temp_url += "&item_no=";
      temp_url += req.body.item_no;
      temp_url += "&company_code=";
      temp_url += req.body.company_code;
      temp_url += "&plant_id=";
      temp_url += req.body.plant_id;
      temp_url += "&delivery_date=";
      temp_url += allocation_data.delivery_date;

      var options = {
        method: "get",
        url: temp_url,
      };

      axios
        .request(options)
        .then(function (response) {
          // console.log(response);
          res.send(response.data);
        })
        .catch(function (error) {
          res.status(400).send({
            status_code: "400",
            message:
              error.message ||
              "Some error occurred while retrieving allocation details.",
          });
        });
    }
  } catch (err) {
    res.status(500).send({
      status_code: "500",
      message:
        err.message ||
        "Some error occurred while retrieving allocation details.",
    });
  }
};

exports.getSiteBasedAllocation = (req, res) => {
  if (!req.query.createdAt) {
    return res.status(400).send({ message: "Missing parameter." });
  }
  const datee = new Date(req.query.createdAt);
  let sd1 = datee.setHours(datee.getHours() + 24);
  console.log("createdAt", new Date(req.query.createdAt));
  console.log("sd1", new Date(sd1));

  so_allocation_detail_table
    .find({
      createdAt: { $gte: new Date(req.query.createdAt), $lt: new Date(sd1) },
    })
    .sort({ updatedAt: -1 })
    .then((data) => {
      if (data.length) {
        res.status(200).send({
          totalDataCount: data.length,
          message: "Site Based Allocation list is available!",
          data: data,
        });
      } else {
        res.status(200).send({
          totalDataCount: data.length,
          message: "Site Based Allocation list is unavailable!",
          data: data,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message ||
          "Some error occurred while retrieving allocation details.",
      });
    });
};

exports.removeSiteBasedAllocation = (req, res) => {
  console.log("removeSiteBasedAllocation");
  if (
    !(
      req.query.sales_order_no &&
      req.query.crate_bar_code &&
      req.query.createdAt
    )
  ) {
    return res.status(400).send({ message: "Missing parameter." });
  }
  const datee = new Date(req.query.createdAt);
  let sd1 = datee.setHours(datee.getHours() + 24);
  console.log("delivery_date", new Date(req.query.createdAt));
  console.log("sd1", new Date(sd1));
  console.log(
    req.query.sales_order_no,
    req.query.crate_bar_code,
    req.query.createdAt
  );
  so_allocation_detail_table.findOneAndDelete(
    {
      sales_order_no: req.query.sales_order_no,
      crate_bar_code: req.query.crate_bar_code,
      createdAt: { $gte: new Date(req.query.createdAt), $lt: new Date(sd1) },
    },
    function (err, data) {
      if (err) {
        res.status(500).send({
          message:
            err.message ||
            "Some error occurred while retrieving allocation details.",
        });
      } else if (!data) {
        {
          res.status(404).send({
            message: `Cannot delete site_based_allocation. Maybe site_based_allocation was not found!`,
          });
        }
      } else {
        res.status(200).send({
          message: "site_based_allocation was deleted successfully!",
          data: data,
        });
      }
    }
  );
};

exports.findSkuBasedAllocation = async (req, res) => {
  try {
    if (
      !(
        req.query.sales_order_no &&
        req.query.customer_code &&
        req.query.distribution_channel &&
        req.query.material_no &&
        req.query.item_no &&
        req.query.company_code &&
        req.query.plant_id &&
        req.query.delivery_date
      )
    ) {
      return res.status(400).send({
        status_code: "400",
        message: "Missing parameter !",
      });
    }
    const datee = new Date(req.query.delivery_date);
    let sd1 = datee.setHours(datee.getHours() + 24);
    await so_allocation_table
      .find({
        sales_order_no: req.query.sales_order_no,
        customer_code: req.query.customer_code,
        distribution_channel: req.query.distribution_channel,
        material_no: req.query.material_no,
        item_no: req.query.item_no,
        company_code: req.query.company_code,
        plant_id: req.query.plant_id,
        delivery_date: req.query.delivery_date,
      })
      .then((fetchdata) => {
        if (fetchdata.length != 0) {
          fetchdata = fetchdata[0];
          if (fetchdata.create_count) {
            console.log(req.query);
            console.log(fetchdata.create_count);
            so_allocation_table
              .aggregate([
                {
                  $match: {
                    sales_order_no: req.query.sales_order_no,
                    customer_code: req.query.customer_code,
                    distribution_channel: req.query.distribution_channel,
                    material_no: req.query.material_no,
                    item_no: req.query.item_no,
                    company_code: req.query.company_code,
                    plant_id: req.query.plant_id,
                    delivery_date: req.query.delivery_date,
                  },
                },
                { $unwind: "$allocation_detail" },
                { $sort: { "allocation_detail.entry_time": -1 } },
              ])
              .then((data) => {
                let allocation_data = [];
                let response_data = [];
                let data_object = {};
                data_object._id = data[0]._id;
                data_object.entry_time = data[0].entry_time;
                data_object.sales_order_no = data[0].sales_order_no;
                data_object.sales_document_type = data[0].sales_document_type;
                data_object.distribution_channel = data[0].distribution_channel;
                data_object.distribution_channel_description =
                  data[0].distribution_channel_description;
                data_object.customer_code = data[0].customer_code;
                data_object.customer_name = data[0].customer_name;
                data_object.material_name = data[0].material_name;
                data_object.material_no = data[0].material_no;
                data_object.item_no = data[0].item_no;
                data_object.item_id = data[0].item_id;
                data_object.allocated_qty = data[0].allocated_qty;
                data_object.order_qty = data[0].order_qty;
                data_object.pending_qty = data[0].pending_qty;
                data_object.delivery_date = data[0].delivery_date;
                data_object.company_code = data[0].company_code;
                data_object.plant_id = data[0].plant_id;
                data_object.create_count = data[0].create_count;

                data.forEach((element) => {
                  allocation_data.push(element.allocation_detail);
                });

                data_object.allocation_detail = allocation_data;
                data_object.uom = data[0].uom;
                data_object.price = data[0].price;
                data_object.createdAt = data[0].createdAt;
                data_object.updatedAt = data[0].updatedAt;
                data_object.__v = data[0].__v;

                response_data.push(data_object);

                res.status(200).send({
                  status_code: "200",
                  message: `Total create_count = ${fetchdata.create_count}`,
                  data: response_data,
                });
              });
          } else {
            return res.status(200).send({
              status_code: "200",
              message: `Total create_count = ${fetchdata.create_count}`,
              data: [],
            });
          }
        } else {
          return res.status(400).send({
            status_code: "404",
            message: "Data doesn't exist !",
          });
        }
      });
  } catch (err) {
    res.status(500).send({
      status_code: "500",
      message:
        err.message ||
        "Some error occurred while retrieving allocation details !",
    });
  }
};

// remove and update collection

exports.updateSkuBasedAllocation = async (req, res) => {
  try {
    if (
      !(
        req.query.sales_order_no &&
        req.query.material_no &&
        req.query.item_no &&
        req.query.company_code &&
        req.query.plant_id &&
        req.query.crate_barcode
      )
    ) {
      return res
        .status(400)
        .send({ status_code: "400", message: "Missing parameter !" });
    }

    let allocation_data = await so_allocation_table.findOne({
      sales_order_no: req.query.sales_order_no,
      material_no: req.query.material_no,
      item_no: req.query.item_no,
      company_code: req.query.company_code,
      plant_id: req.query.plant_id,
      allocation_detail: {
        $elemMatch: { crate_barcode: req.query.crate_barcode },
      },
    });
    if (allocation_data) {
      let allocation_id = allocation_data._id;
      let update_data = {};
      allocation_data.allocation_detail.map((items, index) => {
        if (items.crate_barcode == req.query.crate_barcode) {
          update_data.allocated_qty =
            allocation_data.allocated_qty - items.net_weight;
          update_data.pending_qty =
            allocation_data.pending_qty + items.net_weight;
          update_data.order_qty =
            allocation_data.allocated_qty + allocation_data.pending_qty;
          update_data.create_count = allocation_data.create_count - 1;
          update_data.allocation_detail = allocation_data.allocation_detail;
        }
      });

      let updated_data = await so_allocation_table.findByIdAndUpdate(
        { _id: allocation_id },
        update_data
      );

      if (updated_data) {
        await so_allocation_table
          .updateOne(
            {
              sales_order_no: req.query.sales_order_no,
              material_no: req.query.material_no,
              item_no: req.query.item_no,
              company_code: req.query.company_code,
              plant_id: req.query.plant_id,
              allocation_detail: {
                $elemMatch: { crate_barcode: req.query.crate_barcode },
              },
            },

            {
              $pull: {
                allocation_detail: { crate_barcode: req.query.crate_barcode },
              },
            }
          )
          .then((data) => {
            if (data.nModified == 0) {
              res.status(400).send({
                status_code: "400",
                message: `Cannot delete , data not found!`,
              });
            } else {
              res.status(200).send({
                status_code: "200",
                message: "crate details removed successfully!",
              });
            }
          })
          .catch((err) => {
            console.log(err);
            return res.status(500).send({
              status_code: "500",
              message: "Some error occurred while retrieving data.",
            });
          });
      }
    } else {
      return res
        .status(400)
        .send({ status_code: "400", message: "Crate details not found" });
    }
  } catch (err) {
    res.status(500).send({
      status_code: "500",
      message:
        err.message ||
        "Some error occurred while retrieving allocation details.",
    });
  }
};

// cron synch sales order to sales order allocation collection

exports.synch_sales_order_to_allocation = async (req, res) => {
  // const { delivery_date, plant_id } = req.query;

  // if (!(delivery_date && plant_id))
  //   return res.status(400).send({
  //     status_code: "400",
  //     message:
  //       "Please provide all parameter inludes plant_id and delivery_date ",
  //   });

  try {
    const today_date = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD");

    // const today_date = "2022-07-06"

    const plant_id = req.params.plant_id;

    const check = [];

    let last_so_synched = await db.soAllocation.aggregate([
        {$match :{
          plant_id: plant_id,
        }},
        {
          $sort :{
            updatedAt :-1
          }
        },
        {
          $limit : 1
        },
        {
          $project :{
            updatedAt:1,
              last_date : {
                $dateToString :{
                  format: "%Y-%m-%d %H:%M:%S:%L%z",
                  date: '$updatedAt',
                  timezone: "Asia/Kolkata",
                }
              },
              //  delivery_date: {
              //   $dateToString: {
              //     date: {
              //       $dateFromString: {
              //         dateString: "$updatedAt",
              //       },
              //     },
              //     timezone: "Asia/Kolkata",
              //     onNull: "",
              //   },
              // },

          }
        }
    ])


    // console.log("last_so_synched",last_so_synched[0].last_date);



    let allocation_data = await db.salesOrder.aggregate([
      {
        $match: {
          plant: plant_id,
          delivery_date: today_date,
        },
      },
      { $unwind: "$items" },

      // { $project: {sales_order_no:1, salesDocumentType: 1, plant: 1, items: 1 } },
    ]);

    if (allocation_data.length === 0) {
      return res.status(200).send({
        status: 200,
        so_last_synched:last_so_synched[0].last_date,
        message: "No Sales Order to synch",
      });
    }

    if (allocation_data.length) {
      allocation_data.map((item, idx) => {
        // console.log(
        //   "item.items._id",
        //   item.items._id,
        //   typeof JSON.stringify(item.items._id)
        // );
        let update_data = {};
        update_data.sales_order_no = item.salesOrderId;
        update_data.isSOCancelled = item.isSOCancelled;
        update_data.sales_document_type = item.salesDocumentType;
        update_data.distribution_channel = item.distributionChannel;
        update_data.distribution_channel_description =
          item.distributionChanneldescription;
        update_data.customer_code = item.sold_to_party;
        update_data.customer_name = item.sold_to_party_description;
        update_data.material_name = item.items.itemName;
        update_data.material_no = item.items.itemId;
        update_data.item_no = item.items.item_no;
        // update_data.item_id =item.items._id;
        update_data.allocated_qty = 0;
        update_data.order_qty = item.items.qty;
        update_data.pending_qty = item.items.qty;
        update_data.delivery_date = item.delivery_date;
        update_data.entry_time = new Date(Date.now());
        update_data.order_placing_date = item.dateOfOrderPlacing;
        update_data.company_code = "1000";
        update_data.plant_id = item.plant;
        update_data.create_count = 0;
        update_data.route_id = "";
        update_data.allocation_detail = [];
        update_data.uom = item.items.uom;
        update_data.price = item.items.net_price;
        update_data.lotting_loss=0;
        update_data.delivery_posted_qty=0;
        update_data.inventory_delivery_posted_qty=0;
        update_data.inventory_allocated_qty=0;

        check.push(update_data);
      });

      let allocation_count = 0;

      let update_count = 0;

      const dataa = check.map(async (item, idx) => {
        // console.log(
        //   "now_id",
        //   item.material_no,
        //   item.item_no,
        //   item.sales_order_no
        // );

        if (item.sales_order_no) {
          // console.log("entered", idx + 1);
          let answerr = await db.soAllocation.findOne({
            // item_id: item.item_id,
            sales_order_no: item.sales_order_no,
            material_no: item.material_no,
            item_no: item.item_no,
          });

          // console.log("answerrrr",answerr,!(answerr.length))

          if (
            !answerr &&
            item.sales_order_no
            // item.sales_document_type &&
            // item.distribution_channel &&
            // item.distribution_channel_description &&
            // item.customer_code &&
            // item.customer_name &&
            // item.material_name &&
            // item.material_no &&
            // item.item_no &&
            // // item.item_id &&
            // item.order_qty &&
            // item.pending_qty &&
            // item.delivery_date &&
            // item.company_code &&
            // item.plant_id
          ) {
            // console.log("synched_in", idx + 1);

            allocation_count = allocation_count + 1;
            const new_so_allocation_Generation = new db.soAllocation(item);
            return new_so_allocation_Generation.save();
          } else if ((answerr && answerr.order_qty != item.order_qty) || (answerr && answerr.isSOCancelled != item.isSOCancelled)) {


            // console.log(answerr.order_qty,item.order_qty)
            update_count = update_count + 1;
            var new_qty = item.order_qty - answerr.order_qty;
            var new_pending_qty = answerr.pending_qty + new_qty;

            const update_one_allocation = await db.soAllocation.updateOne(
              {
                sales_order_no: answerr.sales_order_no,
                material_no: answerr.material_no,
                item_no: answerr.item_no,
              },
              {
                order_qty: item.order_qty,
                pending_qty: new_pending_qty,
                price: item.price,
                isSOCancelled:item.isSOCancelled
              },
              { upsert: false }
            );

            return update_one_allocation;
          }
        }

        // else if ()
        // return item;
      });

      // await Promise.all(dataa);

      // await Promise.all(dataa)
      //   .then((values) => {

      //     console.log("asdasdddddddddddd",values);
      //   })
      //   .catch((error) => {
      //     console.error(error.message);
      //     return  res.status(500).send({
      //       status: 500,
      //       message: error.message || "Some error occurred while synching",
      //     });

      //   });

      // console.log("count", allocation_count);

      await Promise.all(dataa)
        .then((result) => {
          // console.log("qwe",result)
          return res.status(200).send({
            // data: check,
            status: 200,
            allocation_count: allocation_count,
            updated_count: update_count,
            so_last_synched:last_so_synched[0].last_date,
            message: "Synched Successful",
          });
        })
        .catch((err) => {
          return res.status(400).send({
            status: 400,
            message: err.message,
          });
        });

      // return res.status(200).send({
      //   // data: check,
      //   status: 200,
      //   allocation_count: allocation_count,
      //   updated_count: update_count,
      //   message: "Synched Successful",
      // });
    }
  } catch (error) {
    res.status(500).send({
      status: 500,
      message: error.message || "Some error occurred while synching",
    });
  }
};

// manual synch sales order to sales order allocation collection

exports.manual_synch_sales_order_to_allocation = async (req, res) => {
  const { delivery_date, plant_id } = req.query;

  if (!(delivery_date && plant_id))
    return res.status(400).send({
      status: 400,
      message:
        "Please provide all parameter inludes plant_id and delivery_date ",
    });

  try {
    const check = [];

    let allocation_data = await db.salesOrder.aggregate([
      {
        $match: {
          plant: plant_id,
          delivery_date: delivery_date,
        },
      },
      { $unwind: "$items" },

      // { $project: {sales_order_no:1, salesDocumentType: 1, plant: 1, items: 1 } },
    ]);

    if (allocation_data.length === 0) {
      return res.status(200).send({
        status: 200,
        message: "No Sales Order to synch",
      });
    }

    if (allocation_data.length) {
      allocation_data.map((item, idx) => {
        // console.log(
        //   "item.items._id",
        //   item.items._id,
        //   typeof JSON.stringify(item.items._id)
        // );
        let update_data = {};
        update_data.sales_order_no = item.salesOrderId;
        update_data.isSOCancelled = item.isSOCancelled;
        update_data.sales_document_type = item.salesDocumentType;
        update_data.distribution_channel = item.distributionChannel;
        update_data.distribution_channel_description =
          item.distributionChanneldescription;
        update_data.customer_code = item.sold_to_party;
        update_data.customer_name = item.sold_to_party_description;
        update_data.material_name = item.items.itemName;
        update_data.material_no = item.items.itemId;
        update_data.item_no = item.items.item_no;
        // update_data.item_id =item.items._id;
        update_data.allocated_qty = 0;
        update_data.order_qty = item.items.qty;
        update_data.pending_qty = item.items.qty;
        update_data.delivery_date = item.delivery_date;
        update_data.entry_time = new Date(Date.now());
        update_data.order_placing_date = item.dateOfOrderPlacing;
        update_data.company_code = "1000";
        update_data.plant_id = item.plant;
        update_data.create_count = 0;
        update_data.route_id = "";
        update_data.allocation_detail = [];
        update_data.uom = item.items.uom;
        update_data.price = item.items.net_price;
        update_data.lotting_loss=0;
        update_data.delivery_posted_qty=0;
        update_data.inventory_delivery_posted_qty=0;
        update_data.inventory_allocated_qty=0;

        check.push(update_data);
      });

      let allocation_count = 0;

      let update_count = 0;

      const dataa = check.map(async (item, idx) => {
        // console.log(
        //   "now_id",
        //   item.material_no,
        //   item.item_no,
        //   item.sales_order_no
        // );



        if (item.sales_order_no && item.item_no && item.order_qty) {
          // console.log("entered", idx + 1);
          let answerr = await db.soAllocation.findOne({
            // item_id: item.item_id,
            sales_order_no: item.sales_order_no,
            material_no: item.material_no,
            item_no: item.item_no,
          });

          // console.log("answerrrr",answerr,!(answerr.length))

          if (
            !answerr &&
            item.sales_order_no
            // item.sales_document_type &&
            // item.distribution_channel &&
            // item.distribution_channel_description &&
            // item.customer_code &&
            // item.customer_name &&
            // item.material_name &&
            // item.material_no &&
            // item.item_no &&
            // // item.item_id &&
            // item.order_qty &&
            // item.pending_qty &&
            // item.delivery_date &&
            // item.company_code &&
            // item.plant_id
          ) {
            // console.log("synched_in", idx + 1);

            allocation_count = allocation_count + 1;
            const new_so_allocation_Generation = new db.soAllocation(item);
            return new_so_allocation_Generation.save();
          } else if ((answerr && answerr.order_qty != item.order_qty) || (answerr && answerr.isSOCancelled != item.isSOCancelled)) {
            // console.log(answerr.order_qty,item.order_qty)
            update_count = update_count + 1;
            var new_qty = item.order_qty - answerr.order_qty;
            var new_pending_qty = answerr.pending_qty + new_qty;

            const update_one_allocation = await db.soAllocation.updateOne(
              {
                sales_order_no: answerr.sales_order_no,
                material_no: answerr.material_no,
                item_no: answerr.item_no,
              },
              {
                order_qty: item.order_qty,
                pending_qty: parseInt(new_pending_qty),
                price: item.price,
                isSOCancelled:item.isSOCancelled
              },
              { upsert: false }
            );

            // console.log("peasad",update_one_allocation)

            return update_one_allocation;
          }
        }

        // else if ()
        // return item;
      });

      await Promise.all(dataa)
        .then((result) => {
          // console.log("qwe",result)
          return res.status(200).send({
            // data: check,
            status: 200,
            allocation_count: allocation_count,
            updated_count: update_count,
            message: "Synched Successful",
          });
        })
        .catch((err) => {
          return res.status(400).send({
            status: 400,
            message: err.message,
          });
        });

     
    }
  } catch (error) {
    res.status(500).send({
      status: 500,
      status: error.message || "Some error occurred while synching",
    });
  }
};

// synch routes

exports.synch_trips_to_sales_order_allocation = async (req, res) => {
  // const { delivery_date, plant_id } = req.query;

  // if (!(delivery_date && plant_id))
  //   return res.status(400).send({
  //     status: 400,
  //     message:
  //       "Please provide all parameter inludes plant_id and delivery_date ",
  //   });

  try {
    // let trips_count = 0;
    // let so_count = 0
    let trips_updated = 0;

    const plant_id = req.params.plant_id;

    // console.log("wqeqwe",plant_id)
    // const previous = new Date();
    // previous.setDate(previous.getDate() - 1);
    // console.log("todaye",new Date(new Date(new Date()).setHours(00, 00, 00)));
    // console.log("today",new Date(new Date(new Date()).setHours(23, 59, 59)));
    // console.log("yesterdays",previous);
    // console.log("yesterdays",new Date(previous.setHours(00, 00, 00)));
    // console.log("yesterdays",new Date(previous.setHours(23, 59, 59)));

    const trip_data = await trips_table.aggregate([
      {
        $match: {
          plant: plant_id,
          createdAt: {
            $gt: new Date(new Date(new Date()).setHours(00, 00, 00)),
            $lte: new Date(new Date(new Date()).setHours(23, 59, 59)),
          },
        },
      },
      {
        $project: { salesOrder: 1, tripId: 1 },
      },
      {
        $lookup: {
          from: "salesorders",
          localField: "salesOrder",
          foreignField: "_id",
          as: "detail_io",
        },
      },
      {
        $project: {
          salesOrder: 1,
          tripId: 1,
          "detail_io.salesOrderId": 1,
        },
      },
    ]);

    if (trip_data.length === 0) {
      return res.send({
        status: 200,
        message: "Trips are not available to synch",
      });
    }

    const final_resolve = trip_data.map(async (result, idx) => {
      if (result.detail_io.length > 0) {
        // trips_count+=1

        // const trip_check = await so_allocation_table.findOne({route_id:result.tripId})

        // if(!trip_check){
        //   trips_updated+=1
        // }

        return Promise.all(
          result.detail_io.map(async (item, idx) => {
            // console.log("as",item.salesOrderId,result.tripId,idx)
            // so_count +=1

            // check whether trip exists or not

            const trip_check = await so_allocation_table.findOne({
              sales_order_no: item.salesOrderId,
            });
            // console.log(trip_check.route_id != result.tripId)
            if (trip_check && trip_check.route_id != result.tripId) {
              // console.log(trip_check.route_id != result.tripId)
              trips_updated += 1;
            }

            const update_ans = await so_allocation_table.updateMany(
              { sales_order_no: item.salesOrderId },
              { route_id: result.tripId },
              { upsert: false }
            );
            // console.log(update_ans)
            return update_ans;
            // return so_allocation_table.updateMany({sales_order_no:item.salesOrderId},{route_id:result.tripId},{upsert:false})
          })
        );
      }
    });

    await Promise.all(final_resolve)
      .then((result) => {
        return res.status(200).send({
          // data: check,
          status: 200,
          message: "Synched Successful",

          Trips_synched: trips_updated,
          // Trips_count : trips_count,
          // SO_count : so_count

          // data : trip_data
        });
      })
      .catch((err) => {
        return res.status(400).send({
          status: 400,
          message: err.message,
        });
      });

    //  return res.send({data:trip_data})
  } catch (error) {
    res.status(500).send({
      status: 500,
      status: error.message || "Some error occurred while synching",
    });
  }
};


exports.cron_synch_trips_to_sales_order_allocation = async (parameter) => {

  const { plant_id } = parameter;

  try {
    // let trips_count = 0;
    // let so_count = 0
    let trips_updated = 0;

    // const plant_id = req.params.plant_id;

    // console.log("wqeqwe",plant_id)
    // const previous = new Date();
    // previous.setDate(previous.getDate() - 1);
    // console.log("todaye",new Date(new Date(new Date()).setHours(00, 00, 00)));
    // console.log("today",new Date(new Date(new Date()).setHours(23, 59, 59)));
    // console.log("yesterdays",previous);
    // console.log("yesterdays",new Date(previous.setHours(00, 00, 00)));
    // console.log("yesterdays",new Date(previous.setHours(23, 59, 59)));

    const trip_data = await trips_table.aggregate([
      {
        $match: {
          plant: plant_id,
          createdAt: {
            $gt: new Date(new Date(new Date()).setHours(00, 00, 00)),
            $lte: new Date(new Date(new Date()).setHours(23, 59, 59)),
          },
        },
      },
      {
        $project: { salesOrder: 1, tripId: 1 },
      },
      {
        $lookup: {
          from: "salesorders",
          localField: "salesOrder",
          foreignField: "_id",
          as: "detail_io",
        },
      },
      {
        $project: {
          salesOrder: 1,
          tripId: 1,
          "detail_io.salesOrderId": 1,
        },
      },
    ]);

    if (trip_data.length === 0) {
      return "Trips are not available to synch"
      return res.send({
        status: 200,
        message: "Trips are not available to synch",
      });
    }

    const final_resolve = trip_data.map(async (result, idx) => {
      if (result.detail_io.length > 0) {
     
        return Promise.all(
          result.detail_io.map(async (item, idx) => {
            // console.log("as",item.salesOrderId,result.tripId,idx)
            // so_count +=1

            // check whether trip exists or not

            const trip_check = await so_allocation_table.findOne({
              sales_order_no: item.salesOrderId,
            });
            // console.log(trip_check.route_id != result.tripId)
            if (trip_check && trip_check.route_id != result.tripId) {
              // console.log(trip_check.route_id != result.tripId)
              trips_updated += 1;
            }

            const update_ans = await so_allocation_table.updateMany(
              { sales_order_no: item.salesOrderId },
              { route_id: result.tripId },
              { upsert: false }
            );
            // console.log(update_ans)
            return update_ans;
            // return so_allocation_table.updateMany({sales_order_no:item.salesOrderId},{route_id:result.tripId},{upsert:false})
          })
        );
      }
    });

    return await Promise.all(final_resolve)
      .then((result) => {

        return "Synched Successful!"
      })
      .catch((err) => {
        return err.message
     
      });

    //  return res.send({data:trip_data})
  } catch (error) {
    return error.message || "Some error occurred while trip synching"
    // res.status(500).send({
    //   status: 500,
    //   status: error.message || "Some error occurred while synching",
    // });
  }
};



exports.synch_trips_to_invoice_detail_allocation = async (req, res) => {
  try {
    let trips_updated = 0;

    const plant_id = req.params.plant_id;

    const trip_data = await trips_table.aggregate([
      {
        $match: {
          plant: plant_id,
          createdAt: {
            $gt: new Date(new Date(new Date()).setHours(00, 00, 00)),
            $lte: new Date(new Date(new Date()).setHours(23, 59, 59)),
          },
        },
      },
      {
        $project: { invoice_db_id: 1, tripId: 1 },
      },
      {
        $lookup: {
          from: "invoicemasters",
          localField: "invoice_db_id",
          foreignField: "_id",
          as: "detail_io",
        },
      },
      {
        $project: {
          invoice_db_id: 1,
          tripId: 1,
          invoiceNo_list: "$detail_io.invoiceDetails.invoiceNo",
          // "detail_io.invoiceDetails.invoiceNo" :1
        },
      },
    ]);

    //  console.log("trip_data",trip_data)

    //  return res.send({data:trip_data})

    if (trip_data.length === 0) {
      return res.send({
        status: 200,
        message: "Trips are not available to synch",
      });
    }

    const final_resolve = trip_data.map(async (result, idx) => {
      if (result.invoiceNo_list.length > 0) {
        // trips_count+=1

        // const trip_check = await db.invoiceGenerate.findOne({route_id:result.tripId})

        // if(!trip_check){
        //   trips_updated+=1
        // }

        return Promise.all(
          result.invoiceNo_list.map(async (item, idx) => {
            // console.log("as",item.salesOrderId,result.tripId,idx)
            // so_count +=1

            // check whether trip exists or not

            const trip_check = await db.invoiceGenerate.findOne({
              invoice_no: item,
            });
            // console.log(trip_check.route_id != result.tripId)
            if (trip_check && trip_check.route_id != result.tripId) {
              // console.log(trip_check.route_id, result.tripId)
              trips_updated += 1;
            }

            const update_ans = await db.invoiceGenerate.updateMany(
              { invoice_no: item },
              { route_id: result.tripId },
              { upsert: false }
            );
            // console.log(update_ans)
            return update_ans;
            // return so_allocation_table.updateMany({sales_order_no:item.salesOrderId},{route_id:result.tripId},{upsert:false})
          })
        );
      }
    });

    await Promise.all(final_resolve)
      .then((result) => {
        return res.status(200).send({
          // data: check,
          status: 200,
          message: "Synched Successful",

          Trips_synched: trips_updated,
          // Trips_count : trips_count,
          // SO_count : so_count

          // data : trip_data
        });
      })
      .catch((err) => {
        return res.status(400).send({
          status: 400,
          message: err.message,
        });
      });
  } catch (error) {
    res.status(500).send({
      status: 500,
      status: error.message || "Some error occurred while synching",
    });
  }
};

// get api for pending quantity
exports.get_salesorder_pending_quantity_ptl = async (req, res) => {
  try {
    if (
      !(
        req.query.sales_order_no &&
        req.query.plant_id &&
        req.query.company_code &&
        req.query.delivery_date
      )
    ) {
      return res
        .status(400)
        .send({ status_code: 400, message: "parameter is missing !" });
    }
    const datee = new Date(req.query.delivery_date);
    let sd1 = datee.setHours(datee.getHours() + 24);
    const pending_item_details = [];
    const fetchdata = await so_allocation_table.find({
      sales_order_no: req.query.sales_order_no,
      plant_id: req.query.plant_id,
      company_code: req.query.company_code,
      delivery_date: req.query.delivery_date,
    });
    if (fetchdata != 0) {
      fetchdata.map((item, index) => {
        const finddata = {};
        (finddata.sales_order_no = item.sales_order_no),
          (finddata.item_no = item.item_no),
          (finddata.item_code = item.material_no),
          (finddata.item_name = item.material_name),
          (finddata.order_qty = item.order_qty),
          (finddata.allocated_qty = item.allocated_qty),
          (finddata.pending_qty = item.pending_qty),
          pending_item_details.push(finddata);
      });
      return res.status(200).send({
        status_code: 200,
        message: "Sale order have pending quantity !",
        pending_item_details,
      });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "Data doesn't exist !",
      });
    }
  } catch (err) {
    res.status(500).send({
      status_code: "500",
      message:
        err.message ||
        "Some error occurred while retrieving allocation details !",
    });
  }
};

exports.get_so_allocation_table = async (req, res) => {
  // console.log('get_so_allocation_table');

  const company_code = req.query.company_code;
  const plant_id = req.query.plant_id;
  const delivery_date = req.query.delivery_date;
  if (!(company_code && plant_id && delivery_date)) {
    return res.status(400).send({
      status_code: "400",
      message: "Some parameter is missing !",
    });
  }

  so_allocation_table
    .find({
      company_code: company_code,
      plant_id: plant_id,
      delivery_date: delivery_date,
    })
    .then((data) => {
      // console.log("d", data)
      if (data.length == 0) {
        return res
          .status(200)
          .send({ status: "200", message: "data not found !", data: {} });
      } else {
        res.status(200).send({
          status_code: "200",
          message: "soallocation data is available",
          data: data,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while retrieving data.",
      });
    });
};

exports.get_pick_list_by_customer_orders = async (req, res) => {
  try {
    if (
      !(
        req.query.company_code &&
        req.query.plant_id &&
        req.query.delivery_date &&
        req.query.customer_code &&
        req.query.sales_order_no
      )
    ) {
      return res.status(400).send({
        status_code: 200,
        message:
          "Please provide all the details like company code, plant id, delivery date, customer code, sales order number!",
      });
    }

    const picklist = await so_allocation_table.aggregate([
      {
        $match: {
          company_code: req.query.company_code,
          plant_id: req.query.plant_id,
          delivery_date: req.query.delivery_date,
          customer_code: req.query.customer_code,
          sales_order_no: req.query.sales_order_no,
        },
      },
      {
        $group: {
          _id: "$sales_order_no",
          company_code: { $first: "$company_code" },
          plant_id: { $first: "$plant_id" },
          sales_order_no: { $first: "$sales_order_no" },
          distribution_channel: { $first: "$distribution_channel" },
          distribution_channel_description: {
            $first: "$distribution_channel_description",
          },
          sales_document_type: { $first: "$sales_document_type" },
          delivery_date: { $first: "$delivery_date" },
          customer_code: { $first: "$customer_code" },
          customer_name: { $first: "$customer_name" },
          route_id: { $first: "$route_id" },
          items: {
            $push: {
              item_no: "$item_no",
              material_no: "$material_no",
              material_name: "$material_name",
              order_qty: "$order_qty",
              allocated_qty: "$allocated_qty",
              pending_qty: "$pending_qty",
              create_count: "$create_count",
              uom: "$uom",
              price: "$price",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          company_code: 1,
          plant_id: 1,
          sales_order_no: 1,
          distribution_channel: 1,
          distribution_channel_description: 1,
          sales_document_type: 1,
          delivery_date: 1,
          customer_code: 1,
          customer_name: 1,
          route_id: 1,
          items: 1,
        },
      },
    ]);

    if (picklist.length) {
      return res.status(200).send({
        status_code: 200,
        message: "Pick list by customer order is available!",
        picklist,
      });
    }
    return res.status(400).send({
      status_code: 200,
      message: "Pick list by customer order is not available!",
    });
  } catch (err) {
    res.status(500).send({
      status_code: 500,
      message: err.message || "Some error occurred while retrieving data!",
    });
  }
};

exports.get_customer_code_by_delivery_date = async (req, res) => {
  try {
    if (
      !(req.query.company_code && req.query.plant_id && req.query.delivery_date)
    ) {
      return res.status(200).send({
        status_code: 200,
        message:
          "Please provide all the details like company code, plant id, delivery date!",
      });
    }

    const data = [];
    const fetchdata = await so_allocation_table
      .find({
        company_code: req.query.company_code,
        plant_id: req.query.plant_id,
        delivery_date: req.query.delivery_date,
      })
      .sort({ customer_name: 1 });

    if (fetchdata != 0) {
      fetchdata.map((item) => {
        const finddata = {};
        (finddata.customer_code = item.customer_code),
          (finddata.customer_name = item.customer_name),
          data.push(finddata);
      });

      const uniqueObjects = [
        ...new Map(
          data.map((customer) => [customer.customer_code, customer])
        ).values(),
      ];

      return res.status(200).send({
        status_code: 200,
        message: "Customer is available!",
        data: uniqueObjects,
      });
    } else {
      return res.status(200).send({
        status_code: 200,
        message: "Customer is not available!",
      });
    }
  } catch (err) {
    res.status(500).send({
      status_code: 500,
      message: err.message || "Some error occurred while retrieving data!",
    });
  }
};

exports.get_sales_order_no_by_customer_order = async (req, res) => {
  try {
    if (
      !(
        req.query.company_code &&
        req.query.plant_id &&
        req.query.customer_code &&
        req.query.delivery_date
      )
    ) {
      return res.status(200).send({
        status_code: 200,
        message:
          "Please provide all the details like company code, plant id, customer code, delivery date!",
      });
    }

    const data = [];
    const fetchdata = await so_allocation_table
      .find({
        company_code: req.query.company_code,
        plant_id: req.query.plant_id,
        customer_code: req.query.customer_code,
        delivery_date: req.query.delivery_date,
      })
      .sort({ _id: -1 });

    if (fetchdata != 0) {
      fetchdata.map((item) => {
        const finddata = {};
        (finddata.sales_order_no = item.sales_order_no), data.push(finddata);
      });

      const uniqueObjects = [
        ...new Map(data.map((son) => [son.sales_order_no, son])).values(),
      ];

      return res.status(200).send({
        status_code: 200,
        message: "Sales order number is available!",
        data: uniqueObjects,
      });
    } else {
      return res.status(400).send({
        status_code: 200,
        message: "Sales order number is not available!",
      });
    }
  } catch (err) {
    res.status(500).send({
      status_code: 500,
      message: err.message || "Some error occurred while retrieving data!",
    });
  }
};

exports.get_pick_list_by_sku_id = async (req, res) => {
  try {
    if (
      !(
        req.query.company_code &&
        req.query.plant_id &&
        req.query.delivery_date &&
        req.query.material_no
      )
    ) {
      return res.status(200).send({
        status_code: 200,
        message:
          "Please provide all the details like company code, plant id, delivery date, customer code, material number!",
      });
    }

    const match = {
      company_code: req.query.company_code,
      plant_id: req.query.plant_id,
      delivery_date: req.query.delivery_date,
      material_no: req.query.material_no,
    };

    if (req.query.customer_code) {
      match.customer_code = req.query.customer_code;
    }

    const picklist = await so_allocation_table.aggregate([
      {
        $match: match,
      },
      {
        $group: {
          _id: "$sales_order_no",
          company_code: { $first: "$company_code" },
          plant_id: { $first: "$plant_id" },
          sales_order_no: { $first: "$sales_order_no" },
          distribution_channel: { $first: "$distribution_channel" },
          distribution_channel_description: {
            $first: "$distribution_channel_description",
          },
          sales_document_type: { $first: "$sales_document_type" },
          delivery_date: { $first: "$delivery_date" },
          customer_code: { $first: "$customer_code" },
          customer_name: { $first: "$customer_name" },
          route_id: { $first: "$route_id" },
          items: {
            $push: {
              item_no: "$item_no",
              material_no: "$material_no",
              material_name: "$material_name",
              order_qty: "$order_qty",
              allocated_qty: "$allocated_qty",
              pending_qty: "$pending_qty",
              create_count: "$create_count",
              uom: "$uom",
              price: "$price",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          company_code: 1,
          plant_id: 1,
          sales_order_no: 1,
          distribution_channel: 1,
          distribution_channel_description: 1,
          sales_document_type: 1,
          delivery_date: 1,
          customer_code: 1,
          customer_name: 1,
          route_id: 1,
          items: 1,
        },
      },
    ]);

    if (picklist.length) {
      return res.status(200).send({
        status_code: 200,
        message: "Pick list by sku id is available!",
        picklist,
      });
    }
    return res.status(400).send({
      status_code: 200,
      message: "Pick list by sku id is not available!",
    });
  } catch (err) {
    res.status(500).send({
      status_code: 500,
      message: err.message || "Some error occurred while retrieving data!",
    });
  }
};

exports.get_material_list_by_delivery_date = async (req, res) => {
  try {
    if (
      !(req.query.company_code && req.query.plant_id && req.query.delivery_date)
    ) {
      return res.status(200).send({
        status_code: 200,
        message:
          "Please provide all the details like company code, plant id, delivery date, customer code!",
      });
    }

    const data = [];
    const fetchdata = await so_allocation_table
      .find({
        company_code: req.query.company_code,
        plant_id: req.query.plant_id,
        delivery_date: req.query.delivery_date,
      })
      .sort({ material_name: 1 });

    if (fetchdata != 0) {
      fetchdata.map((item) => {
        const finddata = {};
        (finddata.material_no = item.material_no),
          (finddata.material_name = item.material_name),
          data.push(finddata);
      });

      const uniqueObjects = [
        ...new Map(
          data.map((material) => [material.material_no, material])
        ).values(),
      ];

      return res.status(200).send({
        status_code: 200,
        message: "Material is available!",
        data: uniqueObjects,
      });
    } else {
      return res.status(200).send({
        status_code: 200,
        message: "Material is not available!",
      });
    }
  } catch (err) {
    res.status(500).send({
      status_code: 500,
      message: err.message || "Some error occurred while retrieving data!",
    });
  }
};

exports.get_customer_list_by_material_no = async (req, res) => {
  try {
    if (
      !(
        req.query.company_code &&
        req.query.plant_id &&
        req.query.delivery_date &&
        req.query.material_no
      )
    ) {
      return res.status(200).send({
        status_code: 400,
        message:
          "Please provide all the details like company code, plant id, delivery date, customer code!",
      });
    }

    const data = [];
    const fetchdata = await so_allocation_table
      .find({
        company_code: req.query.company_code,
        plant_id: req.query.plant_id,
        delivery_date: req.query.delivery_date,
        material_no: req.query.material_no,
      })
      .sort({ customer_name: 1 });

    if (fetchdata != 0) {
      fetchdata.map((item) => {
        const finddata = {};
        (finddata.customer_code = item.customer_code),
          (finddata.customer_name = item.customer_name),
          data.push(finddata);
      });

      const uniqueObjects = [
        ...new Map(
          data.map((customer) => [customer.customer_code, customer])
        ).values(),
      ];

      return res.status(200).send({
        status_code: 200,
        message: "Customer is available!",
        data: uniqueObjects,
      });
    } else {
      return res.status(200).send({
        status_code: 200,
        message: "Customer is not available!",
      });
    }
  } catch (err) {
    res.status(500).send({
      status_code: 500,
      message: err.message || "Some error occurred while retrieving data!",
    });
  }
};

exports.getDeviceIp = async (req, res) => {
  console.log("calling get device ip address api");
  const { company_code, plant_id, email } = req.query;
  try {
    if (!(company_code && plant_id && email))
      return res.status(400).send({
        status_code: 400,
        message: "Please provide all required parameters!",
      });

    const getDeviceIps = await db.userModuleMapping.find(
      {
        company_code: company_code,
        plant_id: plant_id,
        email: email,
      },
      { _id: 0, device_name: 1, ip_address: 1, port_address: 1 }
    );

    let deviceIps = {};

    getDeviceIps.map((device) => {
      switch (device.device_name) {
        case "WeightMachine":
          deviceIps.weightMachine_Port = device.port_address;
          deviceIps.weightMachine_Ip = device.ip_address;
          break;

        case "Printer":
          deviceIps.printer_Port = device.port_address;
          deviceIps.printer_Ip = device.ip_address;
          break;

        case "BarcodeReader":
          deviceIps.barcodeReader_Port = device.port_address;
          deviceIps.barcodeReader_Ip = device.ip_address;
          break;
      }
    });

    let mssge = "Device ips are available";

    if (getDeviceIps.length == 0) mssge = "Device ips are not available!";

    return res.send({ status_code: 200, message: mssge, data: deviceIps });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting device ips!",
    });
  }
};

exports.getPickList_By_SKUIdDetails = async (req, res) => {
  console.log("calling get particular picklist by sku id details");
  const { customer_code, so_no, material_no } = req.query;
  try {
    if (!(customer_code && so_no && material_no))
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    let getPickList = await db.soAllocation.findOne(
      {
        // company_code: company_code,
        // plant_id: plant_id,
        customer_code: customer_code,
        sales_order_no: so_no,
        material_no: material_no,
      },
      {
        _id: 0,
        company_code: 1,
        plant_id: 1,
        customer_code: 1,
        customer_name: 1,
        sales_order_no: 1,
        sales_document_type: 1,
        delivery_date: 1,
        order_placing_date: 1,
        distribution_channel_description: 1,
        distribution_channel: 1,
        item_no: 1,
        material_no: 1,
        material_name: 1,
        order_qty: 1,
        allocated_qty: 1,
        pending_qty: 1,
        uom: 1,
        route_id: 1,
      }
    );

    let data = {};

    let mssge = "Pick list details is available";

    if (getPickList == null) {
      data = {};
      mssge = "Pick list details is not available!";
    } else {
      //getting plant name
      const getPlantName = await db.plants.findOne(
        {
          plant_id: getPickList.plant_id,
        },
        { _id: 0, plant_name: 1 }
      );

      data.sales_order_no = getPickList.sales_order_no;
      data.sales_document_type = getPickList.sales_document_type;
      data.distribution_channel = getPickList.distribution_channel;
      data.distribution_channel_description =
        getPickList.distribution_channel_description;
      data.customer_code = getPickList.customer_code;
      data.customer_name = getPickList.customer_name;
      data.material_name = getPickList.material_name;
      data.material_no = getPickList.material_no;
      data.item_no = getPickList.item_no;
      data.allocated_qty = getPickList.allocated_qty;
      data.order_qty = getPickList.order_qty;
      data.pending_qty = getPickList.pending_qty;
      data.delivery_date = getPickList.delivery_date;
      data.order_placing_date = moment(getPickList.order_placing_date).format(
        "YYYY-MM-DD"
      );

      data.company_code = getPickList.company_code;
      data.plant_id = getPickList.plant_id;
      data.plant_name = getPlantName != null ? getPlantName.plant_name : "";
      data.uom = getPickList.uom;
      data.route_id = getPickList.route_id ? getPickList.route_id : "NA";
    }

    return res.send({ status_code: 200, message: mssge, data: data });
    //
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        "Some error occurred while extracting particular picklist details!",
    });
  }
};

exports.get_pickList_by_SO = async (req, res) => {
  console.log("calling get picklist by so api");
  const { so_no, customer_code } = req.query;

  try {
    if (!(so_no && customer_code))
      return res.status(400).send({
        status_code: 400,
        message: "Provide both sales order number and customer code",
      });

    const getPickList = await db.soAllocation
      .find({
        sales_order_no: so_no,
        customer_code: customer_code,
      })
      .sort({ item_no: 1 });

    let mssge = "Picklist data is available";
    let pickListData = {};

    if (getPickList.length != 0) {
      const getPlantName = await db.plants.findOne(
        {
          plant_id: getPickList[0].plant_id,
        },
        { _id: 0, plant_name: 1 }
      );

      // headers information
      pickListData.plant_id = getPickList[0].plant_id;

      pickListData.plant_name =
        getPlantName != null ? getPlantName.plant_name : "";
      pickListData.customer_code = getPickList[0].customer_code;
      pickListData.customer_name = getPickList[0].customer_name;
      pickListData.sales_document_type = getPickList[0].sales_document_type;
      pickListData.delivery_date = getPickList[0].delivery_date;
      pickListData.sales_order_no = getPickList[0].sales_order_no;
      pickListData.order_placing_date = moment(
        getPickList[0].order_placing_date
      ).format("YYYY-MM-DD");

      pickListData.route_id = getPickList[0].route_id
        ? getPickList[0].route_id
        : "NA";

      let itemArr = [];
      // item array
      getPickList.map((data) =>
        itemArr.push({
          item_no: data.item_no,
          material_code: data.material_no,
          material_name: data.material_name,
          order_qty: data.order_qty,
          allocated_qty: data.allocated_qty,
          pending_qty: data.pending_qty,
          uom: data.uom,
        })
      );
      pickListData.items = itemArr;
      //
    } else mssge = "Picklist data is not availabe!";

    return res.send({
      status_code: 200,
      message: mssge,
      data: pickListData,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        "Some error occurred while extracting picklist data by sales order number!",
    });
  }
};

async function completed_route_count(
  condition,
  company_code,
  plant_id,
  from_date,
  to_date
) {
  let overall_routes_list = await so_allocation_table.aggregate([
    {
      $match: {
        company_code: company_code,
        plant_id: plant_id,
        delivery_date: { $gte: from_date, $lte: to_date },
        route_id: { $ne: "" },
      },
    },
    { $group: { _id: "$route_id" } },
  ]);

  let route_condition = condition;

  let routes_list = await so_allocation_table.aggregate([
    { $match: route_condition },
    { $unwind: "$allocation_detail" },
    { $group: { _id: "$route_id" } },
  ]);

  route_condition.pending_qty = { $gt: 0 };
  let pending_routes_list = await so_allocation_table.aggregate([
    { $match: route_condition },
    { $unwind: "$allocation_detail" },
    { $group: { _id: "$route_id" } },
  ]);

  let overall_routes_count = overall_routes_list.length;
  let total_routes_count = routes_list.length;
  let pending_routes_count = pending_routes_list.length;
  let completed_routes_count = total_routes_count - pending_routes_count;

  return {
    total_routes_count: overall_routes_count,
    completed_routes_count: completed_routes_count,
  };
}

async function completed_so_count(
  condition,
  company_code,
  plant_id,
  from_date,
  to_date
) {
  //console.log("completed_so_count",condition);

  let overall_so_list = await so_allocation_table.aggregate([
    {
      $match: {
        company_code: company_code,
        plant_id: plant_id,
        delivery_date: { $gte: from_date, $lte: to_date },
      },
    },
    { $group: { _id: "$sales_order_no" } },
  ]);

  let so_list = await so_allocation_table.aggregate([
    { $match: condition },
    { $unwind: "$allocation_detail" },
    { $group: { _id: "$sales_order_no" } },
  ]);

  //console.log(so_list);

  condition.pending_qty = { $gt: 0 };
  let pending_so_list = await so_allocation_table.aggregate([
    { $match: condition },
    { $unwind: "$allocation_detail" },
    { $group: { _id: "$sales_order_no" } },
  ]);

  //console.log(pending_so_list);
  let overall_so_count = overall_so_list.length;
  let total_so_count = so_list.length;
  let pending_so_count = pending_so_list.length;
  let completed_so_count = total_so_count - pending_so_count;

  //console.log(total_so_count,completed_so_count);
  return {
    total_so_count: overall_so_count,
    completed_so_count: completed_so_count,
  };
}

async function completed_sku_count(
  condition,
  company_code,
  plant_id,
  from_date,
  to_date
) {
  let overall_sku_list = await so_allocation_table.aggregate([
    {
      $match: {
        company_code: company_code,
        plant_id: plant_id,
        delivery_date: { $gte: from_date, $lte: to_date },
      },
    },
  ]);

  condition.allocated_qty = { $gt: 0 };
  let sku_list = await so_allocation_table.aggregate([{ $match: condition }]);

  //console.log(sku_list);

  condition.pending_qty = { $gt: 0 };
  //console.log(condition);
  let pending_sku_list = await so_allocation_table.aggregate([
    { $match: condition },
  ]);

  //console.log(pending_sku_list.length);
  let overall_sku_count = overall_sku_list.length;
  let total_sku_count = sku_list.length;
  let pending_sku_count = pending_sku_list.length;
  let completed_sku_count = total_sku_count - pending_sku_count;

  //console.log(total_sku_count,completed_sku_count);
  return {
    total_sku_count: overall_sku_count,
    completed_sku_count: completed_sku_count,
  };
}

exports.picked_item_list = async (req, res) => {
  const { company_code, plant_id, from_date, to_date } = req.query;

  try {
    if (!(company_code && plant_id && from_date && to_date))
      return res.status(400).send({
        status_code: 400,
        message:
          "Provide all parameters like company code, plant id, from date and to date",
      });

    let condition = {};
    if (req.query.mode) {
      //console.log("true");
      condition = {
        "allocation_detail.mode": req.query.mode,
      };
    }
    (condition.company_code = company_code),
      (condition.plant_id = plant_id),
      (condition.delivery_date = { $gte: from_date, $lte: to_date });

    const get_picked_item_list = await db.soAllocation.aggregate([
      {
        $match: condition,
      },
      {
        $project: {
          delivery_date: "$delivery_date",
          sales_order_no: "$sales_order_no",
          material_no: "$material_no",
          material_name: "$material_name",
          order_qty: "$order_qty",
          allocated_qty: "$allocated_qty",
          allocation_details: "$allocation_detail",
          route_id: "$route_id",
          // barcode_detail : ""
        },
      },
    ]);

    let barcode_array = [];

    get_picked_item_list.forEach((element) => {
      let duplicate = [];
      element.allocation = [];
      if (element.allocation_details.length) {
        element.allocation_details.sort((a, b) => b.entry_time - a.entry_time);
        element.allocation_details.forEach((allocated_object) => {
          // console.log("allocated_object", allocated_object.mode);
          barcode_array.push(allocated_object.crate_barcode);

          if (!duplicate.includes(allocated_object.mode)) {
            duplicate.push(allocated_object.mode);
            element.allocation.push(allocated_object);
          }
        });
      }
      let barcode_ans = barcode_array.join(",");
      element.barcode_detail = barcode_ans;
      barcode_array = [];
    });

    let final_response = get_picked_item_list.length
      ? unwind(get_picked_item_list, "allocation")
      : [];
    final_response.forEach((element) => {
      delete element.allocation_details;
    });

    //  console.log("asdasd",get_picked_item_list)

    if (final_response.length > 0) {
      var mssge = "Allocation details available";
    } else {
      var mssge = "Allocation details not available";
    }

    //console.log("con1",condition);

    let route_list = await completed_route_count(
      condition,
      company_code,
      plant_id,
      from_date,
      to_date
    );
    delete condition["pending_qty"];

    //console.log("con2",condition);

    let sales_order_no_list = await completed_so_count(
      condition,
      company_code,
      plant_id,
      from_date,
      to_date
    );
    delete condition["pending_qty"];

    //console.log("con3",condition);

    //res.send(sales_order_no_list);

    let sku_list = await completed_sku_count(
      condition,
      company_code,
      plant_id,
      from_date,
      to_date
    );
    //delete condition['allocated_qty'];
    delete condition["pending_qty"];
    //console.log("con4",condition);

    let summed_qty = await so_allocation_table.aggregate([
      { $match: condition },
      {
        $group: {
          _id: "$plant_id",
          allocated_qty: { $sum: "$allocated_qty" },
        },
      },
    ]);

    let overall_ordered_qty = await so_allocation_table.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: { $gte: from_date, $lte: to_date },
        },
      },
      {
        $group: { _id: "$plant_id", qty: { $sum: "$order_qty" } },
      },
    ]);

    let article_count_condition = {
      company_code: company_code,
      plant_id: plant_id,
      delivery_date: { $gte: from_date, $lte: to_date },
    };

    let overall_article_count = await so_allocation_table.aggregate([
      {
        $match: article_count_condition,
      },
      {
        $group: { _id: "$material_no" },
      },
    ]);

    let overall_article_array = [];
    var discrete_article_count;
    if (req.query.mode) {
      overall_article_count.forEach((element) => {
        overall_article_array.push(element._id);
      });
      discrete_article_count = await product_weight_model.aggregate([
        {
          $match: {
            company_code: company_code,
            plant_id: plant_id,
            pieces_per_bin: { $gt: 0 },
            material_code: { $in: overall_article_array },
          },
        },
      ]);
    }

    //console.log("overall_ordered_qty",overall_ordered_qty);

    let starting_time = await so_allocation_table.aggregate([
      { $match: condition },
      { $unwind: "$allocation_detail" },
      { $sort: { "allocation_detail.entry_time": 1 } },
      { $limit: 1 },
    ]);
    let ending_time = await so_allocation_table.aggregate([
      { $match: condition },
      { $unwind: "$allocation_detail" },
      { $sort: { "allocation_detail.entry_time": -1 } },
      { $limit: 1 },
    ]);
    let exact_starting_time = starting_time[0]
      ? starting_time[0].allocation_detail
      : 0;
    let exact_ending_time = ending_time[0]
      ? ending_time[0].allocation_detail
      : 0;
    //console.log(exact_ending_time.entry_time,exact_starting_time.entry_time);
    var resnd;
    if (exact_ending_time.entry_time && exact_starting_time.entry_time) {
      resnd =
        Math.abs(
          exact_ending_time.entry_time - exact_starting_time.entry_time
        ) / 1000;
    } else {
      resnd = 0;
    }
    // get total days between two dates
    var days = Math.floor(resnd / 86400);
    //console.log("days",days);

    // get hours
    var hours = Math.floor(resnd / 3600) % 24;
    //console.log("days",hours);

    // get minutes
    var minutes = Math.floor(resnd / 60) % 60;
    //console.log("days",minutes);

    // get seconds
    var seconds = Math.floor(resnd % 60);
    //console.log("days",seconds);

    let days_in_seconds = days * 86400;
    let hours_in_seconds = hours * 3600;
    let minutes_in_seconds = minutes * 60;
    let total_seconds =
      days_in_seconds + hours_in_seconds + minutes_in_seconds + seconds;
    let total_hours = Math.floor(total_seconds / 3600);
    //console.log("total_seconds",total_seconds,total_hours,summed_qty[0].allocated_qty,(summed_qty[0].allocated_qty/total_seconds)*3600);

    let summary_report = {};
    summary_report.routes_count = route_list;
    summary_report.sales_order_no_count = sales_order_no_list;
    summary_report.sku_list = sku_list;
    summary_report.summed_ordered_qty = overall_ordered_qty[0]
      ? overall_ordered_qty[0].qty
      : 0;
    summary_report.summed_allocated_qty = summed_qty[0]
      ? summed_qty[0].allocated_qty
      : 0;
    summary_report.started_time = exact_starting_time
      ? exact_starting_time.entry_time
      : 0;
    summary_report.ended_time = exact_ending_time
      ? exact_ending_time.entry_time
      : 0;
    // console.log("total_hours",total_hours,minutes,seconds);
    if (total_hours != null && minutes != null && seconds != null)
      summary_report.total_hours_used =
        total_hours + ":" + minutes + ":" + seconds;
    else summary_report.total_hours_used = "0:0:0";

    //console.log(summed_qty[0].allocated_qty,total_seconds);
    //console.log("total_seconds>3600 && total_seconds>0",total_seconds>3600 && total_seconds>0);

    summary_report.allocated_qty_per_hour =
      summed_qty[0] && total_seconds > 0
        ? total_seconds > 3600
          ? Math.floor((summed_qty[0].allocated_qty / total_seconds) * 3600)
          : Math.floor(summed_qty[0].allocated_qty)
        : 0;

    // console.log(
    //   "discrete_article_count.length",
    //   discrete_article_count.length,
    //   overall_article_count.length
    // );

    summary_report.article_count = req.query.mode
      ? req.query.mode == "ptl"
        ? discrete_article_count.length
        : overall_article_count.length - discrete_article_count.length
      : overall_article_count.length;

    return res.send({
      status_code: 200,
      message: mssge,
      count: final_response.length,
      data: final_response,
      summary_report,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        err.message ||
        "Some error occurred while retrieving allocation details.",
    });
  }
};

exports.summary_report = async (req, res) => {
  console.log("summary_report");
  const { company_code, plant_id, from_date, to_date } = req.query;

  try {
    if (!(company_code && plant_id && from_date && to_date))
      return res.status(400).send({
        status_code: 400,
        message:
          "Provide all parameters like company code, plant id, from date and to date",
      });

    var condition = {};
    if (req.query.mode) {
      // console.log("true");
      condition = {
        "allocation_detail.mode": req.query.mode,
      };
    }
    (condition.company_code = company_code),
      (condition.plant_id = plant_id),
      (condition.delivery_date = { $gte: from_date, $lte: to_date });

    // let result = await Promise.all([
    //   so_allocation_table.aggregate([{$match: condition},{$group:{_id: "$route_id"}}]),
    //   so_allocation_table.aggregate([{$match: condition},{$group:{_id: "$sales_order_no"}}]),
    //   so_allocation_table.aggregate([{$match: condition},{$group:{_id: "$material_no"}}]),
    //   so_allocation_table.aggregate([{$match: condition},{$group:{_id: "$plant_id", allocated_qty: {$sum: "$allocated_qty"},order_qty:{$sum: "$order_qty"}}}]),
    //   so_allocation_table.aggregate([{$match: condition},{$unwind: "$allocation_detail"},{$sort: {"allocation_detail.entry_time":1}},{$limit:1}]),
    //   so_allocation_table.aggregate([{$match: condition},{$unwind: "$allocation_detail"},{$sort: {"allocation_detail.entry_time":-1}},{$limit:1}])
    // ]);

    // // console.log(result);

    // let routes_list = result[0];
    // let sales_order_no_list = result[1];
    // let sku_list = result[2];
    // let summed_qty = result[3];
    // let starting_time = result[4];
    // let ending_time = result[5];

    let routes_list = await so_allocation_table.aggregate([
      { $match: condition },
      { $group: { _id: "$route_id" } },
    ]);
    let sales_order_no_list = await so_allocation_table.aggregate([
      { $match: condition },
      { $group: { _id: "$sales_order_no" } },
    ]);
    let sku_list = await so_allocation_table.aggregate([
      { $match: condition },
      { $group: { _id: "$material_no" } },
    ]);
    let summed_qty = await so_allocation_table.aggregate([
      { $match: condition },
      {
        $group: {
          _id: "$plant_id",
          allocated_qty: { $sum: "$allocated_qty" },
          order_qty: { $sum: "$order_qty" },
        },
      },
    ]);
    let starting_time = await so_allocation_table.aggregate([
      { $match: condition },
      { $unwind: "$allocation_detail" },
      { $sort: { "allocation_detail.entry_time": 1 } },
      { $limit: 1 },
    ]);
    let ending_time = await so_allocation_table.aggregate([
      { $match: condition },
      { $unwind: "$allocation_detail" },
      { $sort: { "allocation_detail.entry_time": -1 } },
      { $limit: 1 },
    ]);
    let exact_starting_time = starting_time[0].allocation_detail;
    let exact_ending_time = ending_time[0].allocation_detail;
    // console.log(exact_ending_time.entry_time,exact_starting_time.entry_time);

    var resnd =
      Math.abs(exact_ending_time.entry_time - exact_starting_time.entry_time) /
      1000;
    // get total days between two dates
    var days = Math.floor(resnd / 86400);
    // console.log("days",days);

    // get hours
    var hours = Math.floor(resnd / 3600) % 24;
    // console.log("days",hours);

    // get minutes
    var minutes = Math.floor(resnd / 60) % 60;
    // console.log("days",minutes);

    // get seconds
    var seconds = Math.floor(resnd % 60);
    // console.log("days",seconds);

    let days_in_seconds = days * 86400;
    let hours_in_seconds = hours * 3600;
    let minutes_in_seconds = minutes * 60;
    let total_seconds =
      days_in_seconds + hours_in_seconds + minutes_in_seconds + seconds;
    let total_hours = Math.floor(total_seconds / 3600);
    // console.log("total_seconds",total_seconds,total_hours,summed_qty[0].allocated_qty,(summed_qty[0].allocated_qty/total_seconds)*3600);

    let response = {};
    response.routes_count = routes_list.length;
    response.sales_order_no_count = sales_order_no_list.length;
    response.sku_list = sku_list.length;
    response.summed_ordered_qty = summed_qty[0].order_qty;
    response.summed_allocated_qty = summed_qty[0].allocated_qty;
    response.total_hours_used = total_hours + ":" + minutes + ":" + seconds;
    response.allocated_qty_per_hour = (
      (summed_qty[0].allocated_qty / total_seconds) *
      3600
    ).toFixed(3);

    return res.status(200).send({
      status_code: "200",
      status_message: "Allocation Summary Report",
      data: response,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        err.message ||
        "Some error occurred while retrieving allocation details.",
    });
  }
};

exports.list_discrete_allocations = async (req, res) => {
  let company_code = req.query.company_code;
  let plant_id = req.query.plant_id;
  if (!(plant_id && company_code)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing Parameter!" });
  }

  let condition = {};
  condition.plant_id = plant_id;
  condition.company_code = company_code;

  if (req.query.delivery_date) {
    condition.delivery_date = req.query.delivery_date;
  }

  let sub_condition = {};
  sub_condition["allocation_detail.mode"] = "ptl";
  if (req.query.start_time && req.query.end_time) {
    // let d1 = new Date(req.query.start_time);
    // let d2 = new Date(req.query.end_time);
    // let gte_date = d1.setHours(d1.getHours() - 5);
    // let lt_date = d2.setHours(d2.getHours() - 5);
    sub_condition["allocation_detail.entry_time"] = {
      $gte: new Date(req.query.start_time),
      $lt: new Date(req.query.end_time),
    };
  }
  try {
    let so_details = await so_allocation_table.aggregate([
      { $match: condition },
      { $unwind: "$allocation_detail" },
      { $match: sub_condition },
      { $sort: { "allocation_detail.entry_time": -1 } },
      {
        $group: {
          _id: "$allocation_detail.data_scanner",
          allocated_time: { $first: "$allocation_detail.entry_time" },
          station: { $first: "$allocation_detail.data_scanner" },
          bin_id: { $first: "$allocation_detail.crate_barcode" },
          pick_qty: { $first: "$allocation_detail.net_weight" },
        },
      },
      { $sort: { allocated_time: 1 } },
      {
        $project: {
          _id: 0,
          allocated_time: 1,
          station: 1,
          bin_id: 1,
          pick_qty: 1,
        },
      },
    ]);

    return res.status(200).send({
      status_code: "200",
      status_message: "Listing the last ten records",
      data: so_details,
    });
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some Error Occurred While Creating The Customer.",
    });
  }
};

exports.list_discrete_allocations_v2 = async (req, res) => {
  let company_code = req.query.company_code;
  let plant_id = req.query.plant_id;
  if (!(plant_id && company_code)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing Parameter!" });
  }

  let condition = {};
  condition.plant_id = plant_id;
  condition.company_code = company_code;

  if (req.query.delivery_date) {
    condition.delivery_date = req.query.delivery_date;
  }

  let sub_condition = {};
  sub_condition["allocation_detail.mode"] = "ptl";
  if (req.query.seconds) {
    // console.log("seconds");
    var start_time = moment().subtract(req.query.seconds, "seconds");
    var end_time = moment(start_time).add(req.query.seconds, "seconds");
    console.log("start_time", start_time, end_time);
    // let d1 = new Date(req.query.start_time);
    // let d2 = new Date(req.query.end_time);
    // let gte_date = d1.setHours(d1.getHours() - 5);
    // let lt_date = d2.setHours(d2.getHours() - 5);
    sub_condition["allocation_detail.entry_time"] = {
      $gte: new Date(start_time),
      $lte: new Date(end_time),
    };
  }
  try {
    let so_details = await so_allocation_table.aggregate([
      { $match: condition },
      { $unwind: "$allocation_detail" },
      { $match: sub_condition },
      { $sort: { "allocation_detail.entry_time": -1 } },
      {
        $group: {
          _id: "$allocation_detail.data_scanner",
          allocated_time: { $first: "$allocation_detail.entry_time" },
          station: { $first: "$allocation_detail.data_scanner" },
          bin_id: { $first: "$allocation_detail.crate_barcode" },
          pick_qty: { $first: "$allocation_detail.net_weight" },
        },
      },
      { $sort: { allocated_time: 1 } },
      {
        $project: {
          _id: 0,
          allocated_time: 1,
          station: 1,
          bin_id: 1,
          pick_qty: 1,
        },
      },
    ]);
    const today_date = moment_tz(end_time)
      .tz("Asia/Kolkata")
      .format("HH:mm:ss MM-DD-YYYY");
    console.log("end_time", today_date);
    // so_details.push({end_time:today_date});
    return res.status(200).send({
      status_code: "200",
      status_message: "Live Ptl Report",
      data: so_details,
      today_date,
    });
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some Error Occurred While Creating The Customer.",
    });
  }
};

exports.show_sales_order_allocation = async (req, res) => {
  let id = req.params.id;
  // console.log("id", id);

  try {
    let so_details = await so_allocation_table.aggregate([
      { $match: { _id: ObjectId(id) } },
      // { $unwind: "$allocation_detail" },
      // { $project: { allocation_detail: 1, _id: 0 } },
    ]);

    let message = so_details.length ? "Detailed view" : "Invalid Id";

    return res.send({
      status_code: 200,
      message: message,
      data: so_details,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        err.message ||
        "Some error occurred while retrieving allocation details.",
    });
  }
};
