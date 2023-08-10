const db = require("../../models");
const secondary_storage = db.secondary_storage;

const primary_storage_table = db.primary_storage;

const discrete_item_table = db.discrete_item;

const rack_mater_table = db.racks;

const palletization_table = db.palletization;

const pallet_master_table = db.pallets;

const secondary_storage_table = db.secondary_storage;

const product_weight = db.product_weight_model;

const article_master_table = db.articleMaster;

const conn = require("../../../server.js");

const moment = require("moment");

const _ = require("lodash");

// Add Secondary Discrete Storage Material
exports.add_discrete_storage = (req, res) => {
  if (
    !(
      req.body.company_code &&
      req.body.plant_id &&
      req.body.rack_type &&
      req.body.unit_no &&
      req.body.rack_id &&
      req.body.level_id &&
      req.body.column_id &&
      req.body.location_id &&
      req.body.rack_barcode &&
      req.body.material_code &&
      req.body.current_stock &&
      req.body.uom &&
      req.body.status &&
      req.body.pallet_barcode &&
      req.body.decision_scanner &&
      req.body.data_scanner
    )
  ) {
    return res.status(400).send({
      status_code: "400",
      message: "Please fill all required fields !",
    });
  }
  // console.log(req.body);
  const postdata = new secondary_storage({
    company_code: req.body.company_code,
    plant_id: req.body.plant_id,
    rack_type: req.body.rack_type,
    unit_no: req.body.unit_no,
    rack_id: req.body.rack_id,
    level_id: req.body.level_id,
    column_id: req.body.column_id,
    location_id: req.body.location_id,
    //rack_barcode: req.body.rack_barcode,
    material_code: req.body.material_code,
    current_stock: req.body.current_stock,
    uom: req.body.uom,
    status: req.body.status,
    pallet_barcode: req.body.pallet_barcode,
    decision_scanner: req.body.decision_scanner,
    data_scanner: req.body.data_scanner,
  });
  // console.log("abid");
  // console.log(postdata);
  postdata
    .save(postdata)
    .then((data) => {
      res.status(200).send({
        status_code: "200",
        message: "Material added successfully",
        data,
      });
    })
    .catch((err) => {
      res.status(500).send({
        status_code: "500",
        message: "Some error occurred while adding product.",
      });
    });
};

//  get_rack_for_discrete_material

