module.exports = (app) => {
  const controller = require("../../controllers/master/rack_status.controller.js");

  let router = require("express").Router();

  const { requireAuth } = require("../../helpers/verifyJwtToken");

  router.get("/get_rack_status", requireAuth, controller.getRackStatus);

  app.use("/api/master/rack_status", router);
};
