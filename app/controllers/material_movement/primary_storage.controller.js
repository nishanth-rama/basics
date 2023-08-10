const { add } = require("lodash");
const db = require("../../models");
const rackModel = require("../../models/master/rack.model");
const primary_storage = db.primary_storage;

const palletization_table = db.palletization;

const pallet_master_table = db.pallets;

const so_allocation_detail_table = db.soAllocation;

const rack_mater_table = db.racks;

const secondary_storage_table = db.secondary_storage;

const discrete_item_table = db.discrete_item;

const product_weight = db.product_weight_model;

const moment = require("moment");
const { company } = require("../../models");

// get api for pending quantity
exports.get_primary_storage_data = async (req, res) => {
  try {
    if (!(req.query.company_code && req.query.plant_id)) {
      return res.status(400).send({
        status_code: 400,
        message: "Please provide all the details like company code, plant id!",
      });
    }

    const primary_storage_details = [];
    const fetchdata = await primary_storage
      .find({
        company_code: req.query.company_code,
        plant_id: req.query.plant_id,
        // material_code: req.query.material_code,
        // rack_barcode: req.query.rack_barcode,
        status: "occupied",
      })
      .sort({ location_id: 1 });

    if (fetchdata != 0) {
      fetchdata.map((item) => {
        const finddata = {};
        (finddata.rack_type = item.rack_type),
          (finddata.unit_no = item.unit_no),
          (finddata.rack_id = item.rack_id),
          (finddata.level_id = item.level_id),
          (finddata.column_id = item.column_id),
          (finddata.rack_barcode = item.rack_barcode),
          (finddata.material_code = item.material_code),
          (finddata.status = item.status),
          (finddata.pallet_barcode = item.pallet_barcode),
          primary_storage_details.push(finddata);
      });
      return res.status(200).send({
        status_code: 200,
        message: "Pallet data is available in primary storage!",
        primary_storage_details,
      });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "Pallet data is not available in primary storage!",
      });
    }
  } catch (err) {
    res.status(500).send({
      status_code: "500",
      message: err.message || "Some error occurred while retrieving data!",
    });
  }
};

// this api is not in use instead giving empty rack from secondary in get stacked pallet detail api
exports.get_first_empty_rack = async (req, res) => {
  // console.log("calling get first empty rack api");
  try {
    if (
      !(req.body.company_code && req.body.plant_id && req.body.pallet_barcode)
    ) {
      return res.status(400).send({
        status_code: 400,
        message:
          "Please provide all the details like company code, plant id and pallet_barcode!",
      });
    }

    // if (!req.body.pallet_barcode) {
    //   return res.status(400).send({
    //     status_code: 400,
    //     message: "Please provide pallet_barcode value!",
    //   });
    // }

    // checking status of pallet in pallet_master

    const pallet_in_palletization = await palletization_table.findOne({
      pallet_barcode_value: req.body.pallet_barcode,
    });

    // console.log("rr", pallet_in_palletization);

    if (!pallet_in_palletization) {
      return res.send({
        status: 404,
        success: false,
        message: "pallet not found in Palletization Collection",
      });
    } else if (pallet_in_palletization.pallet_status != "Stacked") {
      // console.log("asddas_updated", pallet_in_palletization.pallet_status);
      return res.send({
        status: 404,
        success: false,
        message: `pallet is at ${pallet_in_palletization.pallet_status} stage`,
      });
    }

    const fetchdata = await rack_mater_table
      .find({
        active_status: 1,
        status: "unoccupied",
        plant_id: req.body.plant_id,
        company_code: req.body.company_code,
        rack_type: "primary",
        level_id: { $ne: "L3" },
      })
      .sort({ rack_id: 1, unit_no: 1, location_id: 1 })
      .collation({ locale: "en_US", numericOrdering: true })
      // .limit(primary_storage_pick_detail && primary_storage_pick_detail.length)
      .limit(1);

    // console.log("fetchdata",fetchdata)

    // const fetchdata = await primary_storage
    //   .findOne({
    //     status: "unoccupied",
    //   })
    //   .sort({ location_id: 1 })
    //   .limit(1);

    // console.log(fetchdata && Object.keys(fetchdata).length);

    if (fetchdata && Object.keys(fetchdata).length != 0) {
      return res.status(200).send({
        status_code: 200,
        message: `Please store pallet in primary storage rack with location_id ${fetchdata[0].location_id}`,
      });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "no space available in Primary Storage!",
      });
    }
  } catch (err) {
    res.status(500).send({
      status_code: "500",
      message: err.message || "Some error occurred while retrieving data!",
    });
  }
};

