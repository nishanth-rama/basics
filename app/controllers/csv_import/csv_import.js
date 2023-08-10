const csvtojson = require("csvtojson");
const path = require("path");
const db = require("../../models");
var fs = require("fs");
const moment = require("moment");
const { string } = require("joi");
const moment_tz = require("moment-timezone");

// import synch

exports.synch_trip_to_so_allocation = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .send({ status_code: 400, message: "please select the file" });
    }

    if (req.file.mimetype != "text/csv") {
      const rmv_file = await fs.unlink(req.file.path, function (res) {
        console.log("File removed!");
      });
      return res
        .status(400)
        .send({ status_code: 400, message: "please select the csv file only" });
    }

    const json_data = await csvtojson().fromFile(req.file.path);

    const results = json_data.filter((element) => {
      if (!element["SalesOrderNo"] && !element["RouteId"]) {
        return false;
      }

      return true;
    });

    let count = 0;

    let ppromise = []

    for (let i = 0; i < results.length; i++) {
      if (results[i].SalesOrderNo && results[i].RouteId) {


        ppromise.push(db.soAllocation.updateMany(
          { sales_order_no: results[i].SalesOrderNo },
          { $set: { route_id: results[i].RouteId } }
        ));


        // var update_route = await db.soAllocation.updateMany(
        //   { sales_order_no: results[i].SalesOrderNo },
        //   { $set: { route_id: results[i].RouteId } }
        // );

        // if (update_route.n) {
        //   count++;
        // }
      }
    }

    let ss = await Promise.all(ppromise)
    .then((pm_result)=>{
      if (pm_result && pm_result.length) {
        count = pm_result.length
      }
    })
    .catch((e)=>{
      return res.status(500).send({ message: err.message})
    })



    const rmv_file = await fs.unlink(req.file.path, function (res) {
      console.log("File removed!");
    });

    return res.send({
      status_code: 200,
      message: `${count} trips updated`,
    });
  } catch (err) {
    return res.status(500).send({
      message: err.message,
    });
  }
};

