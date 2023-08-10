module.exports = (app) => {
  const wet_dc_controller = require("../../controllers/dashboard/wetDcDashboardController.js");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  // po doc type on date range
  router.get(
    "/get_po_type",
    requireAuth,
    wet_dc_controller.get_poType_onDateRange
  );

  // dashboard report api
  router.get(
    "/get_report",
    requireAuth,
    wet_dc_controller.home_dashboard_report
  );

  // get pom detail
  router.get("/get_po_detail", requireAuth, wet_dc_controller.get_po_detail);

  // get purcahse order list
  router.get(
    "/get_po_list",
    // requireAuth,
    wet_dc_controller.get_purchase_order_list
  );

  // get item wise view on po click
  router.get(
    "/get_poItem_detail",
    requireAuth,
    wet_dc_controller.get_po_item_detail
  );

  // // inward po detail filter api
  //1. get inward po type on delivery date
  router.get(
    "/get_inward_PoType",
    requireAuth,
    wet_dc_controller.get_inward_PoType_on_DeliveryDate
  );

  // 2. get vendor name on inward po delivery date and and po type
  router.get(
    "/get_inward_vendorName",
    requireAuth,
    wet_dc_controller.get_inward_vendorName
  );

  // 3. get po number on dd,po type and vendor name
  router.get(
    "/get_inward_poNumber",
    requireAuth,
    wet_dc_controller.get_inward_poNumber
  );

  //4.get asn number on dd,po type vendor name and po number
  router.get(
    "/get_inward_asnNumber",
    requireAuth,
    wet_dc_controller.get_inward_asnNumber
  );

  // inward detail api
  router.get(
    "/get_inward_poDetail",
    requireAuth,
    wet_dc_controller.get_inward_po_detail
  );

  // inward po item wise detail
  router.get(
    "/get_inward_poItem_detail",
    // requireAuth,
    wet_dc_controller.get_inward_po_item_detail
  );

  router.get(
    "/v1/get_inward_poItem_detail",
    // requireAuth,
    wet_dc_controller.get_inward_po_item_detail_v1
  );

  // get inward crate log detail for inward po item
  router.get(
    "/get_inward_crateLog_detail",
    requireAuth,
    wet_dc_controller.get_inward_crate_log_detail
  );

  // STOPO APIs
  router.get(
    "/autoInward_po_type",
    requireAuth,
    wet_dc_controller.get_autoInward_po_type
  );
  
  router.get(
    "/autoInward_vendor_list",
    requireAuth,
    wet_dc_controller.get_autoInward_vendor_name
  );


  // router.get(
  //   "/autoInward_po_list",
  //   requireAuth,
  //   wet_dc_controller.get_autoInward_po_list
  // );

  router.get(
    "/autoInward_po_itemDetail",
    requireAuth,
    wet_dc_controller.get_autoInward_po_itemDetail
  );

  app.use("/api/wetDc_dashboard", router);
};
