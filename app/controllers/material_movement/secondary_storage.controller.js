const { find } = require("lodash");
const db = require("../../models");

const primary_storage_table = db.primary_storage;

const discrete_item_table = db.discrete_item;

const rack_mater_table = db.racks;

const palletization_table = db.palletization;

const pallet_master_table = db.pallets;

const secondary_storage_table = db.secondary_storage;

const product_weight = db.product_weight_model;

const conn = require("../../../server.js");

const moment = require("moment");

// get api for pending quantity
exports.get_secondary_storage_data = async (req, res) => {
  try {
    if (!(req.query.company_code && req.query.plant_id)) {
      return res.status(400).send({
        status_code: 400,
        message: "Please provide all the details like company code, plant id!",
      });
    }

    const secondary_storage_details = [];
    const fetchdata = await secondary_storage
      .find({
        company_code: req.query.company_code,
        plant_id: req.query.plant_id,
        //material_code: req.query.material_code,
        //rack_barcode: req.query.rack_barcode,
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
          secondary_storage_details.push(finddata);
      });
      return res.status(200).send({
        status_code: 200,
        message: "Pallet data is available in secondary storage!",
        secondary_storage_details,
      });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "Pallet data is not available in secondary storage!",
      });
    }
  } catch (err) {
    res.status(500).send({
      status_code: "500",
      message: err.message || "Some error occurred while retrieving data!",
    });
  }
};

// get rack location from primary and give secondary rack to store.