exports.get_rack_for_discrete_material = async (req, res) => {
  try {
    if (!(req.query.company_code && req.query.plant_id)) {
      return res.status(400).send({
        status_code: 400,
        message: "Please provide company code, plant id!",
      });
    }

    // const discrete_item_detail = await discrete_item_table.find({
    //   company_code: req.query.company_code,
    //   plant_id: req.query.plant_id,
    // });

    // discrete material check from rapid_products_weight_tolerence

    const discrete_item_detail = await product_weight.find({
      company_code: req.query.company_code,
      plant_id: req.query.plant_id,
      pieces_per_bin: { $nin: [0, null] },
    });

    var discrete_item_number_array = [];

    const discrete_item_number = await discrete_item_detail.map((item, idx) => {
      // console.log("item",item.material_code)
      discrete_item_number_array.push(item.material_code);
    });

    // console.log("prasad", discrete_item_number_array);

    // console.log("discrete_item_number",discrete_item_number_array)
    // getting all discrete material from primary storage to be moved

    const discrete_material_from_primary =
      await primary_storage_table.aggregate([
        {
          $match: {
            material_code: { $in: discrete_item_number_array },
            company_code: req.query.company_code,
            plant_id: req.query.plant_id,
          },
        },
        {
          $sort: {
            createdAt: 1,
          },
        },
      ]);

    // console.log("discrete_material_from_primary",discrete_material_from_primary)

    if (discrete_material_from_primary.length == 0) {
      return res.status(400).send({
        status_code: 400,
        message: "Discrete material not available in primary storage",
      });
    }

    // get unoccupied rack from rack master

    const secondary_discrete_initial_empty_rack = await rack_mater_table
      .find({
        active_status: 1,
        status: "unoccupied",
        plant_id: req.query.plant_id,
        company_code: req.query.company_code,
        rack_type: "secondary_discrete",
        // level_id: { $ne: "L3" },
      })
      .sort({ rack_id: 1, unit_no: 1, location_id: 1 })
      .collation({ locale: "en_US", numericOrdering: true });

    var result_array = [];

    if (_.isEmpty(secondary_discrete_initial_empty_rack)) {
      return res.status(200).send({
        status_code: 200,
        message: "Empty rack not available in rack_mater_table",
        data: result_array,
      });
    }

    // console.log("secondary_discrete_initial_empty_rack",secondary_discrete_initial_empty_rack)

    var check_array = [];

    var rack_master_idx = 0;

    const curr_result = discrete_material_from_primary.map(
      async (item, idx) => {
        // console.log("item",item)

        if (check_array.includes(item.material_code)) {
          return false;
        }

        check_array.push(item.material_code);

        let discrete_item_total_qty_available =
          await secondary_storage_table.findOne({
            material_code: item.material_code,
            rack_type: "secondary_discrete",
          });

        // console.log("check_array",check_array)
        // let carrier_count_of_discrete_item = await discrete_item_table.findOne({
        //   item_code: item.material_code,
        // });

        //
        //  discrete material check from rapid_products_weight_tolerence
        const carrier_count_of_discrete_item = await product_weight.findOne({
          company_code: req.query.company_code,
          plant_id: req.query.plant_id,
          material_code: item.material_code,
        });

        // console.log("carrier_count_of_discrete_item",carrier_count_of_discrete_item)
        // console.log("aq",carrier_count_of_discrete_item)
        var count_threshold = Math.round(
          0.2 * carrier_count_of_discrete_item.rack_capacity
        );

        // console.log("pp",count_threshold,discrete_item_total_qty_available.total_stock)

        // console.log("discrete_item_total_qty_available",discrete_item_total_qty_available,count_threshold)

        // console.log("is this",discrete_item_total_qty_available,count_threshold)

        if (
          discrete_item_total_qty_available &&
          discrete_item_total_qty_available.current_stock <= count_threshold
        ) {
          // console.log("aalalalalalal1",carrier_count_of_discrete_item.rack_capacity,discrete_item_total_qty_available.current_stock)
          var qty_move =
            carrier_count_of_discrete_item.rack_capacity -
            discrete_item_total_qty_available.current_stock;

          if (item.total_stock < qty_move) {
            qty_move = item.total_stock;
          }
          // if(!check_array.includes(item.material_code)){

          result_array.push({
            pallet_barcode: item.pallet_barcode,
            material_code: item.material_code,
            material_name: item.material_name,
            primary_pick_location: item.location_id,
            qty_to_be_moved: qty_move ? qty_move : 0,
            discrete_store_location:
              discrete_item_total_qty_available.location_id,
          });
          //   check_array.push(item.material_code);
          // }

          // console.log("result_array_01",result_array)
        } else if (!discrete_item_total_qty_available) {
          // console.log("aalalalalalal2")
          var full_qty_move = carrier_count_of_discrete_item.rack_capacity;
          if (item.total_stock < full_qty_move) {
            full_qty_move = item.total_stock;
          }
          // console.log("1221",item.material_code,item.total_stock)
          // if(!check_array.includes(item.material_code)){

          result_array.push({
            pallet_barcode: item.pallet_barcode,
            material_code: item.material_code,
            material_name: item.material_name,
            primary_pick_location: item.location_id,
            qty_to_be_moved: full_qty_move ? full_qty_move : 0,
            discrete_store_location:
              secondary_discrete_initial_empty_rack[rack_master_idx]
                .location_id,
          });
          // check_array.push(item.material_code);
          // console.log("result_array_02",result_array)
          rack_master_idx += 1;
          // }
        }
      }
    );

    await Promise.all(curr_result);

    const final_array =
      result_array &&
      result_array.sort((a, b) => {
        return a.qty_to_be_moved - b.qty_to_be_moved;
      });

    return res.status(200).send({
      status_code: 200,
      message: "Discrete pick and put detail list",
      data: result_array,
    });
  } catch (err) {
    res.status(500).send({
      status_code: "500",
      message: err.message || "Some error occurred while material movement!",
    });
  }
};

// discrerte material in secondary discrete rack

