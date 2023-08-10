module.exports = (app) => {
  const controller = require("../../controllers/sales_order/synch_so.controller");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  var router = require("express").Router();

  router.get("/synch_bulk", requireAuth, controller.synch_so_on_plant_id);

  app.use("/api/sales_order", router);
};