exports.get_rack_id_for_secondary_storage = async (req, res) => {
  try {
    if (
      !(
        req.body.company_code &&
        req.body.plant_id &&
        req.body.material_no &&
        req.body.total_qty_require
      )
    ) {
      return res.status(400).send({
        status_code: 400,
        message:
          "Please provide all the details like company code, plant id, material code and total_qty_require !",
      });
    }

    let secondary_total_qty = await secondary_storage_table.aggregate([
      {
        $match: {
          material_code: req.body.material_no,
          company_code: req.body.company_code,
          plant_id: req.body.plant_id,
          rack_type: "secondary",
        },
      },

      {
        $group: {
          _id: "$material_code",
          total_qty: {
            $sum: "$current_stock",
          },
        },
      },
      {
        $project: { _id: 0, total_qty: 1 },
      },
    ]);

    let primary_storage_pick_detail = await primary_storage_table.aggregate([
      {
        $match: {
          material_code: req.body.material_no,
          company_code: req.body.company_code,
          plant_id: req.body.plant_id,
        },
      },
      { $sort: { createdAt: 1 } },
      // {
      //   $project: {
      //     _id: 0,
      //     location_id: 1,
      //     material_code: 1,
      //     rack_id: 1,
      //     level_id: 1,
      //     column_id: 1,
      //     material_name: 1,
      //     carrier_count: 1,
      //     total_stock: 1,
      //     uom: 1,
      //     pallet_barcode: 1,
      //   },
      // },
      // { $sort: { location_id: 1 } },
    ]);

    var qty_available_in_secondary_storage =
      secondary_total_qty.length && secondary_total_qty[0].total_qty
        ? secondary_total_qty[0].total_qty
        : 0;

    var require_stock =
      req.body.total_qty_require - qty_available_in_secondary_storage;

    if (require_stock <= 0) {
      return res.status(400).send({
        status_code: 400,
        message: "Sales order requirement has reached",
      });
    }

    if (primary_storage_pick_detail.length == 0) {
      return res.status(400).send({
        status_code: 400,
        message: "Material not available in primary storage",
      });
    }

    const pick_put_detail = [];

    // var qty_available_in_secondary_storage =
    //   secondary_total_qty.length && secondary_total_qty[0].total_qty
    //     ? secondary_total_qty[0].total_qty
    //     : 0;

    // var require_stock =
    //   req.body.total_qty_require - qty_available_in_secondary_storage;

    // if (require_stock <= 0) {
    //   return res.status(400).send({
    //     status_code: 400,
    //     message: "Sales order requirement has reached",
    //   });
    // }

    // loop starting

    var loop_length = 0;

    for (let i = 0; i < primary_storage_pick_detail.length; i++) {
      if (loop_length >= require_stock) {
        break;
      }

      var primary_rack_status = await rack_mater_table.findOne({
        rack_type: "primary",
        location_id: primary_storage_pick_detail[i].location_id,
      });

      //
      // checking in palletization

      const pallet_detail = await palletization_table.findOne({
        company_code: req.body.company_code,
        plant_id: req.body.plant_id,
        is_deleted:false,
        pallet_barcode_value: primary_storage_pick_detail[i].pallet_barcode,
      });

      let check_in_rack_master_rack_type = [];


      if (pallet_detail && pallet_detail.location_id) {
        check_in_rack_master_rack_type = await rack_mater_table.findOne({
          company_code: req.body.company_code,
          plant_id: req.body.plant_id,
          location_id: pallet_detail.location_id,
        });
      }

      if (
        check_in_rack_master_rack_type &&
        check_in_rack_master_rack_type.rack_type == "secondary"
      ) {
        var secondary_initial_empty_rack = await rack_mater_table.findOne({
          company_code: req.body.company_code,
          plant_id: req.body.plant_id,
          rack_type: "secondary",
          location_id: pallet_detail.location_id,
        });
      } else {
        const pallet_type = await pallet_master_table.findOne({
          pallet_id: primary_storage_pick_detail[i].pallet_barcode,
        });

        if (pallet_type && pallet_type.assert_type == "Normal pallet") {
          var rack_filter = {
            active_status: 1,
            locked: false,
            status: "unoccupied",
            plant_id: req.body.plant_id,
            company_code: req.body.company_code,
            rack_type: "secondary",
            level_id: { $ne: "L3" },
          };
        } else {
          var rack_filter = {
            active_status: 1,
            locked: false,
            status: "unoccupied",
            plant_id: req.body.plant_id,
            company_code: req.body.company_code,
            rack_type: "secondary",
            // level_id: { $ne: "L3" },
          };
        }

        var secondary_initial_empty_rack = await rack_mater_table
          .findOne(rack_filter)
          .sort({ rack_id: 1, unit_no: 1, location_id: 1 })
          .collation({ locale: "en_US", numericOrdering: true });
        // .limit(
        //   primary_storage_pick_detail && primary_storage_pick_detail.length
        // );
      }

      // console.log("77666",secondary_initial_empty_rack)

      if (!secondary_initial_empty_rack) {
        return res.status(200).send({
          status_code: 200,
          message: "No more space available in secondary rack master",
          data: final_obj,
        });
      }

      // console.log("final",primary_storage_pick_detail[i].location_id)
      // console.log("secondary_initial_empty_rack.location_id",secondary_initial_empty_rack.location_id)
      // console.log("secondary_initial_empty_rack.locked,",secondary_initial_empty_rack.locked)
      // console.log("secondary_initial_empty_rack.locked_by",secondary_initial_empty_rack.locked_by)

      // console.log(secondary_initial_empty_rack)

      loop_length = loop_length + primary_storage_pick_detail[i].total_stock;
      let detail_obj = {
        pick_material_name: primary_storage_pick_detail[i].material_name,
        pick_material_code: primary_storage_pick_detail[i].material_code,
        pick_material_uom: primary_storage_pick_detail[i].uom,
        pick_material_quantity: primary_storage_pick_detail[i].total_stock,

        createdAt: primary_storage_pick_detail[i].createdAt
          ? moment(primary_storage_pick_detail[i].createdAt).format(
              "DD-MM-YYYY"
            )
          : "NA",
        pick_rack_pallet_barcode: primary_storage_pick_detail[i].pallet_barcode,
        primary_storage_rack_type: primary_storage_pick_detail[i].rack_type,
        primary_storage_rack_status: primary_rack_status.locked,
        primary_storage_loacked_by: primary_rack_status.locked_by,
        primary_storage_rack_id: primary_storage_pick_detail[i].rack_id,
        primary_storage_level_id: primary_storage_pick_detail[i].level_id,
        primary_storage_column_id: primary_storage_pick_detail[i].column_id,
        primary_storage_location_id: primary_storage_pick_detail[i].location_id,
        // createdAt : primary_storage_pick_detail[i].createdAt ? moment(primary_storage_pick_detail[i].createdAt).format('YYYY-MM-DD h:mm:ss a') : "NA",

        secondary_storage_rack_status: secondary_initial_empty_rack.locked,
        secondary_storage_locked_by: secondary_initial_empty_rack.locked_by,
        secondary_storage_rack_id: secondary_initial_empty_rack.rack_id,
        secondary_storage_level_id: secondary_initial_empty_rack.level_id,
        secondary_storage_column_id: secondary_initial_empty_rack.column_id,
        secondary_storage_rack_type: secondary_initial_empty_rack.rack_type,
        secondary_storage_location_id: secondary_initial_empty_rack.location_id,
      };

      pick_put_detail.push(detail_obj);
    }

    // here it finished

    var final_obj = {
      material_code: req.body.material_no,
      material_name:
        primary_storage_pick_detail.length &&
        primary_storage_pick_detail[0].material_name,
      company_code: req.body.company_code,
      plant_id: req.body.plant_id,
      pick_put_detail: pick_put_detail,
    };

    // if(primary_storage_pick_detail.length>0){
    //   var primary_storage_rack =
    // }

    if (primary_storage_pick_detail.length) {
      return res.status(200).send({
        status_code: 200,
        message: "pick and put detail list",
        data: final_obj,
      });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "pick list is not available in primary storage!",
      });
    }
  } catch (err) {
    res.status(500).send({
      status_code: "500",
      message: err.message || "Some error occurred while material movement!",
    });
  }
};

