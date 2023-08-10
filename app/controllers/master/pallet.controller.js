"use strict";

const { company, racks } = require("../../models");
const db = require("../../models");
const rack_statusRoutes = require("../../routes/master/rack_status.routes");
const pallets_detail_table = db.pallets;

// Create and Save
exports.create = async (req, res) => {
  console.log("calling pallet manual generation api");
  const {
    company_code,
    company_name,
    plant_id,
    plant_name,
    assert_type,
    prefix,
    suffix,
    created_by,
  } = req.body;

  if (
    !(
      company_code &&
      company_name &&
      plant_id &&
      plant_name &&
      assert_type &&
      created_by
    )
  )
    return res
      .status(400)
      .send({ message: "Please provide all the required parameters!" });
  try {
    const lastInsertPalletId = await pallets_detail_table
      .findOne(
        { company_code: company_code, plant_id: plant_id },
        { _id: 0, pallet_no: 1 }
      )
      .sort({ _id: -1 })
      .limit(1);

    let palletNo = 0;

    if (lastInsertPalletId != null) palletNo = +lastInsertPalletId.pallet_no;

    let pallet_id;

    ++palletNo;

    let p_no =
      palletNo.toString().length == 1
        ? `00${palletNo}`
        : palletNo.toString().length == 2
        ? `0${palletNo}`
        : palletNo;

    if (prefix != undefined && suffix != undefined)
      pallet_id = prefix + p_no + suffix;
    else if (prefix != undefined && suffix === undefined)
      pallet_id = prefix + p_no;
    else if (prefix == undefined && suffix != undefined)
      pallet_id = p_no + suffix;
    else pallet_id = p_no;

    let newPalletInfo = req.body;

    newPalletInfo.pallet_id = pallet_id;
    newPalletInfo.pallet_no = palletNo;
    newPalletInfo.mode = "Manual";

    // Create
    const pallets_manualgen_insertion = await pallets_detail_table.create(
      newPalletInfo
    );
    let mssge = "Pallet id manual generation successfull";

    if (pallets_manualgen_insertion == null)
      mssge = "Pallet id manual generation failed!";
    return res.send({
      message: mssge,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send({
      message:
        err.message || "Some error occurred while generating the pallet id",
    });
  }
};

// Retrieve all
exports.findAll = (req, res) => {
  console.log("Calling get all manual generated pallet details api");

  const { company_code, plant_id } = req.query;
  if (!(company_code && plant_id))
    return res.status(400).send({
      status_code: 400,
      message: "Provide company code and plant id to proceed!",
    });

  pallets_detail_table
    .find({ mode: "Manual", company_code: company_code, plant_id: plant_id })
    .sort({ _id: -1 })
    .then((data) => {
      let mssge = "Pallet id manual generated data is available";
      let status = 200;
      if (data.length == 0) {
        mssge = "Pallet id manual generated data is not available!";
        status = 404;
      }
      res.send({ status_code: status, message: mssge, data: data });
    })
    .catch((err) => {
      res.status(500).send({
        status_code: 500,
        message: err.message || "Some error occurred while retrieving pallet.",
      });
    });
};

// Find a single
exports.findOne = (req, res) => {
  const id = req.params.id;

  pallets_detail_table
    .findById(id)
    .then((data) => {
      if (!data)
        res.status(404).send({ message: "Not found pallet with id " + id });
      else res.send(data);
    })
    .catch((err) => {
      res
        .status(500)
        .send({ message: "Error retrieving pallet with id=" + id });
    });
};

// Find by company code and plant id
exports.get_all_pallet_by_company_code = (req, res) => {
  const { company_code } = req.query;

  if (!company_code) {
    return res.status(400).send({
      status_code: 400,
      message: "Company code is missing!",
    });
  }

  pallets_detail_table
    .find({ company_code: company_code, plant_id: plant_id })
    .then((data) => {
      if (data.length == 0) {
        return res.send({
          status_code: 404,
          message: "Pallet data not found!",
        });
      } else
        return res.send({
          status_code: 200,
          message: "Pallet data is available",
          data: data,
        });
    })
    .catch((err) => {
      res
        .status(500)
        .send({ status_code: 500, message: "Error retrieving pallet data!" });
    });
};

// Update
exports.update = (req, res) => {
  if (!req.body) {
    return res.status(400).send({
      message: "Data to update can not be empty!",
    });
  }

  const id = req.params.id;

  pallets_detail_table
    .findByIdAndUpdate(id, req.body, { useFindAndModify: false })
    .then((data) => {
      if (!data) {
        res.status(404).send({
          message: `Cannot update pallet with id=${id}. Maybe pallet was not found!`,
        });
      } else res.send({ message: "Pallet updated successfully." });
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error updating pallet with id=" + id,
      });
    });
};

exports.delete = (req, res) => {
  if (!req.body) {
    return res.status(400).send({
      message: "Data to update can not be empty!",
    });
  }

  const id = req.params.id;
  let success_msg = "";
  if (req.body.active_status == 1) {
    success_msg = "Activated successfully!";
  } else {
    success_msg = "Deactivated successfully!";
  }

  pallets_detail_table
    .findByIdAndUpdate(id, req.body, { useFindAndModify: false })
    .then((data) => {
      if (!data) {
        res.status(404).send({
          status_code: 500,
          message: `Cannot activate/deactivate pallet with id=${id}. Maybe pallet was not found!`,
        });
      } else {
        status_code: 500, res.send({ message: success_msg });
      }
    })
    .catch((err) => {
      res.status(500).send({
        status_code: 500,
        message: "Error activating/deactivating pallet with id=" + id,
      });
    });
};

