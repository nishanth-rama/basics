const db = require("../../models");
const pallets_autogen_table = db.pallets;

// Create and Save
exports.create = async (req, res) => {
  console.log("calling pallet auto generation api");
  const {
    company_code,
    company_name,
    plant_id,
    plant_name,
    assert_type,
    prefix,
    suffix,
    number_of_id,
    created_by,
  } = req.body;
  try {
    // Validate request
    if (
      !(
        company_code &&
        company_name &&
        plant_id &&
        plant_name &&
        assert_type &&
        number_of_id &&
        created_by
      )
    )
      return res.status(400).send({ message: "Missing parameter!" });

    let lastInsertPalletId = await pallets_autogen_table
      .findOne(
        { company_code: company_code, plant_id: plant_id },
        { _id: 0, pallet_no: 1 }
      )
      .sort({ _id: -1 })
      .limit(1);

    let palletInfoArr = [];
    let palletNo = 0;

    if (lastInsertPalletId != null) palletNo = +lastInsertPalletId.pallet_no;

    for (let i = 0; i < +number_of_id; i++) {
      let pallet_id;

      ++palletNo;
      // added 0000
      let p_no =
        palletNo.toString().length == 1
          ? `000${palletNo}`
          : palletNo.toString().length == 2
          ? `00${palletNo}`
          : palletNo.toString().length == 3
          ? `0${palletNo}`
          : palletNo;

      if (prefix != undefined && suffix != undefined)
        pallet_id = prefix + p_no + suffix;
      else if (prefix != undefined) pallet_id = prefix + p_no;
      else if (suffix != undefined) pallet_id = p_no + suffix;
      else pallet_id = p_no;

      palletInfoArr.push({
        company_code: company_code,
        company_name: company_name,
        plant_id: plant_id,
        plant_name: plant_name,
        assert_type: assert_type,
        pallet_id: pallet_id,
        pallet_no: palletNo,
        prefix: prefix,
        suffix: suffix,
        created_by: created_by,
        mode: "Auto",
      });
    }

    // Create
    const pallets_autogen_insertion = await pallets_autogen_table.create(
      palletInfoArr
    );

    let mssge = "Pallet id auto generation successfull";
    if (pallets_autogen_insertion.length == 0)
      mssge = "Pallet id auto generation failed!";
    return res.send({
      status_code: 200,
      message: mssge,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while generating the pallet id",
    });
  }
};

// Retrieve all
exports.findAll = (req, res) => {
  console.log("Calling get all auto generated pallet details api");

  const { company_code, plant_id } = req.query;

  if (!(company_code && plant_id))
    return res.status(400).send({
      status_code: 400,
      message: "Please provide company code and plant id to proceed!",
    });

  pallets_autogen_table
    .find({ mode: "Auto", company_code: company_code, plant_id: plant_id })
    .sort({ _id: -1 })
    .then((data) => {
      let mssge = "Pallet id auto generated data is available";
      let status = 200;
      if (data.length == 0) {
        mssge = "Pallet id auto generated data is not available!";
        status = 404;
      }
      res.send({ status_code: status, message: mssge, data: data });
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving pallet data!",
      });
    });
};

// Find a single
exports.findOne = (req, res) => {
  const id = req.params.id;

  pallets_autogen_table
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

// Retrieve by company code and plant id
exports.get_all_pallet_autogeneration_by_company_code = (req, res) => {
  const { company_code } = req.query;

  if (!company_code) {
    return res.status(400).send({
      status_code: "400",
      message: "Company code is missing!",
    });
  }

  pallets_autogen_table
    .find({ company_code: company_code })
    .sort({ _id: -1 })
    .then((data) => {
      if (data.length == 0) {
        return res.send({
          status_code: 404,
          message: " Pallet data not found!",
        });
      } else
        res.send({
          status_code: 200,
          message: "Pallet autogeneration data is available",
          data,
        });
    })
    .catch((err) => {
      res
        .status(500)
        .send({ status_code: 500, message: "Error retrieving pallet data" });
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

  pallets_autogen_table
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
  if (req.body.active_status == 1) success_msg = "Activated successfully!";
  else success_msg = "Deactivated successfully!";

  pallets_autogen_table
    .findByIdAndUpdate(id, req.body, { useFindAndModify: false })
    .then((data) => {
      if (!data) {
        res.status(404).send({
          message: `Cannot delete pallet with id=${id}. Maybe pallet was not found!`,
        });
      } else res.send({ message: success_msg });
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error deleting pallet with id=" + id,
      });
    });
};

exports.getLastInsertedId = async (req, res) => {
  console.log("calling get pallet id api");
  const { company_code, plant_id } = req.query;

  try {
    if (!(company_code && plant_id))
      return res
        .status(400)
        .send({ message: "Provide company code and plant id" });

    const getLastedInsertedId = await pallets_autogen_table
      .findOne(
        { company_code: company_code, plant_id: plant_id },
        { _id: 0, pallet_no: 1 }
      )
      .sort({ _id: -1 })
      .limit(1);

    let palletId = "0001";

    if (getLastedInsertedId != null) {
      palletId = ++getLastedInsertedId.pallet_no;
      // const count = 9;
      // const palletId = 1+count;

      if (palletId.toString().length == 1) {
        return res.send({
          message: "Pallet id is available",
          pallet_id: "000" + palletId,
        });
      } else if (palletId.toString().length == 2) {
        return res.send({
          message: "Pallet id is available",
          pallet_id: "00" + palletId,
        });
      } else if (palletId.toString().length == 3) {
        return res.send({
          message: "Pallet id is available",
          pallet_id: "0" + palletId,
        });
      } else {
        return res.send({
          message: "Pallet id is available",
          pallet_id: palletId,
        });
      }
    }
  } catch (err) {
    console.log(err);

    return res.status(500).send({
      message: "Some error occurred while extracting pallet id",
    });
  }
};