exports.add_pallet_to_secondary_storage = async (req, res) => {
  const session = await conn.startSession();
  try {
    session.startTransaction();

    if (
      !(
        req.body.pallet_barcode &&
        req.body.location_id &&
        req.body.plant_id &&
        req.body.company_code &&
        req.body.primary_rack_location_id &&
        req.body.secondary_storage_rack_type
      )
    ) {
      return res.status(400).send({
        status_code: 400,
        message:
          "Please provide all the parameters like plant_id, company_code, location_id, pallet_barcode,primary_rack_location_id and secondary_storage_rack_type!",
      });
    }

    const fetchdata_from_primary = await primary_storage_table.findOne({
      rack_type: "primary",
      plant_id: req.body.plant_id,
      company_code: req.body.company_code,
      pallet_barcode: req.body.pallet_barcode,
      location_id: req.body.primary_rack_location_id,
    });

    if (!fetchdata_from_primary) {
      return res.send({
        status_code: "200",
        message: "Pallet not found in primary storage",
      });
    }

    // console.log("fetchdata_from_primary", fetchdata_from_primary);

    const fetchdata_from_rack_master = await rack_mater_table.findOne({
      // add here dynamic rack_type (req.body.rack_type)
      rack_type: req.body.secondary_storage_rack_type,
      plant_id: req.body.plant_id,
      company_code: req.body.company_code,
      location_id: req.body.location_id,
    });

    if (
      fetchdata_from_rack_master &&
      fetchdata_from_rack_master.status === "occupied"
    ) {
      return res.status(200).send({
        status_code: 200,
        message: `Provided ${req.body.secondary_storage_rack_type} location_id ${req.body.location_id} is already occupied`,
      });
    }

    if (fetchdata_from_rack_master) {
      // only secondary

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
        current_stock: fetchdata_from_primary.total_stock,
        carrier_count: fetchdata_from_primary.carrier_count,
        uom: fetchdata_from_primary.uom,
        status: "occupied",
        pallet_barcode: req.body.pallet_barcode,
      };

      const secondary_rack_entry = new secondary_storage_table(
        rack_entry_detail
      );

      let save_rack_in_secondary = await secondary_rack_entry.save({
        session,
      });

      var update_secondary_rack_status_in_rack_master =
        await rack_mater_table.updateOne(
          {
            rack_type: "secondary",
            plant_id: req.body.plant_id,
            company_code: req.body.company_code,
            location_id: req.body.location_id,
          },
          { status: "occupied" },
          { upsert: false, new: true, session }
        );

      var update_primary_rack_status_in_rack_master =
        await rack_mater_table.updateOne(
          {
            rack_type: "primary",
            plant_id: req.body.plant_id,
            company_code: req.body.company_code,
            location_id: req.body.primary_rack_location_id,
          },
          { status: "occupied" },
          { upsert: false, new: true, session }
        );

      const update_pallet_status_in_pallet_master =
        await pallet_master_table.updateOne(
          {
            pallet_id: req.body.pallet_barcode,
            plant_id: req.body.plant_id,
            company_code: req.body.company_code,
          },
          { palletization_status: "Secondary_storage" },
          { upsert: false, new: true }
        );

      const update_pallet_status_in_palletization =
        await palletization_table.updateOne(
          {
            pallet_barcode_value: req.body.pallet_barcode,
            is_deleted: false,
            plant_id: req.body.plant_id,
            company_code: req.body.company_code,
          },
          { pallet_status: "Secondary_storage" },
          { upsert: false, new: true }
        );

      const remove_rack_from_primary_storage =
        await primary_storage_table.deleteOne(
          {
            rack_type: "primary",
            plant_id: req.body.plant_id,
            company_code: req.body.company_code,
            pallet_barcode: req.body.pallet_barcode,
          },
          { session }
        );
    } else {
      return res.status(200).send({
        status_code: 200,
        message: "Rack not exists in Rack master",
      });
    }

    // data: fetchdata,
    // update_message: update_one_pallet,

    if (update_secondary_rack_status_in_rack_master.nModified === 1) {
      await session.commitTransaction();
      return res.status(200).send({
        status_code: 200,
        message: `Pallet with Barcode Id ${req.body.pallet_barcode} stored in secondary rack with Location Id ${req.body.location_id} successfully`,
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
      status_code: "500",
      message:
        err.message ||
        "Some error occurred while adding pallet to secondary storage!",
    });
  }
};

