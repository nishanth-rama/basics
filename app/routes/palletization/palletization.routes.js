module.exports = (app) => {
  const palletization_controller = require("../../controllers/palletization/palletization.controller");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  router.post(
    "/add_empty_pallet",
    requireAuth,
    palletization_controller.add_empty_pallet
  );

  // router.put(
  //   "/add_carrier_to_pallet",
  //   palletization_controller.add_carrier_to_pallet
  // );

  router.put(
    "/update_pallet_stacked",
    requireAuth,
    palletization_controller.update_pallet_stacked
  );
  router.put(
    "/update_pallet_stacked_manual",
    requireAuth,
    palletization_controller.update_pallet_stacked_manual
  ); // manual inward

  router.put(
    "/update_pallet_stacked_manual_clone",
    requireAuth,
    palletization_controller.update_pallet_stacked_manual_clone
  );
  router.put(
    "/v2/update_pallet_stacked_po",
    requireAuth,
    palletization_controller.update_pallet_stacked_v2
  ); // multiple articles for ITC

  router.get(
    "/list_all_pallets_stacked",
    requireAuth,
    palletization_controller.list_all_pallets_stacked
  );

  router.get(
    "/v2/list_all_pallets_stacked_po",
    requireAuth,
    palletization_controller.list_all_pallets_stacked_v2
  ); // Multiple articles for ITC

  router.get(
    "/v1/get_stacked_pallet_details",
    requireAuth,
    palletization_controller.stackedPalletDetails
  );

  router.get(
    "/v1/get_stacked_pallet_details_clone",
    requireAuth,
    palletization_controller.stackedPalletDetailsClone
  ); // KG pallet location testing

  router.get(
    "/v2/get_stacked_pallet_details_po",
    requireAuth,
    palletization_controller.stackedPalletDetails_po
  ); // Multiple articles for ITC

  router.get(
    "/get_pallet_details",
    requireAuth,
    palletization_controller.get_pallet_details
  );
  //  router.get(
  //   "/get_pallet_details_by_pallet_id",palletization_controller.get_pallet_details_by_pallet_id
  //  );

  //  router.get(
  //   "/get_pallet_details_by_locationId",palletization_controller.get_pallet_details_by_locationId
  //  );
  router.get(
    "/get_palletization_details",
    requireAuth,
    palletization_controller.get_palletization_details
  );
  router.post(
    "/v2/add_empty_pallet_po",
    requireAuth,
    palletization_controller.add_empty_pallet_po
  ); // multiple articles

  app.use("/api/palletization", router);
};
