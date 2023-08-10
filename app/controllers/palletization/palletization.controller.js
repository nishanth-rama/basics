const { date } = require("joi");
const db = require("../../models");
const moment = require("moment");
const moment_ts = require("moment-timezone");

const palletization_table = db.palletization;
const palletization_table_v2 = db.palletizationV2;

const inward_process_table = db.inwardProcess;
const pallet_master_table = db.pallets;
const primary_storage = db.primary_storage;
const secondary_storage = db.secondary_storage;
const rack_master_table = db.racks;
const product_weight_table = db.product_weight_model;
const conn = require("../../../server.js");

exports.add_empty_pallet = async (req, res) => {
  const plt_str = req.body.pallet_barcode_value;
  let pallet_barcode_value = plt_str.trim();
  let plant_id = req.body.plant_id;
  let company_code = req.body.company_code;
  let created_by = req.body.created_by;
  let flag = false;

  if (!(pallet_barcode_value && plant_id && company_code && created_by)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Parameters are missing!" });
  }

  //check whether the pallet_barcode_value is present in pallet master collection
  let pallet_master_exist = await pallet_master_table.findOne({
    pallet_id: pallet_barcode_value,
    plant_id: plant_id,
    company_code: company_code,
  });

  // console.log("pallet_master_exist",pallet_master_exist);

  if (!pallet_master_exist) {
    return res.status(200).send({
      status_code: "200",
      status_message:
        "Pallet Barcode Doesn't Exist in Masters!" +
        pallet_barcode_value +
        plant_id +
        company_code,
    });
  } else if (
    pallet_master_exist.palletization_status == "Primary_storage" ||
    pallet_master_exist.palletization_status == "Secondary_storage"
  ) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        "Pallet Already stored in " +
        pallet_master_exist.palletization_status +
        " !",
    });
  }

  const session = await conn.startSession();

  try {
    session.startTransaction();

    if (pallet_master_exist.palletization_status == "Unassigned") {
      // console.log(" if block");

      //insert new pallet to palletization collection
      let insert_empty_pallet = {};
      insert_empty_pallet.pallet_barcode_value = pallet_barcode_value;
      insert_empty_pallet.pallet_status = "Assigned";
      insert_empty_pallet.company_code = company_code;
      insert_empty_pallet.plant_id = plant_id;
      insert_empty_pallet.created_by = created_by;
      insert_empty_pallet.is_deleted = false;
      const new_empty_pallet = new palletization_table(insert_empty_pallet);

      let pallet_data = await new_empty_pallet.save({ session });
      let updated_data = await pallet_master_table.findByIdAndUpdate(
        { _id: pallet_master_exist._id },
        { palletization_status: "Assigned" },
        { useFindAndModify: false, new: true, session }
      );
    } else {
      // console.log("else block");
      //check whether the pallet_barcode_value is already inserted in palletization collection
      let pallet_barcode_already_exist = await palletization_table.findOne({
        pallet_barcode_value: pallet_barcode_value,
        plant_id: plant_id,
        company_code: company_code,
        is_deleted: false,
      });

      if (pallet_barcode_already_exist.pallet_status == "Stacked") {
        // console.log("stacked");

        let pallet_capacity = await product_weight_table.findOne(
          {
            company_code: company_code,
            material_code: pallet_barcode_already_exist.item_code,
          },
          { _id: 0, pallet_capacity: 1 }
        );

        if (
          pallet_capacity.pallet_capacity >
          pallet_barcode_already_exist.carrier_count
        ) {
          flag = true;
        } else {
          return res.status(200).send({
            status_code: "200",
            status_message: "Pallet full!",
          });
        }

        if (flag) {
          let updated_palletization =
            await palletization_table.findByIdAndUpdate(
              { _id: pallet_barcode_already_exist._id },
              { pallet_status: "Assigned" },
              { useFindAndModify: false, new: true, session }
            );
          let updated_pallet_master =
            await pallet_master_table.findByIdAndUpdate(
              { _id: pallet_master_exist._id },
              { palletization_status: "Assigned" },
              { useFindAndModify: false, new: true, session }
            );
        }
      }
    }

    await session.commitTransaction();

    return res.status(200).send({
      status_code: "200",
      status_message: "New Pallet Initialized Successfully",
    });
  } catch (err) {
    console.log(err);
    await session.abortTransaction();
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some Error Occurred While Creating The Customer.",
    });
  }
};

exports.add_empty_pallet_po = async (req, res) => {
  const plt_str = req.body.pallet_barcode_value;
  let pallet_barcode_value = plt_str.trim();
  let plant_id = req.body.plant_id;
  let company_code = req.body.company_code;
  let created_by = req.body.created_by;
  let flag = false;

  if (!(pallet_barcode_value && plant_id && company_code && created_by)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Parameters are missing!" });
  }

  //check whether the pallet_barcode_value is present in pallet master collection
  let pallet_master_exist = await pallet_master_table.findOne({
    pallet_id: pallet_barcode_value,
    plant_id: plant_id,
    company_code: company_code,
  });

  // console.log("pallet_master_exist",pallet_master_exist);

  if (!pallet_master_exist) {
    return res.status(200).send({
      status_code: "200",
      status_message:
        "Pallet Barcode Doesn't Exist in Masters!" +
        pallet_barcode_value +
        plant_id +
        company_code,
    });
  } else if (
    pallet_master_exist.palletization_status == "Primary_storage" ||
    pallet_master_exist.palletization_status == "Secondary_storage"
  ) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        "Pallet Already stored in " +
        pallet_master_exist.palletization_status +
        " !",
    });
  }

  const session = await conn.startSession();

  try {
    session.startTransaction();

    if (pallet_master_exist.palletization_status == "Unassigned") {
      // console.log(" if block");

      //insert new pallet to palletization collection
      let insert_empty_pallet = {};
      insert_empty_pallet.pallet_barcode_value = pallet_barcode_value;
      insert_empty_pallet.pallet_status = "Assigned";
      insert_empty_pallet.company_code = company_code;
      insert_empty_pallet.plant_id = plant_id;
      insert_empty_pallet.created_by = created_by;
      insert_empty_pallet.is_deleted = false;
      const new_empty_pallet = new palletization_table_v2(insert_empty_pallet);

      let pallet_data = await new_empty_pallet.save({ session });
      let updated_data = await pallet_master_table.findByIdAndUpdate(
        { _id: pallet_master_exist._id },
        { palletization_status: "Assigned" },
        { useFindAndModify: false, new: true, session }
      );
    } else {
      // console.log("else block");
      //check whether the pallet_barcode_value is already inserted in palletization collection
      let pallet_barcode_already_exist = await palletization_table.findOne({
        pallet_barcode_value: pallet_barcode_value,
        plant_id: plant_id,
        company_code: company_code,
        is_deleted: false,
      });

      let pallet_barcode_already_exist_3p =
        await palletization_table_v2.findOne({
          pallet_barcode_value: pallet_barcode_value,
          plant_id: plant_id,
          company_code: company_code,
          is_deleted: false,
        });

      let item_code = pallet_barcode_already_exist_3p.inward_item_details.map(
        (item) => item.item_code
      );

      if (pallet_barcode_already_exist) {
        if (pallet_barcode_already_exist.pallet_status == "Stacked") {
          let pallet_capacity = await product_weight_table.findOne(
            {
              company_code: company_code,
              material_code: pallet_barcode_already_exist.item_code,
            },
            { _id: 0, pallet_capacity: 1 }
          );

          if (
            pallet_capacity.pallet_capacity >
            pallet_barcode_already_exist.carrier_count
          ) {
            flag = true;
          } else {
            return res.status(200).send({
              status_code: "200",
              status_message: "Pallet full!",
            });
          }

          if (flag) {
            let updated_palletization =
              await palletization_table.findByIdAndUpdate(
                { _id: pallet_barcode_already_exist._id },
                { pallet_status: "Assigned" },
                { useFindAndModify: false, new: true, session }
              );
            let updated_pallet_master =
              await pallet_master_table.findByIdAndUpdate(
                { _id: pallet_master_exist._id },
                { palletization_status: "Assigned" },
                { useFindAndModify: false, new: true, session }
              );
          }
        }
      }
      if (pallet_barcode_already_exist_3p) {
        function checkBox(itemCapacities, itemCounts) {
          let totalCount = 100;
          for (let i = 0; i < itemCounts.length; i++) {
            const capacity = Math.floor(
              (100 / itemCapacities[i]) * itemCounts[i]
            );
            if (capacity > totalCount) {
              return "Pallet is Full";
              break;
            } else {
              totalCount -= capacity;
            }
          }
          return totalCount + "% is empty";
        }

        if (
          pallet_barcode_already_exist_3p &&
          pallet_barcode_already_exist_3p.pallet_status === "Stacked"
        ) {
          const itemCapacities = [];
          const itemCounts = [];

          for (const itemCode of item_code) {
            const pallet_capacity = await product_weight_table.findOne(
              {
                company_code: company_code,
                material_code: itemCode,
              },
              { _id: 0, pallet_capacity: 1 }
            );

            const itemCapacity = pallet_capacity.pallet_capacity;
            const itemCount = getItemCountForItemCode(
              pallet_barcode_already_exist_3p,
              itemCode
            );
            itemCapacities.push(itemCapacity);
            itemCounts.push(itemCount);
          }

          const palletStatus = checkBox(itemCapacities, itemCounts);

          if (!(palletStatus === "Pallet is Full")) {
            flag = true;
          } else {
            return res.status(200).send({
              status_code: "200",
              status_message: "Pallet full!",
            });
          }

          // Continue with the rest of the code if the pallet is not full
          // ...
        }

        function getItemCountForItemCode(palletData, itemCode) {
          let itemCount = 0;
          for (const inwardItem of palletData.inward_item_details) {
            if (inwardItem.item_code === itemCode) {
              itemCount += inwardItem.total_inwarded_qty;
            }
          }
          return itemCount;
        }

        if (flag) {
          let updated_palletization =
            await palletization_table_v2.findByIdAndUpdate(
              { _id: pallet_barcode_already_exist_3p._id },
              { pallet_status: "Assigned" },
              { useFindAndModify: false, new: true, session }
            );
          let updated_pallet_master =
            await pallet_master_table.findByIdAndUpdate(
              { _id: pallet_master_exist._id },
              { palletization_status: "Assigned" },
              { useFindAndModify: false, new: true, session }
            );
        }
      }
    }

    await session.commitTransaction();

    return res.status(200).send({
      status_code: "200",
      status_message: "New Pallet Initialized Successfully",
    });
  } catch (err) {
    console.log(err);
    await session.abortTransaction();
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some Error Occurred While Creating The Customer.",
    });
  }
};

