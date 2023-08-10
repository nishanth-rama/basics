module.exports = (app) => {
  const mdc_report_controller = require("../../controllers/dashboard/mdc_report_controller.js");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  router.get(
    "/purchase_order",
    requireAuth,
    mdc_report_controller.purchase_order_report
  );

  router.get(
    "/sales_order",
    requireAuth,
    mdc_report_controller.sales_order_report
  );

  app.use("/api/mdc_report", router);
};
