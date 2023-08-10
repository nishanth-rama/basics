module.exports = (app) => {
  const crate_counter = require("../../controllers/crate_counter/crate_counter.controller");

  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  router.post("/add_crate_counter", crate_counter.add_crate_counter);
  router.put("/add_count", crate_counter.add_count);

  app.use("/api/crate_counter", router);
};
