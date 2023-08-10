module.exports = (app) => {
  const stoController = require("../../controllers/sto_sap_details/sto_sap_details.controller");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  router.get("/v1/get_by_dates", requireAuth, stoController.getStoSap);

  router.get("/v1/get_sto_list", requireAuth, stoController.get_sto_details);

  app.use("/api/sto_sap_details", router);
};
