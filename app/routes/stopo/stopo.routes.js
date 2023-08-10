module.exports = (app) => {
  const controller = require("../../controllers/stopo/stopo.controller");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  router.get("/v1/get_all_order_details", requireAuth, controller.findAll); // get all stopo details

  router.get("/v1/get_item_list/:id", requireAuth, controller.stopoItemDetails);

  router.post("/v1/sto_creation", requireAuth, controller.stoCreate);

  router.get("/v1/get_document_type", requireAuth, controller.getDocumentType);

  app.use("/api/stopo", router);
};