exports.parse_to_json = async (req, res) => {
  try {
    // console.log("req.file.path", req.file);

    // console.log("rer",req.body.company_code)

    // if(!req.body.company_code){
    //   return res
    //     .status(400)
    //     .send({ status_code: 400, message: "please provide company code" });
    // }

    const { company_code, email } = req.query;

    if (!req.file) {
      return res
        .status(400)
        .send({ status_code: 400, message: "please select the file" });
    }

    if (req.file.mimetype != "text/csv") {
      const rmv_file = await fs.unlink(req.file.path, function (res) {
        console.log("File removed!");
      });
      return res
        .status(400)
        .send({ status_code: 400, message: "please select the csv file only" });
    }

    if (!company_code || !email) {
      const rmv_file = await fs.unlink(req.file.path, function (res) {
        console.log("File removed!");
      });
      return res.status(400).send({
        status_code: 400,
        message: "please provide company code and user email",
      });
    }

    const json_data = await csvtojson().fromFile(req.file.path);

    //   const require_field = ["company_code","customer_code","delivery_date","distribution_channel","item_no",
    //   "material_name","material_no","order_placing_date","order_qty","plant_id","price","sales_document_type","sales_order_no","uom"
    // ]


    const results = json_data.filter((element) => {
      if (
        !element["Company Code"] &&
        !element["Customer Code"] &&
        !element["Distribution Channel"] &&
        !element["Material Name"] &&
        !element["Material Number"] &&
        !element["Sales Order Number"] &&
        !element["Sales Document Type"] &&
        !element["Delivery Date"]
      ) {
        return false;
      }

      return true;
    });


    var check_flag = { status: false };

    var count = 0;

    function checkProperties(obj) {
      for (var key in obj) {
        if (
          key == "Price" ||
          key == "Item No" ||
          key == "Distribution Channel Description" ||
          key == "Company Code" ||
          key == "Distribution Channel"
        ) {
          continue;
        }
        // console.log("kk",key,obj[`${key}`])

        if (obj[`${key}`] == null || obj[`${key}`] == "") {
          check_flag["empty_field"] = key;
          return true;
        }

        if (
          key == "Delivery Date" &&
          !moment(obj[`${key}`], "DD-MM-YYYY", true).isValid()
        ) {
          check_flag["empty_field"] = "invalid_date";
          return true;
        }
      }
      return false;
    }

   let ppromise = []

   var current_so;

   let current_item_number = 0;

   let so_obj = {}

    for (let i = 0; i < results.length; i++) {

      const checkp = checkProperties(results[i]);
      if (checkp == true) {
        check_flag.status = true;
        break;
      }

      if(current_so != results[i]["Sales Order Number"]){
        if(so_obj.hasOwnProperty(results[i]["Sales Order Number"])){
          current_item_number = so_obj[results[i]["Sales Order Number"]]
        }
        else {
          current_item_number = 0
        }
        current_so = results[i]["Sales Order Number"]
      }


      const check_entry_in_so_allocation = await db.soAllocation.findOne({
        sales_order_no: results[i]["Sales Order Number"],
        material_no: results[i]["Material Number"],
        plant_id: results[i]["Plant ID"],
      });



      const item_no_check = await db.soAllocation
        .findOne({ sales_order_no: results[i]["Sales Order Number"],plant_id: results[i]["Plant ID"]})
        .sort({ _id: -1})
        .limit(1);

      if (check_entry_in_so_allocation) {
        var item_number = check_entry_in_so_allocation.item_no;
       
      } else if (item_no_check) {
        // console.log("aaaa12",item_no_check)
        // console.log(Number(item_no_check.item_no))
        if(Number(item_no_check.item_no)>=current_item_number){
          current_item_number = Number(item_no_check.item_no)
        }
        
        let item_no_in = current_item_number + 10;
        // console.log("item_no_in",item_no_in)

        let str1 = String(item_no_in);

        var item_number = str1.padStart(6, "0");

        // console.log(str1.padStart(6, '0'));
        // console.log("as",item_number)

        // const str1 = '100';
        // console.log(str1.padStart(6, '0'));
      } else {

      

        let item_no_in = current_item_number + 10;
        // console.log("item_no_in",item_no_in)

        let str1 = String(item_no_in);

        var item_number = str1.padStart(6, "0");
      }

      // console.log("item_number",item_number)


      current_item_number = Number(item_number);

      so_obj[results[i]["Sales Order Number"]] = current_item_number

      // console.log("------------",so_obj);

      let entry_obj = {
        sales_order_no: results[i]["Sales Order Number"],
        sales_document_type: results[i]["Sales Document Type"],
        distribution_channel: results[i]["Distribution Channel"]
          ? results[i]["Distribution Channel"]
          : "3p",
        distribution_channel_description: results[i][
          "Distribution Channel Description"
        ]
          ? results[i]["Distribution Channel Description"]
          : "third party",
        customer_code: results[i]["Customer Code"],
        customer_name: results[i]["Customer Name"],
        material_name: results[i]["Material Name"],
        material_no: results[i]["Material Number"],
        item_no: item_number,
        // item_id :item.items._id,
        allocated_qty: 0,
        order_qty: results[i]["Order Qty"],
        pending_qty: results[i]["Order Qty"],
        delivery_date: moment(results[i]["Delivery Date"], "DD-MM-YYYY").format(
          "YYYY-MM-DD"
        ),
        entry_time: new Date(Date.now()),
        order_placing_date: moment(
          results[i]["Order Placing Date"],
          "DD-MM-YYYY"
        ).toISOString(),
        company_code: company_code,
        plant_id: results[i]["Plant ID"],
        create_count: 0,
        route_id: "",
        allocation_detail: [],
        uom: results[i]["UOM"],
        price: results[i]["Price"],
        is_ready_for_invoice: false,
        allocation_status: "PENDING",
        lotting_loss:0,
        delivery_posted_qty:0,
        inventory_delivery_posted_qty:0,
        inventory_allocated_qty:0,
        created_by: email,
      };

      // console.log("entry_obj",entry_obj)

      let filter = {
        sales_order_no: results[i]["Sales Order Number"],
        material_no: results[i]["Material Number"],
        // item_no: results[i]["Item No"],
        plant_id: results[i]["Plant ID"],
        // delivery_date : moment(results[i]["Delivery Date"], "DD-MM-YYYY").format(
        //   "YYYY-MM-DD"
        // )
      };

      

      if (
        entry_obj.sales_order_no &&
        entry_obj.order_qty &&
        entry_obj.material_no
        // entry_obj.delivery_date
      ) {
        // console.log("entry_obj",entry_obj)
        // console.log("entered")




        ppromise.push(db.soAllocation.updateOne(filter, entry_obj, {
          upsert: true,
          new: true,
        }))

        // var update_db = await db.soAllocation.updateOne(filter, entry_obj, {
        //   upsert: true,
        //   new: true,
        // });
      }


      // if (update_db) {
      //   count += 1;
      // }
    }


    let ss = await Promise.all(ppromise)
    .then((pm_result)=>{
      if (pm_result && pm_result.length) {
        count = pm_result.length
      }
    })
    .catch((e)=>{
      return res.status(500).send({ message: err.message})
    })


    const rmv_file = await fs.unlink(req.file.path, function (res) {
      console.log("File removed!");
    });

    const require_field = [
      "Company Code",
      "Customer Code",
      "Customer Name",
      "Delivery Date",
      "Distribution Channel",
      "Distribution Channel Description",
      "Item No",
      "Material Name",
      "Material Number",
      "Order Placing Date",
      "Order Qty",
      "Plant ID",
      "Price",
      "Sales Document Type",
      "Sales Order Number",
      "UOM",
    ];

    if (check_flag.status == true) {
      if (check_flag.empty_field == "invalid_date") {
        return res.status(400).send({
          status_code: 400,
          message: `please provide the valid date format`,
        });
      }
      if (require_field.includes(check_flag.empty_field)) {
        return res.status(400).send({
          status_code: 400,
          message: `${check_flag.empty_field} is not provided`,
        });
      } else {
        return res.status(400).send({
          status_code: 400,
          message: "Please provide the valid field",
        });
      }
    } else if (count == 0) {
      return res.status(400).send({
        status_code: 400,
        message: "Please provide the valid field",
      });
    } else {
      return res.send({
        status_code: 200,
        message: `${count} items updated`,
      });
    }
  } catch (err) {
    return res.status(500).send({
      message: err.message,
    });
  }
};

