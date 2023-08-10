const db = require("../../models");
const rack_master_table = db.racks;
const primary_storage_table = db.primary_storage;
const secondary_storage_table = db.secondary_storage;

exports.list_rack_information = async (req, res) => {
  let company_code = req.query.company_code;
  let plant_id = req.query.plant_id;
  let rack_type = req.query.rack_type;
  let rack_id = req.query.rack_id;
  let occupied_rack_array = [];

  if (!(plant_id && company_code && rack_id && rack_type)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing Parameter!" });
  }

  try {
    let rack_details_unoccupied = await rack_master_table.aggregate([
      {
        $match: {
          rack_id: rack_id,
          plant_id: plant_id,
          company_code: company_code,
          status: "unoccupied",
        },
      },
      {
        $project: {
          locked: 1,
          active_status: 1,
          status: 1,
          _id: 0,
          location_id: 1,
          unit_no: 1,
          level_id: 1,
          column_id: 1,
        },
      },
    ]);

    if (rack_type == "dispatch") {
      var rack_details_occupied = await rack_master_table.aggregate([
        {
          $match: {
            rack_id: rack_id,
            plant_id: plant_id,
            company_code: company_code,
            status: "occupied",
          },
        },
        {
          $project: {
            locked: 1,
            active_status: 1,
            status: 1,
            _id: 0,
            location_id: 1,
            unit_no: 1,
            level_id: 1,
            column_id: 1,
          },
        },
      ]);
    } else if (rack_type == "primary") {
      var rack_details_occupied = await rack_master_table.aggregate([
        {
          $match: {
            rack_id: rack_id,
            plant_id: plant_id,
            company_code: company_code,
            status: "occupied",
          },
        },
        {
          $project: {
            locked: 1,
            active_status: 1,
            status: 1,
            _id: 0,
            location_id: 1,
            unit_no: 1,
            level_id: 1,
            column_id: 1,
          },
        },
      ]);

      rack_details_occupied.forEach((element) => {
        occupied_rack_array.push(element.location_id);
      });

      //   console.log(occupied_rack_array);
      let primary_storage = await primary_storage_table.aggregate([
        {
          $match: {
            plant_id: plant_id,
            company_code: company_code,
            location_id: { $in: occupied_rack_array },
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
            // "palletization.pallet_status": "Primary_storage",
            "palletization.is_deleted": false,
          },
        },
        {
          $project: {
            material_code: 1,
            material_name: 1,
            total_stock: 1,
            pallet_barcode: 1,
            location_id: 1,
            po_number: "$palletization.po_number",
            expiry_date: "$palletization.expiry_date",
            stacked_date: "$palletization.stacked_date",
          },
        },
      ]);

      //   res.send(primary_storage);
      rack_details_occupied.forEach((element) => {
        primary_storage.forEach((primary_data) => {
          if (primary_data.location_id == element.location_id) {
            element.pallet_barcode = primary_data.pallet_barcode;
            element.total_stock = primary_data.total_stock;
            element.material_code = primary_data.material_code;
            element.material_name = primary_data.material_name;
            element.po_number = primary_data.po_number || "";
            element.stacked_date = primary_data.stacked_date || "";
            element.expiry_date = primary_data.expiry_date || "";
          }
        });
      });

      // console.log(rack_details_occupied);
    } else {
      var rack_details_occupied = await rack_master_table.aggregate([
        {
          $match: {
            rack_id: rack_id,
            plant_id: plant_id,
            company_code: company_code,
            status: "occupied",
          },
        },
        {
          $project: {
            locked: 1,
            active_status: 1,
            status: 1,
            _id: 0,
            location_id: 1,
            unit_no: 1,
            level_id: 1,
            column_id: 1,
          },
        },
      ]);

      rack_details_occupied.forEach((element) => {
        occupied_rack_array.push(element.location_id);
      });

      //   console.log(occupied_rack_array);
      let secondary_storage = await secondary_storage_table.aggregate([
        {
          $match: {
            plant_id: plant_id,
            company_code: company_code,
            location_id: { $in: occupied_rack_array },
          },
        },
      ]);

      // console.log(secondary_storage);

      rack_details_occupied.forEach((element) => {
        secondary_storage.forEach((secondary_data) => {
          if (secondary_data.location_id == element.location_id) {
            element.pallet_barcode = secondary_data.pallet_barcode;
            element.total_stock = secondary_data.current_stock;
            element.material_code = secondary_data.material_code;
            element.material_name = secondary_data.material_name;
          }
        });
      });

      // console.log(rack_details_occupied);
    }

    final_response = [];
    rack_details_unoccupied.forEach((element) => {
      final_response.push(element);
    });
    rack_details_occupied.forEach((element) => {
      final_response.push(element);
    });

    if (!final_response.length) {
      return res.status(200).send({
        status_code: "200",
        status_message: "Rack details are empty!",
        data: final_response,
      });
    }

    final_response.sort(
      (a, b) => a.unit_no - b.unit_no || a.column_id.localeCompare(b.column_id)
    );
    return res.status(200).send({
      status_code: "200",
      status_message: "Listing the Rack details",
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
