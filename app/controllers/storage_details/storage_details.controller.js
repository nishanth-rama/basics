const db = require("../../models");

const palletization_table = db.palletization;
const primary_storage_table = db.primary_storage;
const secondary_storage_table = db.secondary_storage;
const secondary_storage_table_new = db.secondary_storage;
const article_master_table = db.articleMaster;
const rack_table = db.racks;
const pallet_master_table = db.pallets;
const conn = require("../../../server.js");

exports.list_primary_storage_details = async (req, res) => {
  const company_code = req.query.company_code;
  const plant_id = req.query.plant_id;

  if (!(company_code && plant_id)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }

  try {
    let primary_storage_details = await primary_storage_table.aggregate([
      {
        $match: { company_code: company_code, plant_id: plant_id },
      },
      {
        $group: {
          _id: "$material_code",
          total_stock: { $sum: "$total_stock" },
          material_name: { $first: "$material_name" },
          material_code: { $first: "$material_code" },
          carrier_count: { $sum: "$carrier_count" },
        },
      },
      {
        $project: {
          _id: 1,
          material_name: 1,
          material_code: 1,
          total_stock: { $trunc: ["$total_stock", 2] },
          carrier_count: { $trunc: ["$carrier_count", 2] },
        },
      },
    ]);
    let status_message = primary_storage_details.length
      ? "Listing the data!"
      : "Storage is empty!";

    return res.status(200).send({
      status_code: "200",
      status_message: status_message,
      data: primary_storage_details,
    });
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

exports.list_secondary_storage_details = async (req, res) => {
  const company_code = req.query.company_code;
  const plant_id = req.query.plant_id;
  const rack_type = req.query.rack_type;

  if (!(company_code && plant_id && rack_type)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }

  try {
    let secondary_storage_details = await secondary_storage_table.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          rack_type: rack_type,
        },
      },
      {
        $group: {
          _id: "$material_code",
          total_stock: { $sum: "$current_stock" },
          material_name: { $first: "$material_name" },
        },
      },
    ]);
    let status_message = secondary_storage_details.length
      ? "Listing the data!"
      : "Storage is empty!";

    return res.status(200).send({
      status_code: "200",
      status_message: status_message,
      data: secondary_storage_details,
    });
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

