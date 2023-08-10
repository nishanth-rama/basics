module.exports = (app) => {
  const dashboard_controller = require("../../controllers/dashboard/dashboardController.js");

  const dashboard_controller_week = require("../../controllers/dashboard/dashboardControllerWeek.js");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  router.get("/v2/get_quantity_sum", dashboard_controller.getQuantitySum_v2);

  router.get(
    "/get_quantity_sum",
    requireAuth,
    dashboard_controller.getQuantitySum
  );
  router.get(
    "/get_po_count",
    requireAuth,
    dashboard_controller.getPurchaseOrderCount
  );
  router.get(
    "/get_stopo_count",
    requireAuth,
    dashboard_controller.getStoPoCount
  );
  router.get(
    "/get_so_count",
    requireAuth,
    dashboard_controller.getSalesOrderCount
  );
  router.get(
    "/get_invoice_sto_count",
    requireAuth,
    dashboard_controller.getInvoiceStoCount
  );
  router.get(
    "/get_invoice_count",
    requireAuth,
    dashboard_controller.getInvoiceCount
  );

  router.get(
    "/v2/get_quantity_sum_for_week",
    requireAuth,
    dashboard_controller_week.getQuantitySum_v2_of_week
  );

  //get all the po_document_type from purchaseorders collection for the given delivery_date, supplying_plant, company_code
  router.get(
    "/get_po_document_type",
    requireAuth,
    dashboard_controller.getPoDocumentType
  );

  router.get(
    "/v1/get_summary_info",
    requireAuth,
    dashboard_controller.getDashboardInfo
  );

  router.get(
    "/v1/get_rack_graph_info",
    requireAuth,
    dashboard_controller.getRackGraphData
  );

  router.get(
    "/send_report/:company_code/:plant_id",
    requireAuth,
    dashboard_controller_week.send_dashboard_report
  );

  router.get(
    "/get_plant_detail",
    requireAuth,
    dashboard_controller_week.get_plant_detail
  );

  app.use("/api/dashboard", router);
};
