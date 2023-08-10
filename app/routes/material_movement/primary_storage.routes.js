module.exports = (app) => {
  const primary_storage = require("../../controllers/material_movement/primary_storage.controller.js");
  const { requireAuth } = require("../../helpers/verifyJwtToken");
  const router = require("express").Router();

  router.get(
    "/get_primary_storage_data",
    requireAuth,
    primary_storage.get_primary_storage_data
  );

  // router.post("/add_rack/primary_storage", primary_storage.add_empty_rack_to_primary_storage);

  router.post(
    "/get_first_empty_primary_rack",
    requireAuth,
    primary_storage.get_first_empty_rack
  );

  router.post(
    "/primary_storage/get_first_empty_rack",
    requireAuth,
    primary_storage.get_first_empty_rack
  );

  router.put(
    "/primary_storage/add_pallet",
    requireAuth,
    primary_storage.add_pallet_to_primary_storage
  );

  router.get(
    "/sales_order/get_total_quantity",
    requireAuth,
    primary_storage.get_total_quantity_of_material
  );

  router.get(
    "/primary_storage/v1/get_carrier_barcodes",
    requireAuth,
    primary_storage.getCarrierBarcodes
  );

  app.use("/api/material_movement", router);
};
