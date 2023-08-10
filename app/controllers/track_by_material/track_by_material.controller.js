const db = require("../../models");
const primary_storage_table = db.primary_storage;
const secondary_storage_table = db.secondary_storage;

exports.list_all_materials = async (req, res) => {
  // res.send("list_all_materials");
  let company_code = req.query.company_code;
  let plant_id = req.query.plant_id;

  if (!(plant_id && company_code)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing Parameter!" });
  }
  try {
    let primary_storage = await primary_storage_table.aggregate([
      {
        $match: {
          plant_id: plant_id,
          company_code: company_code,
        },
      },
      {
        $lookup: {
          from: "rapid_palletization",
          localField: "pallet_barcode",
          foreignField: "pallet_barcode_value",
          as: "palletization",
        },
      },
      {
        $unwind: {
          path: "$palletization",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          "palletization.pallet_status": "Primary_storage",
          "palletization.is_deleted": false,
        },
      },
      {
        $project: {
          material_code: 1,
          material_name: 1,
          total_stock: 1,
          uom: 1,
          carrier_count: 1,
        },
      },
      {
        $group: {
          _id: "$material_code",
          material_code: { $first: "$material_code" },
          material_name: { $first: "$material_name" },
          uom: { $first: "$uom" },
          total_stock: { $sum: "$total_stock" },
          carrier_count: { $sum: "$carrier_count" },
        },
      },
      {
        $project: {
          _id: 0,
          material_code: 1,
          material_name: 1,
          total_stock: 1,
          uom: 1,
          carrier_count: 1,
        },
      },
    ]);

    let secondary_storage = await secondary_storage_table.aggregate([
      {
        $match: {
          plant_id: plant_id,
          company_code: company_code,
        },
      },
      {
        $project: {
          material_code: 1,
          material_name: 1,
          current_stock: 1,
          uom: 1,
          carrier_count: 1,
        },
      },
      {
        $group: {
          _id: "$material_code",
          material_code: { $first: "$material_code" },
          material_name: { $first: "$material_name" },
          uom: { $first: "$uom" },
          total_stock: { $sum: "$current_stock" },
          carrier_count: { $sum: "$carrier_count" },
        },
      },
      {
        $project: {
          _id: 0,
          material_code: 1,
          material_name: 1,
          total_stock: 1,
          uom: 1,
          carrier_count: 1,
        },
      },
    ]);

    let final_response = [];
    let material_code = [];

    primary_storage.forEach((element) => {
      // console.log(element);
      material_code.push(element.material_code);
      final_response.push(element);
    });

    //   console.log(material_code);
    secondary_storage.forEach((secondary_element) => {
      if (material_code.includes(secondary_element.material_code)) {
        final_response.forEach((primary_element) => {
          if (
            primary_element.material_code == secondary_element.material_code
          ) {
            // console.log("primary_element.material_code",primary_element.material_code);
            // console.log("secondary_element.material_code",secondary_element.material_code);
            primary_element.total_stock += secondary_element.total_stock;
          }
        });
      } else {
        final_response.push(secondary_element);
      }
    });
    let status_message;
    if (final_response.length) {
      status_message = "Material are available!";
      final_response.forEach((element) => {
        element.total_stock = +element.total_stock.toFixed(2);
        element.carrier_count = +element.carrier_count.toFixed(2);
      });
    } else {
      status_message = "Material are unavailable!";
    }

    return res.status(200).send({
      status_code: "200",
      status_message: status_message,
      data: final_response,
    });
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some Error Occurred While Creating The Customer.",
    });
  }
};

exports.list_particular_materials = async (req, res) => {
  let company_code = req.query.company_code;
  let plant_id = req.query.plant_id;
  let material_code = req.query.material_code;
  let rack_type = req.query.rack_type;

  if (!(plant_id && company_code && material_code && rack_type)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing Parameter!" });
  }
  try {
    if (rack_type == "primary") {
      let primary_storage = await primary_storage_table.aggregate([
        {
          $match: {
            plant_id: plant_id,
            company_code: company_code,
            material_code: material_code,
          },
        },
        {
          $sort: { rack_id: 1, level_id: 1 },
        },
        {
          $lookup: {
            from: "rapid_palletization",
            localField: "pallet_barcode",
            foreignField: "pallet_barcode_value",
            as: "palletization",
          },
        },
        {
          $unwind: {
            path: "$palletization",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: {
            "palletization.pallet_status": "Primary_storage",
            "palletization.is_deleted": false,
          },
        },
        {
          $project: {
            _id: 0,
            material_code: 1,
            material_name: 1,
            total_stock: 1,
            uom: 1,
            rack_id: 1,
            level_id: 1,
            column_id: 1,
            location_id: 1,
            pallet_barcode: 1,
            po_number: "$palletization.po_number",
            expiry_date: "$palletization.expiry_date",
            stacked_date: "$palletization.stacked_date",
          },
        },
      ]);

      return res.status(200).send({
        status_code: "200",
        status_message: "Listing the materials details",
        data: primary_storage,
      });
    } else if (rack_type == "secondary_discrete" || rack_type == "secondary") {
      let condition = {};
      condition.plant_id = plant_id;
      condition.company_code = company_code;
      condition.material_code = material_code;
      condition.rack_type = rack_type;
      let secondary_storage = await secondary_storage_table.aggregate([
        {
          $match: condition,
        },
        {
          $sort: { rack_id: 1, level_id: 1 },
        },
        {
          $project: {
            _id: 0,
            material_code: 1,
            material_name: 1,
            total_stock: "$current_stock",
            uom: 1,
            rack_id: 1,
            level_id: 1,
            column_id: 1,
            location_id: 1,
            pallet_barcode: 1,
          },
        },
      ]);

      return res.status(200).send({
        status_code: "200",
        status_message: "Listing the materials details",
        data: secondary_storage,
      });
    } else {
      return res.status(400).send({
        status_code: "400",
        status_message: "invalid rack type!",
      });
    }
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some Error Occurred While Creating The Customer.",
    });
  }
};

exports.list_rack_types_for_materials = async (req, res) => {
  let company_code = req.query.company_code;
  let plant_id = req.query.plant_id;
  let material_code = req.query.material_code;
  let final_rack_types = [];

  if (!(plant_id && company_code && material_code)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing Parameter!" });
  }
  try {
    let primary_storage = await primary_storage_table.aggregate([
      {
        $match: {
          plant_id: plant_id,
          company_code: company_code,
          material_code: material_code,
        },
      },
      {
        $group: { _id: "$rack_type", rack_type: { $first: "$rack_type" } },
      },
      {
        $project: {
          _id: 0,
          rack_type: 1,
        },
      },
    ]);

    if (primary_storage.length) {
      primary_storage.forEach((element) => {
        final_rack_types.push(element);
      });
    }
    let secondary_storage = await secondary_storage_table.aggregate([
      {
        $match: {
          plant_id: plant_id,
          company_code: company_code,
          material_code: material_code,
        },
      },
      {
        $group: { _id: "$rack_type", rack_type: { $first: "$rack_type" } },
      },
      {
        $project: {
          _id: 0,
          rack_type: 1,
        },
      },
    ]);

    if (secondary_storage.length) {
      secondary_storage.forEach((element) => {
        final_rack_types.push(element);
      });
    }
    return res.status(200).send({
      status_code: "200",
      status_message: "Listing the materials rack types",
      data: final_rack_types,
    });
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some Error Occurred While Creating The Customer.",
    });
  }
};
