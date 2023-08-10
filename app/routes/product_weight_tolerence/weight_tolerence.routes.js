module.exports = (app) => {
  const product_controller = require("../../controllers/product_weight_tolerence/weight_tolerence.controller.js");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  // Add button through sku/site based allocation
  router.post(
    "/add_product_weight_tolerence",
    requireAuth,
    product_controller.add_product_weight_tolerence
  );

  router.get(
    "/get_product_weight_tolerence/:noteId",
    requireAuth,
    product_controller.get_product_weight_tolerence
  );

  router.get(
    "/get_all_product_weight_tolerence",
    requireAuth,
    product_controller.getall_product_weight_tolerence
  );

  router.put(
    "/update_product_weight_tolerence/:noteId",
    requireAuth,
    product_controller.update_product_weight_tolerence
  );

  router.delete(
    "/delete_product_weight_tolerence/:noteId",
    requireAuth,
    product_controller.delete_product_weight_tolerence
  );

  router.get(
    "/v1/check_tolerance_data",
    requireAuth,
    product_controller.verifyDetails
  );

  app.use("/api/product", router);
};