exports.getRackItemDetails = async (req, res) => {
  console.log("calling get secondary discrete rack item details api");
  const { company_code, plant_id, unit_no, rack_id } = req.query;
  try {
    if (!(company_code && plant_id && unit_no && rack_id))
      return res.status(400).send({
        message: "Provide all required parameters",
      });

    let getLocationIds = await db.racks
      .find(
        {
          company_code: company_code,
          plant_id: plant_id,
          rack_type: "secondary_discrete",
          unit_no: +unit_no,
          rack_id: rack_id,
        },
        { _id: 0, location_id: 1, level_id: 1 }
      )
      .sort({ _id: 1 });

    // extracting unique level ids
    const uniqueLevelIds = [
      ...new Map(
        getLocationIds.map((level) => [level.level_id, level])
      ).values(),
    ];

    let locationIds = [];

    // ordering location ids according to levels....
    uniqueLevelIds.map((level) => {
      getLocationIds.map((location) => {
        if (level.level_id == location.level_id)
          locationIds.push(location.location_id);
      });
    });

    if (locationIds.length != 0) {
      const getRackItemDetails = await db.secondary_storage.aggregate([
        {
          $match: {
            company_code: company_code,
            plant_id: plant_id,
            rack_type: "secondary_discrete",
            // unit_no: +unit_no,
            rack_id: rack_id,
            location_id: { $in: locationIds },
          },
        },

        { $sort: { _id: 1 } },

        {
          $project: {
            _id: 0,
            location_id: 1,
            material_code: 1,
            current_stock: 1,
            uom: 1,
            decision_scanner: 1,
            data_scanner: 1,
          },
        },
      ]);

      // console.log("check - ", locationIds, getRackItemDetails);

      // shifting available data here
      for (let i = 0; i < locationIds.length; i++) {
        //
        for (let j = 0; j < getRackItemDetails.length; j++) {
          //
          if (locationIds[i] == getRackItemDetails[j].location_id) {
            delete locationIds[i];
            locationIds[i] = {
              location_id: getRackItemDetails[j].location_id,
              material_code: getRackItemDetails[j].material_code,
              total_stock: getRackItemDetails[j].current_stock,
              uom: getRackItemDetails[j].uom,
              decision_scanner: getRackItemDetails[j].decision_scanner,
              data_scanner: getRackItemDetails[j].data_scanner,
            };
          }
        }
      }

      // filling missing data with empty string
      for (let i = 0; i < locationIds.length; i++) {
        if (locationIds[i].location_id == undefined) {
          let id = locationIds[i];
          delete locationIds[i];
          locationIds[i] = {
            location_id: id,
            material_code: "",
            total_stock: 0,
            uom: "",
            decision_scanner: "",
            data_scanner: "",
          };
        }
      }

      return res.send({
        message: "Rack item list is available",
        data: locationIds,
      });
      //
    } else return res.send({ message: "No racks found!", data: locationIds });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message: "Some error occurred while extracting rack item details!",
    });
  }
};

// exports.add_pallet_to_secondary_storage = async (req, res) => {
//   const session = await conn.startSession();
//   try {
//     session.startTransaction();

//     if (
//       !(
//         req.body.pallet_barcode &&
//         req.body.location_id &&
//         req.body.plant_id &&
//         req.body.company_code &&
//         req.body.primary_rack_location_id &&
//         req.body.secondary_storage_rack_type
//       )
//     ) {
//       return res.status(400).send({
//         status_code: 400,
//         message:
//           "Please provide all the parameters like plant_id, company_code, location_id, pallet_barcode,primary_rack_location_id and secondary_storage_rack_type!",
//       });
//     }

