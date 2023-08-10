const { soAllocation } = require("../../models");
const db = require("../../models");

const product_weight = db.product_weight_model;

// Add product weight tolerence data
exports.add_product_weight_tolerence = async (req, res) => {
  if (
    !(
      req.body.company_code &&
      req.body.plant_id &&
      req.body.material_code &&
      req.body.material_description &&
      req.body.uom &&
      req.body.brand_name &&
      req.body.qty_in_kg &&
      req.body.qty_in_pack &&
      req.body.min_weight &&
      req.body.max_weight &&
      req.body.pallet_capacity &&
      req.body.entry_by &&
      req.body.updated_by &&
      req.body.layer_count &&
      req.body.pieces_per_pack
    )
  ) {
    return res.status(400).send({
      status_code: "400",
      message: "Please fill all required fields !",
    });
  }
  let data_exist = await product_weight.findOne({
    plant_id: req.body.plant_id,
    company_code: req.body.company_code,
    material_code: req.body.material_code,
  });
  if (data_exist) {
    return res
      .status(400)
      .send({ status_code: "400", message: "sku already inserted" });
  }

  var dt = new Date();
  //let sd1 = dt.setHours( dt.getHours() + 5 );
  let sd1 = dt.setMinutes(dt.getMinutes() + 30);
  let sd2 = dt.setHours(dt.getHours() + 5);
  const postdata = new product_weight({
    company_code: req.body.company_code,
    company_name: req.body.company_name,
    plant_id: req.body.plant_id,
    material_code: req.body.material_code,
    material_description: req.body.material_description,
    uom: req.body.uom,
    brand_name: req.body.brand_name,
    qty_in_kg: req.body.qty_in_kg,
    qty_in_pack: req.body.qty_in_pack,
    min_weight: req.body.min_weight,
    max_weight: req.body.max_weight,
    pack_min_weight: req.body.pack_min_weight,
    pack_max_weight: req.body.pack_max_weight,
    pallet_capacity: req.body.pallet_capacity,
    layer_count: req.body.layer_count,
    entry_by: req.body.entry_by,
    updated_by: req.body.updated_by,
    entry_time: new Date(sd2),
    pieces_per_bin: req.body.pieces_per_bin,
    pieces_per_pack: req.body.pieces_per_pack
  });
  console.log(sd2);
  console.log(new Date(sd2));
  // Save product in the database
  postdata
    .save()
    .then((data) => {
      res.status(200).send({
        status_code: "200",
        message: "product weight tolerence added successfully",
        data,
      });
    })
    .catch((err) => {
      res.status(500).send({
        status_code: "500",
        message: "Some error occurred while adding product.",
      });
    });
};

// Find a single product with a Id
exports.get_product_weight_tolerence = (req, res) => {
  product_weight
    .findById(req.params.noteId)
    .then((data) => {
      if (!data) {
        return res.status(404).send({
          status_code: "400",
          message: "product data doesn't match with id !",
        });
      }
      res.send({
        status_code: "200",
        message: "Successfully find product weight tolerence",
        data,
      });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(400).send({
          status_code: "400",
          message: "product data doesn't match with id !",
        });
      }

      return res.status(500).send({
        status_code: "500",
        message: "Some error occurred while adding product.",
      });
    });
};

exports.getall_product_weight_tolerence = (req, res) => {
  const { company_code, plant_id } = req.query;

  if (!(company_code && plant_id))
    return res.status(400).send({
      status_code: 400,
      message: "Please provide company code and plant id to proceed!",
    });

  product_weight
    .find({ company_code: company_code, plant_id: plant_id })
    .then((data) => {
      let resMessage = "SKU tolerence data is available";
      let status = 200;
      if (data.length === 0) {
        status = 404;
        resMessage = "SKU tolerence data is not available!";
      }
      return res.send({
        status_code: status,
        message: resMessage,
        data: data,
      });
    })
    .catch((err) => {
      console.error("Data not found due to " + err.message);
      res.status(400).send({
        status_code: "400",
        message:
          err.message ||
          "Some error occurred while retrieving weight tolerance data.",
      });
    });
};

// Update product weight tolerence
exports.update_product_weight_tolerence = (req, res) => {
  if (
    !(
      req.body.company_code ||
      req.body.material_code ||
      req.body.plant_id ||
      req.body.material_description ||
      req.body.uom ||
      req.body.brand_name ||
      req.body.qty_in_kg ||
      req.body.qty_in_pack ||
      req.body.min_weight ||
      req.body.max_weight ||
      req.body.pallet_capacity ||
      req.body.entry_by ||
      req.body.layer_count ||
      req.body.pieces_per_pack
    )
  ) {
    return res
      .status(400)
      .send({ status_code: "400", message: "missing data what you update !" });
  }

  const id = req.params.noteId;

  product_weight
    .findByIdAndUpdate(id, req.body, { useFindAndModify: false })
    .then((data) => {
      res
        .status(200)
        .send({ status_code: "200", message: "product update successfully" });
    })
    .catch((err) => {
      res
        .status(400)
        .send({ status_code: "400", message: "product id doesn't exist !" });
    });
};

// Delete product weight tolerence
exports.delete_product_weight_tolerence = (req, res) => {
  const id = req.params.noteId;

  product_weight
    .findByIdAndRemove(id, { useFindAndModify: false })
    .then((data) => {
      if (!data) {
        res.status(404).send({
          status_code: "400",
          message: `Cannot delete, product doesn't found !`,
        });
      } else {
        res.send({
          status_code: "200",
          message: "product deleted successfully!",
        });
      }
    })
    .catch((err) => {
      res.status(400).send({
        status_code: "400",
        message: "Cannot delete, product doesn't found !",
      });
    });
};

