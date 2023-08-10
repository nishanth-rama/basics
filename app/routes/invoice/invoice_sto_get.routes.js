module.exports = (app) => {
  const controller = require("../../controllers/invoice_sto_get/invoice_sto_get.controller");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  router.get("/v1/get_all_invoiceSto", requireAuth, controller.findAll);

  router.get("/v1/get_invoiceSto/:invoice_no", requireAuth, controller.findOne);

  // router.get("/v1/last_inserted_entry",controller.findLastEntry);

  // router.put("/v1/new_process_entry", controller.createOne);

  app.use("/api/invoiceStoGet", router);
};