exports.add_pallet_to_primary_storage = async (req, res) => {
  try {
    if (
      !(
        req.body.plant_id &&
        req.body.company_code &&
        req.body.pallet_barcode &&
        req.body.material_code &&
        req.body.location_id
      )
    ) {
      return res.status(400).send({
        status_code: 400,
        message:
          "Please provide all the parameters like location_id, pallet_barcode, material_code, plant_id and company_code!",
      });
    }

    let pallet_qty_sum = await palletization_table.aggregate([
      {
        $match: {
          pallet_barcode_value: req.body.pallet_barcode,
          is_deleted: false,
        },
      },
      // {
      //   $project: {
      //     pallet_status: 1,
      //     item_name: 1,
      //     item_code: 1,
      //     uom: 1,
      //     carrier_count: 1,
      //     // total_qty: {
      //     //   $multiply:[ "$carrier_count", "$sku_qty_in_kg" ]
      //     //   // $sum: "$carrier_detail.gross_weight",
      //     // },
      //   },
      // },
    ]);

    if (
      pallet_qty_sum &&
      pallet_qty_sum.length &&
      pallet_qty_sum[0].pallet_status != "Stacked"
    ) {
      return res.send({
        status_code: "200",
        message: "Pallet not in stacked position",
      });
    }

    if (pallet_qty_sum.length == 0) {
      return res.send({
        status_code: "200",
        message: "Pallet not found in palletization table",
      });
    }
    // check in rack master

    const fetchdata_from_rack_master = await rack_mater_table.findOne({
      rack_type: "primary",
      plant_id: req.body.plant_id,
      company_code: req.body.company_code,
      location_id: req.body.location_id,
    });

    if (
      fetchdata_from_rack_master &&
      fetchdata_from_rack_master.status == "occupied"
    ) {
      return res.send({ status_code: "200", message: "Rack already occupied" });
    } else if (!fetchdata_from_rack_master) {
      return res.send({
        status_code: "200",
        message: "rack not found in rack master",
      });
    }

    // const discrete_item_detail = await discrete_item_table.findOne({
    //   company_code: req.body.company_code,
    //   plant_id: req.body.plant_id,
    //   item_code: req.body.material_code,
    // });

    // discrete material check from rapid_products_weight_tolerence
    const discrete_item_detail = await product_weight.findOne({
      company_code: req.body.company_code,
      plant_id: req.body.plant_id,
      material_code: req.body.material_code,
    });

    
    var update_total_stock ;
    var update_uom ;

    if(pallet_qty_sum.length && pallet_qty_sum[0].uom == "KG"){
      update_total_stock =
        pallet_qty_sum[0].carrier_count * pallet_qty_sum[0].sku_qty_in_kg;
      
        update_uom = "KG"
    }
    else if(pallet_qty_sum.length && pallet_qty_sum[0].uom == "PAC"){
        if(discrete_item_detail && discrete_item_detail.pieces_per_bin !=0){
          update_total_stock =
          pallet_qty_sum[0].carrier_count * pallet_qty_sum[0].sku_qty_in_pack;

          update_uom = "PAC"
        }
        else {
          update_total_stock =
          pallet_qty_sum[0].carrier_count * pallet_qty_sum[0].sku_qty_in_kg;
          update_uom = "KG"
        }
    }

    // if (pallet_qty_sum.length && pallet_qty_sum[0].uom == "PAC") {
    //   // var update_total_stock =
    //   //   Number(pallet_qty_sum[0].carrier_count) *
    //   //   Number(discrete_item_detail.carrier_count);
    //   //  var update_total_stock = pallet_qty_sum[0].total_qty;
    //   var update_total_stock =
    //     pallet_qty_sum[0].carrier_count * pallet_qty_sum[0].sku_qty_in_pack;
    // } else {
    //   update_total_stock =
    //     pallet_qty_sum[0].carrier_count * pallet_qty_sum[0].sku_qty_in_kg;
    // }

    // console.log("update_total_stock",update_total_stock)

    rack_entry_detail = {
      company_code: req.body.company_code,
      plant_id: req.body.plant_id,
      rack_type: fetchdata_from_rack_master.rack_type,
      unit_no: fetchdata_from_rack_master.unit_no,
      rack_id: fetchdata_from_rack_master.rack_id,
      level_id: fetchdata_from_rack_master.level_id,
      column_id: fetchdata_from_rack_master.column_id,
      location_id: fetchdata_from_rack_master.location_id,
      material_code: pallet_qty_sum[0].item_code,
      material_name: pallet_qty_sum[0].item_name,
      carrier_count: pallet_qty_sum[0].carrier_count,
      total_stock: update_total_stock,
      uom: update_uom,
      status: "occupied",
      pallet_barcode: req.body.pallet_barcode,
    };


    

    const primary_rack_entry = new primary_storage(rack_entry_detail);

    let save_rack_in_primary = await primary_rack_entry.save();

    if (save_rack_in_primary) {
      const filter = {};

      const update_pallet_status_in_palletization =
        await palletization_table.updateOne(
          {
            pallet_barcode_value: req.body.pallet_barcode,
            is_deleted: false,
            plant_id: req.body.plant_id,
            company_code: req.body.company_code,
          },
          { pallet_status: "Primary_storage" },
          { upsert: false, new: true }
        );

      const update_pallet_status_in_pallet_master =
        await pallet_master_table.updateOne(
          {
            pallet_id: req.body.pallet_barcode,
            plant_id: req.body.plant_id,
            company_code: req.body.company_code,
          },
          { palletization_status: "Primary_storage" },
          { upsert: false, new: true }
        );

      const update_primary_rack_status_in_rack_master =
        await rack_mater_table.updateOne(
          {
            rack_type: "primary",
            plant_id: req.body.plant_id,
            company_code: req.body.company_code,
            location_id: req.body.location_id,
          },
          { status: "occupied" },
          { upsert: false, new: true }
        );

      // const remove_rack_from_primary_storage =
      //   await primary_storage_table.deleteOne(
      //     {
      //       rack_type: "primary",
      //       plant_id: req.body.plant_id,
      //       company_code: req.body.company_code,
      //       pallet_barcode: req.body.pallet_barcode,
      //     }
      //   );

      if (update_primary_rack_status_in_rack_master.nModified === 1) {
        return res.status(200).send({
          status_code: 200,
          message: `Pallet with Barcode Id ${req.body.pallet_barcode} stored in primary rack with Location Id ${req.body.location_id} successfully`,
          // data: fetchdata,
          // update_message: update_one_pallet,
        });
      } else {
        return res.status(400).send({
          status_code: 400,
          message:
            "some error occured while updating pallet status in Palletization",
        });
      }
    }

    res.status(200).json({
      status_code: "200",
      message: "unable to save rack in primary storage",
    });

    // if (save_rack_in_primary) {
    //   const filter = { _id: fetchdata[0]._id };

    //   console.log("filter", filter);

    //   const post_parameter = {
    //     pallet_barcode: req.body.pallet_barcode,
    //     material_code: req.body.material_code,
    //     material_name:material_name,
    //     total_stock: total_stock,
    //     uom: uom,
    //     status: "occupied",
    //   };

    //   const update_one_pallet = await primary_storage.updateOne(
    //     filter,
    //     post_parameter,
    //     { upsert: false, new: true }
    //   );

    //   // console.log(update_one_pallet);

    //   if (update_one_pallet.nModified === 1) {
    //     const filter = {};

    //     // const update_pallet_status_in_master = await pallet_master_table.updateOne({pallet_id:req.body.pallet_barcode}, {palletization_status:"Primary_storage"}, { upsert: false, new: true });

    //     const update_pallet_status_in_palletization =
    //       await palletization_table.updateOne(
    //         { pallet_barcode_value: req.body.pallet_barcode },
    //         { pallet_status: "Primary_storage" },
    //         { upsert: false, new: true }
    //       );

    //     console.log("done", update_pallet_status_in_palletization);

    //     if (update_pallet_status_in_palletization.nModified === 1) {
    //       return res.status(200).send({
    //         status_code: 200,
    //         message: `Pallet with Barcode Id ${req.body.pallet_barcode} stored in rack with Location Id ${req.body.location_id} successfully`,
    //         // data: fetchdata,
    //         // update_message: update_one_pallet,
    //       });
    //     } else {
    //       return res.status(400).send({
    //         status_code: 400,
    //         message:
    //           "some error occured while updating pallet status in Palletization",
    //       });
    //     }
    //   }
    //   // no need ot this else , remove it later
    //   else {
    //     return res.status(400).send({
    //       status_code: 400,
    //       message: "No Rack Found!",
    //     });
    //   }
    // } else {
    //   return res.status(400).send({
    //     status_code: 400,
    //     message: "No rack found with given location_id !",
    //   });
    // }
  } catch (err) {
    res.status(500).send({
      status_code: "500",
      message:
        err.message ||
        "Some error occurred while adding pallet to primary storage!",
    });
  }
};

