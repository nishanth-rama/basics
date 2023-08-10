module.exports = (app) => {
  const controller = require("../../controllers/inward_process/inward_process.controller");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  router.get("/v1/get_all_inward_process", requireAuth, controller.findAll);

  router.get(
    "/v1/get_crate_details/:id",
    requireAuth,
    controller.getCrateDetails
  );

  router.get("/v1/last_inserted_entry", requireAuth, controller.findLastEntry); // not been used anywhere

  router.post("/v1/save_inward_process", requireAuth, controller.createOne);
  //manual inward
  router.post(
    "/v1/save_inward_process_manual",
    requireAuth,
    controller.createOne_manual
  );

  router.post("/v2/save_inward_process", requireAuth, controller.createOne_v2); //ASN

  router.post(
    "/v2/save_inward_process_clone",
    requireAuth,
    controller.createOne_v2_clone
  ); //ASN

  router.get("/v1/get_item_details", requireAuth, controller.getItemDetails);

  router.get("/v2/get_item_details", requireAuth, controller.itemDetails_v2); //ASN

  // marge the item details function
  router.get(
    "/v1/get_item_details_clone",
    requireAuth,
    controller.getItemDetails_clone
  );

  router.get(
    "/v1/get_carrier_count_per_pallet",
    requireAuth,
    controller.getCarrierCountPerPallet
  );
  router.get(
    "/v2/get_carrier_count_per_pallet_po",
    requireAuth,
    controller.getCarrierCountPerPallet_po
  ); // multiple articles for ITC

  router.get("/v1/supplier_list", requireAuth, controller.findSuppliers);

  router.get(
    "/v1/inward_grn_details",
    requireAuth,
    controller.findDetailsByFilter
  );

  router.get(
    "/v2/inward_grn_details",
    requireAuth,
    controller.findDetailsByFilterV2
  );

  router.get("/v1/po_detail", requireAuth, controller.findByPO);

  router.get("/v2/po_detail", requireAuth, controller.findByPOAsn);

  router.put("/v1/grn_creation", requireAuth, controller.grnCreation);

  router.put("/v2/grn_creation", requireAuth, controller.grnCreationV2);

  router.get(
    "/v1/get_conveyor_command",
    requireAuth,
    controller.getConveyorCommand
  );

  router.post(
    "/v1/add_conveyor_command",
    requireAuth,
    controller.addConveyorCommand
  );

  //testing conveyor command
  router.get(
    "/v1/get_testing_conveyor_command",
    requireAuth,
    controller.getTestConveyorCommand
  );

  router.get(
    "/v1/get_inward_details",
    requireAuth,
    controller.getInwardDetails
  );

  router.get(
    "/v2/get_inward_details",
    requireAuth,
    controller.getInwardDetails_v2
  );

  router.get(
    "/v1/getInwardDetailsById/:id",
    requireAuth,
    controller.getInwardDetailsById
  );

  router.get(
    "/v1/get_inward_dashboard_details",
    requireAuth,
    controller.getInwardDashboardInfo
  );

  app.use("/api/inwardprocess", router);
};
