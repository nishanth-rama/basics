const db = require("../../models");

const allocation_palletization_table = db.allocationPalletization;
const pallet_master_table = db.pallets;
const soAllocationColl = db.soAllocation;
const cummulative_palletization = db.cumulativePalletization;
const toleranceColl = db.product_weight_model;

const conn = require("../../../server.js");
const { find, forEach, pick } = require("lodash");
const { promises } = require("nodemailer/lib/xoauth2");
const { send } = require("express/lib/response");

exports.assign_pallet = async (req, res) => {
  const company_code = req.body.company_code;
  const plant_id = req.body.plant_id;
  const route_id = req.body.route_id;
  const delivery_date = req.body.delivery_date;
  const pallet_barcode = req.body.pallet_barcode;
  const user_name = req.body.user_name;

  if (
    !(
      company_code &&
      plant_id &&
      route_id &&
      delivery_date &&
      pallet_barcode &&
      user_name
    )
  ) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }

  const session = await conn.startSession();
  try {
    session.startTransaction();

    //check whether the pallet_barcode_value is present in pallet master collection
    let pallet_master_exist = await pallet_master_table.findOne({
      pallet_id: pallet_barcode,
      plant_id: plant_id,
      company_code: company_code,
    });

    // console.log("pallet_master_exist",pallet_master_exist);
    let insert_empty_pallet = {};

    if (!pallet_master_exist) {
      return res.status(400).send({
        status_code: "400",
        status_message:
          "Pallet Barcode Doesn't Exist in Masters!" +
          pallet_barcode +
          plant_id +
          company_code,
      });
    } else if (pallet_master_exist.palletization_status == "Assigned") {
      insert_empty_pallet.company_code = company_code;
      insert_empty_pallet.plant_id = plant_id;
      insert_empty_pallet.delivery_date = delivery_date;
      insert_empty_pallet.route_id = route_id;
      insert_empty_pallet.pallet_barcode = pallet_barcode;
      insert_empty_pallet.is_deleted = false;
      insert_empty_pallet.pallet_status = "ASSIGNED";
      insert_empty_pallet.total_stacked_weight = 0;
      insert_empty_pallet.total_stacked_carriers = 0;
      insert_empty_pallet.items = [];
      insert_empty_pallet.created_by = user_name;
      insert_empty_pallet.updated_by = user_name;
    } else if (pallet_master_exist.palletization_status != "Unassigned") {
      return res.status(400).send({
        status_code: "400",
        status_message:
          "Already Pallet Status is " +
          pallet_master_exist.palletization_status +
          " !",
      });
    } else {
      insert_empty_pallet.company_code = company_code;
      insert_empty_pallet.plant_id = plant_id;
      insert_empty_pallet.delivery_date = delivery_date;
      insert_empty_pallet.route_id = route_id;
      insert_empty_pallet.pallet_barcode = pallet_barcode;
      insert_empty_pallet.is_deleted = false;
      insert_empty_pallet.pallet_status = "ASSIGNED";
      insert_empty_pallet.total_stacked_weight = 0;
      insert_empty_pallet.total_stacked_carriers = 0;
      insert_empty_pallet.items = [];
      insert_empty_pallet.created_by = user_name;
      insert_empty_pallet.updated_by = user_name;
    }
    console.log("insert_empty_pallet", insert_empty_pallet);

    let allocation_data = await allocation_palletization_table.findOne({
      pallet_barcode: pallet_barcode,
      plant_id: plant_id,
      company_code: company_code,
      is_deleted: false,
    });

    if (allocation_data) {
      return res.status(400).send({
        status_code: "400",
        status_message: "Pallet Already Used",
      });
    }
    const new_empty_pallet = new allocation_palletization_table(
      insert_empty_pallet
    );

    let pallet_data = await new_empty_pallet.save({ session });
    let updated_data = await pallet_master_table.findByIdAndUpdate(
      { _id: pallet_master_exist._id },
      { palletization_status: "Assigned" },
      { useFindAndModify: false, new: true, session }
    );

    await session.commitTransaction();
    return res.status(200).send({
      status_code: "200",
      status_message: "Pallet Assigned Successfully",
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

exports.list_assigned_pallets = async (req, res) => {
  console.log("calling allocator screeen listing pallets api");
  const { company_code, plant_id, delivery_date, route_id, status } = req.query;

  if (!(company_code && plant_id && delivery_date && route_id && status)) {
    return res.status(400).send({
      status_code: "400",
      status_message: "Provide all required parameters!",
    });
  }

  try {
    let filter = {
      company_code: company_code,
      plant_id: plant_id,
      delivery_date: delivery_date,
      route_id: route_id,
      is_deleted: false,
    };

    if (status == "stacking")
      filter.palletization_status = { $in: ["ASSIGNED", "STACKING"] };
    else if (status == "stacked") filter.palletization_status = "STACKED";
    else
      return res.status(400).send({
        status_code: "400",
        status_message: "Wrong pallet status received!",
      });

    const allocation_data = await allocation_palletization_table
      .find(filter, {
        _id: 1,
        delivery_date: 1,
        route_id: 1,
        pallet_barcode: 1,
        palletization_status: 1,
        created_by: 1,
        updated_by: 1,
      })
      .sort({ _id: -1, palletization_status: 1, route_id: 1 });

    let mssge = "Pallet list is available";
    let status_code = 200;

    if (allocation_data.length == 0) {
      status_code = 404;
      mssge = "No data found";
    }

    return res.status(status_code).send({
      status_code: status_code.toString(),
      status_message: mssge,
      data: allocation_data,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: "500",
      status_message:
        "Some error occurred while extracting pallet details list!",
    });
  }
};

exports.delete_assigned_pallet = async (req, res) => {
  let id = req.params.id;
  console.log("id", id);

  const session = await conn.startSession();
  try {
    session.startTransaction();
    let allocation_data = await allocation_palletization_table.findOne({
      _id: id,
    });

    if (!allocation_data) {
      return res.status(400).send({
        status_code: "400",
        status_message: "Invalid id!",
      });
    }

    let updated_data = await allocation_palletization_table.findOneAndUpdate(
      { _id: id },
      {
        is_deleted: true,
      },
      { useFindAndModify: false, new: true, session }
    );

    // console.log("allocation_data.pallet_barcode",allocation_data.pallet_barcode,allocation_data.plant_id,allocation_data.company_code);
    let updated_rack_master = await pallet_master_table.findOneAndUpdate(
      {
        pallet_id: allocation_data.pallet_barcode,
        plant_id: allocation_data.plant_id,
        company_code: allocation_data.company_code,
      },
      { palletization_status: "Unassigned" },
      { useFindAndModify: false, new: true, session }
    );

    await session.commitTransaction();

    //   let status_message = allocation_data? "Listing the pallets": "No records found";

    return res.status(200).send({
      status_code: "200",
      status_message: "Data deleted successfully!",
      data: allocation_data,
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

const getPTLItemCodes = async (filter) => {
  const getPTLItemCode = await toleranceColl.aggregate([
    {
      $match: filter,
    },
    {
      $group: {
        _id: "$material_code",
      },
    },
  ]);

  const ptl_item_codes = getPTLItemCode.map((code) => {
    return code._id;
  });

  return ptl_item_codes;
};

const getOrderedQtyList_normal = async (filter) => {
  return await soAllocationColl.aggregate([
    {
      $match: filter,
    },
    {
      $group: {
        _id: {
          material_no: "$material_no",
          material_name: "$material_name",
          route_id: "$route_id",
          uom: "$uom",
        },
        total_pending_qty: { $sum: "$pending_qty" },
        total_ordered_qty: { $sum: "$order_qty" },
        total_allocated_qty: { $sum: "$allocated_qty" },
      },
    },
    { $sort: { "_id.route_id": 1, "_id.uom": 1, total_ordered_qty: -1 } },
  ]);
};

const getOrderedQtyList_ptl = async (filter) => {
  return await soAllocationColl.aggregate([
    {
      $match: filter,
    },
    { $sort: { material_no: 1 } },
  ]);
};

const getPickedQtyList = async (filter, material_code) => {
  return await cummulative_palletization.aggregate([
    {
      $match: filter,
    },
    { $unwind: "$items" },
    { $unwind: "$items.carriers" },
    {
      $match: {
        "items.carriers.carrier_status": "PRESENT",
        "items.material_code": material_code,
      },
    },
    {
      $group: {
        _id: {
          material_code: "$items.material_code",
          material_name: "$items.material_name",
          uom: "$items.uom",
          qty_in_kg: "$items.sku_qty_in_kg",
          qty_in_pack: "$items.sku_qty_in_pack",
        },
        carrier_count: { $sum: 1 },
      },
    },
    { $sort: { "_id.material_code": 1 } },
  ]);
};

const getFinalResult_normal = (
  ordered_normal,
  picked_normal,
  delivery_date,
  route_id
) => {
  console.log("entered - final result normal");

  let finalArr_normal = [];

  for (let i = 0; i < picked_normal.length; i++) {
    for (let j = 0; j < ordered_normal.length; j++) {
      if (
        picked_normal[i]._id["material_code"] ==
        ordered_normal[j]._id["material_no"]
      ) {
        let ordered_qty = ordered_normal[j].total_ordered_qty;
        let allocated_qty = ordered_normal[j].total_allocated_qty;
        let pending_qty = ordered_normal[j].total_pending_qty;

        let picked_qty =
          ordered_normal[j]._id["uom"] == "KG"
            ? picked_normal[i].carrier_count * picked_normal[i]._id["qty_in_kg"]
            : picked_normal[i].carrier_count;

        if (picked_qty > pending_qty) picked_qty = pending_qty;

        // console.log("picked qty - ", picked_qty, ordered_qty, allocated_qty);

        finalArr_normal.push({
          delivery_date: delivery_date,
          route_id: route_id,
          material_code: picked_normal[i]._id["material_code"],
          material_name: picked_normal[i]._id["material_name"],
          uom: ordered_normal[j]._id["uom"],
          cumulative_ordered_qty: ordered_qty.toFixed(2),
          cumulative_picked_qty: picked_qty.toFixed(2),
          cumulative_allocated_qty: allocated_qty.toFixed(2),
          cumulative_pending_qty: pending_qty.toFixed(2),
        });

        ordered_normal.splice(j, 1);
        j = j - 1;
      }
    }
  }
  return finalArr_normal;
};

const getFinalResult_ptl = async (ordered_ptl, picked_ptl, filter) => {
  console.log("entered - final result ptl");
  let flag = 0;
  let prev_material_code = "";
  let ptlOrderedQtyArr = [];
  let tolerance = null;
  let finalArr_ptl = [];

  if (picked_ptl.length > 0) {
    for (let i = 0; i < ordered_ptl.length; i++) {
      //

      if (prev_material_code != ordered_ptl[i].material_no) {
        console.log("entered - diff material code");
        //
        prev_material_code = ordered_ptl[i].material_no;

        tolerance = await db.product_weight_model.findOne(
          {
            company_code: filter.company_code,
            plant_id: filter.plant_id,
            material_code: ordered_ptl[i].material_no,
          },
          { _id: 0, qty_in_pack: 1 }
        );
      }

      if (tolerance != null) {
        console.log("entered - tolerance not null");
        //
        if (ordered_ptl[i].order_qty >= tolerance.qty_in_pack) {
          //

          let len = ptlOrderedQtyArr.length;
          // console.log("entered - tolernace - ", len);

          if (len > 0) {
            // console.log("entered - ptlOrderedQtyArr len > 0");
            if (
              ptlOrderedQtyArr[len - 1].material_no ==
              ordered_ptl[i].material_no
            ) {
              console.log("entered already same data");
              ptlOrderedQtyArr[len - 1].cumulative_ordered_qty =
                Math.floor(ordered_ptl[i].order_qty / tolerance.qty_in_pack) +
                ptlOrderedQtyArr[len - 1].cumulative_ordered_qty;

              ptlOrderedQtyArr[len - 1].cumulative_pending_qty =
                ptlOrderedQtyArr[len - 1].cumulative_ordered_qty;

              ptlOrderedQtyArr[len - 1].cumulative_allocated_qty =
                Math.floor(
                  ordered_ptl[i].allocated_qty / tolerance.qty_in_pack
                ) + ptlOrderedQtyArr[len - 1].cumulative_allocated_qty;
              //
            } else {
              //
              ptlOrderedQtyArr.push({
                material_no: ordered_ptl[i].material_no,
                material_name: ordered_ptl[i].material_name,
                uom: ordered_ptl[i].uom,
                cumulative_ordered_qty: Math.floor(
                  ordered_ptl[i].order_qty / tolerance.qty_in_pack
                ),
                cumulative_picked_qty: 0,
                cumulative_allocated_qty: Math.floor(
                  ordered_ptl[i].allocated_qty / tolerance.qty_in_pack
                ),
                cumulative_pending_qty: Math.floor(
                  ordered_ptl[i].order_qty / tolerance.qty_in_pack
                ),
              });
            }
          } else {
            ptlOrderedQtyArr.push({
              material_no: ordered_ptl[i].material_no,
              material_name: ordered_ptl[i].material_name,
              uom: ordered_ptl[i].uom,
              cumulative_ordered_qty: Math.floor(
                ordered_ptl[i].order_qty / tolerance.qty_in_pack
              ),
              cumulative_picked_qty: 0,
              cumulative_allocated_qty: Math.floor(
                ordered_ptl[i].allocated_qty / tolerance.qty_in_pack
              ),
              cumulative_pending_qty: Math.floor(
                ordered_ptl[i].order_qty / tolerance.qty_in_pack
              ),
            });

            // console.log(
            //   "entered - first time entry - ",
            //   ordered_ptl[i].material_no,
            //   ptlOrderedQtyArr
            // );
          }
        }
      } else {
        flag = 1;
        ptlOrderedQtyArr = [];
      }
    }

    // console.log("check - ", ptlOrderedQtyArr);

    // console.log("ordered qty arr", ptlOrderedQtyArr, picked_ptl);

    for (let i = 0; i < picked_ptl.length; i++) {
      for (let j = 0; j < ptlOrderedQtyArr.length; j++) {
        if (
          picked_ptl[i]._id["material_code"] ==
          ptlOrderedQtyArr[j]["material_no"]
        ) {
          finalArr_ptl.push({
            delivery_date: filter.delivery_date,
            route_id: filter.route_id,
            material_code: picked_ptl[i]._id["material_code"],
            material_name: picked_ptl[i]._id["material_name"],
            uom: picked_ptl[i]._id["uom"],
            cumulative_ordered_qty:
              ptlOrderedQtyArr[j].cumulative_ordered_qty.toFixed(2),
            cumulative_picked_qty: picked_ptl[i].carrier_count.toFixed(2),
            cumulative_allocated_qty:
              ptlOrderedQtyArr[j].cumulative_allocated_qty.toFixed(2),
            cumulative_pending_qty: (
              ptlOrderedQtyArr[j].cumulative_pending_qty -
              ptlOrderedQtyArr[j].cumulative_allocated_qty
            ).toFixed(2),
          });

          ptlOrderedQtyArr.splice(j, 1);
          j = j - 1;
        }
      }
    }
  }

  return finalArr_ptl;
};

exports.cumulativePickedList = async (req, res) => {
  console.log("Calling get cumulative picked SKU list api");
  const { company_code, plant_id, delivery_date, route_id } = req.query;
  try {
    if (!(company_code && plant_id && delivery_date && route_id))
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required to parameters!",
      });

    let mssge = "SKU based cumulative picked list is available";
    let status = 200;

    const ptl_item_codes = await getPTLItemCodes({
      company_code: company_code,
      plant_id: plant_id,
      pieces_per_bin: { $gt: 0 },
    });

    const getQty = await Promise.all([
      getOrderedQtyList_normal({
        company_code: company_code,
        plant_id: plant_id,
        delivery_date: delivery_date,
        route_id: route_id,
        material_no: { $nin: ptl_item_codes },
      }),

      getOrderedQtyList_ptl({
        company_code: company_code,
        plant_id: plant_id,
        delivery_date: delivery_date,
        route_id: route_id,
        material_no: { $in: ptl_item_codes },
      }),
      getPickedQtyList(
        {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          route_id: route_id,
          is_deleted: false,
          palletization_status: "STACKED",
        },
        { $nin: ptl_item_codes }
      ),

      getPickedQtyList(
        {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          route_id: route_id,
          is_deleted: false,
          palletization_status: "STACKED",
        },
        { $in: ptl_item_codes }
      ),
    ]);

    let ordered_normal = getQty[0];
    let ordered_ptl = getQty[1];
    let picked_normal = getQty[2];
    let picked_ptl = getQty[3];

    const finalResult = await Promise.all([
      getFinalResult_normal(
        ordered_normal,
        picked_normal,
        delivery_date,
        route_id
      ),
      getFinalResult_ptl(ordered_ptl, picked_ptl, {
        company_code: company_code,
        plant_id: plant_id,
        delivery_date: delivery_date,
        route_id: route_id,
      }),
    ]);

    const data = finalResult[0].concat(finalResult[1]);

    if (data.length == 0) {
      mssge = "SKU based cumulative picked list is not available!";
      status = 404;
    }

    return res.send({
      status_code: status,
      message: mssge,
      data: data,
    });
    //
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        "Some error occurred while extracting SKU based SO cumulative picked list!",
    });
  }
};

const getSkuAllocationList = async (filter) => {
  return await soAllocationColl
    .find(filter, {
      sales_order_no: 1,
      material_no: 1,
      material_name: 1,
      item_no: 1,
      uom: 1,
      pending_qty: 1,
      allocated_qty: 1,
      order_qty: 1,
    })
    .sort({ order_qty: -1 });
};

exports.skuAllocationList = async (req, res) => {
  console.log("calling get SKU allocation list api");
  const {
    company_code,
    plant_id,
    delivery_date,
    route_id,
    material_code,
    uom,
  } = req.query;
  try {
    if (
      !(
        company_code &&
        plant_id &&
        delivery_date &&
        route_id &&
        material_code &&
        uom
      )
    )
      return res
        .status(400)
        .send({ status_code: 400, message: "Provide all required paramters!" });

    const checkPTLItem = await toleranceColl.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        material_code: material_code,
      },
      { _id: 0, pieces_per_bin: 1, qty_in_kg: 1, qty_in_pack: 1 }
    );

    if (checkPTLItem == null)
      return res.send({
        status_code: 404,
        message:
          "Weight tolerance data is not available for the selected material!",
      });

    const getSKUListAndPickedQty = await Promise.all([
      getPickedQtyList(
        {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          route_id: route_id,
          is_deleted: false,
          palletization_status: "STACKED",
        },
        material_code
      ),
      getSkuAllocationList({
        company_code: company_code,
        plant_id: plant_id,
        route_id: route_id,
        delivery_date: delivery_date,
        material_no: material_code,
        uom: uom,
        pending_qty: { $ne: 0 },
      }),
    ]);

    const picked = getSKUListAndPickedQty[0];
    const getSosPickingQtyList = getSKUListAndPickedQty[1];

    let totalPendingQty = 0;
    getSosPickingQtyList.map((qty) => {
      totalPendingQty += qty.pending_qty;
    });

    const getPickedQty = picked.length > 0 ? picked[0].carrier_count : 0;

    let picked_qty =
      checkPTLItem.pieces_per_bin == 0
        ? uom == "KG"
          ? getPickedQty * checkPTLItem.qty_in_kg
          : getPickedQty
        : getPickedQty;

    if (picked_qty > totalPendingQty) picked_qty = totalPendingQty;

    let mssge = "SKU allocation list is available";
    let status = 200;
    let skuAllocationArr = [];

    if (+picked_qty == 0)
      return res.send({
        status_code: 200,
        message:
          "You allocated all picked carriers. So, please go back and check again!",
        data: {
          cumulative_picked_qty: picked_qty,
          allocation_list: skuAllocationArr,
          tolerance: uom == "KG" ? checkPTLItem.qty_in_kg.toFixed(2) : "1.00",
        },
      });

    let remaining_pick_qty = +picked_qty;

    if (getSosPickingQtyList.length != 0) {
      if (checkPTLItem.pieces_per_bin == 0) {
        console.log(" entered - normal item");

        for (let i = 0; i < getSosPickingQtyList.length; i++) {
          // console.log("looping");
          let remaining_ordered_qty = getSosPickingQtyList[i].pending_qty;

          if (remaining_ordered_qty > 0) {
            if (remaining_ordered_qty > remaining_pick_qty) {
              console.log("else if > ");

              skuAllocationArr.push({
                sales_order_no: getSosPickingQtyList[i].sales_order_no,
                material_code: material_code,
                item_no: getSosPickingQtyList[i].item_no,
                material_name: getSosPickingQtyList[i].material_name,
                uom: uom,
                ordered_qty: getSosPickingQtyList[i].order_qty.toFixed(2),
                allocation_qty: remaining_pick_qty.toFixed(2),
                already_allocated_qty:
                  getSosPickingQtyList[i].allocated_qty.toFixed(2),
              });

              remaining_pick_qty = 0;

              //
            } else if (remaining_ordered_qty == remaining_pick_qty) {
              // console.log("else if == ");
              // console.log("getSosPickingQtyList[i].getSosPickingQtyList",getSosPickingQtyList[i]);
              skuAllocationArr.push({
                sales_order_no: getSosPickingQtyList[i].sales_order_no,
                material_code: material_code,
                item_no: getSosPickingQtyList[i].item_no,
                material_name: getSosPickingQtyList[i].material_name,
                uom: uom,
                ordered_qty: getSosPickingQtyList[i].order_qty.toFixed(2),
                allocation_qty: remaining_pick_qty.toFixed(2),
                already_allocated_qty:
                  getSosPickingQtyList[i].allocated_qty.toFixed(2),
              });

              remaining_pick_qty = 0;

              //
            } else if (remaining_ordered_qty < remaining_pick_qty) {
              console.log("else if < ");

              skuAllocationArr.push({
                sales_order_no: getSosPickingQtyList[i].sales_order_no,
                material_code: material_code,
                item_no: getSosPickingQtyList[i].item_no,
                material_name: getSosPickingQtyList[i].material_name,
                uom: uom,
                ordered_qty: getSosPickingQtyList[i].order_qty.toFixed(2),
                allocation_qty: getSosPickingQtyList[i].pending_qty.toFixed(2),
                already_allocated_qty:
                  getSosPickingQtyList[i].allocated_qty.toFixed(2),
              });

              remaining_pick_qty = remaining_pick_qty - remaining_ordered_qty;

              //
            } else {
            }
          }
        }
      } else {
        console.log(" entered - PTL item");
        for (let i = 0; i < getSosPickingQtyList.length; i++) {
          let remaining_ordered_qty = Math.floor(
            getSosPickingQtyList[i].pending_qty / checkPTLItem.qty_in_pack
          );

          if (remaining_ordered_qty > 0) {
            if (remaining_ordered_qty > remaining_pick_qty) {
              console.log("else if > ");

              skuAllocationArr.push({
                sales_order_no: getSosPickingQtyList[i].sales_order_no,
                material_code: material_code,
                item_no: getSosPickingQtyList[i].item_no,
                material_name: getSosPickingQtyList[i].material_name,
                uom: uom,
                ordered_qty: Math.floor(
                  getSosPickingQtyList[i].order_qty / checkPTLItem.qty_in_pack
                ).toFixed(2),
                allocation_qty: remaining_pick_qty.toFixed(2),
                already_allocated_qty: Math.floor(
                  getSosPickingQtyList[i].allocated_qty
                ).toFixed(2),
              });

              remaining_pick_qty = 0;

              //
            } else if (remaining_ordered_qty == remaining_pick_qty) {
              console.log("else if == ");
              // console.log(
              //   "getSosPickingQtyList[i].getSosPickingQtyList",
              //   getSosPickingQtyList[i]
              // );
              skuAllocationArr.push({
                sales_order_no: getSosPickingQtyList[i].sales_order_no,
                material_code: material_code,
                item_no: getSosPickingQtyList[i].item_no,
                material_name: getSosPickingQtyList[i].material_name,
                uom: uom,
                ordered_qty: Math.floor(
                  getSosPickingQtyList[i].order_qty / checkPTLItem.qty_in_pack
                ).toFixed(2),
                allocation_qty: remaining_pick_qty.toFixed(2),
                already_allocated_qty: Math.floor(
                  getSosPickingQtyList[i].allocated_qty /
                  checkPTLItem.qty_in_pack
                ).toFixed(2),
              });

              remaining_pick_qty = 0;

              //
            } else if (remaining_ordered_qty < remaining_pick_qty) {
              console.log("else if < ");

              skuAllocationArr.push({
                sales_order_no: getSosPickingQtyList[i].sales_order_no,
                material_code: material_code,
                item_no: getSosPickingQtyList[i].item_no,
                material_name: getSosPickingQtyList[i].material_name,
                uom: uom,
                ordered_qty: Math.floor(
                  getSosPickingQtyList[i].order_qty / checkPTLItem.qty_in_pack
                ).toFixed(2),
                allocation_qty: Math.floor(
                  getSosPickingQtyList[i].pending_qty / checkPTLItem.qty_in_pack
                ).toFixed(2),
                already_allocated_qty: Math.floor(
                  getSosPickingQtyList[i].allocated_qty /
                  checkPTLItem.qty_in_pack
                ).toFixed(2),
              });

              remaining_pick_qty = remaining_pick_qty - remaining_ordered_qty;

              //
            } else {
            }
          }
        }
      }
    } else {
      mssge = "SKU allocation list is not available!";
      status = 404;
    }

    if (skuAllocationArr.length == 0) {
      mssge = "SKU allocation list is not available!";
      status = 404;
    }

    return res.send({
      status_code: status,
      message: mssge,
      data: {
        cumulative_picked_qty: picked_qty,
        allocation_list: skuAllocationArr,
        tolerance: uom == "KG" ? checkPTLItem.qty_in_kg.toFixed(2) : "1.00",
      },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting SKU allocation list!",
    });
  }
};

exports.list_pallets_for_sku = async (req, res) => {
  console.log("list_pallets_for_sku");
  const { company_code, plant_id, delivery_date, route_id, material_code } =
    req.query;
  try {
    if (
      !(company_code && plant_id && delivery_date && route_id && material_code)
    )
      return res
        .status(400)
        .send({ status_code: 400, message: "Provide all required paramters!" });

    let mssge = "pallets list";
    let status = 200;

    let assigned_pallet = await allocation_palletization_table.aggregate([
      {
        $match: {
          delivery_date: delivery_date,
          plant_id: plant_id,
          company_code: company_code,
          route_id: route_id,
          is_deleted: false,
          palletization_status: { $in: ["ASSIGNED", "STACKING"] },
        },
      },
      {
        $project: {
          _id: 0,
          pallet_barcode: 1,
          palletization_status: 1,
        },
      },
    ]);

    let picked_pallet = await cummulative_palletization.aggregate([
      {
        $match: {
          is_deleted: false,
          palletization_status: "STACKED",
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          route_id: route_id,
          "items.material_code": material_code,
        },
      },
      {
        $project: {
          _id: 0,
          pallet_barcode: 1,
          palletization_status: 1,
        },
      },
    ]);

    for (let i = 0; i < picked_pallet.length; i++) {
      for (let j = 0; j < assigned_pallet.length; j++) {
        if (picked_pallet.length == 0) break;

        if (picked_pallet.length > 0 && i == -1) i++;

        if (
          picked_pallet[i].pallet_barcode == assigned_pallet[j].pallet_barcode
        ) {
          picked_pallet.splice(i, 1);
          i = i - 1;
        }
      }
    }

    picked_pallet.forEach((element) => {
      assigned_pallet.push(element);
    });

    // console.log("assigned_pallet", assigned_pallet);
    if (!assigned_pallet.length) {
      mssge = "No pallets to list!";
    }

    return res.send({
      status_code: status,
      message: mssge,
      data: assigned_pallet,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting SKU allocation list!",
    });
  }
};

const checkPalletCanBeUsed = async (filter) => {
  const checkSamePallet = await cummulative_palletization.findOne({
    company_code: filter.company_code,
    plant_id: filter.plant_id,
    delivery_date: filter.delivery_date,
    route_id: filter.route_id,
    pallet_barcode: filter.pallet_barcode,
    palletization_status: "STACKED",
    is_deleted: false,
  });

  let confirm = "Stacked_Pallet";

  if (checkSamePallet == null) {
    const checkAssigned = await allocation_palletization_table.findOne(filter);

    if (checkAssigned != null) confirm = "Assigned_Pallet";
    else confirm = "Cannot_Use";
  }

  console.log("check pallet - ", confirm);

  return confirm;
};

const free_empty_pallets = async (filter, user) => {
  const getPallets = await Promise.all([
    (
      await cummulative_palletization.aggregate([
        {
          $match: filter,
        },
        { $unwind: "$items" },
        { $unwind: "$items.carriers" },
        { $match: { "items.carriers.carrier_status": "PRESENT" } },
        { $group: { _id: "$pallet_barcode" } },
      ])
    ).map((barcode) => {
      return barcode._id;
    }),
    (
      await cummulative_palletization.aggregate([
        {
          $match: filter,
        },
        { $project: { _id: 0, pallet_barcode: 1 } },
      ])
    ).map((barcode) => {
      return barcode.pallet_barcode;
    }),
  ]);

  let allPallets = getPallets[1];
  let palletsWithCarriers = getPallets[0];

  for (let i = 0; i < allPallets.length; i++) {
    for (let j = 0; j < palletsWithCarriers.length; j++) {
      if (allPallets[i] == palletsWithCarriers[j]) {
        allPallets.splice(i, 1);
        palletsWithCarriers.splice(j, 1);

        i = i - 1;
        j = j - 1;
      }
    }
  }

  const getUsedPallets = (
    await allocation_palletization_table.find(
      {
        company_code: filter.company_code,
        plant_id: filter.plant_id,
        delivery_date: filter.delivery_date,
        route_id: filter.route_id,
        pallet_barcode: { $in: allPallets },
      },
      { _id: 0, pallet_barcode: 1 }
    )
  ).map((barcode) => {
    return barcode.pallet_barcode;
  });

  let extractFromUsedPallets = allPallets;

  if (getUsedPallets.length == 0) {
    for (let i = 0; i < extractFromUsedPallets.length; i++) {
      for (let j = 0; j < getUsedPallets.length; j++) {
        //
        if (extractFromUsedPallets[i] == getUsedPallets[j]) {
          extractFromUsedPallets.splice(i, 1);
          i = i - 1;
        }
      }
    }
  }

  //  Delete Removed Pallet
  await cummulative_palletization.updateMany(
    {
      company_code: filter.company_code,
      plant_id: filter.plant_id,
      delivery_date: filter.delivery_date,
      route_id: filter.route_id,
      pallet_barcode: { $in: allPallets },
    },
    { $set: { is_deleted: true, updated_by: user } }
  );

  // free pallet
  await db.pallets.updateMany(
    {
      company_code: filter.company_code,
      plant_id: filter.plant_id,
      pallet_id: { $in: extractFromUsedPallets },
    },
    {
      $set: {
        is_deleted: true,
        updated_by: user,
        palletization_status: "Unassigned",
      },
    }
  );

  return 1;
};

const getCarriersData = async (filter, material_code) => {
  return await cummulative_palletization.aggregate([
    {
      $match: filter,
    },
    { $unwind: "$items" },
    { $match: { "items.material_code": material_code } },
    { $unwind: "$items.carriers" },
    { $match: { "items.carriers.carrier_status": { $ne: "REMOVED" } } },
    {
      $project: {
        _id: 0,
        "items.sku_qty_in_kg": 1,
        "items.sku_qty_in_pack": 1,
        "items.material_name": 1,
        "items.total_carrier_count": 1,
        "items.carriers": 1,
      },
    },
  ]);
};

exports.saveAllocation = async (req, res) => {
  console.log("calling save allocation api");
  const {
    company_code,
    plant_id,
    route_id,
    delivery_date,
    pallet_barcode,
    sales_order_no,
    material_code,
    item_no,
    ordered_qty,
    uom,
    allocated_qty,
    user,
  } = req.body;
  try {
    if (
      !(
        company_code &&
        plant_id &&
        route_id &&
        delivery_date &&
        pallet_barcode &&
        sales_order_no &&
        material_code &&
        item_no &&
        ordered_qty != undefined &&
        uom &&
        allocated_qty != undefined &&
        user
      )
    )
      return res
        .status(400)
        .send({ status_code: 400, message: "Provide all required paramters!" });

    if (+allocated_qty > +ordered_qty)
      return res.status(400).send({
        status_code: 400,
        message: "Allocated qty should not be more than ordered qty!",
      });

    const checkIsDiscreteItem = await toleranceColl.findOne({
      company_code: company_code,
      plant_id: plant_id,
      material_code: material_code,
      // pieces_per_bin: { $gt: 0 },
    });

    const checkPallet = await checkPalletCanBeUsed({
      company_code: company_code,
      plant_id: plant_id,
      delivery_date: delivery_date,
      route_id: route_id,
      pallet_barcode: pallet_barcode,
      palletization_status: { $in: ["ASSIGNED", "STACKING"] },
    });

    if (checkPallet == "Cannot_Use")
      return res.send({
        status_code: 400,
        message: "Provided pallet is not available or wrong pallet scanned!",
      });

    let carriers = [];
    if (checkPallet == "Stacked_Pallet") {
      carriers = await getCarriersData(
        {
          company_code: company_code,
          plant_id: plant_id,
          route_id: route_id,
          delivery_date: delivery_date,
          pallet_barcode: pallet_barcode,
          is_deleted: false,
        },
        material_code
      );
      console.log(carriers);

      const standard_qty = uom == "KG" ? carriers[0].items["sku_qty_in_kg"] : 1;

      if (carriers.length * standard_qty < allocated_qty)
        return res.status(400).send({
          status_code: 400,
          message:
            "Maximum you could allocate upto to qty - " +
            carriers.length * standard_qty,
        });
    } else {
      carriers = await getCarriersData(
        {
          company_code: company_code,
          plant_id: plant_id,
          route_id: route_id,
          delivery_date: delivery_date,
          is_deleted: false,
        },
        material_code
      );

      const pallet_capacity =
        uom == "KG"
          ? checkIsDiscreteItem.pallet_capacity * checkIsDiscreteItem.qty_in_kg
          : checkIsDiscreteItem.pallet_capacity;

      if (allocated_qty > pallet_capacity)
        return res.status(400).send({
          status_code: 400,
          message: "Maximum you can allocate upto to qty - " + pallet_capacity,
        });
    }

    // console.log("carriers", carriers);

    const standard_qty = uom == "KG" ? carriers[0].items["sku_qty_in_kg"] : 1;

    // allocation value check
    if (uom == "KG")
      if (
        +allocated_qty / carriers[0].items["sku_qty_in_kg"] >
        Math.floor(+allocated_qty / carriers[0].items["sku_qty_in_kg"])
      )
        return res.status(400).send({
          status_code: "400",
          message:
            "Allocation qty should be a multiple of " +
            carriers[0].items["sku_qty_in_kg"] +
            ", because of its tolerance weight!",
        });

    let carriersAddedQty = 0;

    let carriersPLTArr = [];
    let carriersAllocationArr = [];
    let carriersBarcode = [];

    let total_crate_weight = 0;
    let total_net_weight = 0;
    let total_gross_weight = 0;

    let flag = 0;

    const net_qty =
      uom == "KG"
        ? checkIsDiscreteItem.qty_in_kg
        : checkIsDiscreteItem.pieces_per_bin > 0
          ? checkIsDiscreteItem.qty_in_pack
          : 1;

    for (let i = 0; i < carriers.length; i++) {
      console.log("entered carriers loop");
      carriersAddedQty = (i + 1) * standard_qty;

      // console.log(
      //   "carriers added qty -",
      //   i + 1,
      //   standard_qty,
      //   carriersAddedQty,
      //   +allocated_qty,
      //   allocated_qty == carriersAddedQty
      // );

      if (+allocated_qty > carriersAddedQty) {
        console.log("entered allctd qty > carrAdd");

        carriersPLTArr.push({
          carrier_barcode: carriers[i].items.carriers.carrier_barcode,
          crate_weight: carriers[i].items.carriers.crate_weight,
          net_weight: carriers[i].items.carriers.net_weight,
          gross_weight: carriers[i].items.carriers.gross_weight,
        });

        carriersAllocationArr.push({
          crate_barcode: carriers[i].items.carriers.carrier_barcode,
          tare_weight: carriers[i].items.carriers.crate_weight,
          net_weight: net_qty,
          exact_net_weight: carriers[i].items.carriers.net_weight,
          gross_weight: carriers[i].items.carriers.gross_weight,
          user_name: user,
          mode: "cumulative",
          pallet_barcode: pallet_barcode,
        });

        carriersBarcode.push(carriers[i].items.carriers.carrier_barcode);

        total_crate_weight += carriers[i].items.carriers.crate_weight;
        total_net_weight += carriers[i].items.carriers.net_weight;
        total_gross_weight += carriers[i].items.carriers.gross_weight;
        //
      } else if (+allocated_qty == carriersAddedQty) {
        console.log("entered allctd qty == carrAdd");

        carriersPLTArr.push({
          carrier_barcode: carriers[i].items.carriers.carrier_barcode,
          crate_weight: carriers[i].items.carriers.crate_weight,
          net_weight: carriers[i].items.carriers.net_weight,
          gross_weight: carriers[i].items.carriers.gross_weight,
        });

        carriersAllocationArr.push({
          crate_barcode: carriers[i].items.carriers.carrier_barcode,
          tare_weight: carriers[i].items.carriers.crate_weight,
          net_weight: net_qty,
          exact_net_weight: carriers[i].items.carriers.net_weight,
          gross_weight: carriers[i].items.carriers.gross_weight,
          user_name: user,
          mode: "cumulative",
          pallet_barcode: pallet_barcode,
        });

        carriersBarcode.push(carriers[i].items.carriers.carrier_barcode);

        total_crate_weight += carriers[i].items.carriers.crate_weight;
        total_net_weight += carriers[i].items.carriers.net_weight;
        total_gross_weight += carriers[i].items.carriers.gross_weight;

        flag = 1;
      } else if (+allocated_qty < carriersAddedQty) {
        console.log("entered allctd qty < carrAdd");
        flag = 1;
      }

      if (flag == 1) break;
    }
    // console.log(
    //   "carriers check - ",
    //   carriersPLTArr.length,
    //   allocated_qty,
    //   standard_qty,
    // "---------------------------------------",
    // carriersAllocationArr.length,
    // "------------------------------------"
    // carriersBarcode
    // );

    if (+allocated_qty != carriersPLTArr.length * standard_qty)
      return res.send({
        status_code: 400,
        message: "picked carriers qty is less than allocation qty!",
      });

    const allocationData = await soAllocationColl.findOne({
      company_code: company_code,
      plant_id: plant_id,
      delivery_date: delivery_date,
      route_id: route_id,
      sales_order_no: sales_order_no,
      material_no: material_code,
      item_no: item_no,
      pending_qty: { $ne: 0 },
    });

    if (allocationData != null) {
      console.log("entered allocation data is present");

      const totalAllocatedQty =
        checkIsDiscreteItem.pieces_per_bin > 0
          ? allocationData.allocated_qty +
          +allocated_qty * checkIsDiscreteItem.qty_in_pack
          : allocationData.allocated_qty + +allocated_qty;

      const isReadyForInvoice =
        allocationData.order_qty == totalAllocatedQty ? true : false;

      const updateAllocation = await soAllocationColl.updateOne(
        {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          route_id: route_id,
          sales_order_no: sales_order_no,
          material_no: material_code,
          item_no: item_no,
        },
        {
          $set: {
            allocated_qty:
              allocationData.allocated_qty +
              (checkIsDiscreteItem.pieces_per_bin > 0
                ? +allocated_qty * checkIsDiscreteItem.qty_in_pack
                : +allocated_qty),
            pending_qty:
              allocationData.pending_qty -
              (checkIsDiscreteItem.pieces_per_bin > 0
                ? +allocated_qty * checkIsDiscreteItem.qty_in_pack
                : +allocated_qty),

            create_count:
              allocationData.create_count + carriersAllocationArr.length,
            is_ready_for_invoice: isReadyForInvoice,
          },
        }
      );

      const pushCarriers = await soAllocationColl.updateOne(
        {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          route_id: route_id,
          sales_order_no: sales_order_no,
          material_no: material_code,
          item_no: item_no,
        },

        { $push: { allocation_detail: { $each: carriersAllocationArr } } }
      );
    } else
      return res.send({
        status_code: 400,
        message: "Selected SO is already allocated or not available!",
      });

    ////////////////////////////////////////

    const allocatedData = await allocation_palletization_table.findOne({
      company_code: company_code,
      plant_id: plant_id,
      delivery_date: delivery_date,
      route_id: route_id,
      pallet_barcode: pallet_barcode,
      is_deleted: false,
    });

    // console.log("check pallet - ", checkPallet);
    if (allocatedData == null && checkPallet == "Stacked_Pallet") {
      console.log("entered - new data insertion in allocation palletization");

      const insertAllocated = await allocation_palletization_table.create({
        company_code: company_code,
        plant_id: plant_id,
        delivery_date: delivery_date,
        route_id: route_id,
        pallet_barcode: pallet_barcode,
        palletization_status: "STACKING",
        total_stacked_weight: total_gross_weight.toFixed(2),
        total_stacked_carriers: carriersPLTArr.length,
        items: [
          {
            sales_order_no: sales_order_no,
            item_no: item_no,
            material_code: material_code,
            material_name: carriers[0].items.material_name,
            uom: uom,
            total_allocated_qty:
              checkIsDiscreteItem.pieces_per_bin > 0
                ? +allocated_qty * checkIsDiscreteItem.qty_in_pack
                : +allocated_qty,
            total_crate_weight: total_crate_weight.toFixed(2),
            total_net_weight: total_net_weight.toFixed(2),
            total_gross_weight: total_gross_weight.toFixed(2),
            total_carrier_count: carriersPLTArr.length,
            carriers: carriersPLTArr,
          },
        ],
      });

      await pallet_master_table.updateOne(
        {
          company_code: company_code,
          plant_id: plant_id,
          pallet_id: pallet_barcode,
        },
        { $set: { palletization_status: "Stacking", updated_by: user } }
      );
    } else {
      console.log("entered - entry is available");

      const checkItemPresent = await allocation_palletization_table.findOne(
        {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          route_id: route_id,
          pallet_barcode: pallet_barcode,
          is_deleted: false,
          "items.material_code": material_code,
          "items.sales_order_no": sales_order_no,
          "items.item_no": item_no,
        },
        {
          _id: 0,
          "items.$": 1,
          total_stacked_carriers: 1,
          total_stacked_weight: 1,
        }
      );

      if (checkItemPresent != null) {
        console.log("entered - item present");

        let totalAllocatedQty = 0;
        let totalCrateWeight = 0;
        let totalNetWeight = 0;
        let totalGrossWeight = 0;
        let totalCarrierCount = 0;
        // let picking_location_carriers = 0;

        for (let i = 0; i < checkItemPresent.items.length; i++) {
          if (checkItemPresent.items[i].material_code == material_code) {
            totalCrateWeight =
              checkItemPresent.items[i].total_crate_weight + total_crate_weight;

            totalNetWeight =
              checkItemPresent.items[i].total_net_weight + total_net_weight;

            totalGrossWeight =
              checkItemPresent.items[i].total_gross_weight + total_gross_weight;

            totalCarrierCount =
              checkItemPresent.items[i].total_carrier_count +
              carriersPLTArr.length;

            totalAllocatedQty =
              checkItemPresent.items[i].total_allocated_qty +
              (checkIsDiscreteItem.pieces_per_bin > 0
                ? +allocated_qty * checkIsDiscreteItem.qty_in_pack
                : +allocated_qty);
          }
        }

        // updating header
        await allocation_palletization_table.updateOne(
          {
            company_code: company_code,
            plant_id: plant_id,
            delivery_date: delivery_date,
            route_id: route_id,
            pallet_barcode: pallet_barcode,
            "items.material_code": material_code,
            "items.sales_order_no": sales_order_no,
            "items.item_no": item_no,
          },
          {
            $set: {
              total_stacked_weight: (
                checkItemPresent.total_stacked_weight + total_gross_weight
              ).toFixed(2),
              total_stacked_carriers: (
                checkItemPresent.total_stacked_carriers + carriersPLTArr.length
              ).toFixed(2),
              "items.$.total_allocated_qty": totalAllocatedQty,
              "items.$.total_crate_weight": totalCrateWeight.toFixed(2),
              "items.$.total_net_weight": totalNetWeight.toFixed(2),
              "items.$.total_gross_weight": totalGrossWeight.toFixed(2),
              "items.$.total_carrier_count": totalCarrierCount,
            },
          }
        );

        // console.log("carriers - ", carriersPLTArr);

        // updating body
        await allocation_palletization_table.updateOne(
          {
            company_code: company_code,
            plant_id: plant_id,
            delivery_date: delivery_date,
            route_id: route_id,
            pallet_barcode: pallet_barcode,
            "items.material_code": material_code,
          },
          { $push: { "items.$.carriers": { $each: carriersPLTArr } } }
        );
      } else {
        // console.log("check pallet - ", checkPallet);

        if (
          checkPallet == "Assigned_Pallet" ||
          checkPallet == "Stacked_Pallet"
        ) {
          const filter = {
            company_code: company_code,
            plant_id: plant_id,
            delivery_date: delivery_date,
            route_id: route_id,
            pallet_barcode: pallet_barcode,
          };
          // updating header
          await allocation_palletization_table.updateOne(filter, {
            $set: {
              palletization_status: "STACKING",
              total_stacked_carriers:
                allocatedData.total_stacked_carriers + carriersPLTArr.length,
              total_stacked_weight: (
                allocatedData.total_stacked_weight + total_gross_weight
              ).toFixed(2),
            },
          });

          // updating body
          await allocation_palletization_table.updateOne(filter, {
            $push: {
              items: {
                sales_order_no: sales_order_no,
                item_no: item_no,
                material_code: material_code,
                material_name: carriers[0].items.material_name,
                uom: uom,
                total_allocated_qty:
                  checkIsDiscreteItem.pieces_per_bin > 0
                    ? +allocated_qty * checkIsDiscreteItem.qty_in_pack
                    : +allocated_qty,
                total_crate_weight: total_crate_weight.toFixed(2),
                total_net_weight: total_net_weight.toFixed(2),
                total_gross_weight: total_gross_weight.toFixed(2),
                total_carrier_count: carriersPLTArr.length,
                carriers: carriersPLTArr,
              },
            },
          });

          await pallet_master_table.updateOne(
            {
              company_code: company_code,
              plant_id: plant_id,
              pallet_id: pallet_barcode,
              palletization_status: "Assigned",
            },
            { $set: { palletization_status: "Stacking", updated_by: user } }
          );
        } else
          return res.send({
            status_code: 400,
            message: "Please check provided is a assigned pallet!",
          });
      }
    }

    ////////////////////////////////////////////////////////////////////

    const deleteAllocatedCarriers = await cummulative_palletization.updateMany(
      {
        company_code: company_code,
        plant_id: plant_id,
        delivery_date: delivery_date,
        route_id: route_id,
      },
      { $set: { "items.$[x].carriers.$[y].carrier_status": "REMOVED" } },
      {
        arrayFilters: [
          { "x.material_code": material_code },
          { "y.carrier_barcode": { $in: carriersBarcode } },
        ],
      }
    );

    const freePallets = await free_empty_pallets(
      {
        company_code: company_code,
        plant_id: plant_id,
        delivery_date: delivery_date,
        route_id: route_id,
      },
      user
    );

    return res.send({ status_code: 200, message: "Allocated successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while saving allocation details!",
    });
  }
};

exports.update_allocation_pallet_status = async (req, res) => {
  let allocated_pallet_id = req.query.pallet_id;

  if (!allocated_pallet_id)
    return res
      .status(400)
      .send({ status_code: 200, message: "Missing parameter!" });

  try {
    const update_status = await db.allocationPalletization.findByIdAndUpdate(
      { _id: allocated_pallet_id },
      { palletization_status: "STACKED" },
      { useFindAndModify: false, new: true }
    );

    if (update_status) {
      return res.send({
        status_code: 200,
        message: "status updated successfully",
      });
    }
  } catch (error) {
    return res.status(400).send({
      status_code: 400,
      message:
        error.message ||
        "Some error occurred while updating allocation palletization status",
    });
  }
};

exports.palletDetails = async (req, res) => {
  console.log("calling stacked pallet details api");
  const {
    company_code,
    plant_id,
    delivery_date,
    route_id,
    pallet_barcode,
    material_code,
  } = req.query;
  try {
    if (
      !(company_code && plant_id && delivery_date && route_id && pallet_barcode)
    )
      return res
        .status(400)
        .send({ status_code: 400, message: "Provide all required paramters!" });

    let items = {};
    let carrierCodes = [];
    let mssge = "";
    let status = 200;

    const filter = {
      company_code: company_code,
      plant_id: plant_id,
      delivery_date: delivery_date,
      route_id: route_id,
      pallet_barcode: pallet_barcode,
      is_deleted: false,
      palletization_status: "STACKED",
    };

    if (material_code == undefined) {
      mssge = "item details available";

      // const getPalletInfo = await allocation_palletization_table.findOne(
      //   filter
      // );
      const getPalletInfo = await allocation_palletization_table.aggregate([
        { $match: filter },
        { $limit: 1 },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "rapid_allocation_invoice_details",
            localField: "items.sales_order_no",
            foreignField: "sales_order_no",
            pipeline: [
              {
                $project: {
                  _id: 0,
                  "items.material_code": 1,
                  allocation_id: 1,
                  invoice_no: 1,
                  plant_id: 1,
                  company_code: 1,
                  pallet_details: 1,
                },
              },
              {
                $match: {
                  plant_id: plant_id,
                  company_code: company_code,
                  "pallet_details.pallet_id": pallet_barcode,
                },
              },
              {
                $lookup: {
                  from: "rapid_sales_order_allocation_generate",
                  localField: "allocation_id",
                  foreignField: "allocation_id",
                  pipeline: [
                    {
                      $project: {
                        _id: 0,
                        customer_code: 1,
                        customer_name: 1,
                        plant_id: 1,
                        company_code: 1,
                        item_details: 1,
                      },
                    },
                    {
                      $match: {
                        plant_id: plant_id,
                        company_code: company_code,
                      },
                    },
                  ],
                  as: "allocation_details",
                },
              },
            ],
            as: "invoice_details",
          },
        },
        {
          $unwind: {
            path: "$invoice_details",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$invoice_details.allocation_details",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$invoice_details.allocation_details.item_details",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $sort: { "invoice_details.invoice_no": 1 },
        },
        {
          $project: {
            _id: 0,
            total_stacked_weight: 1,
            total_stacked_carriers: 1,
            "items.material_code": 1,
            "items.sales_order_no": 1,
            "items.material_name": 1,
            "items.uom": 1,
            "items.total_crate_weight": 1,
            "items.total_gross_weight": 1,
            "items.total_net_weight": 1,
            "items.total_carrier_count": 1,
            "items.total_allocated_qty": 1,
            invoice_details: 1,
          },
        },
      ]);

      // res.send(getPalletInfo);
      // getPalletInfo.filter((element) =>
      //   element.invoice_details
      //     ? element.invoice_details.allocation_details.item_details
      //         .material_no == element.items.material_code
      //     : true
      // );
      let final_response = [];
      getPalletInfo.forEach((element) => {
        if (
          element.items.material_code &&
          element.invoice_details.allocation_details.item_details.material_no
        ) {
          if (
            element.items.material_code ==
            element.invoice_details.allocation_details.item_details.material_no
          ) {
            final_response.push(element);
          }
        }
      });
      //return res.send(final_response);

      let invoice_list = [];
      final_response.forEach((element) => {
        // console.log(element.invoice_details);
        if (element.invoice_details && element.invoice_details.invoice_no) {
          if (!invoice_list.includes(element.invoice_details.invoice_no)) {
            invoice_list.push(element.invoice_details.invoice_no);
          }
        }
      });

      if (final_response.length) {
        items = {
          total_stacked_carriers: final_response[0].total_stacked_carriers,
          total_stacked_weight: final_response[0].total_stacked_weight,
          no_of_invoices: invoice_list.length,
          items: final_response.map((data) => {
            // console.log("data", data.invoice_details);
            return {
              material_code: data.items.material_code,
              material_name: data.items.material_name,
              allocated_qty: data.invoice_details
                ? data.invoice_details.allocation_details.item_details.quantity
                : 0,
              uom: data.items.uom,
              total_crate_weight: data.items.total_crate_weight,
              total_gross_weight: data.items.total_gross_weight,
              total_net_weight: data.items.total_net_weight,
              total_carrier_count: data.items.total_carrier_count,
              sales_order_no: data.items.sales_order_no,
              invoice_no: data.invoice_details
                ? data.invoice_details.invoice_no
                : "",
              customer_code: data.invoice_details
                ? data.invoice_details.allocation_details.customer_code
                : "",
              customer_name: data.invoice_details
                ? data.invoice_details.allocation_details.customer_name
                : "",
              order_qty: data.invoice_details
                ? data.invoice_details.allocation_details.item_details.so_qty
                : 0,
            };
          }),
        };
      } else {
        mssge = "item details not available!";
        status = 404;
      }
    } else {
      mssge = "Carrier barcodes available";

      const getPalletInfo = await allocation_palletization_table.aggregate([
        { $match: filter },
        { $unwind: "$items" },
        { $match: { "items.material_code": material_code } },
        { $project: { _id: 0, "items.carriers": 1 } },
      ]);

      let Data = [];

      if (getPalletInfo.length > 0) {
        carrierCodes = getPalletInfo[0].items.carriers.map((code) => {
          return code.carrier_barcode;
        });
      } else {
        mssge = "Carrier barcodes not available!";
        status = 404;
      }
    }

    res.send({
      status_code: status,
      message: mssge,
      data: material_code != undefined ? carrierCodes : items,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        "Some error occurred while extracting selected stacked pallet details!",
    });
  }
};
