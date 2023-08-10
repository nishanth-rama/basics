module.exports = (app) => {
  const secondary_storage = require("../../controllers/material_movement/secondary_storage.controller.js");
  const discrete_storage = require("../../controllers/material_movement/secondary_discrete_storage.js");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  router.get(
    "/get_secondary_storage_data",
    requireAuth,
    secondary_storage.get_secondary_storage_data
  );

  // get_rack_id_for_secondary_storage
  // on salesorder basis

  router.post(
    "/secondary_storage/get_first_empty_rack",
    requireAuth,
    secondary_storage.get_rack_id_for_secondary_storage
  );

  router.post(
    "/secondary_storage/add_pallet",
    requireAuth,
    secondary_storage.add_pallet_to_secondary_storage
  );

  // on requirement n

  router.get(
    "/secondary_discrete/v1/get_racks_stock_list",
    requireAuth,
    secondary_storage.getRackItemDetails
  );

  app.use("/api/material_movement", router);
};
