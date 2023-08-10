module.exports = (app) => {
  const controller = require("../../controllers/user_module_mapping/userModuleMapping.controller");
  const passport = require("passport");
  require("../../helpers/passport");

  // const requireAuth = passport.authenticate("jwt", { session: false });

  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  router.get(
    "/v1/get_all_module_names",
    requireAuth,
    controller.getModuleNames
  );

  router.post(
    "/v1/add_module_names",
    requireAuth,
    controller.addModuleNames
  );

  router.delete(
    "/v1/delete_module_names/:id",
    requireAuth,
    controller.removeModuleName
  );

  router.put(
    "/v1/update_module_names/:id",
    requireAuth,
    controller.updateModuleName
  );

  router.post(
    "/v1/save_module_mapping_details",
    requireAuth,
    controller.saveModuleMapping
  );

  router.put(
    "/v1/update_module_mapping_details/:id",
    requireAuth,
    controller.updateModuleMappingDetails
  );

  router.get(
    "/v1/get_module_mapping_details",
    requireAuth,
    controller.getAllModuleMappingDetails
  );

  router.delete(
    "/v1/delete_module_mapping_details/:id",
    requireAuth,
    controller.deleteModuleMappingDetails
  );

  router.get(
    "/v1/get_transaction_company_code",
    requireAuth,
    controller.get_transaction_company_code
  );

  app.use("/api/userModuleMapping", router);
};
