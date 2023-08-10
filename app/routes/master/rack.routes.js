module.exports = (app) => {
  const controller = require("../../controllers/master/rack.controller.js");

  let router = require("express").Router();

  const { requireAuth } = require("../../helpers/verifyJwtToken");

  router.put("/v1/update_rack_lock", requireAuth, controller.updateRackLock);

  router.put(
    "/v1/update_secondary_rack_lock",
    requireAuth,
    controller.updateSecondaryRackLock
  );

  router.post("/v1/create_rack_type", requireAuth, controller.createRackType);

  router.get("/v1/get_rack_type", requireAuth, controller.getRackType);

  router.delete(
    "/v1/delete_rack_type/:id",
    requireAuth,
    controller.deleteRackType
  );

  // Create a new Tutorial
  router.post("/create_rack_master", requireAuth, controller.create);

  // Retrieve all Tutorials
  router.get(
    "/get_all_rack_master_by_company_code",
    requireAuth,
    controller.findAll_by_companycode
  );

  router.get("/v1/get_all_rack_details", requireAuth, controller.findAll);

  // Retrieve a single Tutorial with id
  router.get("/get_rack_details/:id", requireAuth, controller.findOne);

  // Update a Tutorial with id
  router.put("/update_rack_details/:id", requireAuth, controller.update);

  // Delete a Tutorial with id
  router.delete("/v1/delete_rack_details/:id", requireAuth, controller.delete);

  // // Create a new Tutorial
  // router.delete("/", controller.deleteAll);
  //  // Retrieve all published Tutorials
  //  router.get("/published", controller.findAllPublished);

  router.post("/v1/rack_id_auto_generation", requireAuth, controller.addRacks); // rack auto generation
  router.post(
    "/v2/rack_id_auto_generation",
    requireAuth,
    controller.addRacksV2
  ); // rack auto generation discrete

  router.get(
    "/v1/get_starting_rack_id",
    requireAuth,
    controller.startingRackId
  );

  router.get("/v1/get_rack_units_list", requireAuth, controller.getUnitNo);

  app.use("/api/master/rack", router);
};