exports.add_material_to_secondary_discrete_storage = async (req, res) => {
  const session = await conn.startSession();
  try {
    session.startTransaction();

    if (
      !(
        req.body.pallet_barcode &&
        req.body.primary_pick_location &&
        req.body.discrete_store_location &&
        req.body.plant_id &&
        req.body.company_code &&
        req.body.material_code &&
        req.body.qty_to_be_moved
      )
    ) {
      return res.status(400).send({
        status_code: 400,
        message:
          "Please provide all the parameters like plant_id, company_code,pallet_barcode, primary_pick_location, discrete_store_location !",
      });
    }

    const fetchdata_from_primary = await primary_storage_table.findOne({
      rack_type: "primary",
      plant_id: req.body.plant_id,
      company_code: req.body.company_code,
      pallet_barcode: req.body.pallet_barcode,
      location_id: req.body.primary_pick_location,
    });

    if (!fetchdata_from_primary) {
      return res.send({
        status_code: 400,
        message: "Pallet not found in primary storage",
      });
    }

    // console.log("fetchdata_from_primary", fetchdata_from_primary);

    const fetchdata_from_rack_master = await rack_mater_table.findOne({
      // add here dynamic rack_type (req.body.rack_type)
      rack_type: "secondary_discrete",
      plant_id: req.body.plant_id,
      company_code: req.body.company_code,
      location_id: req.body.discrete_store_location,
    });

    if (fetchdata_from_rack_master) {
      // let discrete_item_detail = await discrete_item_table.findOne({
      //   item_code: fetchdata_from_primary.material_code,
      //   company_code: req.body.company_code,
      //   plant_id: req.body.plant_id,
      // });

      // // var new_total_stock = discrete_item_detail.carrier_capacity *fetchdata_from_primary.carrier_count

      // if (!discrete_item_detail) {
      //   return res.send({
      //     status_code: 400,
      //     message:
      //       "Item detail not available in discrete item detail collection",
      //   });
      // }

      // checking material already there in discrete or not

      const check_material_in_discrete = await secondary_storage_table.findOne({
        material_code: req.body.material_code,
        rack_type: "secondary_discrete",
      });

      if (check_material_in_discrete) {
        // if material available there in secondary_discrete then update only

        var stock_need_to_update =
          Number(check_material_in_discrete.current_stock) +
          Number(req.body.qty_to_be_moved);

        // console.log(
        //   "pure",
        //   check_material_in_discrete,
        //   req.body.qty_to_be_moved,
        //   stock_need_to_update
        // );

        var update_secondary_storage_discrete =
          await secondary_storage_table.updateOne(
            {
              rack_type: "secondary_discrete",
              plant_id: req.body.plant_id,
              company_code: req.body.company_code,
              location_id: req.body.discrete_store_location,
            },
            { current_stock: stock_need_to_update },
            { upsert: false, new: true, session }
          );
      } else {
        if (fetchdata_from_rack_master.unit_no < 4) {
          var decision_scanner = "BS1";
          if (fetchdata_from_rack_master.rack_id == "R15") {
            var data_scanner = "BS2";
          } else {
            var data_scanner = "BS3";
          }
        } else if (
          fetchdata_from_rack_master.unit_no > 3 &&
          fetchdata_from_rack_master.unit_no < 7
        ) {
          var decision_scanner = "BS4";
          if (fetchdata_from_rack_master.rack_id == "R15") {
            var data_scanner = "BS5";
          } else {
            var data_scanner = "BS6";
          }
        } else if (fetchdata_from_rack_master.unit_no > 6) {
          var decision_scanner = "BS7";
          if (fetchdata_from_rack_master.rack_id == "R15") {
            var data_scanner = "BS8";
          } else {
            var data_scanner = "BS9";
          }
        }

        const product_weight_detail = await product_weight.findOne({
          company_code: req.body.company_code,
          plant_id: req.body.plant_id,
          material_code: req.body.material_code,
        });

        const article_master_detail = await product_weight.findOne({
          company_code: req.body.company_code,
          plant_id: req.body.plant_id,
          material_code: req.body.material_code,
        });

        rack_entry_detail = {
          company_code: req.body.company_code,
          plant_id: req.body.plant_id,
          rack_type: fetchdata_from_rack_master.rack_type,
          unit_no: fetchdata_from_rack_master.unit_no,
          rack_id: fetchdata_from_rack_master.rack_id,
          level_id: fetchdata_from_rack_master.level_id,
          column_id: fetchdata_from_rack_master.column_id,
          location_id: fetchdata_from_rack_master.location_id,
          material_code: fetchdata_from_primary.material_code,
          material_name: fetchdata_from_primary.material_name,
          current_stock: req.body.qty_to_be_moved,
          decision_scanner: decision_scanner,
          data_scanner: data_scanner,
          carrier_count: 3,
          uom: fetchdata_from_primary.uom,
          status: "occupied",
          brand: article_master_detail ? article_master_detail.brand : "",
          sub_brand: article_master_detail
            ? article_master_detail.sub_brand
            : "",
          pack_weight: "",
          qty_in_bin: "",
          // pallet_barcode: req.body.pallet_barcode,
        };

        // console.log("k_set", rack_entry_detail);

        const secondary_rack_entry = new secondary_storage_table(
          rack_entry_detail
        );

        let save_rack_in_secondary = await secondary_rack_entry.save({
          session,
        });

        var update_secondary_rack_status_in_rack_master =
          await rack_mater_table.updateOne(
            {
              rack_type: "secondary_discrete",
              plant_id: req.body.plant_id,
              company_code: req.body.company_code,
              location_id: req.body.discrete_store_location,
            },
            { status: "occupied" },
            { upsert: false, new: true, session }
          );
      }

      //  update or delete primary rack

      if (fetchdata_from_primary.total_stock <= req.body.qty_to_be_moved) {
        var remove_rack_from_primary_storage =
          await primary_storage_table.deleteOne(
            {
              rack_type: "primary",
              plant_id: req.body.plant_id,
              company_code: req.body.company_code,
              pallet_barcode: req.body.pallet_barcode,
              location_id: req.body.primary_pick_location,
            },
            { session }
          );

        var update_pallet_status_in_palletization =
          await palletization_table.updateOne(
            {
              pallet_barcode_value: req.body.pallet_barcode,
              plant_id: req.body.plant_id,
              company_code: req.body.company_code,
              is_deleted: false
            },
            { is_deleted: true },
            { upsert: false, new: true, session }
          );

        var update_pallet_status_in_pallet_master =
          await pallet_master_table.updateOne(
            {
              pallet_id: req.body.pallet_barcode,
              plant_id: req.body.plant_id,
              company_code: req.body.company_code,
            },
            { palletization_status: "Unassigned" },
            { upsert: false, new: true, session }
          );

        var update_primary_rack_status_in_rack_master =
          await rack_mater_table.updateOne(
            {
              rack_type: "primary",
              plant_id: req.body.plant_id,
              company_code: req.body.company_code,
              location_id: req.body.primary_pick_location,
            },
            { status: "unoccupied", locked: false, locked_by: "" },
            { upsert: false, new: true, session }
          );
      } else {
        const total_stock_left =
          fetchdata_from_primary.total_stock - req.body.qty_to_be_moved;

        const total_carrier_left = fetchdata_from_primary.carrier_count - 3;

        var update_carrier_count_in_primary_rack =
          await primary_storage_table.updateOne(
            {
              rack_type: "primary",
              plant_id: req.body.plant_id,
              company_code: req.body.company_code,
              pallet_barcode: req.body.pallet_barcode,
              location_id: req.body.primary_pick_location,
            },
            {
              carrier_count: total_carrier_left,
              total_stock: total_stock_left,
            },
            { upsert: false, new: true, session }
          );
      }
    } else {
      return res.send({
        status_code: 400,
        message: "Rack not exists in secondary discrete rack master",
      });
    }

    // data: fetchdata,
    // update_message: update_one_pallet,

    if (
      (update_primary_rack_status_in_rack_master &&
        update_primary_rack_status_in_rack_master.nModified === 1) ||
      (update_carrier_count_in_primary_rack &&
        update_carrier_count_in_primary_rack.nModified === 1)
    ) {
      await session.commitTransaction();
      return res.status(200).send({
        status_code: 200,
        message: `Material moved from pallet ${req.body.pallet_barcode} to secondary discrete rack with Location Id ${req.body.discrete_store_location} successfully`,
        // data: fetchdata,
        // update_message: update_one_pallet,
      });
    } else {
      await session.abortTransaction();
      return res.status(400).send({
        status_code: 400,
        message: "unable to save rack in secondary storage",
      });
    }
  } catch (err) {
    await session.abortTransaction();
    res.status(500).send({
      status_code: 500,
      message:
        err.message ||
        "Some error occurred while adding pallet to secondary storage!",
    });
  }
};