exports.freePallet = async (req, res) => {
  console.log("calling free pallet api");

  const { company_code, plant_id, pallet_barcode, user } = req.query;
  try {
    if (!(company_code && plant_id && pallet_barcode && user))
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    const checkPallet = await pallets_detail_table.findOne(
      {
        company_code: company_code,
        plant_id: plant_id,
        pallet_id: pallet_barcode,
      },
      { _id: 0, palletization_status: 1 }
    );

    if (checkPallet == null)
      return res.send({
        status_code: 400,
        message: "Pallet not found or wrong pallet barcode!",
      });

    let status = 200;
    let mssge = "Pallet freed successfully";
    const palletStatus = checkPallet.palletization_status;

    if (palletStatus == "Unassigned") {
      //
      status = 400;
      mssge = "Already pallet is set free!";
    } else if (
      palletStatus == "Assigned" ||
      palletStatus == "Stacked" ||
      palletStatus == "Primary_storage" ||
      palletStatus == "Secondary_storage"
    ) {
      //
      let primaryLocations = [];
      let secondaryLocations = [];

      const filter1 = {
        company_code: company_code,
        plant_id: plant_id,
        pallet_barcode_value: pallet_barcode,
        is_deleted: false,
      };

      (await db.palletization.find(filter1)).map((id) => {
        if (id.pallet_status == "Primary_storage")
          primaryLocations.push(id.location_id);

        if (id.pallet_status == "Secondary_storage")
          secondaryLocations.push(id.location_id);
      });

      await db.palletization.updateMany(filter1, {
        $set: { is_deleted: true },
      });

      let pLocations = [];
      let sLocations = [];

      if (primaryLocations.length != 0) {
        const filter2 = {
          company_code: company_code,
          plant_id: plant_id,
          pallet_barcode: pallet_barcode,
          location_id: { $in: primaryLocations },
        };

        (await db.primary_storage.find(filter2)).map((id) => {
          pLocations.push(id.location_id);
        });

        await db.primary_storage.deleteMany(filter2);
      }

      if (secondaryLocations.length != 0) {
        const filter3 = {
          company_code: company_code,
          plant_id: plant_id,
          pallet_barcode: pallet_barcode,
          location_id: { $in: primaryLocations },
          rack_type: "secondary",
        };

        (await db.secondary_storage.find(filter3)).map((id) => {
          sLocations.push(id.location_id);
        });

        await db.secondary_storage.deleteMany(filter3);
      }

      const combinedLocations = pLocations.concat(sLocations);

      Promise.all([
        //freeing racks
        await db.racks.updateMany(
          {
            company_code: company_code,
            plant_id: plant_id,
            location_id: { $in: combinedLocations },
          },
          {
            $set: {
              status: "unoccupied",
              locked: false,
              locked_by: "",
              updated_by: user,
            },
          }
        ),

        // updating records deleted in palletizaion
        await db.palletization.updateMany(
          {
            company_code: company_code,
            plant_id: plant_id,
            pallet_barcode_value: pallet_barcode,
            is_deleted: false,
          },
          { $set: { is_deleted: true } }
        ),

        // only assigned pallets making to deleted
        await db.cumulativePalletization.updateMany(
          {
            company_code: company_code,
            plant_id: plant_id,
            pallet_barcode: pallet_barcode,
            palletization_status: "ASSIGNED",
            is_deleted: false,
          },
          { $set: { is_deleted: true, updated_by: user } }
        ),

        await pallets_detail_table.updateOne(
          {
            company_code: company_code,
            plant_id: plant_id,
            pallet_id: pallet_barcode,
          },
          {
            $set: {
              palletization_status: "Unassigned",
              updated_by: user,
            },
          }
        ),
      ]);
    } else if (palletStatus == "Dispatch_area") {
      // free dispatch rack and placed pallet in it

      const checkPalletPresent = await db.dispatch_storage.findOne({
        company_code: company_code,
        plant_id: plant_id,
        pallet_barcode: pallet_barcode,
      });

      if (checkPalletPresent != null) {
        //
        await db.dispatch_storage.deleteOne({
          company_code: company_code,
          plant_id: plant_id,
          pallet_barcode: pallet_barcode,
        });

        await db.racks.updateOne(
          {
            company_code: company_code,
            plant_id: plant_id,
            location_id: checkPalletPresent.location_id,
          },
          {
            $set: { locked: false, locked_by: "", status: "unoccupied" },
          }
        );

        await db.allocationPalletization.updateOne(
          {
            company_code: company_code,
            plant_id: plant_id,
            location_id: checkPalletPresent.location_id,
            is_deleted: false,
          },
          {
            $set: { is_deleted: true, updated_by: user },
          }
        );

        await pallets_detail_table.updateOne(
          {
            company_code: company_code,
            plant_id: plant_id,
            pallet_id: pallet_barcode,
          },

          {
            $set: { updated_by: user, palletization_status: "Unassigned" },
          }
        );
        //
      } else {
        status = 404;
        mssge = "Failed to free the pallet and the rack!";
      }
    } else {
      status = 422;
      mssge = "Failed to free pallet!";
    }

    res.send({ status_code: status, message: mssge });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while freeing pallet!",
    });
  }
};
