module.exports = (app) => {
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const mm_by_stacker_controller = require("../../controllers/material_movement/mm_by_stacker.js");
  const router = require("express").Router();

  router.get(
    "/list_outward_route_id",
    requireAuth,
    mm_by_stacker_controller.list_outward_route_id
  );
  router.get(
    "/list_outward_pallet",
    requireAuth,
    mm_by_stacker_controller.list_outward_pallet
  );

  app.use("/api/material_movement", router);
};