exports.update_pallet_stacked = async (req, res) => {
  const company_code = req.body.company_code;
  const plant_id = req.body.plant_id;
  const po_no = req.body.po_no;
  // const po_type = req.body.po_type;
  const item_no = req.body.item_no;
  const item_code = req.body.item_code;
  // const item_name = req.body.item_name;
  const pallet_barcode = req.body.pallet_barcode;

  const expiry_date = req.body.expiry_date;

  if (
    !(
      plant_id &&
      company_code &&
      po_no &&
      item_no &&
      item_code &&
      pallet_barcode
    )
  ) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing Parameter!" });
  }

  const session = await conn.startSession();
  try {
    //implementing transaction
    session.startTransaction();

    //check whether the pallet barcode is available in palletization collection
    let pallet_data = await palletization_table.findOne({
      pallet_barcode_value: pallet_barcode,
      pallet_status: "Assigned",
      plant_id: plant_id,
      company_code: company_code,
      is_deleted: false,
    });

    if (!pallet_data) {
      return res.status(400).send({
        status_code: "400",
        status_message:
          "Pallet Barcode doesn't exist in palletization collection!" +
          pallet_barcode,
      });
    }

    let sku_details = await product_weight_table.findOne(
      {
        plant_id: plant_id,
        company_code: company_code,
        material_code: item_code,
      },
      { qty_in_kg: 1, qty_in_pack: 1 }
    );
    console.log("sku_details", sku_details);

    //updating the body parameters
    let update_pallet = {};
    update_pallet.pallet_status = "Stacked";
    update_pallet.item_code = item_code;
    // update_pallet.item_name = item_name;
    update_pallet.item_no = item_no;
    // update_pallet.po_document_type = po_type;
    update_pallet.po_number = po_no;
    update_pallet.sku_qty_in_kg = sku_details.qty_in_kg;
    update_pallet.sku_qty_in_pack = sku_details.qty_in_pack;
    update_pallet.expiry_date = expiry_date ? expiry_date : "";

    // Getting the crates for the given pallet from inward collection
    let inward_pallet_details = await inward_process_table.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          po_no: po_no,
          item_no: item_no,
          item_code: item_code,
        },
      },
      {
        $project: {
          _id: 0,
          inward_crate_details: 1,
          uom: 1,
          item_name: 1,
          po_type: 1,
        },
      },
      {
        $unwind: "$inward_crate_details",
      },
      { $match: { "inward_crate_details.pallet_barcode": pallet_barcode } },
    ]);

    if (!inward_pallet_details.length) {
      return res.status(200).send({
        status_code: "200",
        status_message: "Pallet is empty!",
      });
    }

    // updating the carrier_array with the values received from the inward collection for the pallet
    let carrier_details = [];
    inward_pallet_details.forEach((element) => {
      carrier_details.push({
        carrier_barcode: element.inward_crate_details.crate_barcode_value,
        carrier_id: "100",
        carrier_type: "crate",
        tare_weight: element.inward_crate_details.crate_tare,
        gross_weight: element.inward_crate_details.inwarded_qty,
        net_weight: element.inward_crate_details.net_qty,
      });
    });

    update_pallet.uom = inward_pallet_details[0].uom;
    update_pallet.po_document_type = inward_pallet_details[0].po_type;
    update_pallet.item_name = inward_pallet_details[0].item_name;
    update_pallet.carrier_count = carrier_details.length;
    update_pallet.carrier_detail = carrier_details;
    let format = "YYYY-MM-DD";
    let format_with_time = "DD-MM-YYYY HH:mm:ss";
    let stacked_date = moment_ts(new Date(), format)
      .tz("Asia/Kolkata")
      .format(format);
    update_pallet.stacked_date = stacked_date;
    let stacked_date_time = moment_ts(new Date(), format)
      .tz("Asia/Kolkata")
      .format(format_with_time);
    update_pallet.stacked_date_time = stacked_date_time;
    //updating to db
    let updated_data = await palletization_table.findByIdAndUpdate(
      { _id: pallet_data._id },
      update_pallet,
      { useFindAndModify: false, new: true, session }
    );

    let update_pallet_master = await pallet_master_table.findOneAndUpdate(
      {
        pallet_id: pallet_barcode,
        plant_id: plant_id,
        company_code: company_code,
      },
      { palletization_status: "Stacked" },
      { useFindAndModify: false, new: true, session }
    );

    await session.commitTransaction();

    return res.status(200).send({
      status_code: "200",
      status_message: "Pallet Stacked Successfully",
      data: updated_data,
    });
  } catch (err) {
    await session.abortTransaction();
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

//manual inward
exports.update_pallet_stacked_manual = async (req, res) => {
  const company_code = req.body.company_code;
  const plant_id = req.body.plant_id;
  const po_no = req.body.po_no;
  // const po_type = req.body.po_type;
  const item_no = req.body.item_no;
  const item_code = req.body.item_code;
  // const item_name = req.body.item_name;
  const pallet_barcode = req.body.pallet_barcode;

  const expiry_date = req.body.expiry_date;

  if (
    !(
      plant_id &&
      company_code &&
      po_no &&
      item_no &&
      item_code &&
      pallet_barcode &&
      expiry_date
    )
  ) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing Parameter!" });
  }

  const session = await conn.startSession();
  try {
    //implementing transaction
    session.startTransaction();

    //check whether the pallet barcode is available in palletization collection
    let pallet_data = await palletization_table.findOne({
      pallet_barcode_value: pallet_barcode,
      pallet_status: "Assigned",
      plant_id: plant_id,
      company_code: company_code,
      is_deleted: false,
    });

    if (!pallet_data) {
      return res.status(400).send({
        status_code: "400",
        status_message:
          "Pallet Barcode doesn't exist in palletization collection!" +
          pallet_barcode,
      });
    }

    let sku_details = await product_weight_table.findOne(
      {
        plant_id: plant_id,
        company_code: company_code,
        material_code: item_code,
      },
      { qty_in_kg: 1, qty_in_pack: 1 }
    );
    console.log("sku_details", sku_details);

    //updating the body parameters
    let update_pallet = {};
    update_pallet.pallet_status = "Stacked";
    update_pallet.item_code = item_code;
    // update_pallet.item_name = item_name;
    update_pallet.item_no = item_no;
    // update_pallet.po_document_type = po_type;
    update_pallet.po_number = po_no;
    update_pallet.sku_qty_in_kg = sku_details.qty_in_kg;
    update_pallet.sku_qty_in_pack = sku_details.qty_in_pack;
    update_pallet.expiry_date = expiry_date;

    // Getting the crates for the given pallet from inward collection
    let inward_pallet_details = await inward_process_table.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          po_no: po_no,
          item_no: item_no,
          item_code: item_code,
        },
      },
      {
        $project: {
          _id: 0,
          inward_crate_details: 1,
          uom: 1,
          item_name: 1,
          po_type: 1,
          expiry_date: 1,
        },
      },
      {
        $unwind: "$inward_crate_details",
      },
      {
        $match: {
          "inward_crate_details.pallet_barcode": pallet_barcode,
          "inward_crate_details.expiry_date": expiry_date,
        },
      },
    ]);

    if (!inward_pallet_details.length) {
      return res.status(200).send({
        status_code: "200",
        status_message: "Pallet is empty! or wrong expiry date",
      });
    }

    // updating the carrier_array with the values received from the inward collection for the pallet
    let carrier_details = [];
    inward_pallet_details.forEach((element) => {
      carrier_details.push({
        carrier_barcode: element.inward_crate_details.crate_barcode_value,
        carrier_id: "100",
        carrier_type: "crate",
        tare_weight: element.inward_crate_details.crate_tare,
        gross_weight: element.inward_crate_details.inwarded_qty,
        net_weight: element.inward_crate_details.net_qty,
      });
    });

    update_pallet.uom = inward_pallet_details[0].uom;
    update_pallet.po_document_type = inward_pallet_details[0].po_type;
    update_pallet.item_name = inward_pallet_details[0].item_name;
    // update_pallet.expiry_date = inward_pallet_details[0].expiry_date || "";

    update_pallet.carrier_count = carrier_details.length;
    update_pallet.carrier_detail = carrier_details;
    let format = "YYYY-MM-DD";
    let format_with_time = "DD-MM-YYYY HH:mm:ss";
    let stacked_date = moment_ts(new Date(), format)
      .tz("Asia/Kolkata")
      .format(format);
    update_pallet.stacked_date = stacked_date;
    let stacked_date_time = moment_ts(new Date(), format)
      .tz("Asia/Kolkata")
      .format(format_with_time);
    update_pallet.stacked_date_time = stacked_date_time;
    //updating to db
    let updated_data = await palletization_table.findByIdAndUpdate(
      { _id: pallet_data._id },
      update_pallet,
      { useFindAndModify: false, new: true, session }
    );

    let update_pallet_master = await pallet_master_table.findOneAndUpdate(
      {
        pallet_id: pallet_barcode,
        plant_id: plant_id,
        company_code: company_code,
      },
      { palletization_status: "Stacked" },
      { useFindAndModify: false, new: true, session }
    );

    await session.commitTransaction();

    return res.status(200).send({
      status_code: "200",
      status_message: "Pallet Stacked Successfully",
      data: updated_data,
    });
  } catch (err) {
    await session.abortTransaction();
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};
exports.update_pallet_stacked_manual_clone = async (req, res) => {
  const company_code = req.body.company_code;
  const plant_id = req.body.plant_id;
  const po_no = req.body.po_no;
  // const po_type = req.body.po_type;
  const item_no = req.body.item_no;
  const item_code = req.body.item_code;
  // const item_name = req.body.item_name;
  const pallet_barcode = req.body.pallet_barcode;

  const expiry_date = req.body.expiry_date;

  if (
    !(
      plant_id &&
      company_code &&
      po_no &&
      item_no &&
      item_code &&
      pallet_barcode &&
      expiry_date
    )
  ) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing Parameter!" });
  }

  const session = await conn.startSession();
  try {
    //implementing transaction
    session.startTransaction();

    //check whether the pallet barcode is available in palletization collection
    let pallet_data = await palletization_table.findOne({
      pallet_barcode_value: pallet_barcode,
      pallet_status: "Assigned",
      plant_id: plant_id,
      company_code: company_code,
      is_deleted: false,
    });

    if (!pallet_data) {
      return res.status(400).send({
        status_code: "400",
        status_message:
          "Pallet Barcode doesn't exist in palletization collection!" +
          pallet_barcode,
      });
    }

    let sku_details = await product_weight_table.findOne(
      {
        plant_id: plant_id,
        company_code: company_code,
        material_code: item_code,
      },
      { qty_in_kg: 1, qty_in_pack: 1 }
    );
    console.log("sku_details", sku_details);

    //updating the body parameters
    let update_pallet = {};
    update_pallet.pallet_status = "Stacked";
    update_pallet.item_code = item_code;
    // update_pallet.item_name = item_name;
    update_pallet.item_no = item_no;
    // update_pallet.po_document_type = po_type;
    update_pallet.po_number = po_no;
    update_pallet.sku_qty_in_kg = sku_details.qty_in_kg;
    update_pallet.sku_qty_in_pack = sku_details.qty_in_pack;
    update_pallet.expiry_date = expiry_date;

    // Getting the crates for the given pallet from inward collection
    let inward_pallet_details = await inward_process_table.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          po_no: po_no,
          item_no: item_no,
          item_code: item_code,
        },
      },
      {
        $project: {
          _id: 0,
          inward_crate_details: 1,
          uom: 1,
          item_name: 1,
          po_type: 1,
          expiry_date: 1,
        },
      },
      {
        $unwind: "$inward_crate_details",
      },
      {
        $match: {
          "inward_crate_details.pallet_barcode": pallet_barcode,
          "inward_crate_details.expiry_date": expiry_date,
        },
      },
    ]);

    if (!inward_pallet_details.length) {
      return res.status(200).send({
        status_code: "200",
        status_message: "Pallet is empty! or wrong expiry date",
      });
    }

    // updating the carrier_array with the values received from the inward collection for the pallet
    let carrier_details = [];
    inward_pallet_details.forEach((element) => {
      carrier_details.push({
        carrier_barcode: element.inward_crate_details.crate_barcode_value,
        carrier_id: "100",
        carrier_type: "crate",
        tare_weight: element.inward_crate_details.crate_tare,
        gross_weight: element.inward_crate_details.inwarded_qty,
        net_weight: element.inward_crate_details.net_qty,
      });
    });

    update_pallet.uom = inward_pallet_details[0].uom;
    update_pallet.po_document_type = inward_pallet_details[0].po_type;
    update_pallet.item_name = inward_pallet_details[0].item_name;
    // update_pallet.expiry_date = inward_pallet_details[0].expiry_date || "";

    update_pallet.carrier_count = carrier_details.length;
    update_pallet.carrier_detail = carrier_details;
    let format = "YYYY-MM-DD";
    let format_with_time = "DD-MM-YYYY HH:mm:ss";
    let stacked_date = moment_ts(new Date(), format)
      .tz("Asia/Kolkata")
      .format(format);
    update_pallet.stacked_date = stacked_date;
    let stacked_date_time = moment_ts(new Date(), format)
      .tz("Asia/Kolkata")
      .format(format_with_time);
    update_pallet.stacked_date_time = stacked_date_time;
    //updating to db
    let updated_data = await palletization_table.findByIdAndUpdate(
      { _id: pallet_data._id },
      update_pallet,
      { useFindAndModify: false, new: true, session }
    );

    let update_pallet_master = await pallet_master_table.findOneAndUpdate(
      {
        pallet_id: pallet_barcode,
        plant_id: plant_id,
        company_code: company_code,
      },
      { palletization_status: "Stacked" },
      { useFindAndModify: false, new: true, session }
    );

    await session.commitTransaction();

    return res.status(200).send({
      status_code: "200",
      status_message: "Pallet Stacked Successfully",
      data: updated_data,
    });
  } catch (err) {
    await session.abortTransaction();
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

exports.update_pallet_stacked_v2 = async (req, res) => {
  const company_code = req.body.company_code;
  const plant_id = req.body.plant_id;
  const po_no = req.body.po_no;
  // const po_type = req.body.po_type;
  const item_no = req.body.item_no;
  const item_code = req.body.item_code;
  // const item_name = req.body.item_name;
  const pallet_barcode = req.body.pallet_barcode;

  if (
    !(
      plant_id &&
      company_code &&
      po_no &&
      item_no &&
      item_code &&
      pallet_barcode
    )
  ) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing Parameter!" });
  }

  const session = await conn.startSession();
  try {
    //implementing transaction
    session.startTransaction();

    // check whether the pallet barcode is available in palletization collection
    let pallet_data = await palletization_table_v2.findOne({
      pallet_barcode_value: pallet_barcode,
      pallet_status: "Assigned",
      plant_id: plant_id,
      company_code: company_code,
      is_deleted: false,
    });

    if (!pallet_data) {
      return res.status(400).send({
        status_code: "400",
        status_message:
          "Pallet Barcode doesn't exist in palletization collection!" +
          pallet_barcode,
      });
    }

    let sku_details = await product_weight_table.findOne(
      {
        plant_id: plant_id,
        company_code: company_code,
        material_code: item_code,
      },
      { qty_in_kg: 1, qty_in_pack: 1 }
    );
    console.log("sku_details", sku_details);

    // Getting the crates for the given pallet from inward collection
    let inward_pallet_details = await inward_process_table.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          // delivery_date: delivery_date,
          // po_type: po_type,
          // supplier_no: supplier_no,
          po_no: po_no,
        },
      },
      { $match: { "inward_crate_details.pallet_barcode": pallet_barcode } },
    ]);

    if (!inward_pallet_details.length) {
      return res.status(200).send({
        status_code: "200",
        status_message: "Pallet is empty!",
      });
    }
    let finalArr = [];
    let newObj = {};
    newObj.pallet_status = "Stacked";
    newObj.company_code = inward_pallet_details[0].company_code;
    newObj.plant_id = inward_pallet_details[0].plant_id;
    newObj.created_at = inward_pallet_details[0].createdAt;
    newObj.updated_at = inward_pallet_details[0].updatedAt;
    // newObj._id = inward_pallet_details[0]._id;
    newObj.delivery_date = inward_pallet_details[0].delivery_date;
    newObj.invoice_no = inward_pallet_details[0].invoice_no;
    newObj.pallet_barcode_value =
      inward_pallet_details[0].inward_crate_details[0].pallet_barcode;
    newObj.po_number = inward_pallet_details[0].po_no;
    newObj.po_type = inward_pallet_details[0].po_type;
    newObj.supplier_name = inward_pallet_details[0].supplier_name;
    newObj.supplier_no = inward_pallet_details[0].supplier_no;
    newObj.is_deleted = false;
    newObj.carrier_count = inward_pallet_details.reduce(
      (acc, obj) => acc + obj.total_crates,
      0
    );

    let format = "YYYY-MM-DD";
    let format_with_time = "DD-MM-YYYY HH:mm:ss";
    let stacked_date = moment_ts(new Date(), format)
      .tz("Asia/Kolkata")
      .format(format);
    newObj.stacked_date = stacked_date;

    let stacked_date_time = moment_ts(new Date(), format)
      .tz("Asia/Kolkata")
      .format(format_with_time);

    newObj.stacked_date_time = stacked_date_time;

    inward_pallet_details.map((items, ind) => {
      let newItem = {};
      newItem.item_code = items.item_code;
      newItem.item_name = items.item_name;
      newItem.item_no = items.item_no;
      newItem.unit_price = "-";
      newItem.ordered_qty = items.ordered_qty;
      newItem.total_inwarded_qty = items.total_inwarded_qty;
      newItem.total_pending_qty = items.total_pending_qty;
      newItem.total_extra_qty = items.total_extra_qty;
      newItem.total_grn_post_qty = items.total_grn_post_qty;
      newItem.inventory_grn_posted_qty = items.inventory_grn_posted_qty;
      newItem.po_grn_status = items.po_grn_status;
      newItem.uom = items.uom;
      newItem.rejected_qty = items.rejected_qty;
      newItem.total_crates = items.total_crates;
      newItem.total_crates_weight = items.total_crates_weight;
      newItem.total_net_qty = items.total_net_qty;

      newItem.carrier_detail = items.inward_crate_details.map((item) => ({
        carrier_type: item.crate_type,
        tare_weight: item.crate_tare,
        gross_weight: item.inwarded_qty,
        net_weight: item.net_qty,
        carrier_id: item._id,
        carrier_barcode: item.crate_barcode_value,
      }));

      finalArr.push(newItem);
    });
    newObj.inward_item_details = finalArr;
    let updated_data = await palletization_table_v2.findByIdAndUpdate(
      { _id: pallet_data._id },
      newObj,
      { useFindAndModify: false, new: true, session }
    );
    // let updated_data = await palletization_table_v2.create(newObj);

    let update_pallet_master = await pallet_master_table.findOneAndUpdate(
      {
        pallet_id: pallet_barcode,
        plant_id: plant_id,
        company_code: company_code,
      },
      { palletization_status: "Stacked" },
      { useFindAndModify: false, new: true, session }
    );

    await session.commitTransaction();

    return res.status(200).send({
      status_code: "200",
      status_message: "Pallet Stacked Successfully",
      inward_data: updated_data,
    });
  } catch (err) {
    await session.abortTransaction();
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

exports.add_carrier_to_pallet = async (req, res) => {
  try {
    // console.log("add_carrier_to_pallet");
    let pallet_barcode_value = req.body.pallet_barcode_value;
    let carrier_barcode = req.body.carrier_barcode;
    let temp_pallet_weight = 100;
    let plant_id = req.body.plant_id;
    let company_code = req.body.company_code;

    if (
      !(pallet_barcode_value && carrier_barcode && plant_id && company_code)
    ) {
      return res
        .status(400)
        .send({ status_code: "400", status_message: "Missing Parameter!" });
    }

    // check whether the carrier_barcode is available in inward collection
    let carrier_data = await inward_process_table.findOne(
      {
        "inward_crate_details.crate_barcode_value": carrier_barcode,
        plant_id: plant_id,
        company_code: company_code,
      },
      {
        _id: 1,
        company_code: 1,
        plant_id: 1,
        po_no: 1,
        po_type: 1,
        item_no: 1,
        item_code: 1,
        item_name: 1,
        uom: 1,
        "inward_crate_details.$": 1,
      }
    );

    if (!carrier_data) {
      return res.status(400).send({
        status_code: "400",
        status_message: "Carrier Barcode doesn't exist!",
      });
    }

    //check whether the pallet barcode is available in palletization collection
    let pallet_data = await palletization_table.findOne({
      pallet_barcode_value: pallet_barcode_value,
      plant_id: plant_id,
      company_code: company_code,
      is_deleted: false,
    });

    if (!pallet_data) {
      return res.status(400).send({
        status_code: "400",
        status_message: "Pallet Barcode doesn't exist!",
      });
    }

    //check whether the crate barcode is already inserted in the pallet
    let crate_barcode_exist_in_pallet = await palletization_table.findOne({
      "carrier_detail.carrier_barcode": carrier_barcode,
      plant_id: plant_id,
      company_code: company_code,
      is_deleted: false,
    });

    // console.log(crate_barcode_exist_in_pallet);
    if (crate_barcode_exist_in_pallet) {
      return res.status(400).send({
        status_code: "400",
        status_message: "Carrier already allocated to pallet",
      });
    }

    let update_data = {};

    //get carrier details for the barcode with all inward_crate_details array
    let carrier_data_with_all_inward_crate_details =
      await inward_process_table.findOne(
        {
          _id: carrier_data._id,
        },
        {
          _id: 0,
          inward_crate_details: 1,
        }
      );

    //update status to stacked when it is the last crate
    let inward_crate_details_length =
      carrier_data_with_all_inward_crate_details.inward_crate_details.length;

    if (
      carrier_data_with_all_inward_crate_details.inward_crate_details[
        inward_crate_details_length - 1
      ].crate_barcode_value == carrier_barcode
    ) {
      let stacked_date = moment(new Date()).format("YYYY-MM-DD");
      update_data.stacked_date = stacked_date;
      update_data.pallet_status = "Stacked";
    }

    // updating the data for the first time
    if (pallet_data.pallet_status == "Assigned") {
      update_data.po_number = carrier_data.po_no;
      update_data.po_document_type = carrier_data.po_type;
      update_data.item_no = carrier_data.item_no;
      update_data.item_code = carrier_data.item_code;
      update_data.item_name = carrier_data.item_name;
      update_data.uom = carrier_data.uom;

      //update status from assigned to stacking when this is not the last crate
      if (!update_data.pallet_status) update_data.pallet_status = "Stacking";
    }

    //skip the condition when the carrier details array is empty
    if (pallet_data.pallet_status != "Assigned") {
      // check whether the crate belongs to the same pallet
      let crate_belongs_to_pallet = await inward_process_table.findOne({
        company_code: pallet_data.company_code,
        plant_id: pallet_data.plant_id,
        po_no: pallet_data.po_number,
        po_type: pallet_data.po_document_type,
        item_no: pallet_data.item_no,
        item_code: pallet_data.item_code,
        item_name: pallet_data.item_name,
        "inward_crate_details.crate_barcode_value": carrier_barcode,
      });

      if (!crate_belongs_to_pallet) {
        return res.status(400).send({
          status_code: "400",
          status_message:
            "Carrier details doesn't belong to the Purchase Order",
        });
      }

      //sum the existing gross weight
      let summed_gross_weight = await palletization_table.aggregate([
        { $match: { _id: pallet_data._id } },
        { $project: { carrier_detail: 1 } },
        { $unwind: "$carrier_detail" },
        {
          $group: {
            _id: "$_id",
            previous_pallet_quantity_summed: {
              $sum: "$carrier_detail.gross_weight",
            },
          },
        },
      ]);

      //adding the new crate weight to the existing pallet weight
      let overall_weight =
        summed_gross_weight[0].previous_pallet_quantity_summed +
        carrier_data.inward_crate_details[0].inwarded_qty;

      // check whether the overall pallet weight is equal to the maximum pallet weight
      if (overall_weight == temp_pallet_weight) {
        let stacked_date = moment(new Date()).format("YYYY-MM-DD");
        update_data.stacked_date = stacked_date;
        update_data.pallet_status = "Stacked";
      }

      //update status stacked when the next crate weight will exceed the limit
      let find_next_create_index = 0;
      for (let i = 0; i < inward_crate_details_length; i++) {
        find_next_create_index++;
        if (
          carrier_data_with_all_inward_crate_details.inward_crate_details[i]
            .crate_barcode_value == carrier_barcode
        ) {
          break;
        }
      }

      if (update_data.pallet_status != "Stacked") {
        let adding_next_carrier_weight_to_overall_weight =
          overall_weight +
          carrier_data_with_all_inward_crate_details.inward_crate_details[
            find_next_create_index
          ].inwarded_qty;

        if (adding_next_carrier_weight_to_overall_weight > temp_pallet_weight) {
          let stacked_date = moment(new Date()).format("YYYY-MM-DD");
          update_data.stacked_date = stacked_date;
          update_data.pallet_status = "Stacked";
        }
      }
    }
    update_data.carrier_count = pallet_data.carrier_count + 1;

    let temp_carrier_id = 100;
    let temp_carrier_type = "crate";
    let push_carrier_detail = {};

    push_carrier_detail.carrier_barcode =
      carrier_data.inward_crate_details[0].crate_barcode_value;
    push_carrier_detail.carrier_id = temp_carrier_id;
    push_carrier_detail.carrier_type = temp_carrier_type;
    push_carrier_detail.tare_weight =
      carrier_data.inward_crate_details[0].crate_tare;
    push_carrier_detail.gross_weight =
      carrier_data.inward_crate_details[0].inwarded_qty;
    push_carrier_detail.net_weight =
      carrier_data.inward_crate_details[0].net_qty;

    update_data["$push"] = { carrier_detail: push_carrier_detail };

    //updating to db
    await palletization_table.findByIdAndUpdate(
      { _id: pallet_data._id },
      update_data,
      { useFindAndModify: false }
    );

    //getting the updated data from db
    let final_data = await palletization_table.aggregate([
      {
        $match: {
          _id: pallet_data._id,
        },
      },
      {
        $project: {
          _id: 0,
          pallet_barcode_value: 1,
          pallet_status: 1,
          carrier_count: 1,
          carrier_detail: 1,
          item_code: 1,
          item_name: 1,
          item_no: 1,
          po_document_type: 1,
          po_number: 1,
          uom: 1,
        },
      },
      { $unwind: "$carrier_detail" },
      {
        $match: {
          "carrier_detail.carrier_barcode": carrier_barcode,
        },
      },
    ]);

    return res.status(200).send({
      status_code: "200",
      status_message: "Carrier details successfully added",
      data: final_data[0],
    });
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

exports.list_all_pallets_stacked = async (req, res) => {
  let pallet_status = req.query.pallet_status;
  let plant_id = req.query.plant_id;
  let company_code = req.query.company_code;
  let stacked_date = req.query.stacked_date;

  // console.log("pallet_status",pallet_status);
  // console.log("plant_id",plant_id);
  // console.log("company_code",company_code);
  // console.log("stacked_date",stacked_date);

  if (!(plant_id && company_code && pallet_status && stacked_date)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing Parameter!" });
  }
  let condition = {};

  if (pallet_status == "pending") {
    condition.pallet_status = "Stacked";
  } else if (pallet_status == "completed") {
    condition.pallet_status = "Primary_storage";
  } else {
    return res.status(400).send({
      status_code: "400",
      status_message: "pallet status should be pending or completed!",
    });
  }

  if (req.query.pallet_id) {
    condition.pallet_barcode_value = req.query.pallet_id;
  }
  condition.is_deleted = false;
  condition.company_code = company_code;
  condition.plant_id = plant_id;
  condition.stacked_date = req.query.stacked_date;

  await palletization_table
    .aggregate([
      {
        $match: condition,
      },
      {
        $project: {
          pallet_barcode_value: 1,
          pallet_status: 1,
          carrier_count: 1,
          item_no: 1,
          po_number: 1,
          item_code: 1,
          item_name: 1,
          carrier_detail: 1,
          location_id: 1,
          stacked_date: 1,
          stacked_date_time: 1,
        },
      },
      { $unwind: "$carrier_detail" },
      {
        $group: {
          _id: "$_id",
          pallet_id: { $first: "$pallet_barcode_value" },
          pallet_Status: { $first: "$pallet_status" },
          item_count: { $first: "$carrier_count" },
          item_id: { $first: "$item_no" },
          po_number: { $first: "$po_number" },
          item_code: { $first: "$item_code" },
          item_name: { $first: "$item_name" },
          location_id: { $first: "$location_id" },
          stacked_date: { $first: "$stacked_date" },
          stacked_date_time: { $first: "$stacked_date_time" },
          pallet_weight: { $sum: "$carrier_detail.gross_weight" },
        },
      },
      {
        $project: {
          pallet_id: 1,
          pallet_Status: 1,
          item_count: 1,
          item_id: 1,
          po_number: 1,
          item_code: 1,
          item_name: 1,
          location_id: 1,
          stacked_date: 1,
          stacked_date_time: 1,
          pallet_weight: { $round: ["$pallet_weight", 3] },
        },
      },
      {
        $sort: { pallet_id: -1 },
      },
    ])
    .then((data) => {
      if (data.length) {
        return res.status(200).send({
          status_code: "200",
          status_message: "Pallets are ready for allocation",
          data: data,
        });
      } else {
        return res.status(200).send({
          status_code: "200",
          status_message: "Pallets Are Not Stacked Yet",
          data: data,
        });
      }
    })
    .catch((err) => {
      return res.status(400).send({
        status_code: "400",
        status_message:
          err.message || "Some error occurred while creating the customer.",
      });
    });
};

exports.list_all_pallets_stacked_v2 = async (req, res) => {
  let pallet_status = req.query.pallet_status;
  let plant_id = req.query.plant_id;
  let company_code = req.query.company_code;
  let stacked_date = req.query.stacked_date;

  if (!(plant_id && company_code && pallet_status && stacked_date)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing Parameter!" });
  }
  let condition = {};

  if (pallet_status == "pending") {
    condition.pallet_status = "Stacked";
  } else if (pallet_status == "completed") {
    condition.pallet_status = "Primary_storage";
  } else {
    return res.status(400).send({
      status_code: "400",
      status_message: "pallet status should be pending or completed!",
    });
  }

  const session = await conn.startSession();
  try {
    //implementing transaction
    session.startTransaction();
    let inward_pallet_details = await palletization_table_v2.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          stacked_date: stacked_date,
          pallet_status: condition.pallet_status,
        },
      },
    ]);

    let data = [];
    inward_pallet_details.map((items, ind) => {
      let newItem = {};
      newItem._id = items._id;
      newItem.pallet_id = items.pallet_barcode;
      newItem.pallet_Status = items.pallet_status;
      newItem.item_count = items.carrier_count;
      newItem.po_number = items.po_no;
      newItem.item_code = items.inward_item_details.length + " code(s)";
      newItem.item_name = items.inward_item_details.length + " material(s)";
      newItem.item_id = items.inward_item_details.length + " item_id";
      newItem.location_id = null;
      newItem.stacked_date = items.stacked_date;
      newItem.stacked_date_time = items.stacked_date_time;
      data.push(newItem);
    });

    return res.status(200).send({
      status_code: "200",
      status_message: "Pallet Stacked Successfully",
      data: data,
    });
  } catch (err) {
    await session.abortTransaction();
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

exports.stackedPalletDetails = async (req, res) => {
  console.log("calling get stacked pallet details api");
  try {
    const { company_code, plant_id, pallet_barcode } = req.query;

    if (!(company_code && plant_id && pallet_barcode))
      return res
        .status(400)
        .send({ status_code: "200", message: "Missing parameter!" });

    var palletDetails = await palletization_table.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        pallet_barcode_value: pallet_barcode,
        pallet_status: "Stacked",
        is_deleted: false,
      },
      {
        _id: 1,
        location_id: 1,
        pallet_barcode_value: 1,
        pallet_status: 1,
        company_code: 1,
        plant_id: 1,
        created_by: 1,
        is_deleted: 1,
        carrier_detail: 1,
        createdAt: 1,
        updatedAt: 1,
        carrier_count: 1,
        item_code: 1,
        item_name: 1,
        item_no: 1,
        po_document_type: 1,
        po_number: 1,
        stacked_date: 1,
        stacked_date_time: 1,
        uom: 1,
        pallet_weight: {
          $round: [{ $sum: "$carrier_detail.gross_weight" }, 3],
        },
      }
    );

    // let mssge = "Pallet is stacked";
    // if (palletDetails == null) mssge = "Wrong pallet is scanned!";

    // console.log("palletDetails",palletDetails.location_id)

    if (palletDetails == null) {
      return res.status(200).send({
        status_code: "200",
        message: "pallet is not available in palletization collection!",
        data: palletDetails,
      });
    }

    if (palletDetails.location_id) {
      var fetch_first_empty_rack = await rack_master_table.find({
        rack_type: "primary",
        location_id: palletDetails.location_id,
        status: "unoccupied",
        locked: true,
      });
    } else {
      const pallet_type = await pallet_master_table.findOne({
        pallet_id: palletDetails.pallet_barcode_value,
      });

      console.log("pallet_type", pallet_type);

      if (pallet_type && pallet_type.assert_type == "Normal pallet") {
        var rack_filter = {
          active_status: 1,
          locked: false,
          status: "unoccupied",
          plant_id: plant_id,
          company_code: company_code,
          rack_type: "primary",
          level_id: { $ne: "L3" },
        };
      } else {
        var rack_filter = {
          active_status: 1,
          locked: false,
          status: "unoccupied",
          plant_id: plant_id,
          company_code: company_code,
          rack_type: "primary",
          // level_id: { $ne: "L3" },
        };
      }

      var fetch_first_empty_rack = await rack_master_table
        .find(rack_filter)
        .sort({ rack_id: 1, unit_no: 1, location_id: 1 })
        .collation({ locale: "en_US", numericOrdering: true })
        // .sort({ location_id: 1 })
        // .collation({ locale: "en_US", numericOrdering: true })
        // .limit(primary_storage_pick_detail && primary_storage_pick_detail.length)
        .limit(1);
    }

    // console.log("fecth_first_empty_rack", fetch_first_empty_rack);

    let rack_location_detail;
    let mssge;

    console.log("fetch_first_empty_rack", fetch_first_empty_rack);

    if (
      fetch_first_empty_rack &&
      Object.keys(fetch_first_empty_rack).length != 0
    ) {
      rack_location_detail = {
        rack_id: fetch_first_empty_rack[0].rack_id,
        level_id: fetch_first_empty_rack[0].level_id,
        column_id: fetch_first_empty_rack[0].column_id,
        location_id: fetch_first_empty_rack[0].location_id,
        rack_status: fetch_first_empty_rack[0].locked,
        locked_by: fetch_first_empty_rack[0].locked_by,
      };
      // palletDetails.rack_location_detail = rack_location_detail,
      // mssge = "primary_storage_rack_location_detail"

      return res.status(200).send({
        status_code: "200",
        message: "primary_storage_rack_location_detail",
        // rack_location_detail:rack_location_detail,
        data: {
          palletDetails: palletDetails,
          rackDetails: rack_location_detail,
        },
      });
    } else {
      // palletDetails = null,
      mssge = "Empty rack not available in primary rack master !";
      return res.status(200).send({
        status_code: "200",
        message: mssge,
        // rack_location_detail:rack_location_detail,
        data: null,
      });
    }

    // if()

    // return res.status(200).send({
    //   status_code:"200",
    //   message: mssge,
    //   // rack_location_detail:rack_location_detail,
    //   data: {palletDetails:palletDetails,rackDetails:rack_location_detail }
    // });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message:
        "Some error occurred while extracting details of stacked pallet!",
    });
  }
};

