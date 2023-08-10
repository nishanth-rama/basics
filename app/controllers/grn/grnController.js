"use strict";

const db = require("../../models");

const grn = db.grn;

exports.getGrnDetails = async (req, res) => {
  console.log("get grn details");
  try {
    const { delivery_date, plant_id } = req.query;

    if (!(delivery_date && plant_id))
      return res
        .status(400)
        .send({ message: "Please provide delivery date and plant id" });

    const grnDetails = await grn.aggregate([
      {
        $lookup: {
          from: "rapid_grn_items",
          localField: "id",
          foreignField: "grn_id",
          as: "grn_items",
        },
      },
      {
        $match: {
          document_date: delivery_date,
          "grn_items.plant": plant_id,
        },
      },
    ]);

    res.json({ message: "Grn details", data: grnDetails });
  } catch (err) {
    return res
      .status(500)
      .json({ msg: "Some error occurred while collecting grn details" });
  }
};

exports.getSpecificDetails = async (req, res) => {
  console.log("get particular grn details");

  try {
    const { document_no, plant_id } = req.query;

    if (!(document_no && plant_id))
      return res
        .status(400)
        .send({ message: "Please provide plant id and document number" });

    const specificGrnDetails = await grn.aggregate([
      {
        $lookup: {
          from: "rapid_grn_items",
          localField: "id",
          foreignField: "grn_id",
          pipeline:[
            {
              $match :{
                plant:plant_id
              }
            }
          ],
          as: "grn_items",
        },
      },
      {
        $match: {
          material_document_no: document_no,
        },
      },
    ]);

    const plantDetails = await db.plants.findOne({ plant_id: plant_id });

    let mssge = "Grn details is available";
    let data = {
      specificGrnDetails: specificGrnDetails[0],
      plantDetails: plantDetails,
    };
    if (specificGrnDetails.length == 0) {
      mssge = "Grn details is not available!";
      data = {
        specificGrnDetails: {},
        plantDetails: {},
      };
    }

    res.json({
      message: mssge,
      data: data,
    });
  } catch {
    return res.status(500).send({
      message: "Some error occurred while collecting particular grn details",
    });
  }
};

exports.uploadGRNreceipt = (req, res) => {
  try {
    if (!req.file)
      return res.status(400).send({
        status_code: 400,
        // message: "Please provide invoice receipt image",
         message: "Please upload invoice copy to create GRN",
      });

    res.send({
      status_code: 200,
      message: "Successfully uploaded GRN receipt to azure storage",
      data: { uploadedImageURL: req.file.url },
    });
  } catch (err) {
    console.log(err);
    res.status(500).send({
      status_code: 500,
      message:
        "Some error occurred while uplaoding invoice receipt to azure storage!",
    });
  }
};
