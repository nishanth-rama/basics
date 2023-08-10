module.exports = (app) => {
  const controller = require("../../controllers/master/plant.controller.js");

  let router = require("express").Router();

  const { requireAuth } = require("../../helpers/verifyJwtToken");

  router.post("/create_plant", requireAuth, controller.create);

  router.get("/get_all_plant", requireAuth, controller.findAll);

  router.get(
    "/get_all_plant_by_company_code",
    controller.get_all_plant_by_company_code
  );

  router.get("/get_plant_by_id/:id", requireAuth, controller.findOne);

  router.put("/update_plant/:id", requireAuth, controller.update);

  router.delete("/delete_plant/:id", requireAuth, controller.delete);

  app.use("/api/master/plant", router);
};
