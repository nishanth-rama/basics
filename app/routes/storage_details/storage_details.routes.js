module.exports = (app) => {
  const storage_details_controller = require("../../controllers/storage_details/storage_details.controller.js");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  router.get(
    "/list_primary_storage_details",
    requireAuth,
    storage_details_controller.list_primary_storage_details
  );

  router.get(
    "/list_secondary_storage_details",
    requireAuth,
    storage_details_controller.list_secondary_storage_details
  );

  router.get(
    "/list_secondary_discrete_storage_details",
    requireAuth,
    storage_details_controller.list_secondary_discrete_storage_details
  );

  router.get(
    "/list_sku_brand",
    requireAuth,
    storage_details_controller.list_sku_brand
  );
  router.get(
    "/list_sku_sub_brand",
    requireAuth,
    storage_details_controller.list_sku_sub_brand
  );
  router.get(
    "/list_sku_name",
    requireAuth,
    storage_details_controller.list_sku_name
  );

  router.post(
    "/add_secondary_discrete",
    requireAuth,
    storage_details_controller.add_secondary_discrete
  );

  router.put(
    "/update_secondary_discrete/:id",
    requireAuth,
    storage_details_controller.update_secondary_discrete
  );

  router.delete(
    "/delete_secondary_discrete/:id",
    requireAuth,
    storage_details_controller.delete_secondary_discrete
  );

  router.put(
    "/pallet_movement/",
    requireAuth,
    storage_details_controller.pallet_movement
  );

  router.put(
    "/unmapping_pallet/",
    requireAuth,
    storage_details_controller.unmapping_pallet
  );

  app.use("/api/storage_details", router);
};
