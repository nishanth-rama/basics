module.exports = (app) => {
  const router = require("express").Router();
  const wet_inward_controller = require("../../controllers/inward_process/wet_inward_process.controller");

  const { requireAuth } = require("../../helpers/verifyJwtToken");

  router.post(
    "/insert_direct_scan_inwarded_crates",
    requireAuth,
    wet_inward_controller.insert_direct_scan_inwarded_crates
  );

  router.post(
    "/v2/insert_direct_scan_inwarded_crates",
    requireAuth,
    wet_inward_controller.insert_direct_scan_inwarded_crates_v2
  );

  router.post(
    "/v3/insert_direct_scan_inwarded_crates",
    requireAuth,
    wet_inward_controller.insert_direct_scan_inwarded_crates_v3
  );

  router.post(
    "/v4/insert_direct_scan_inwarded_crates",
    requireAuth,
    wet_inward_controller.insert_direct_scan_inwarded_crates_v4
  );

  router.post(
    "/v5/insert_auto_inwarded_crates",
    requireAuth,
    wet_inward_controller.insert_auto_inwarded_crates_v5
  );


  router.post(
    "/v6/insert_auto_inwarded_crates",
    requireAuth,
    wet_inward_controller.insert_auto_inwarded_crates_v6
  );

  router.post(
    "/insert_auto_inwarded_crates",
    requireAuth,
    wet_inward_controller.insert_auto_inwarded_crates
  );

  router.post(
    "/v2/insert_auto_inwarded_crates",
    requireAuth,
    wet_inward_controller.insert_auto_inwarded_crates_v2
  );

  router.post(
    "/v3/insert_auto_inwarded_crates",
    requireAuth,
    wet_inward_controller.insert_auto_inwarded_crates_v3
  );

  router.post(
    "/v4/insert_vendor_inwarded_crates",
    requireAuth,
    wet_inward_controller.insert_vendor_inwarded_crates_v4
  );

  router.get(
    "/v1/real_time_inward_details",
    requireAuth,
    wet_inward_controller.realTimeInwardedDetails
  );

  router.get(
    "/v2/real_time_auto_inward_details",
    requireAuth,
    wet_inward_controller.real_time_auto_inward_details
  );

  // router.get(
  //   "/v2/real_time_vendor_inward_details",
  //   requireAuth,
  //   wet_inward_controller.real_time_vendor_inward_details
  // );

  router.get(
    "/v3/real_time_vendor_inward_details",
    requireAuth,
    wet_inward_controller.real_time_vendor_inward_details_v2
  );

  router.get(
    "/v2/real_time_vendor_inward_details",
    requireAuth,
    wet_inward_controller.real_time_vendor_inward_details_v3
  );

  router.get(
    "/v1/manual_inward/item_details",
    requireAuth,
    wet_inward_controller.itemDetailsForManual
  );

  router.get(
    "/v1/item_details",
    requireAuth,
    wet_inward_controller.itemDetails
  );

  router.get(
    "/v2/item_details",
    requireAuth,
    wet_inward_controller.itemDetailsV2
  );

  router.get(
    "/v1/get_item_list",
    requireAuth,
    wet_inward_controller.get_item_list
  );

  router.get(
    "/v1/get_vendor_list",
    requireAuth,
    wet_inward_controller.get_vendor_list
  );

  router.get(
    "/v1/get_po_number_list",
    requireAuth,
    wet_inward_controller.get_po_number_list
  );

  router.post(
    "/v1/save_manual_inward_process",
    requireAuth,
    wet_inward_controller.saveManualInwardV1 // not completed
  );

  // router.post(
  //   "/v2/save_manual_vendor_inward_process",
  //   requireAuth,
  //   wet_inward_controller.save_manual_vendor_inward_process_v2 // not completed
  // );

  router.post(
    "/v2/save_manual_vendor_inward_process",
    requireAuth,
    wet_inward_controller.save_manual_vendor_inward_process_v3 // inward new po
  );

  router.post(
    "/v2/save_manual_auto_inward_process",
    requireAuth,
    wet_inward_controller.saveManualInwardV2 // not completed
  );

  router.get("/v1/po_no_list", requireAuth, wet_inward_controller.getPoNoList);

  //wdc auto inward new screen real time inward sto listing
  router.get("/v2/sto_no_list", requireAuth, wet_inward_controller.sto_no_list);
  //router.get("/v2/po_asn_list", requireAuth, wet_inward_controller.po_asn_list);
  router.get("/v3/po_asn_list", requireAuth, wet_inward_controller.po_asn_list_v2);
  router.get("/v2/po_asn_list", requireAuth, wet_inward_controller.po_asn_list_v3);


  router.get(
    "/v1/po_type_list",
    requireAuth,
    wet_inward_controller.getPoTypeList
  );

  router.put(
    "/v1/grn_creation",
    requireAuth,
    wet_inward_controller.grnCreation
  );
  router.put(
    "/v2/grn_creation",
    requireAuth,
    wet_inward_controller.grnCreationMultiplePo
  );
  router.put(
    "/v3/grn_creation",
    requireAuth,
    wet_inward_controller.grnCreationV3
  );

  router.put(
    "/v4/grn_creation",
    requireAuth,
    wet_inward_controller.grnCreationV4
  );

  router.put(
    "/v5/grn_creation",
    requireAuth,
    wet_inward_controller.grnCreationV5
  );

  router.put(
    "/v1/manual_grn_sync",
    requireAuth,
    wet_inward_controller.manual_grn_sync
  );

  router.put(
    "/v1/insert_article_conversion_factor",
    requireAuth,
    wet_inward_controller.insert_article_conversion_factor
  );
  router.put(
    "/v2/insert_article_conversion_factor",
    requireAuth,
    wet_inward_controller.insert_article_conversion_factor_v2
  );

  router.put(
    "/v1/sync_rapid_wdc_item_masters",
    requireAuth,
    wet_inward_controller.sync_rapid_wdc_item_masters
  );

  app.use("/api/wetinwardprocess", router);
};
