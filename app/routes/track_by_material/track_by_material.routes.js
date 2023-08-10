module.exports = (app) => {
  const track_by_material_controller = require("../../controllers/track_by_material/track_by_material.controller.js");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  router.get(
    "/list_all_materials",
    requireAuth,
    track_by_material_controller.list_all_materials
  );

  router.get(
    "/list_particular_materials",
    requireAuth,
    track_by_material_controller.list_particular_materials
  );

  router.get(
    "/list_rack_types_for_materials",
    requireAuth,
    track_by_material_controller.list_rack_types_for_materials
  );

  app.use("/api/track_by_material", router);
};
