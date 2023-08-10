module.exports = (app) => {
  const sac_controller = require("../../controllers/sac/sac_report.controller");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  router.get("/get_sales_order", requireAuth, sac_controller.get_sac_so_report);

  router.get(
    "/get_purchase_order",
    requireAuth,
    sac_controller.get_sac_po_report
  );

  app.use("/api/sac", router);
};
