module.exports = (app) => {
  const controller = require("../../controllers/purchase_order/synch_po.controller");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  router.get("/synch", requireAuth, controller.synch_po_on_po_number);

  router.get("/synch_bulk", requireAuth, controller.synch_po_on_plant_id);

  app.use("/api/purchase_order", router);
};
