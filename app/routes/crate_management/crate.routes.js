module.exports = (app) => {
  const crate_controller = require("../../controllers/crate_management/crate_management.controller.js");
  const { requireAuth } = require("../../helpers/verifyJwtToken");
  const controller = require("../../controllers/master/plant.controller");

  const router = require("express").Router();

  // router.post("/add_crates", crate_controller.add_crates_detail);
  router.post(
    "/create_bulk_crate",
    requireAuth,
    crate_controller.add_crates_bulk_list
  );

  router.put("/update_crate/:id", requireAuth, crate_controller.update_crate);
  router.delete(
    "/delete_crate/:id",
    requireAuth,
    crate_controller.delete_crate
  );
  router.get("/get_all", requireAuth, crate_controller.all_crates);
  router.get("/get_all_plant", requireAuth, controller.findAll);
  //existing plants in crate list
  router.get("/get_plants", requireAuth, crate_controller.get_plants);

  router.get("/get_crate_weight", requireAuth, crate_controller.crate_weight);
  router.get("/get_crate_barcode", requireAuth, crate_controller.crate_barcode);

  app.use("/api/crate_management", router);
};
