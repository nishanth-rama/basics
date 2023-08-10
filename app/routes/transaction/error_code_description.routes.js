module.exports = (app) => {
  const error_code = require("../../controllers/transaction/error_code_description.controller");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  // Retrieve all Tutorials
  router.get("/get_all_error_details", requireAuth, error_code.getallerrors);

  router.get("/error_code_details", requireAuth, error_code.get_by_error_code);

  router.post(
    "/post_error_details",
    requireAuth,
    error_code.post_error_details
  );

  router.put(
    "/update_error_details",
    requireAuth,
    error_code.updateErrorDetails
  );

  router.delete("/delete_error_code", requireAuth, error_code.deleteErrorCode);

  app.use("/api/error_code_description", router);
};