// po import

exports.parse_po_to_json = async (req, res) => {
  try {
    // console.log("req.file.path", req.file);

    // console.log("rer",req.body.company_code)

    const { company_code, email } = req.query;

    if (!req.file) {
      return res
        .status(400)
        .send({ status_code: 400, message: "please select the file" });
    }

    if (req.file.mimetype != "text/csv") {
      const rmv_file = await fs.unlink(req.file.path, function (res) {
        console.log("File removed!");
      });
      return res
        .status(400)
        .send({ status_code: 400, message: "please select the csv file only" });
    }

    if (!company_code || !email) {
      const rmv_file = await fs.unlink(req.file.path, function (res) {
        console.log("File removed!");
      });
      return res.status(400).send({
        status_code: 400,
        message: "please provide company code and user email",
      });
    }

    const today_date = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD");

    const json_data = await csvtojson().fromFile(req.file.path);

    const results = json_data.filter((element) => {
      if (
        !element["PO Number"] &&
        !element["Delivery Date"] &&
        !element["Material No"] &&
        !element["Quantity"] &&
        !element["Item No"]
      ) {
        return false;
      }

      return true;
    });

    var check_flag = { status: false };

    var count = 0;

    function checkProperties(obj) {
      for (var key in obj) {
        if (
          key == "Batch" ||
          key == "Expiry" ||
          key == "HSNCode" ||
          key == "Vendor code" ||
          key == "Vendor"
          // key == "Item No"
        ) {
          continue;
        }

        if (obj[`${key}`] == null || obj[`${key}`] == "") {
          check_flag["empty_field"] = key;
          return true;
        }

        if (
          key == "Delivery Date" &&
          !moment(obj[`${key}`], "DD-MM-YYYY", true).isValid()
        ) {
          check_flag["empty_field"] = "invalid_date";
          return true;
        }
      }
      return false;
    }

    for (let i = 0; i < results.length; i++) {
      // console.log("log",i);
      const checkp = checkProperties(results[i]);
      if (checkp == true) {
        check_flag.status = true;
        break;
      }

      let check_po_entry = await db.purchaseOrder.aggregate([
        {
          $match: {
            company_code: company_code,
            supplying_plant: results[i]["Plant"],
            po_number: results[i]["PO Number"],
          },
        },
        { $unwind: { path: "$item" } },
        { $sort: { "item._id": -1 } },
      ]);

      if (check_po_entry && check_po_entry.length > 0) {
        var item_no_set = "";

        // let pre_item_no = check_po_entry[0].item.item_no;

        // let item_no_in = Number(pre_item_no) + 10;

        // let str1 = String(item_no_in);

        var item_no_set = results[i]["Item No"].padStart(5, "0");

        var check_array = false;

        let check_item_available = check_po_entry.map((result, idx) => {
          // console.log(
          //   "current_check",
          //   result.item.material_no,
          //   results[i]["Material No"]
          // );

          if (
            result.item.material_no == results[i]["Material No"] &&
            result.item.item_no == item_no_set
          ) {
            item_no_set = result.item.item_no;
            check_array = true;
          }
        });

        let entry_obj = {
          item_no: item_no_set,
          material_no: results[i]["Material No"],
          plant: results[i]["Plant"],
          delivery_date: moment(
            results[i]["Delivery Date"],
            "DD-MM-YYYY"
          ).format("YYYY-MM-DD"),
          material_group: "ITCBRAND",
          quantity: results[i]["Quantity"],
          storage_location: "100",
          uom: results[i]["UOM"],
          conversion_factor_status: "No",
          tax_code: "",
          net_price: 0,
          selling_price: 0,
          taxable_value: 0,
          mrp_amount: 0,
          discount_amount: 0,
          discount_perc: 0,
          material_description: results[i]["Material Name"],
        };

        // object for rapid_purchase_order_batch_details

        let batch_entry_obj = {
          item_no: item_no_set,
          material_no: results[i]["Material No"],
          batch: results[i]["Batch"],
          expiry: results[i]["Expiry"],
          hsn_code: results[i]["HSNCode"],
        };

        if (check_array == true) {
          var update_db = await db.purchaseOrder.update(
            { po_number: results[i]["PO Number"] },
            {
              $set: {
                delivery_date: entry_obj.delivery_date,
                "item.$[elem].quantity": entry_obj.quantity,
                "item.$[elem].delivery_date": entry_obj.delivery_date,
              },
            },
            {
              arrayFilters: [
                {
                  "elem.material_no": results[i]["Material No"],
                  "elem.item_no": results[i]["Item No"].padStart(5, "0"),
                },
              ],
            }
          );

          let Update_all_item_dd = await db.purchaseOrder.update(
            { po_number: results[i]["PO Number"] },
            {
              $set: {
                "item.$[].delivery_date": entry_obj.delivery_date,
                delivery_date: entry_obj.delivery_date,
              },
            }
          );

          let update_batch_collection = await db.purchase_order_batch.update(
            { po_number: results[i]["PO Number"] },
            {
              $set: {
                "item.$[elem].batch": batch_entry_obj.batch,
                "item.$[elem].expiry": batch_entry_obj.expiry,
                "item.$[elem].hsn_code": batch_entry_obj.hsn_code,
              },
            },
            {
              arrayFilters: [
                {
                  "elem.material_no": results[i]["Material No"],
                  "elem.item_no": results[i]["Item No"].padStart(5, "0"),
                },
              ],
            }
          );

          // update batch

          if (update_db) {
            count += 1;
          }

          // console.log("update_db_set",update_db)
        } else {
          var update_db = await db.purchaseOrder.update(
            { po_number: results[i]["PO Number"] },
            { $push: { item: entry_obj } }
          );

          let Update_all_item_dd = await db.purchaseOrder.update(
            { po_number: results[i]["PO Number"] },
            {
              $set: {
                "item.$[].delivery_date": entry_obj.delivery_date,
                delivery_date: entry_obj.delivery_date,
              },
            }
          );

          // update batch collection with new item entry
          let update_batch_collection = await db.purchase_order_batch.update(
            { po_number: results[i]["PO Number"] },
            { $push: { item: batch_entry_obj } }
          );

          if (update_db) {
            count += 1;
          }

          // console.log("update_db_push",update_db)
        }
      } else {
        let entry_obj = {
          po_number: results[i]["PO Number"],
          po_document_type: "ZNSP",
          company_code: company_code,
          vendor_no: results[i]["Vendor code"] ? results[i]["Vendor code"] : "100001",
          purchase_organisation: "1004",
          purchase_group: "",
          document_date: today_date,
          delivery_date: moment(
            results[i]["Delivery Date"],
            "DD-MM-YYYY"
          ).format("YYYY-MM-DD"),
          start_of_validity_period: today_date,
          end_of_validity_period: "",
          plant: Number(results[i]["Plant"]),
          supplying_plant: results[i]["Plant"],
          shiping_plant: "",
          vendor_name: results[i]["Vendor"] ? results[i]["Vendor"] : "ITC Private Limited",
          fright_value: "0",
          isDeleted: 0,
          status: 1,
          created_by: email,

          item: [
            {
              item_no: results[i]["Item No"].padStart(5, "0"),
              material_no: results[i]["Material No"],
              plant: results[i]["Plant"],
              delivery_date: moment(
                results[i]["Delivery Date"],
                "DD-MM-YYYY"
              ).format("YYYY-MM-DD"),
              material_group: "ITCBRAND",
              quantity: results[i]["Quantity"],
              storage_location: "100",
              uom: results[i]["UOM"],
              conversion_factor_status: "No",
              tax_code: "",
              net_price: 0,
              selling_price: 0,
              taxable_value: 0,
              mrp_amount: 0,
              discount_amount: 0,
              discount_perc: 0,
              material_description: results[i]["Material Name"],
            },
          ],
        };

        let batch_entry_obj = {
          company_code: company_code,
          plant: results[i]["Plant"],
          po_number: results[i]["PO Number"],

          item: [
            {
              item_no: results[i]["Item No"].padStart(5, "0"),
              material_no: results[i]["Material No"],
              batch: results[i]["Batch"],
              expiry: results[i]["Expiry"],
              hsn_code: results[i]["HSNCode"],
            },
          ],
        };

        let new_po_entry = await new db.purchaseOrder(entry_obj).save();

        let new_po_batch_entry = await new db.purchase_order_batch(
          batch_entry_obj
        ).save();

        // console.log("new_po_entry",new_po_entry)
        if (new_po_entry) {
          count += 1;
        }
      }
    }

    const rmv_file = await fs.unlink(req.file.path, function (res) {
      console.log("File removed!");
    });

    const require_field = [
      "PO Number",
      "Delivery Date",
      "Plant",
      "Item No",
      "Material No",
      "Material Name",
      "UOM",
      "Quantity",
    ];

    if (check_flag.status == true) {
      if (check_flag.empty_field == "invalid_date") {
        return res.status(400).send({
          status_code: 400,
          message: `please provide the valid date format`,
        });
      }

      if (require_field.includes(check_flag.empty_field)) {
        return res.status(400).send({
          status_code: 400,
          message: `${check_flag.empty_field} is not provided`,
        });
      } else {
        return res.status(400).send({
          status_code: 400,
          message: "Please provide the valid field",
        });
      }
    } else if (count == 0) {
      console.log("sa");
      return res.status(400).send({
        status_code: 400,
        message: "Please provide the valid field",
      });
    } else {
      return res.send({
        status_code: 200,
        message: `${count} items updated`,
      });
    }
  } catch (err) {
    return res.status(500).send({
      message: err.message,
    });
  }
};