//     const fetchdata_from_primary = await primary_storage_table.findOne({
//       rack_type: "primary",
//       plant_id: req.body.plant_id,
//       company_code: req.body.company_code,
//       pallet_barcode: req.body.pallet_barcode,
//       location_id: req.body.primary_rack_location_id,
//     });

//     if (!fetchdata_from_primary) {
//       return res.send({
//         status_code: "200",
//         message: "Pallet not found in primary storage",
//       });
//     }

//     // console.log("fetchdata_from_primary", fetchdata_from_primary);

//     const fetchdata_from_rack_master = await rack_mater_table.findOne({
//       // add here dynamic rack_type (req.body.rack_type)
//       rack_type: req.body.secondary_storage_rack_type,
//       plant_id: req.body.plant_id,
//       company_code: req.body.company_code,
//       location_id: req.body.location_id,
//     });

//     if (
//       fetchdata_from_rack_master &&
//       fetchdata_from_rack_master.status === "occupied"
//     ) {
//       return res.status(200).send({
//         status_code: 200,
//         message: `Provided ${req.body.secondary_storage_rack_type} location_id ${req.body.location_id} is already occupied`,
//       });
//     }

//     if (fetchdata_from_rack_master) {
//       if (req.body.secondary_storage_rack_type === "secondary_discrete") {
//         // total_stock: fetchdata_from_primary.total_stock,

//         // Math.round(5.4)

//         var total_stock_in_each_crate =
//           fetchdata_from_primary.total_stock /
//           fetchdata_from_primary.carrier_count;
//         console.log("popup", total_stock_in_each_crate);

//         const multiplying_ftr =
//           fetchdata_from_primary.carrier_count > 3
//             ? 3
//             : fetchdata_from_primary.carrier_count;

//         let total_stock_in_discrete_rack =
//           total_stock_in_each_crate * multiplying_ftr;

//         var total_stock_left_in_primary_rack =
//           fetchdata_from_primary.total_stock - total_stock_in_discrete_rack;

//         if (fetchdata_from_rack_master.unit_no < 4) {
//           var decision_scanner = "BS1";
//           if (fetchdata_from_rack_master.rack_id == "R15") {
//             var data_scanner = "BS2";
//           } else {
//             var data_scanner = "BS3";
//           }
//         } else if (
//           fetchdata_from_rack_master.unit_no > 3 &&
//           fetchdata_from_rack_master.unit_no < 7
//         ) {
//           var decision_scanner = "BS4";
//           if (fetchdata_from_rack_master.rack_id == "R15") {
//             var data_scanner = "BS5";
//           } else {
//             var data_scanner = "BS6";
//           }
//         } else if (fetchdata_from_rack_master.unit_no > 6) {
//           var decision_scanner = "BS7";
//           if (fetchdata_from_rack_master.rack_id == "R15") {
//             var data_scanner = "BS8";
//           } else {
//             var data_scanner = "BS9";
//           }
//         }

//         console.log("data_scanner", data_scanner, decision_scanner);

//         rack_entry_detail = {
//           company_code: req.body.company_code,
//           plant_id: req.body.plant_id,
//           rack_type: fetchdata_from_rack_master.rack_type,
//           unit_no: fetchdata_from_rack_master.unit_no,
//           rack_id: fetchdata_from_rack_master.rack_id,
//           level_id: fetchdata_from_rack_master.level_id,
//           column_id: fetchdata_from_rack_master.column_id,
//           location_id: fetchdata_from_rack_master.location_id,
//           material_code: fetchdata_from_primary.material_code,
//           material_name: fetchdata_from_primary.material_name,
//           total_stock: total_stock_in_discrete_rack,
//           decision_scanner: decision_scanner,
//           data_scanner: data_scanner,
//           carrier_count: multiplying_ftr,
//           uom: fetchdata_from_primary.uom,
//           status: "occupied",
//           pallet_barcode: req.body.pallet_barcode,
//         };

//         console.log("k_set", rack_entry_detail);

//         const secondary_rack_entry = new secondary_storage(rack_entry_detail);

//         let save_rack_in_secondary = await secondary_rack_entry.save({
//           session,
//         });

//         var update_secondary_rack_status_in_rack_master =
//           await rack_mater_table.updateOne(
//             {
//               rack_type: req.body.secondary_storage_rack_type,
//               plant_id: req.body.plant_id,
//               company_code: req.body.company_code,
//               location_id: req.body.location_id,
//             },
//             { status: "occupied" },
//             { upsert: false, new: true, session }
//           );