// get_total_qty_of_material

exports.get_total_quantity_of_material = async (req, res) => {
  try {
    if (
      !(req.query.company_code && req.query.plant_id && req.query.delivery_date)
    ) {
      return res.status(400).send({
        status_code: 400,
        message:
          "Please provide all the details like delivery_date, company code, plant id!",
      });
    }

    // const secondary_storage_data = secondary_storage_table.aggregate([
    //   {
    //     $match: {
    //       material_no: { $in: so_item_array },
    //       company_code: req.query.company_code,
    //       plant_id: req.query.plant_id,
    //       delivery_date: req.query.delivery_date,
    //     },
    //   },
    // ]);

    var delivery_date;
    if (req.query.delivery_date) {
      delivery_date = req.query.delivery_date;
    } else {
      delivery_date = moment(new Date()).format("YYYY-MM-DD");
    }

    const primary_storage_item_detail = await primary_storage
      .find()
      .select("-_id material_code");

    // just R
    // const discrete_item_array = [];

    // const check_material_in_discrete = await secondary_storage_table.find().select("-_id item_code");;

    // const check_material_in_discrete = await discrete_item_table.find({
    //   company_code: req.query.company_code,
    //   plant_id: req.query.plant_id,
    // });

    // discrete material check from rapid_products_weight_tolerence
    //  const check_material_in_discrete = await product_weight.find({
    //   company_code: req.query.company_code,
    //   plant_id: req.query.plant_id,
    //   pieces_per_bin:{$nin:[0,null]}
    // });

    // var discrete_item_number_array = [];

    // const discrete_item_number = await discrete_item_detail.map((item, idx) => {
    //   discrete_item_number_array.push(item.item_code);
    // });

    // check_material_in_discrete &&
    //   check_material_in_discrete.map((item, idx) => {
    //     discrete_item_array.push(item.material_code);
    //   });

    const so_item_array = [];

    primary_storage_item_detail &&
      primary_storage_item_detail.map((item, idx) => {
        //just r
        // if (!discrete_item_array.includes(item.material_code))
        // console.log("aaa")
        so_item_array.push(item.material_code);
      });

    // above few line of code for ref to line no 466,showing material available in primary storage only but need to show all on that delivery date

    let sales_order_total_qty = await so_allocation_detail_table.aggregate([
      {
        $match: {
          // material_no: { $in: so_item_array },

          company_code: req.query.company_code,
          plant_id: req.query.plant_id,
          pending_qty: { $ne: 0 },
          delivery_date: req.query.delivery_date,
        },
      },
      {
        $project: {
          material_name: 1,
          material_no: 1,
          order_qty: 1,
          pending_qty: 1,
          uom: 1,
        },
      },

      {
        $group: {
          _id: "$material_no",
          total_qty: {
            $sum: "$pending_qty",
          },

          doc: { $first: "$$ROOT" },
        },
      },
      {
        $project: {
          // _id: 0,
          material_name: "$doc.material_name",
          material_no: "$doc.material_no",
          uom: "$doc.uom",
          total_qty: 1,
        },
      },
      // { $sort: { total_qty: -1 } },

      //
      // $lookup: {
      //   from: "rapid_user_module_mappings",
      //   // let : {
      //   //   email: "$email", module_name: "$module_name"
      //   // }
      //   pipeline: [{ $match: { email: email, module_name: module_name } }],
      //   // localField: "email",
      //   // foreignField: "email",
      //   as: "user_module",
      // },
      //
      // taking secondary material
      {
        $lookup: {
          from: "rapid_secondary_storage_new",
          pipeline: [{ $match: { rack_type: "secondary" } }],
          localField: "material_no",
          foreignField: "material_code",
          as: "secondary_storage_mt_detail",
        },
      },
      {
        $lookup: {
          from: "rapid_primary_storages",
          // pipeline: [{ $match: { rack_type: "secondary" } }],
          localField: "material_no",
          foreignField: "material_code",
          as: "primary_storage_mt_detail",
        },
      },
      {
        $project: {
          material_name: 1,
          material_no: 1,
          uom: 1,
          total_qty: 1,
          secondary_qty: {
            $sum: "$secondary_storage_mt_detail.current_stock",
          },
          primary_qty: {
            $sum: "$primary_storage_mt_detail.total_stock",
          },
        },
      },
    ]);

    // console.log("sales_order_total_qty",sales_order_total_qty)

    if (sales_order_total_qty.length == 0) {
      return res.status(400).send({
        status_code: 400,
        message: "sales order is not available!",
      });
    }

    // console.log("a1",sales_order_total_qty)

    var check = false;

    var result_array = [];

    const curr_result = sales_order_total_qty.map(async (item, idx) => {
      // let secondary_total_qty = await secondary_storage_table.aggregate([
      //   {
      //     $match: {
      //       material_code: item.material_no,
      //       company_code: req.query.company_code,
      //       plant_id: req.query.plant_id,
      //     },
      //   },
      //   {
      //     $group: {
      //       _id: "$material_code",
      //       total_qty: {
      //         $sum: "$current_stock",
      //       },
      //     },
      //   },
      //   {
      //     $project: { _id: 0, total_qty: 1 },
      //   },
      // ]);

      // console.log("val11",item.material_no,item.total_qty,secondary_total_qty)

      if (so_item_array.includes(item.material_no)) {
        check = true;
      }

      if (
        !(
          // secondary_total_qty[0] &&
          // secondary_total_qty[0].total_qty >= item.total_qty

          // new
          // item.secondary_qty &&

          (item.secondary_qty >= item.total_qty)
        ) &&
        so_item_array.includes(item.material_no)
      ) {
        // check = true;

        if (item.secondary_qty != 0) {
          const new_char = Math.ceil(item.total_qty - item.secondary_qty);
          item.secondary_require_qty = new_char;
          item.status = "primary";
          result_array.push(item);
        } else {
          item.secondary_require_qty = item.total_qty;
          item.status = "primary";
          result_array.push(item);
        }
      }
      // console.log("radhe radhe", item.secondary_qty, item.total_qty);
      if (item.secondary_qty >= item.total_qty) {
        item.total_qty = 0;
      }

      // if(secondary_data && secondary_data.total_stock < item.total_qty){
      //      const new_val = item.total_qty - secondary_data.total_stock
      //      item.total_qty = Number(new_val.toFixed(2))
      //      console.log("new_val",new_val)
      //     return new_val
      // }
      // else if (secondary_data && secondary_data.total_stock >= item.total_qty) {
      //   item.total_qty = 0
      // }
    });

    await Promise.all(curr_result);

    // console.log("check", check);

    if (!check) {
      return res.send({
        status_code: 400,
        message: "Sales order requirement is not fulfilled in Primary storage",
      });
    }

    // console.log("result_array", result_array);

    const final_array =
      result_array &&
      result_array.sort((a, b) => {
        return a.secondary_require_qty - b.secondary_require_qty;
      });

    // if(sales_order_total_qty.length && result_array.length == 0){
    //   return res.status(400).send({
    //     status_code: 400,
    //     message: "required sales order material is not available in primary storage!",
    //   });
    // }

    // console.log("curr_result",curr_result)

    if (result_array.length != 0) {
      return res.status(200).send({
        status_code: 200,
        message: "Total quantity list of materials is available!",
        data: result_array,
      });
    } else {
      return res.status(200).send({
        status_code: 200,
        message: "All Materials are available in the secondary storage.",
      });
    }
  } catch (err) {
    res.status(500).send({
      status_code: "500",
      message: err.message || "Some error occurred while retrieving data!",
    });
  }
};

exports.getCarrierBarcodes = async (req, res) => {
  console.log("calling get carrier barcodes from primary storage api");

  const { company_code, plant_id, location_id, pallet_barcode } = req.query;

  try {
    if (!(company_code && plant_id && location_id && pallet_barcode))
      return res.status(400).send({
        status_code: 400,
        message: "Please proivde required parameters!",
      });

    const carrierBarcodes = await palletization_table.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        location_id: location_id,
        pallet_barcode_value: pallet_barcode,
        is_deleted: false,
      },
      { _id: 0, carrier_detail: 1 }
    );

    let status = 200;
    let mssge = "Carrier barcodes available";
    let data = [];
    if (carrierBarcodes != null) {
      data = carrierBarcodes.carrier_detail.map((code) => {
        return {
          barcode: code.carrier_barcode,
        };
      });
    } else {
      status = 404;
      mssge = "Carrier barcodes not found!";
    }

    return res
      .status(status)
      .send({ status_code: status, message: mssge, data: data });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting carrier barcodes!",
    });
  }
};
