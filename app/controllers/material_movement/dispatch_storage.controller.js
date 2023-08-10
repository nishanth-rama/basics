"use strict";

const { respondSuccess } = require("../../helpers/response");
const db = require("../../models");
const allocation_generate = require("../../models/allocation_generate/allocation_generate");

const dispatchStorageColl = db.dispatch_storage;
const toleranceColl = db.product_weight_model;
const allocationPalletizationColl = db.allocationPalletization;

exports.materialWiseStock = async (req, res) => {
  console.log("calling get material wise stocks in dispatch storage api");
  const { company_code, plant_id, delivery_date, route_id } = req.query;
  try {
    if (!(company_code && plant_id && delivery_date && route_id))
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    const itemStocks = await dispatchStorageColl.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          route_id: route_id,
        },
      },
      {
        $unwind: "$items",
      },
      {
        $group: {
          _id: {
            material_code: "$items.material_code",
            material_name: "$items.material_name",
            uom: "$items.uom",
          },
          totalStock: { $sum: "$items.allocated_qty" },
          // totalCarrier: { $sum: "$items.total_carriers" },
        },
      },
      { $sort: { "_id.material_code": 1, "_id.uom": 1 } },
    ]);

    let finalStocks = [];

    for (let i = 0; i < itemStocks.length; i++) {
      if (i + 1 < itemStocks.length) {
        if (
          itemStocks[i]._id["material_code"] ==
            itemStocks[i + 1]._id["material_code"] &&
          itemStocks[i]._id["uom"] == "KG" &&
          itemStocks[i + 1]._id["uom"] == "PAC"
        ) {
          let tolerance = await toleranceColl.findOne({
            company_code: company_code,
            plant_id: plant_id,
            material_code: itemStocks[i]._id["material_code"],
          });

          finalStocks.push({
            material_code: itemStocks[i]._id["material_code"],
            material_name: itemStocks[i]._id["material_name"],
            total_stock: +(
              itemStocks[i].totalStock +
              itemStocks[i + 1].totalStock * tolerance.qty_in_kg
            ).toFixed(2),
            uom: itemStocks[i]._id["uom"],
          });

          i = i + 1;
        }
      } else if (itemStocks[i]._id["uom"] == "PAC") {
        let tolerance = await toleranceColl.findOne({
          company_code: company_code,
          plant_id: plant_id,
          material_code: itemStocks[i]._id["material_code"],
        });

        finalStocks.push({
          material_code: itemStocks[i]._id["material_code"],
          material_name: itemStocks[i]._id["material_name"],
          total_stock:
            tolerance.pieces_per_bin == 0
              ? +(itemStocks[i].totalStock * tolerance.qty_in_kg).toFixed(2)
              : +itemStocks[i].totalStock.toFixed(2),
          uom: tolerance.pieces_per_bin == 0 ? "KG" : itemStocks[i]._id["uom"],
        });
      } else {
        finalStocks.push({
          material_code: itemStocks[i]._id["material_code"],
          material_name: itemStocks[i]._id["material_name"],
          total_stock: +itemStocks[i].totalStock.toFixed(2),
          uom: itemStocks[i]._id["uom"],
        });
      }
    }

    let status = 200;
    let mssge = "Material wise stocks details available";

    if (finalStocks.length == 0) {
      status = 404;
      mssge = "No material present in dispatch storage!";
    }

    return res
      .status(status)
      .send({ status_code: status, message: mssge, data: finalStocks });
  } catch (err) {
    console.log(err);
    return res.send({
      status_code: 500,
      message:
        "Some error occurred while extracting material wise stocks from dispatch storage!",
    });
  }
};

exports.materialBasedRacks = async (req, res) => {
  console.log("calling material based rack locations api");
  const { company_code, plant_id, delivery_date, route_id, material_code } =
    req.query;
  try {
    if (
      !(company_code && plant_id && material_code && delivery_date && route_id)
    )
      return res
        .status(400)
        .send({ status_code: 400, message: "Provide required parameters!" });

    const tolerance = await toleranceColl.findOne({
      company_code: company_code,
      plant_id: plant_id,
      material_code: material_code,
    });

    const getLocations = (
      await dispatchStorageColl.find(
        {
          company_code: company_code,
          plant_id: plant_id,
          delivery_date: delivery_date,
          route_id: route_id,
          "items.material_code": material_code,
        },
        {
          _id: 0,
          pallet_barcode: 1,
          location_id: 1,
          "items.$": 1,
        }
      )
    ).map((info) => {
      let totalStock = 0;

      info.items.map((stock) => {
        if (stock.uom == "PAC") {
          if (tolerance.pieces_per_bin == 0)
            totalStock += stock.allocated_qty * tolerance.qty_in_kg;
          else totalStock += stock.allocated_qty;
        } else totalStock += stock.allocated_qty;
      });

      return {
        pallet_barcode: info.pallet_barcode,
        location_id: info.location_id,
        total_stock: totalStock,
        uom: tolerance.pieces_per_bin == 0 ? "KG" : info.items[0].uom,
      };
    });

    let status = 200;
    let mssge = "Material based location list is available";

    if (getLocations.length == 0) {
      status = 404;
      mssge = "material based location list not found!";
    }

    return res
      .status(status)
      .send({ status_code: status, message: mssge, data: getLocations });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message:
        "Some error occurred while extracting material based rack locations!",
    });
  }
};

exports.getMaterialBarcodes = async (req, res) => {
  console.log("calling get dispatch storage pallet barcodes api");
  const { company_code, plant_id, location_id, pallet_barcode, material_code } =
    req.query;

  try {
    if (
      !(
        company_code &&
        plant_id &&
        location_id &&
        pallet_barcode &&
        material_code
      )
    )
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });
    const getBarcodes = await allocationPalletizationColl.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          pallet_barcode: pallet_barcode,
          location_id: location_id,
          is_deleted: false,
        },
      },
      { $unwind: "$items" },
      { $match: { "items.material_code": material_code } },
      {
        $project: {
          _id: 0,
          "items.carriers": 1,
        },
      },
    ]);

    let carrierBarcodes = [];
    let status = 200;
    let mssge = "Carrier barcode list is available";

    if (getBarcodes.length == 0) {
      status = 404;
      mssge = "Carrier barcode list not found!";
    } else {
      carrierBarcodes = getBarcodes[0].items.carriers.map((code) => {
        return { carrier_barcode: code.carrier_barcode };
      });
    }

    return res
      .status(status)
      .send({ status_code: status, messge: mssge, data: carrierBarcodes });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting material barcodes!",
    });
  }
};