exports.list_secondary_discrete_storage_details = async (req, res) => {
  const company_code = req.query.company_code;
  const plant_id = req.query.plant_id;
  const rack_type = req.query.rack_type;

  if (!(company_code && plant_id && rack_type)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }

  try {
    let secondary_storage_details = await secondary_storage_table_new.aggregate(
      [
        {
          $match: {
            company_code: company_code,
            plant_id: plant_id,
            rack_type: rack_type,
          },
        },
        { $sort: { rack_id: 1, unit_no: 1, column_id: 1 } },
      ]
    );
    let status_message = secondary_storage_details.length
      ? "Listing the data!"
      : "Storage is empty!";

    return res.status(200).send({
      status_code: "200",
      status_message: status_message,
      data: secondary_storage_details,
    });
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

exports.update_secondary_discrete = async (req, res) => {
  console.log("update_secondary_discrete");
  let id = req.params.id;

  let brand = req.body.brand;
  let sub_brand = req.body.sub_brand;
  let material_code = req.body.material_code;
  let material_name = req.body.material_name;
  let uom = req.body.uom;
  let pack_weight = req.body.pack_weight;
  let qty_in_bin = req.body.qty_in_bin;
  const max_stock = req.body.max_stock;
  const total_stock = req.body.current_stock;
  let location_id = req.body.location_id;
  let plant_id = req.body.plant_id;
  let company_code = req.body.company_code;

  if (
    !(
      brand &&
      sub_brand &&
      material_code &&
      material_name &&
      uom &&
      pack_weight != null &&
      qty_in_bin != null &&
      total_stock != null &&
      max_stock != null &&
      location_id &&
      plant_id &&
      company_code
    )
  ) {
    return res.status(400).send({
      status_code: "400",
      status_message: "Missing Parameters!",
    });
  }

  if (total_stock > max_stock) {
    return res.status(400).send({
      status_code: "400",
      status_message: "current stock could not be greater than maximum stock",
    });
  }
  let allocated_stock = max_stock - total_stock;
  const session = await conn.startSession();
  let update_data = {
    brand: brand,
    sub_brand: sub_brand,
    material_code: material_code,
    material_name: material_name,
    uom: uom,
    pack_weight: pack_weight,
    qty_in_bin: qty_in_bin,
    max_stock: max_stock,
    current_stock: total_stock,
    fillable_stock: allocated_stock,
    location_id: location_id,
  };

  try {
    session.startTransaction();
    let old_data = await secondary_storage_table_new.findById({ _id: id });
    // res.send(old_data);
    if (!old_data) {
      return res.status(400).send({
        status_code: "400",
        status_message: "Invalid Id received!",
      });
    } else {
      if (old_data.location_id != location_id) {
        console.log("true");
        let new_rack_id = await rack_table.findOne({
          location_id: location_id,
          plant_id: plant_id,
          company_code: company_code,
        });
        if (!new_rack_id) {
          return res.status(400).send({
            status_code: "400",
            status_message: "Invalid Location Id!",
          });
        }
        update_data.unit_no = new_rack_id.unit_no;
        update_data.rack_id = new_rack_id.rack_id;
        update_data.level_id = new_rack_id.level_id;
        update_data.column_id = new_rack_id.column_id;
        var unit = new_rack_id.unit_no;
        var rack_id = new_rack_id.rack_id;
        if (unit == 1 || unit == 2 || unit == 3) {
          update_data.decision_scanner = "BS1";
          if (rack_id == "R15") {
            update_data.data_scanner = "BS2";
          } else if (rack_id == "R16") {
            update_data.data_scanner = "BS3";
          }
        } else if (unit == 4 || unit == 5 || unit == 6) {
          update_data.decision_scanner = "BS4";
          if (rack_id == "R15") {
            update_data.data_scanner = "BS5";
          } else if (rack_id == "R16") {
            update_data.data_scanner = "BS6";
          }
        } else if (unit == 7 || unit == 8 || unit == 9) {
          update_data.decision_scanner = "BS7";
          if (rack_id == "R15") {
            update_data.data_scanner = "BS8";
          } else if (rack_id == "R16") {
            update_data.data_scanner = "BS9";
          }
        }

        let secondary_storage = await secondary_storage_table_new.findOne({
          location_id: location_id,
          plant_id: plant_id,
          company_code: company_code,
        });
        if (secondary_storage) {
          await secondary_storage.deleteOne({ _id: secondary_storage._id });
        }
        let updated_rack_master_old = await rack_table.updateOne(
          {
            location_id: old_data.location_id,
            plant_id: plant_id,
            company_code: company_code,
          },
          { status: "unoccupied" },
          { useFindAndModify: false, new: true, session }
        );
        let updated_rack_master_new = await rack_table.updateOne(
          {
            location_id: location_id,
            plant_id: plant_id,
            company_code: company_code,
          },
          { status: "occupied" },
          { useFindAndModify: false, new: true, session }
        );
      }

      let options = {
        upsert: false,
        new: true,
        useFindAndModify: false,
        session,
      };
      console.log("update_data", update_data);

      let updated_data = await secondary_storage_table_new.findByIdAndUpdate(
        id,
        update_data,
        options
      );

      await session.commitTransaction();
      return res.status(200).send({
        status_code: "200",
        status_message: "Data Updated Successfully",
        data: updated_data,
      });
    }
  } catch (err) {
    console.log("err", err);
    await session.abortTransaction();
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

exports.delete_secondary_discrete = async (req, res) => {
  console.log("delete_secondary_discrete");
  let id = req.params.id;
  let location_id = req.body.location_id;
  let plant_id = req.body.plant_id;
  let company_code = req.body.company_code;

  if (!(location_id && plant_id && company_code)) {
    return res.status(400).send({
      status_code: "400",
      status_message: "Missing Parameters!",
    });
  }

  const session = await conn.startSession();

  try {
    session.startTransaction();
    let updated_data = await secondary_storage_table_new.findByIdAndRemove(id, {
      useFindAndModify: false,
      session,
    });

    let updated_rack_master = await rack_table.findOneAndUpdate(
      {
        location_id: location_id,
        plant_id: plant_id,
        company_code: company_code,
      },
      { status: "unoccupied" },
      { useFindAndModify: false, new: true, session }
    );

    await session.commitTransaction();

    return res.status(200).send({
      status_code: "200",
      status_message: "Data deleted Successfully",
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

exports.list_sku_brand = async (req, res) => {
  const company_code = req.query.company_code;
  const plant_id = req.query.plant_id;

  if (!(company_code && plant_id)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }

  try {
    let sku_data = await article_master_table.aggregate([
      { $match: { company_code: company_code, plant_id: plant_id } },
      { $group: { _id: "$brand" } },
      { $sort: { _id: 1 } },
    ]);
    let status_message = sku_data.length
      ? "Listing the Brands"
      : "Brands Not available";
    return res.status(200).send({
      status_code: "200",
      status_message: status_message,
      data: sku_data,
    });
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

exports.list_sku_sub_brand = async (req, res) => {
  const company_code = req.query.company_code;
  const plant_id = req.query.plant_id;
  const brand = req.query.brand;

  if (!(company_code && plant_id && brand)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }

  try {
    let sku_data = await article_master_table.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          brand: brand,
        },
      },
      { $group: { _id: "$sub_brand" } },
      { $sort: { _id: 1 } },
    ]);
    let status_message = sku_data.length
      ? "Listing the Sub_brands"
      : "Sub_brands Not available";
    return res.status(200).send({
      status_code: "200",
      status_message: status_message,
      data: sku_data,
    });
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

exports.list_sku_name = async (req, res) => {
  const company_code = req.query.company_code;
  const plant_id = req.query.plant_id;
  const brand = req.query.brand;
  const sub_brand = req.query.sub_brand;

  if (!(company_code && plant_id && brand && sub_brand)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }

  try {
    let sku_data = await article_master_table.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          brand: brand,
          sub_brand: sub_brand,
        },
      },
      { $sort: { material_name: 1 } },
      {
        $lookup: {
          from: "rapid_products_weight_tolerence",
          localField: "material_code",
          foreignField: "material_code",
          pipeline: [
            {
              $project: {
                _id: 0,
                material_code: 1,
                plant_id: 1,
                company_code: 1,
                pieces_per_bin: 1,
              },
            },
            {
              $match: {
                plant_id: plant_id,
                company_code: company_code,
              },
            },
            {
              $limit: 1,
            },
          ],
          as: "sku_tolerance",
        },
      },
      {
        $project: {
          _id: 0,
          material_name: 1,
          material_code: 1,
          uom: 1,
          max_stock: 1,
          qty_in_bin: "$sku_tolerance.pieces_per_bin",
        },
      },
    ]);
    let status_message = sku_data.length
      ? "Listing the sku_details"
      : "sku_details Not available";
    return res.status(200).send({
      status_code: "200",
      status_message: status_message,
      data: sku_data,
    });
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

exports.add_secondary_discrete = async (req, res) => {
  const company_code = req.body.company_code;
  const plant_id = req.body.plant_id;
  const brand = req.body.brand;
  const sub_brand = req.body.sub_brand;
  const material_name = req.body.material_name;
  const material_code = req.body.material_code;
  const uom = req.body.uom;
  const pack_weight = req.body.pack_weight;
  const qty_in_bin = req.body.qty_in_bin;
  const max_stock = req.body.max_stock;
  const total_stock = req.body.current_stock;
  const location_id = req.body.location_id;
  const username = req.body.username;

  if (
    !(
      company_code &&
      plant_id &&
      brand &&
      sub_brand &&
      material_name &&
      material_code &&
      uom &&
      pack_weight != null &&
      qty_in_bin != null &&
      total_stock != null &&
      max_stock != null &&
      location_id &&
      username
    )
  ) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }

  const session = await conn.startSession();
  if (total_stock > max_stock) {
    return res.status(400).send({
      status_code: "400",
      status_message: "current stock could not be greater than maximum stock",
    });
  }
  let allocated_stock = max_stock - total_stock;
  try {
    let rack_master_details = await rack_table.findOne({
      company_code: company_code,
      plant_id: plant_id,
      location_id: location_id,
      rack_type: "secondary_discrete",
    });
    // console.log("rack_master_details", rack_master_details);

    if (!rack_master_details) {
      return res.status(400).send({
        status_code: "400",
        status_message: "Please Enter valid location id",
      });
    } else if (rack_master_details.status == "unoccupied") {
      let secondary_storage_insert_data = {};
      secondary_storage_insert_data.material_code = material_code;
      secondary_storage_insert_data.material_name = material_name;
      secondary_storage_insert_data.uom = uom;
      secondary_storage_insert_data.status = "occupied";
      secondary_storage_insert_data.company_code = company_code;
      secondary_storage_insert_data.plant_id = plant_id;
      secondary_storage_insert_data.rack_type = rack_master_details.rack_type;
      secondary_storage_insert_data.unit_no = rack_master_details.unit_no;
      secondary_storage_insert_data.rack_id = rack_master_details.rack_id;
      secondary_storage_insert_data.level_id = rack_master_details.level_id;
      secondary_storage_insert_data.column_id = rack_master_details.column_id;
      secondary_storage_insert_data.location_id =
        rack_master_details.location_id;
      secondary_storage_insert_data.max_stock = max_stock;
      secondary_storage_insert_data.current_stock = total_stock;
      secondary_storage_insert_data.fillable_stock = allocated_stock;
      var unit = rack_master_details.unit_no;
      var rack_id = rack_master_details.rack_id;
      if (unit == 1 || unit == 2 || unit == 3) {
        secondary_storage_insert_data.decision_scanner = "BS1";
        if (rack_id == "R15") {
          secondary_storage_insert_data.data_scanner = "BS2";
        } else if (rack_id == "R16") {
          secondary_storage_insert_data.data_scanner = "BS3";
        }
      } else if (unit == 4 || unit == 5 || unit == 6) {
        secondary_storage_insert_data.decision_scanner = "BS4";
        if (rack_id == "R15") {
          secondary_storage_insert_data.data_scanner = "BS5";
        } else if (rack_id == "R16") {
          secondary_storage_insert_data.data_scanner = "BS6";
        }
      } else if (unit == 7 || unit == 8 || unit == 9) {
        secondary_storage_insert_data.decision_scanner = "BS7";
        if (rack_id == "R15") {
          secondary_storage_insert_data.data_scanner = "BS8";
        } else if (rack_id == "R16") {
          secondary_storage_insert_data.data_scanner = "BS9";
        }
      }
      // secondary_storage_insert_data.decision_scanner = "";
      // secondary_storage_insert_data.data_scanner = "";
      secondary_storage_insert_data.carrier_count = 3;
      secondary_storage_insert_data.brand = brand;
      secondary_storage_insert_data.sub_brand = sub_brand;
      secondary_storage_insert_data.pack_weight = pack_weight;
      secondary_storage_insert_data.qty_in_bin = qty_in_bin;
      secondary_storage_insert_data.created_by = username;
      secondary_storage_insert_data.updated_by = username;

      // console.log(
      //   "secondary_storage_insert_data",
      //   secondary_storage_insert_data
      // );

      session.startTransaction();

      const new_secondary_data = new secondary_storage_table_new(
        secondary_storage_insert_data
      );

      let inserted_secondary_data = await new_secondary_data.save({ session });
      let updated_rack_master = await rack_table.findByIdAndUpdate(
        { _id: rack_master_details._id },
        { status: "occupied" },
        { useFindAndModify: false, new: true, session }
      );
      await session.commitTransaction();
      return res.status(200).send({
        status_code: "200",
        status_message: "data added in secondary storage!",
        data: inserted_secondary_data,
      });
    } else {
      let update_data_obj = {};
      update_data_obj.brand = brand;
      update_data_obj.sub_brand = sub_brand;
      update_data_obj.material_name = material_name;
      update_data_obj.material_code = material_code;
      update_data_obj.uom = uom;
      update_data_obj.pack_weight = pack_weight;
      update_data_obj.qty_in_bin = qty_in_bin;
      update_data_obj.max_stock = max_stock;
      update_data_obj.current_stock = total_stock;
      update_data_obj.fillable_stock = allocated_stock;
      update_data_obj.updated_by = username;

      let updated_secondary_data =
        await secondary_storage_table_new.findOneAndUpdate(
          {
            plant_id: plant_id,
            company_code: company_code,
            location_id: location_id,
          },
          update_data_obj,
          { useFindAndModify: false, new: true }
        );
      return res.status(200).send({
        status_code: "200",
        status_message: "data updated in secondary storage!",
        data: updated_secondary_data,
      });
    }
  } catch (err) {
    await session.abortTransaction();
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

exports.pallet_movement = async (req, res) => {
  const company_code = req.body.company_code;
  const plant_id = req.body.plant_id;
  const pallet_id = req.body.pallet_id;
  const source_location_id = req.body.source_location_id;
  const destination_location_id = req.body.destination_location_id;
  const username = req.body.username;
  if (
    !(company_code && plant_id && pallet_id && source_location_id && username)
  ) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }
  const session = await conn.startSession();
  try {
    if (!destination_location_id) {
      let palletization_condition = {
        is_deleted: false,
        pallet_barcode_value: pallet_id,
        plant_id: plant_id,
        company_code: company_code,
        pallet_status: "Stacked",
      };
      let palletization_project = {
        pallet_barcode_value: 1,
        pallet_status: 1,
        item_code: 1,
        item_name: 1,
        uom: 1,
        carrier_count: 1,
        total_stock: { $sum: "$carrier_detail.gross_weight" },
      };
      let palletization_data = await palletization_table.findOne(
        palletization_condition,
        palletization_project
      );

      if (!palletization_data) {
        return res.status(400).send({
          status_code: "400",
          status_message: "Please scan the stacked pallet",
        });
      }

      let rack_condition = {
        active_status: 1,
        location_id: source_location_id,
        plant_id: plant_id,
        company_code: company_code,
      };
      let rack_project = {
        _id: 0,
        status: 1,
        rack_type: 1,
        unit_no: 1,
        rack_id: 1,
        level_id: 1,
        column_id: 1,
      };

      let destination_rack_data = await rack_table.findOne(
        rack_condition,
        rack_project
      );

      if (
        destination_rack_data ? destination_rack_data.status != "unoccupied" : 1
      ) {
        return res.status(400).send({
          status_code: "400",
          status_message: "Please provide unoccupied rack location",
        });
      }

      let pallet_master_status =
        destination_rack_data.rack_type == "primary"
          ? "Primary_storage"
          : destination_rack_data.rack_type == "secondary"
          ? "Secondary_storage"
          : 0;

      if (!pallet_master_status) {
        return res.status(400).send({
          status_code: "400",
          status_message: "rack_type is " + destination_rack_data.rack_type,
        });
      }

      session.startTransaction();

      if (pallet_master_status == "Primary_storage") {
        let insert_data = {};
        insert_data.rack_type = "primary";
        insert_data.status = "occupied";
        insert_data.company_code = company_code;
        insert_data.plant_id = plant_id;
        insert_data.unit_no = destination_rack_data.unit_no;
        insert_data.rack_id = destination_rack_data.rack_id;
        insert_data.level_id = destination_rack_data.level_id;
        insert_data.column_id = destination_rack_data.column_id;
        insert_data.location_id = source_location_id;
        insert_data.material_code = palletization_data.item_code;
        insert_data.material_name = palletization_data.item_name;
        insert_data.carrier_count = palletization_data.carrier_count;
        insert_data.total_stock = palletization_data.total_stock;
        insert_data.uom = palletization_data.uom;
        insert_data.pallet_barcode = pallet_id;
        // console.log(insert_data);
        const new_empty_pallet = new primary_storage_table(insert_data);
        await new_empty_pallet.save({ session });
      } else if (pallet_master_status == "Secondary_storage") {
        let insert_data = {};
        insert_data.rack_type = "secondary";
        insert_data.status = "occupied";
        insert_data.company_code = company_code;
        insert_data.plant_id = plant_id;
        insert_data.unit_no = destination_rack_data.unit_no;
        insert_data.rack_id = destination_rack_data.rack_id;
        insert_data.level_id = destination_rack_data.level_id;
        insert_data.column_id = destination_rack_data.column_id;
        insert_data.location_id = source_location_id;
        insert_data.material_code = palletization_data.item_code;
        insert_data.material_name = palletization_data.item_name;
        insert_data.carrier_count = palletization_data.carrier_count;
        insert_data.current_stock = palletization_data.total_stock;
        insert_data.uom = palletization_data.uom;
        insert_data.pallet_barcode = pallet_id;
        const new_empty_pallet = new secondary_storage_table(insert_data);
        await new_empty_pallet.save({ session });
      }

      await rack_table.updateOne(
        {
          location_id: source_location_id,
          plant_id: plant_id,
          company_code: company_code,
        },
        { $set: { status: "occupied", locked: true, locked_by: username } },
        { upsert: false, session }
      );

      await pallet_master_table.updateOne(
        {
          pallet_id: pallet_id,
          plant_id: plant_id,
          company_code: company_code,
        },
        { $set: { palletization_status: pallet_master_status } },
        { upsert: false, session }
      );

      await palletization_table.updateOne(
        { _id: palletization_data._id },
        {
          $set: {
            location_id: source_location_id,
            pallet_status: pallet_master_status,
          },
        },
        { upsert: false, session }
      );

      await session.commitTransaction();
      return res.status(200).send({
        status_code: "200",
        status_message: "Pallet Placed in the source location!",
      });
    } else {
      let palletization_condition = {
        is_deleted: false,
        pallet_barcode_value: pallet_id,
        plant_id: plant_id,
        company_code: company_code,
        location_id: source_location_id,
      };

      let palletization_project = {
        pallet_barcode_value: 1,
        pallet_status: 1,
        location_id: 1,
        item_code: 1,
        item_name: 1,
        uom: 1,
        carrier_count: 1,
        total_stock: { $sum: "$carrier_detail.gross_weight" },
      };

      let palletization_data = await palletization_table.findOne(
        palletization_condition,
        palletization_project
      );

      if (!palletization_data) {
        return res.status(400).send({
          status_code: "400",
          status_message: "Source location is not mapped to the pallet!",
        });
      }

      let rack_condition = {
        active_status: 1,
        location_id: destination_location_id,
        plant_id: plant_id,
        company_code: company_code,
      };
      let rack_project = {
        _id: 0,
        status: 1,
        rack_type: 1,
        unit_no: 1,
        rack_id: 1,
        level_id: 1,
        column_id: 1,
      };

      let destination_rack_data = await rack_table.findOne(
        rack_condition,
        rack_project
      );

      if (
        destination_rack_data ? destination_rack_data.status != "unoccupied" : 1
      ) {
        return res.status(400).send({
          status_code: "400",
          status_message: "Please provide unoccupied rack location",
        });
      }

      let pallet_master_status =
        destination_rack_data.rack_type == "primary"
          ? "Primary_storage"
          : destination_rack_data.rack_type == "secondary"
          ? "Secondary_storage"
          : 0;

      if (!pallet_master_status) {
        return res.status(400).send({
          status_code: "400",
          status_message: "rack_type is " + destination_rack_data.rack_type,
        });
      }

      session.startTransaction();

      // delete existing record from storage
      if (palletization_data.pallet_status == "Primary_storage") {
        await primary_storage_table.deleteOne(
          {
            pallet_barcode: pallet_id,
            plant_id: plant_id,
            company_code: company_code,
          },
          { session }
        );
      } else if (palletization_data.pallet_status == "Secondary_storage") {
        await secondary_storage_table.deleteOne(
          {
            rack_type: "secondary",
            pallet_barcode: pallet_id,
            plant_id: plant_id,
            company_code: company_code,
          },
          { session }
        );
      }

      if (pallet_master_status == "Primary_storage") {
        let insert_data = {};
        insert_data.rack_type = "primary";
        insert_data.status = "occupied";
        insert_data.company_code = company_code;
        insert_data.plant_id = plant_id;
        insert_data.unit_no = destination_rack_data.unit_no;
        insert_data.rack_id = destination_rack_data.rack_id;
        insert_data.level_id = destination_rack_data.level_id;
        insert_data.column_id = destination_rack_data.column_id;
        insert_data.location_id = destination_location_id;
        insert_data.material_code = palletization_data.item_code;
        insert_data.material_name = palletization_data.item_name;
        insert_data.carrier_count = palletization_data.carrier_count;
        insert_data.total_stock = palletization_data.total_stock;
        insert_data.uom = palletization_data.uom;
        insert_data.pallet_barcode = pallet_id;
        // console.log(insert_data);
        const new_empty_pallet = new primary_storage_table(insert_data);
        await new_empty_pallet.save({ session });
      } else if (pallet_master_status == "Secondary_storage") {
        let insert_data = {};
        insert_data.rack_type = "secondary";
        insert_data.status = "occupied";
        insert_data.company_code = company_code;
        insert_data.plant_id = plant_id;
        insert_data.unit_no = destination_rack_data.unit_no;
        insert_data.rack_id = destination_rack_data.rack_id;
        insert_data.level_id = destination_rack_data.level_id;
        insert_data.column_id = destination_rack_data.column_id;
        insert_data.location_id = destination_location_id;
        insert_data.material_code = palletization_data.item_code;
        insert_data.material_name = palletization_data.item_name;
        insert_data.carrier_count = palletization_data.carrier_count;
        insert_data.current_stock = palletization_data.total_stock;
        insert_data.uom = palletization_data.uom;
        insert_data.pallet_barcode = pallet_id;
        const new_empty_pallet = new secondary_storage_table(insert_data);
        await new_empty_pallet.save({ session });
      }

      await rack_table.updateOne(
        {
          location_id: source_location_id,
          plant_id: plant_id,
          company_code: company_code,
        },
        { $set: { status: "unoccupied", locked: false, locked_by: "" } },
        { upsert: false, session }
      );

      await rack_table.updateOne(
        {
          location_id: destination_location_id,
          plant_id: plant_id,
          company_code: company_code,
        },
        { $set: { status: "occupied", locked: true, locked_by: username } },
        { upsert: false, session }
      );

      await pallet_master_table.updateOne(
        {
          pallet_id: pallet_id,
          plant_id: plant_id,
          company_code: company_code,
        },
        { $set: { palletization_status: pallet_master_status } },
        { upsert: false, session }
      );

      await palletization_table.updateOne(
        { _id: palletization_data._id },
        {
          $set: {
            location_id: destination_location_id,
            pallet_status: pallet_master_status,
          },
        },
        { upsert: false, session }
      );

      await session.commitTransaction();
      return res.status(200).send({
        status_code: "200",
        status_message: "Pallet Moved Successfully!",
      });
    }
  } catch (err) {
    await session.abortTransaction();
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};

exports.unmapping_pallet = async (req, res) => {
  const company_code = req.body.company_code;
  const plant_id = req.body.plant_id;
  const pallet_id = req.body.pallet_id;
  const source_location_id = req.body.source_location_id;

  if (!(company_code && plant_id && pallet_id && source_location_id)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }
  const session = await conn.startSession();
  try {
    let palletization_condition = {
      is_deleted: false,
      pallet_barcode_value: pallet_id,
      location_id: source_location_id,
      plant_id: plant_id,
      company_code: company_code,
    };
    let palletization_project = {
      pallet_barcode_value: 1,
      pallet_status: 1,
      item_code: 1,
      item_name: 1,
      uom: 1,
      carrier_count: 1,
      total_stock: { $sum: "$carrier_detail.gross_weight" },
    };

    let palletization_data = await palletization_table.findOne(
      palletization_condition,
      palletization_project
    );

    if (!palletization_data)
      return res.status(400).send({
        status_code: "400",
        status_message:
          "Please verify whether the pallet id and location matches ",
      });

    session.startTransaction();

    // delete existing record from storage

    if (palletization_data.pallet_status == "Primary_storage") {
      await primary_storage_table.deleteOne(
        {
          pallet_barcode: pallet_id,
          plant_id: plant_id,
          company_code: company_code,
        },
        { session }
      );
    } else if (palletization_data.pallet_status == "Secondary_storage") {
      await secondary_storage_table.deleteOne(
        {
          rack_type: "secondary",
          pallet_barcode: pallet_id,
          plant_id: plant_id,
          company_code: company_code,
        },
        { session }
      );
    }

    await rack_table.updateOne(
      {
        location_id: source_location_id,
        plant_id: plant_id,
        company_code: company_code,
      },
      { $set: { status: "unoccupied", locked: false, locked_by: "" } },
      { upsert: false, session }
    );

    await pallet_master_table.updateOne(
      {
        pallet_id: pallet_id,
        plant_id: plant_id,
        company_code: company_code,
      },
      { $set: { palletization_status: "Stacked" } },
      { upsert: false, session }
    );

    await palletization_table.updateOne(
      { _id: palletization_data._id },
      {
        $set: {
          location_id: "",
          pallet_status: "Stacked",
        },
      },
      { upsert: false, session }
    );

    await session.commitTransaction();

    return res.status(200).send({
      status_code: "200",
      status_message: "Pallet & Rack unmapped successfully!",
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
