const cc_cratesModel = require("../../models/wetDc_crate_details/wetDc_crates.model");

const { requireAuth } = require("../../helpers/verifyJwtToken");

module.exports = (app) => {
  const crate_controler = require("../../controllers/wetDc_crate_details/wetDc_crates.controller");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  router.post("/add_crates", crate_controler.add_crates_detail);

  router.get("/get_crate", requireAuth, crate_controler.get_crates_detail);

  app.use("/api/cc_crate", router);
};
