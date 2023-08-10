const _ = require("lodash");
const passport = require("passport");
require("../../helpers/passport");

const { requireAuth } = require("../../helpers/verifyJwtToken");

module.exports = (app) => {
  const wetDc_so_controller = require("../../controllers/allocation/wetDc_so_allocation.controller.js");

  const router = require("express").Router();

  router.get("/so_list", requireAuth, wetDc_so_controller.get_so_list);

  router.get("/get_lotting_loss_details", requireAuth, wetDc_so_controller.get_lotting_loss_details);

  router.get("/item_list", requireAuth, wetDc_so_controller.get_item_list);

  router.get(
    "/progress_bar_detail",
    requireAuth,
    wetDc_so_controller.get_progress_bar_detail
  );

  app.use("/api/wetDc_so_allocation", router);
};