//         // uncomment this later

//         // const update_pallet_status_in_palletization =
//         // await palletization_table.updateOne(
//         //   { pallet_barcode_value: req.body.pallet_barcode },
//         //   { pallet_status: "Secondary_storage" },
//         //   { upsert: false, new: true }
//         // );

//         const carrier_count = fetchdata_from_primary.carrier_count;
//         console.log("carrier_count", carrier_count);
//         console.log("recent", fetchdata_from_primary.carrier_count);

//         if (carrier_count > 3) {
//           const new_carrier_count = carrier_count - 3;

//           console.log("new_carrier_count", new_carrier_count);

//           const update_carrier_count_in_primary_rack =
//             await primary_storage_table.updateOne(
//               {
//                 rack_type: "primary",
//                 plant_id: req.body.plant_id,
//                 company_code: req.body.company_code,
//                 pallet_barcode: req.body.pallet_barcode,
//               },
//               {
//                 carrier_count: new_carrier_count,
//                 total_stock: total_stock_left_in_primary_rack,
//               },
//               { upsert: false, new: true, session }
//             );
//         } else {
//           const remove_rack_from_primary_storage =
//             await primary_storage_table.deleteOne(
//               {
//                 rack_type: "primary",
//                 plant_id: req.body.plant_id,
//                 company_code: req.body.company_code,
//                 pallet_barcode: req.body.pallet_barcode,
//               },
//               { session }
//             );
//         }
//       } else {
//         rack_entry_detail = {
//           company_code: req.body.company_code,
//           plant_id: req.body.plant_id,
//           rack_type: fetchdata_from_rack_master.rack_type,
//           unit_no: fetchdata_from_rack_master.unit_no,
//           rack_id: fetchdata_from_rack_master.rack_id,
//           level_id: fetchdata_from_rack_master.level_id,
//           column_id: fetchdata_from_rack_master.column_id,
//           location_id: fetchdata_from_rack_master.location_id,
//           material_code: fetchdata_from_primary.material_code,
//           material_name: fetchdata_from_primary.material_name,
//           total_stock: fetchdata_from_primary.total_stock,
//           carrier_count: fetchdata_from_primary.carrier_count,
//           uom: fetchdata_from_primary.uom,
//           status: "occupied",
//           pallet_barcode: req.body.pallet_barcode,
//         };

//         const secondary_rack_entry = new secondary_storage(rack_entry_detail);

//         let save_rack_in_secondary = await secondary_rack_entry.save({
//           session,
//         });

//         var update_secondary_rack_status_in_rack_master =
//           await rack_mater_table.updateOne(
//             {
//               rack_type: req.body.secondary_storage_rack_type,
//               plant_id: req.body.plant_id,
//               company_code: req.body.company_code,
//               location_id: req.body.location_id,
//             },
//             { status: "occupied" },
//             { upsert: false, new: true, session }
//           );

//         // uncomment this later

//         // const update_pallet_status_in_palletization =
//         // await palletization_table.updateOne(
//         //   { pallet_barcode_value: req.body.pallet_barcode },
//         //   { pallet_status: "Secondary_storage" },
//         //   { upsert: false, new: true }
//         // );

//         const remove_rack_from_primary_storage =
//           await primary_storage_table.deleteOne(
//             {
//               rack_type: "primary",
//               plant_id: req.body.plant_id,
//               company_code: req.body.company_code,
//               pallet_barcode: req.body.pallet_barcode,
//             },
//             { session }
//           );
//       }
//     } else {
//       return res.status(200).send({
//         status_code: 200,
//         message: "Rack not exists in Rack master",
//       });
//     }

//     // data: fetchdata,
//     // update_message: update_one_pallet,

//     if (update_secondary_rack_status_in_rack_master.nModified === 1) {
//       await session.commitTransaction();
//       return res.status(200).send({
//         status_code: 200,
//         message: `Pallet with Barcode Id ${req.body.pallet_barcode} stored in secondary rack with Location Id ${req.body.location_id} successfully`,
//         // data: fetchdata,
//         // update_message: update_one_pallet,
//       });
//     } else {
//       await session.abortTransaction();
//       return res.status(400).send({
//         status_code: 400,
//         message: "unable to save rack in secondary storage",
//       });
//     }
//   } catch (err) {
//     await session.abortTransaction();
//     res.status(500).send({
//       status_code: "500",
//       message:
//         err.message ||
//         "Some error occurred while adding pallet to secondary storage!",
//     });
//   }
// };