exports.stackedPalletDetailsClone = async (req, res) => {
  console.log("calling get stacked pallet details api");
  try {
    const { company_code, plant_id, pallet_barcode } = req.query;

    if (!(company_code && plant_id && pallet_barcode))
      return res
        .status(400)
        .send({ status_code: "200", message: "Missing parameter!" });

    var palletDetails = await palletization_table.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        pallet_barcode_value: pallet_barcode,
        pallet_status: "Stacked",
        is_deleted: false,
      },
      {
        _id: 1,
        location_id: 1,
        pallet_barcode_value: 1,
        pallet_status: 1,
        company_code: 1,
        plant_id: 1,
        created_by: 1,
        is_deleted: 1,
        carrier_detail: 1,
        createdAt: 1,
        updatedAt: 1,
        carrier_count: 1,
        item_code: 1,
        item_name: 1,
        item_no: 1,
        po_document_type: 1,
        po_number: 1,
        stacked_date: 1,
        stacked_date_time: 1,
        uom: 1,
        pallet_weight: {
          $round: [{ $sum: "$carrier_detail.gross_weight" }, 3],
        },
      }
    );

    // let mssge = "Pallet is stacked";
    // if (palletDetails == null) mssge = "Wrong pallet is scanned!";

    // console.log("palletDetails",palletDetails.location_id)

    if (palletDetails == null) {
      return res.status(200).send({
        status_code: "200",
        message: "pallet is not available in palletization collection!",
        data: palletDetails,
      });
    }

    if (palletDetails.location_id) {
      var fetch_first_empty_rack = await rack_master_table.find({
        rack_type: "primary",
        location_id: palletDetails.location_id,
        status: "unoccupied",
        locked: true,
      });
    } else {
      const pallet_type = await pallet_master_table.findOne({
        pallet_id: palletDetails.pallet_barcode_value,
      });

      console.log("pallet_type", pallet_type);

      let rack_filter = {
        active_status: 1,
        locked: false,
        status: "unoccupied",
        plant_id: plant_id,
        company_code: company_code,
        rack_type: "primary",
        level_id:
          pallet_type && pallet_type.assert_type === "Normal pallet"
            ? { $ne: "L3" }
            : { $eq: "L3" },
      };

      var fetch_first_empty_rack = await rack_master_table
        .find(rack_filter)
        .sort({ rack_id: 1, unit_no: 1, location_id: 1 })
        .collation({ locale: "en_US", numericOrdering: true })
        // .sort({ location_id: 1 })
        // .collation({ locale: "en_US", numericOrdering: true })
        // .limit(primary_storage_pick_detail && primary_storage_pick_detail.length)
        .limit(1);
    }

    // console.log("fecth_first_empty_rack", fetch_first_empty_rack);

    let rack_location_detail;
    let mssge;

    if (
      fetch_first_empty_rack &&
      Object.keys(fetch_first_empty_rack).length != 0
    ) {
      rack_location_detail = {
        rack_id: fetch_first_empty_rack[0].rack_id,
        level_id: fetch_first_empty_rack[0].level_id,
        column_id: fetch_first_empty_rack[0].column_id,
        location_id: fetch_first_empty_rack[0].location_id,
        rack_status: fetch_first_empty_rack[0].locked,
        locked_by: fetch_first_empty_rack[0].locked_by,
      };
      // palletDetails.rack_location_detail = rack_location_detail,
      // mssge = "primary_storage_rack_location_detail"

      return res.status(200).send({
        status_code: "200",
        message: "primary_storage_rack_location_detail",
        // rack_location_detail:rack_location_detail,
        data: {
          palletDetails: palletDetails,
          rackDetails: rack_location_detail,
        },
      });
    } else {
      // palletDetails = null,
      mssge = "Empty rack not available in primary rack master !";
      return res.status(200).send({
        status_code: "200",
        message: mssge,
        // rack_location_detail:rack_location_detail,
        data: null,
      });
    }

    // if()

    // return res.status(200).send({
    //   status_code:"200",
    //   message: mssge,
    //   // rack_location_detail:rack_location_detail,
    //   data: {palletDetails:palletDetails,rackDetails:rack_location_detail }
    // });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message:
        "Some error occurred while extracting details of stacked pallet!",
    });
  }
};

