module.exports = (app) => {
  const controller = require("../../controllers/fill_rate/fill_rates.controller");
  const { requireAuth } = require("../../helpers/verifyJwtToken");
  const router = require("express").Router();

  router.get("/v1/getAllByDate", controller.findAllFillRate);
  app.use("/api/fill_rates", router);
};
