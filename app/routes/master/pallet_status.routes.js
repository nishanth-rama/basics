module.exports = (app) => {
  const controller = require("../../controllers/master/pallet_status.controller.js");

  let router = require("express").Router();

  const { requireAuth } = require("../../helpers/verifyJwtToken");

  router.get("/get_pallet_status", requireAuth, controller.getPalletStatus);

  app.use("/api/master/pallet_status", router);
};
