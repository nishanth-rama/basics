module.exports = (app) => {
  var intervalController = require("../../controllers/interval_settings/interval_settings.controller");
  const { requireAuth } = require("../../helpers/verifyJwtToken");
  var router = require("express").Router();

  router.put("/update", requireAuth, intervalController.updateOrCreateNew);
  router.get("/get_by_code", requireAuth, intervalController.getSpecific);

  app.use("/api/interval_settings", router);
};
