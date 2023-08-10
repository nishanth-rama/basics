module.exports = (app) => {
  const pallet_controller = require("../../controllers/master/pallet.controller.js");

  let router = require("express").Router();

  const { requireAuth } = require("../../helpers/verifyJwtToken");

  router.post("/create_pallet_id", requireAuth, pallet_controller.create);

  router.get("/get_all_pallet", requireAuth, pallet_controller.findAll);

  router.get(
    "/get_all_pallet_by_company_code",
    requireAuth,
    pallet_controller.get_all_pallet_by_company_code
  );

  router.get("/get_pallet_by_id/:id", requireAuth, pallet_controller.findOne);

  router.put("/update_pallet/:id", requireAuth, pallet_controller.update);

  router.delete("/delete_pallet/:id", requireAuth, pallet_controller.delete);

  router.put("/v1/free_pallet", requireAuth, pallet_controller.freePallet);

  app.use("/api/master/pallet", router);
};