exports.stackedPalletDetails_po = async (req, res) => {
  console.log("calling get stacked pallet details api");
  try {
    const { company_code, plant_id, pallet_barcode, po_no } = req.query;

    if (!(company_code && plant_id && pallet_barcode && po_no))
      return res
        .status(400)
        .send({ status_code: "200", message: "Missing parameter!" });

    let palletDetails = await palletization_table_v2.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          pallet_barcode: pallet_barcode,
          pallet_status: "Stacked",
          is_deleted: false,
          po_no: po_no,
        },
      },
    ]);

    if (palletDetails == null || palletDetails.length == 0) {
      return res.status(200).send({
        status_code: "200",
        message: "pallet is not available in palletization collection!",
        data: palletDetails,
      });
    }

    pallet_list = {};
    pallet_list._id = palletDetails[0]._id;

    pallet_list.pallet_barcode_value = palletDetails[0].pallet_barcode;
    pallet_list.pallet_status = palletDetails[0].pallet_status;
    pallet_list.company_code = palletDetails[0].company_code;
    pallet_list.plant_id = palletDetails[0].plant_id;
    pallet_list.created_by = "inward";
    pallet_list.is_deleted = false;

    const allInwardCrateDetails = [];
    palletDetails.forEach((item) => {
      item.inward_item_details.forEach((inwardItem) => {
        inwardItem.carrier_detail.forEach((crateDetail) => {
          allInwardCrateDetails.push(crateDetail);
        });
      });
    });
    pallet_list.carrier_detail = allInwardCrateDetails;

    if (pallet_list.location_id) {
      var fetch_first_empty_rack = await rack_master_table.find({
        rack_type: "primary",
        location_id: palletDetails.location_id,
        status: "unoccupied",
        locked: true,
      });
    } else {
      const pallet_type = await pallet_master_table.findOne({
        pallet_id: palletDetails.pallet_barcode_value,
      });

      console.log("pallet_type", pallet_type);

      let rack_filter = {
        active_status: 1,
        locked: false,
        status: "unoccupied",
        plant_id: plant_id,
        company_code: company_code,
        rack_type: "primary",
        level_id:
          pallet_type && pallet_type.assert_type === "Normal pallet"
            ? { $ne: "L3" }
            : { $eq: "L3" },
      };

      var fetch_first_empty_rack = await rack_master_table
        .find(rack_filter)
        .sort({ rack_id: 1, unit_no: 1, location_id: 1 })
        .collation({ locale: "en_US", numericOrdering: true })
        .limit(1);
    }

    let rack_location_detail;
    let mssge;

    if (
      fetch_first_empty_rack &&
      Object.keys(fetch_first_empty_rack).length != 0
    ) {
      rack_location_detail = {
        rack_id: fetch_first_empty_rack[0].rack_id,
        level_id: fetch_first_empty_rack[0].level_id,
        column_id: fetch_first_empty_rack[0].column_id,
        location_id: fetch_first_empty_rack[0].location_id,
        rack_status: fetch_first_empty_rack[0].locked,
        locked_by: fetch_first_empty_rack[0].locked_by,
      };
      // palletDetails.rack_location_detail = rack_location_detail,
      // mssge = "primary_storage_rack_location_detail"

      return res.status(200).send({
        status_code: "200",
        message: "primary_storage_rack_location_detail",
        // rack_location_detail:rack_location_detail,
        data: {
          palletDetails: pallet_list,
          rackDetails: rack_location_detail,
        },
      });
    } else {
      // palletDetails = null,
      mssge = "Empty rack not available in primary rack master !";
      return res.status(200).send({
        status_code: "200",
        message: mssge,
        // rack_location_detail:rack_location_detail,
        data: null,
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message:
        "Some error occurred while extracting details of stacked pallet!",
    });
  }
};

