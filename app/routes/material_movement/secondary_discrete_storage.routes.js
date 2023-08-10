module.exports = (app) => {
  const discrete_storage = require("../../controllers/material_movement/secondary_discrete_storage.js");
  const { requireAuth } = require("../../helpers/verifyJwtToken");
  const router = require("express").Router();

  // router.get(
  //   "/get_secondary_storage_data",
  //   secondary_storage.get_secondary_storage_data
  // );

  // // get_rack_id_for_secondary_storage
  //  // on salesorder basis

  // router.post(
  //   "/secondary_storage/get_first_empty_rack",
  //   secondary_storage.get_rack_id_for_secondary_storage
  // );

  // router.post(
  //   "/secondary_storage/add_pallet",
  //   secondary_storage.add_pallet_to_secondary_storage
  // );

  // // on requirement n

  // router.get(
  //   "/secondary_discrete/v1/get_racks_stock_list",
  //   secondary_storage.getRackItemDetails
  // );

  router.get(
    "/secondary_discrete/get_rack_allocation",
    requireAuth,
    discrete_storage.get_rack_for_discrete_material
  );

  router.post(
    "/secondary_discrete/add_material",
    requireAuth,
    discrete_storage.add_material_to_secondary_discrete_storage
  );

  app.use("/api/material_movement", router);
};
