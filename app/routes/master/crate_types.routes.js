module.exports = (app) => {
  const controller = require("../../controllers/master/crate_types.controller");

  let router = require("express").Router();

  const { requireAuth } = require("../../helpers/verifyJwtToken");

  router.get("/v1/crate_type_list", requireAuth, controller.getCrateTypes);
  
  //master crate type
  router.get("/v2/crate_type_list", requireAuth, controller.getCrateTypesV2);

  router.post("/v1/add_crate_type", requireAuth, controller.addCrateType);

  router.put("/v1/update_crate_type", requireAuth, controller.update);

  router.delete("/v1/delete_crate_type", requireAuth, controller.delete);

  app.use("/api/master/crateType", router);
};