// if (
//   fetch_first_empty_rack &&
//   Object.keys(fetch_first_empty_rack).length != 0
// ) {
//   return res.status(200).send({
//     message: mssge,
//     rack_location: `Please store pallet in primary storage rack with location_id ${
//       fetch_first_empty_rack && fetch_first_empty_rack.location_id
//     }`,
//     data: palletDetails,
//   });
// } else {
//   // return res.send({ message: mssge, data: palletDetails });
//   return res.status(400).send({
//     status_code: 400,
//     message: mssge,
//     rack_location: "no space available in Primary Storage!",
//     data: palletDetails,
//   });
// }

exports.get_pallet_details = async (req, res) => {
  let company_code = req.query.company_code;
  let plant_id = req.query.plant_id;
  let pallet_id = req.query.pallet_id;
  let stacked_date = req.query.stacked_date;

  if (!(company_code && plant_id && pallet_id && stacked_date))
    return res
      .status(400)
      .send({ status_code: "200", message: "Missing parameter!" });

  try {
    let response = await palletization_table.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        pallet_barcode_value: pallet_id,
        stacked_date: stacked_date,
      },
      {
        pallet_barcode_value: 1,
        pallet_status: 1,
        company_code: 1,
        plant_id: 1,
        created_by: 1,
        is_deleted: 1,
        carrier_detail: 1,
        createdAt: 1,
        updatedAt: 1,
        __v: 1,
        carrier_count: 1,
        item_code: 1,
        item_name: 1,
        item_no: 1,
        po_document_type: 1,
        po_number: 1,
        stacked_date: 1,
        stacked_date_time: 1,
        uom: 1,
        location_id: 1,
        pallet_weight: {
          $round: [{ $sum: "$carrier_detail.gross_weight" }, 3],
        },
      }
    );

    if (response) {
      if (response.location_id) {
        let rack_details = await rack_master_table.findOne({
          company_code: company_code,
          plant_id: plant_id,
          location_id: response.location_id,
        });
        response.rack_details = rack_details;
        // console.log(rack_details);
      } else {
        return res
          .status(400)
          .send({ status_code: "400", message: "location id is missing!" });
      }
      // console.log("response",response.rack_details);
      return res.status(200).send({
        status_code: "200",
        message: "Pallet details available!",
        data: { palletDetails: response, rackDetails: response.rack_details },
      });
    } else {
      return res.status(400).send({
        status_code: "400",
        message: "Invalid Pallet_id!",
      });
    }
  } catch (error) {
    return res.status(400).send({
      status_code: "400",
      message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

// exports.get_pallet_details_by_pallet_id = async (req, res) => {
//   let company_code = req.query.company_code;
//   let plant_id = req.query.plant_id;
//   let pallet_id = req.query.pallet_id;

//   if (!(company_code && plant_id && pallet_id && pallet_id))
//     return res
//       .status(400)
//       .send({ status_code: "200", message: "Missing parameter!" });
//   try {
//     let response = await pallet_master_table.findOne(
//       {
//         company_code: company_code,
//         plant_id: plant_id,
//         pallet_id: pallet_id,
//       },

//       {
//         _id: 0,
//         pallet_id: 1,
//         plant_id: 1,
//         palletization_status: 1,
//       }
//     );

//     // if (response.palletization_status == "Assigned") {
//     //   return res.status(200).send({
//     //     status_code: "200",
//     //     message: "primary storage details available!",
//     //   });

//     if (response.palletization_status == 'Primary_storage') {

//         let primary_data = await primary_storage.findOne(
//           {
//             company_code: req.query.company_code,
//             plant_id: req.query.plant_id,
//             pallet_barcode: req.query.pallet_id
//           }, {
//           _id: 0,
//           rack_type: 1,
//           company_code: 1,
//           plant_id: 1,
//           rack_id: 1,
//           level_id: 1,
//           column_id: 1,
//           location_id: 1,
//           material_code: 1,
//           material_name: 1,
//           carrier_count: 1,
//           total_stock: 1,
//           uom: 1,
//           pallet_barcode: 1
//         });

//         if (primary_data == null) {
//           return res.status(200).send({
//             status_code: "200",
//             message: "pallet is not available in palletization collection!",
//             data: primary_data,
//           });
//         }
//         let result = [],
//           obj = {
//             rack_type: primary_data.rack_type,
//             company_code: primary_data.company_code,
//             plant_id: primary_data.plant_id,
//             rack_id: primary_data.rack_id,
//             level_id: primary_data.level_id,
//             item_no: primary_data.item_no,
//             column_id: primary_data.column_id,
//             location_id: primary_data.location_id,
//             material_code: primary_data.material_code,
//             material_name: primary_data.material_name,
//             carrier_count: primary_data.carrier_count,
//             stacked_date: primary_data.stacked_date,
//             total_stock: primary_data.total_stock,

//           };
//         result.push(obj)

//         return res.status(200).send({
//           status_code: "200",
//           message: "primary storage details available!",
//           palletDetails: result,
//         });

//       }
//       else if (response.palletization_status == 'Secondary_storage') {
//         let secondary_data = await secondary_storage
//           .findOne(
//             {
//               company_code: req.query.company_code,
//               plant_id: req.query.plant_id,
//               pallet_barcode: req.query.pallet_id
//             }, {
//             _id: 0,
//             material_code: 1,
//             material_name: 1,
//             uom: 1,
//             pallet_barcode: 1,
//             company_code: 1,
//             plant_id: 1,
//             rack_type: 1,
//             unit_no: 1,
//             rack_id: 1,
//             level_id: 1,
//             column_id: 1,
//             location_id: 1,
//             current_stock: 1,
//             carrier_count: 1
//           });
//         if (secondary_data == null) {
//           return res.status(200).send({
//             status_code: "200",
//             message: "pallet is not available in palletization collection!",
//             data: secondary_data,
//           });
//         }

//         let result = [],
//           obj = {
//             rackmaterial_code_type: secondary_data.material_code,
//             material_name: secondary_data.material_name,
//             uom: secondary_data.uom,
//             pallet_barcoderack_id: secondary_data.pallet_barcode,
//             company_code: secondary_data.company_code,
//             plant_id: secondary_data.plant_id,
//             rack_type: secondary_data.rack_type,
//             unit_no: secondary_data.unit_no,
//             rack_id: secondary_data.rack_id,
//             level_id: secondary_data.level_id,
//             column_id: secondary_data.column_id,
//             location_id: secondary_data.location_id,
//             current_stock: secondary_data.current_stock,
//             carrier_count: secondary_data.carrier_count,
//           };
//         result.push(obj)
//         return res.status(200).send({
//           status_code: "200",
//           message: "secondary storage details available!",
//           palletDetails: result,
//         });

//       }

//       else {
//         return res.status(400).send({
//           status_code: "400",
//           message: "data not found!",
//         });
//       }
//     } catch (error) {
//       return res.status(400).send({
//         status_code: "400",
//         message:
//           error.message || "Some error occurred while creating the customer.",
//       });
//     }
//   }

// exports.get_pallet_details_by_pallet_id = async (req, res) => {
//   let company_code = req.query.company_code;
//   let plant_id = req.query.plant_id;
//   let pallet_id = req.query.pallet_id;

//   if (!(company_code && plant_id && pallet_id && pallet_id))
//     return res
//       .status(400)
//       .send({ status_code: "200", message: "Missing parameter!" });
//   try {
//     let response = await pallet_master_table.findOne(
//       {
//         company_code: company_code,
//         plant_id: plant_id,
//         pallet_id: pallet_id,
//       },

//       {
//         _id: 0,
//         pallet_id: 1,
//         plant_id: 1,
//         palletization_status: 1,
//       }
//     );

//     if (response.palletization_status == 'Primary_storage') {
//       let primary_data = await primary_storage.findOne(
//         {
//           company_code: req.query.company_code,
//           plant_id: req.query.plant_id,
//           pallet_barcode: req.query.pallet_id
//         }, {
//         _id: 0,
//         rack_type: 1,
//         company_code: 1,
//         plant_id: 1,
//         rack_id: 1,
//         level_id: 1,
//         column_id: 1,
//         location_id: 1,
//         material_code: 1,
//         material_name: 1,
//         carrier_count: 1,
//         total_stock: 1,
//         uom: 1,
//         stacked_date:1,
//         pallet_barcode: 1,
//         sku_qty_in_kg: 1,
//         po_number: 1,
//         sku_qty_in_pack: 1,
//         stacked_date:1,
//       });
//       if (primary_data == null) {
//         return res.status(200).send({
//           status_code: "200",
//           message: "pallet is not available in palletization collection!",
//           data: primary_data,
//         });
//       }
//       let result = [],
//         obj = {
//           company_code: primary_data.company_code,
//           plant_id: primary_data.plant_id,
//           pallet_barcode: primary_data.pallet_barcode,
//           material_name: primary_data.material_name,
//           material_code: primary_data.material_code,
//           item_no: primary_data.item_no,
//           carrier_count: primary_data.carrier_count,
//           sku_qty_in_kg: primary_data.sku_qty_in_kg ? primary_data.sku_qty_in_kg : " ",
//           sku_qty_in_pack: primary_data.sku_qty_in_pack ? primary_data.sku_qty_in_pack : " ",
//           po_number: primary_data.po_number ? primary_data.po_number : " ",
//           location_id: primary_data.location_id,
//           stacked_date: primary_data.stacked_date ? primary_data.stacked_date :" ",
//           uom: primary_data.uom,
//           total_stock: primary_data.total_stock,
//           rack_type: primary_data.rack_type,
//           rack_id: primary_data.rack_id,
//           level_id: primary_data.level_id,
//           column_id: primary_data.column_id,
//         };
//       result.push(obj)
//       result.push(obj)
//       let final_response = {};
//       final_response.type = "pallet";
//       final_response.details = obj;

//       return res.status(200).send({
//         status_code: "200",
//         message: "primary storage details available!",
//         data: final_response,
//       });

//     }
//     else if (response.palletization_status == 'Secondary_storage') {
//       let secondary_data = await secondary_storage
//         .findOne(
//           {
//             company_code: req.query.company_code,
//             plant_id: req.query.plant_id,
//             pallet_barcode: req.query.pallet_id
//           }, {
//           _id: 0,
//           material_code: 1,
//           material_name: 1,
//           uom: 1,
//           pallet_barcode: 1,
//           company_code: 1,
//           plant_id: 1,
//           rack_type: 1,
//           unit_no: 1,
//           rack_id: 1,
//           level_id: 1,
//           column_id: 1,
//           location_id: 1,
//           current_stock: 1,
//           carrier_count: 1,
//           sku_qty_in_kg: 1,
//           po_number: 1,
//           sku_qty_in_pack: 1,
//         });
//       if (secondary_data == null) {
//         return res.status(200).send({
//           status_code: "200",
//           message: "pallet is not available in palletization collection!",
//           data: secondary_data,
//         });
//       }

//       let result = [],
//         obj = {
//           company_code: secondary_data.company_code,
//           plant_id: secondary_data.plant_id,
//           pallet_barcode: secondary_data.pallet_barcode,
//           material_name: secondary_data.material_name,
//           material_code: secondary_data.material_code,
//           unit_no: secondary_data.unit_no,
//           carrier_count: secondary_data.carrier_count,
//           sku_qty_in_kg: secondary_data.sku_qty_in_kg ? secondary_data.sku_qty_in_kg : " ",
//           sku_qty_in_pack: secondary_data.sku_qty_in_pack ? secondary_data.sku_qty_in_pack : " ",
//           po_number: secondary_data.po_number ? secondary_data.po_number : " ",
//           location_id: secondary_data.location_id,
//           stacked_date: secondary_data.stacked_date ? secondary_data.stacked_date:" ",
//           uom: secondary_data.uom,
//           current_stock: secondary_data.current_stock,
//           rack_type: secondary_data.rack_type,
//           rack_id: secondary_data.rack_id,
//           level_id: secondary_data.level_id,
//           column_id: secondary_data.column_id,
//         };
//       result.push(obj)
//       let final_response = {};
//       final_response.type = "pallet";
//       final_response.details = obj;

//       return res.status(200).send({
//         status_code: "200",
//         message: "secondary storage details available!",
//         data: final_response,

//       });

//     }
//     else if (response.palletization_status) {
//       return res.status(400).send({
//         status_code: "400",
//         message: `Pallet id in ${response.palletization_status} status`,
//       });
//     }

//     else {
//       return res.status(400).send({
//         status_code: "400",
//         message: "data not found! ",
//       });
//     }
//   } catch (error) {
//     return res.status(400).send({
//       status_code: "400",
//       message:
//         error.message || "Some error occurred while creating the customer.",
//     });
//   }
// }
// ///////////////////////////////////////////////////////

// exports.get_pallet_details_by_locationId = async (req, res) => {
//   let company_code = req.query.company_code;
//   let plant_id = req.query.plant_id;
//   let location_id = req.query.location_id;
//   // let is_deleted = req.query.false;
//   // if (location_id == location_id) {
//   //   return res
//   //     .status(400)
//   //     .send({ status_code: "200", message: "Missing paramesssssssssssssster!" });
//   // }

//   let quantity;
//   try {
//     let response = await palletization_table.findOne(
//       {
//         company_code: company_code,
//         plant_id: plant_id,
//         location_id: location_id,
//         is_deleted: false,
//       },
//       {
//         company_code: 1,
//         plant_id: 1,
//         pallet_barcode_value: 1,
//         item_code: 1,
//         item_name: 1,
//         item_no: 1,
//         carrier_detail: 1,
//         carrier_count: 1,
//         po_number: 1,
//         location_id: 1,
//         stacked_date: 1,
//         sku_qty_in_kg: 1,
//         sku_qty_in_pack: 1,
//         uom: 1
//       }
//     );

//     if (!(company_code && plant_id && location_id))
//       return res
//         .status(400)
//         .send({ status_code: "200", message: "Missing parameter!" });

//     if (!response) {
//       return res
//         .status(400)
//         .send({ status_code: "400", message: "Invalid id details !" });
//     }
//     let carrier_length = response.carrier_detail.length;

//     if (response.uom === 'KG') {

//       quantity = parseInt(carrier_length) * parseFloat(response.sku_qty_in_kg ? response.sku_qty_in_kg : 1)
//       console.log("carrier_detail", carrier_length);
//       console.log("sku_qty_in_kg", response.sku_qty_in_kg);
//       console.log("Total quantity :", quantity)
//     } else if (response.uom === 'PAC') {
//       quantity = parseInt(carrier_length) * parseFloat(response.sku_qty_in_pack ? response.sku_qty_in_pack : 1)
//       console.log("carrier_detail", carrier_length);
//       console.log("sku_qty_in_pack", response.sku_qty_in_pack);
//       console.log("Total quantity :", quantity)
//     }

//     let result = [],
//       obj = {
//         company_code: response.company_code,
//         plant_id: response.plant_id,
//         pallet_barcode_value: response.pallet_barcode_value,
//         item_name: response.item_name,
//         item_code: response.item_code,
//         item_no: response.item_no,
//         // carrier_detail: response.carrier_detail,
//         carrier_count: response.carrier_count,
//         sku_qty_in_kg: response.sku_qty_in_kg,
//         sku_qty_in_pack: response.sku_qty_in_pack,
//         po_number: response.po_number,
//         location_id: response.location_id,
//         stacked_date: response.stacked_date,
//         uom: response.uom,
//         quantity: quantity
//       };
//     result.push(obj)

//     let final_response = {};
//     final_response.type = "location";
//     final_response.details = obj;

//     return res.status(200).send({
//       status_code: "200",
//       message: "Pallet details available!",
//       data: final_response,
//     });
//   } catch (error) {
//     return res.status(400).send({
//       status_code: "400",
//       message:
//         error.message || "Some error occurred while creating the customer.",
//     });
//   }
// };

exports.get_palletization_details = async (req, res) => {
  let company_code = req.query.company_code;
  let plant_id = req.query.plant_id;
  let location_id = req.query.location_id;
  let pallet_barcode_value = req.query.pallet_barcode_value;

  if (
    !(
      (company_code && plant_id && location_id) ||
      (company_code && plant_id && pallet_barcode_value)
    )
  )
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter!" });
  try {
    let condition = {};
    condition.company_code = company_code;
    condition.plant_id = plant_id;
    condition.is_deleted = false;

    if (req.query.pallet_barcode_value) {
      condition.pallet_barcode_value = req.query.pallet_barcode_value;
    }
    if (req.query.location_id) {
      condition.location_id = req.query.location_id;
    }
    let response = await palletization_table.findOne(
      {
        ...condition,
      },

      {
        _id: 0,
        company_code: 1,
        plant_id: 1,
        location_id: 1,
        pallet_barcode_value: 1,
        pallet_status: 1,
        stacked_date: 1,
      }
    );
    if (!response) {
      return res.status(400).send({
        status_code: "400",
        status_message: "data not found!",
      });
    }
    // console.log(".........response", response);

    if (response.pallet_status == "Primary_storage") {
      let primary_data = await primary_storage.findOne(
        {
          company_code: company_code,
          plant_id: plant_id,
          // pallet_barcode_value: req.query.pallet_barcode_value ? req.query.pallet_barcode_value : " ",
          // location_id: req.query.location_id ?  req.query.location_id : " ",
          pallet_barcode: response.pallet_barcode_value,
          location_id: response.location_id,
        },

        {
          _id: 0,
          rack_type: 1,
          company_code: 1,
          plant_id: 1,
          rack_id: 1,
          level_id: 1,
          column_id: 1,
          location_id: 1,
          material_code: 1,
          material_name: 1,
          carrier_count: 1,
          total_stock: 1,
          uom: 1,
          stacked_date: 1,
          pallet_barcode: 1,
          sku_qty_in_kg: 1,
          po_number: 1,
          sku_qty_in_pack: 1,
          stacked_date: 1,
        }
      );
      // if (primary_data == null) {
      //   return res.status(200).send({
      //     status_code: "200",
      //     message: "pallet is not available in palletization collection!",
      //     data: primary_data,
      //   });
      // }
      let result = [];

      if (primary_data) {
        obj = {
          company_code: primary_data.company_code,
          plant_id: primary_data.plant_id,
          pallet_barcode: primary_data.pallet_barcode,
          material_name: primary_data.material_name,
          material_code: primary_data.material_code,
          item_no: primary_data.item_no,
          carrier_count: primary_data.carrier_count,
          sku_qty_in_kg: primary_data.sku_qty_in_kg
            ? primary_data.sku_qty_in_kg
            : " ",
          sku_qty_in_pack: primary_data.sku_qty_in_pack
            ? primary_data.sku_qty_in_pack
            : " ",
          po_number: primary_data.po_number ? primary_data.po_number : " ",
          location_id: primary_data.location_id,
          stacked_date: response.stacked_date,
          uom: primary_data.uom,
          total_stock: primary_data.total_stock,
          rack_type: primary_data.rack_type,
          rack_id: primary_data.rack_id,
          level_id: primary_data.level_id,
          column_id: primary_data.column_id,
        };
        result.push(obj);
        result.push(obj);
        let final_response = {};
        final_response.type = req.query.location_id ? "location" : "pallet";
        final_response.details = obj;

        return res.status(200).send({
          status_code: "200",
          status_message: "primary storage details available!",
          data: final_response,
        });
      } else {
        return res.status(400).send({
          status_code: "400",
          status_message: "primary storage details not available!",
          // data: final_response,
        });
      }
    } else if (response.pallet_status == "Secondary_storage") {
      let secondary_data = await secondary_storage.findOne(
        {
          company_code: company_code,
          plant_id: plant_id,
          pallet_barcode: response.pallet_barcode_value,
          location_id: response.location_id,
        },
        {
          _id: 0,
          material_code: 1,
          material_name: 1,
          uom: 1,
          pallet_barcode: 1,
          company_code: 1,
          plant_id: 1,
          rack_type: 1,
          unit_no: 1,
          rack_id: 1,
          level_id: 1,
          column_id: 1,
          location_id: 1,
          current_stock: 1,
          carrier_count: 1,
          sku_qty_in_kg: 1,
          po_number: 1,
          sku_qty_in_pack: 1,
        }
      );
      // if (secondary_data == null) {
      //   return res.status(200).send({
      //     status_code: "200",
      //     message: "pallet is not available in palletization collection!",
      //     data: secondary_data,
      //   });
      // }

      let result = [];
      if (secondary_data) {
        obj = {
          company_code: secondary_data.company_code,
          plant_id: secondary_data.plant_id,
          pallet_barcode: secondary_data.pallet_barcode,
          material_name: secondary_data.material_name,
          material_code: secondary_data.material_code,
          unit_no: secondary_data.unit_no,
          carrier_count: secondary_data.carrier_count,
          sku_qty_in_kg: secondary_data.sku_qty_in_kg
            ? secondary_data.sku_qty_in_kg
            : " ",
          sku_qty_in_pack: secondary_data.sku_qty_in_pack
            ? secondary_data.sku_qty_in_pack
            : " ",
          po_number: secondary_data.po_number ? secondary_data.po_number : " ",
          location_id: secondary_data.location_id,
          stacked_date: response.stacked_date,
          uom: secondary_data.uom,
          total_stock: secondary_data.current_stock,
          rack_type: secondary_data.rack_type,
          rack_id: secondary_data.rack_id,
          level_id: secondary_data.level_id,
          column_id: secondary_data.column_id,
        };
        result.push(obj);
        let final_response = {};
        final_response.type = req.query.location_id ? "location" : "pallet";
        final_response.details = obj;

        return res.status(200).send({
          status_code: "200",
          status_message: "secondary storage details available!",
          data: final_response,
        });
      } else {
        return res.status(400).send({
          status_code: "400",
          status_message: "secondary storage details not available!",
          // data: final_response,
        });
      }
    } else if (response.pallet_status) {
      return res.status(200).send({
        status_code: "400",
        status_message: `Pallet id was ${response.pallet_status} on ${response.stacked_date}`,
      });
    } else {
      return res.status(400).send({
        status_code: "400",
        status_message: "data not found! ",
      });
    }
  } catch (error) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        error.message || "Some error occurred while creating the customer.",
    });
  }
};