const checkItemCodesAvailable = async (filter, materials) => {
  let getCodes = materials;

  let checkAvailable = (
    await product_weight.find(filter, { _id: 0, material_code: 1 })
  ).map((code) => {
    return code.material_code;
  });

  for (let i = 0; i < getCodes.length; i++) {
    for (let j = 0; j < checkAvailable.length; j++) {
      if (getCodes[i] == checkAvailable[j]) {
        getCodes.splice(i, 1);
        i = i - 1;
      }
    }
  }

  return getCodes;
};

exports.verifyDetails = async (req, res) => {
  console.log("calling verify tolerance data api");
  const { company_code, plant_id, delivery_date, route_id, material_code } =
    req.query;
  try {
    if (
      !(company_code && plant_id && material_code) &&
      !(company_code && plant_id && delivery_date && route_id)
    )
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    if (company_code && plant_id && material_code) {
      const checkItemCodeAvailable = await product_weight.findOne({
        company_code: company_code,
        plant_id: plant_id,
        material_code: material_code,
      });

      if (checkItemCodeAvailable == null) {
        return res.send({
          status_code: 404,
          message:
            "Weight tolerance details is not available for the material code : " +
            material_code,
        });
      }

      const pieces_per_bin = await product_weight.findOne({
        company_code: company_code,
        plant_id: plant_id,
        material_code: material_code,
        pieces_per_bin: { $exists: true },
      });

      if (pieces_per_bin == null)
        return res.send({
          status_code: 404,
          message:
            "Please add 'pieces_per_bin' field in weight tolerance details. Then, continue.,",
        });

      if (pieces_per_bin.uom == "KG" && pieces_per_bin.pieces_per_bin != 0)
        return res.send({
          status_code: 501,
          message:
            "If order arrives in KG, 'pieces_per_bin' field  should be 'ZERO' in weight tolerance details",
        });

      if (pieces_per_bin.uom == "PAC" && pieces_per_bin.pieces_per_bin <= 0)
        return res.send({
          status_code: 501,
          message:
            "If order arrives in PAC, 'pieces_per_bin' field  should be greater than 'ZERO' in weight tolerance details",
        });

      if (pieces_per_bin.uom == "KG" && pieces_per_bin.qty_in_pack != 1)
        return res.send({
          status_code: 501,
          message:
            "If order arrives in KG, 'qty_in_pack' field  should be 'ONE' in weight tolerance details",
        });
    } else {
      let materialCodes = (
        await db.soAllocation.aggregate([
          {
            $match: {
              company_code: company_code,
              plant_id: plant_id,
              delivery_date: delivery_date,
              route_id: route_id,
            },
          },
          { $group: { _id: "$material_no" } },

          { $sort: { "_id.material_code": 1 } },
        ])
      ).map((code) => {
        return code._id;
      });

      const checkItemsCodesAvailable = await checkItemCodesAvailable(
        {
          company_code: company_code,
          plant_id: plant_id,
          material_code: { $in: materialCodes },
        },
        materialCodes
      );

      if (checkItemsCodesAvailable.length > 0) {
        return res.send({
          status_code: 404,
          message:
            "Weight tolerance data is not available for the following material codes  : " +
            checkItemsCodesAvailable,
        });
      }

      const pieces_per_bin = await product_weight.find({
        company_code: company_code,
        plant_id: plant_id,
        material_code: { $in: materialCodes },
        pieces_per_bin: { $exists: true },
      });

      for (let i = 0; i < materialCodes.length; i++) {
        for (let j = 0; j < pieces_per_bin.length; j++) {
          if (materialCodes[i] == pieces_per_bin[j].material_code) {
            materialCodes.splice(i, 1);
            i = i - 1;
          }
        }
      }

      if (materialCodes.length > 0) {
        return res.send({
          status_code: 404,
          message:
            "Please add 'pieces_per_bin' field in weight tolerance details for the following material codes : " +
            materialCodes,
        });
      } else {
        let wrongCodes1 = [];
        let wrongCodes2 = [];
        let wrongCodes3 = [];

        pieces_per_bin.map((code) => {
          if (code.uom == "KG" && code.pieces_per_bin != 0)
            wrongCodes1.push(code.material_code);

          if (code.uom == "KG" && code.qty_in_pack != 1)
            wrongCodes2.push(code.material_code);

          if (code.uom == "PAC" && code.pieces_per_bin <= 0)
            wrongCodes3.push(code.material_code);
        });

        if (wrongCodes1.length != 0)
          return res.send({
            status_code: 501,
            message:
              "If order arrives in KG, 'pieces_per_bin' field  should be 'ZERO' in weight tolerance details for the following material codes : " +
              wrongCodes1,
          });

        if (wrongCodes3.length != 0)
          return res.send({
            status_code: 501,
            message:
              "If order arrives in PAC, 'pieces_per_bin' field  should be greater than 'ZERO' in weight tolerance details for the following material codes : " +
              wrongCodes3,
          });

        if (wrongCodes2.length != 0)
          return res.send({
            status_code: 501,
            message:
              "If order arrives in KG, 'qty_in_pack' field  should be 'ONE' in weight tolerance details for the following material codes : " +
              wrongCodes2,
          });
      }
    }

    return res.send({
      status_code: 200,
      message: "Tolerance data is fine. Hence, you could proceed",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while validating weight tolerance details!",
    });
  }
};
