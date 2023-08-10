module.exports = (app) => {
  const pallet_autogen_controller = require("../../controllers/master/pallet_autogeneration.controller.js");

  let router = require("express").Router();

  const { requireAuth } = require("../../helpers/verifyJwtToken");

  router.post(
    "/create_pallet_autogeneration",
    requireAuth,
    pallet_autogen_controller.create
  );

  router.get(
    "/get_all_pallet_autogeneration",
    requireAuth,
    pallet_autogen_controller.findAll
  );

  router.get(
    "/get_all_pallet_autogeneration_by_company_code",
    requireAuth,
    pallet_autogen_controller.get_all_pallet_autogeneration_by_company_code
  );

  router.get(
    "/get_pallet_autogeneration_by_id/:id",
    requireAuth,
    pallet_autogen_controller.findOne
  );

  router.put(
    "/update_pallet_autogeneration/:id",
    requireAuth,
    pallet_autogen_controller.update
  );

  // router.delete("/delete_pallet_autogeneration/:id", pallet_autogen_controller.delete);

  router.get(
    "/get_pallet_id",
    requireAuth,
    pallet_autogen_controller.getLastInsertedId
  );

  app.use("/api/master/pallet_autogeneration", router);
};
