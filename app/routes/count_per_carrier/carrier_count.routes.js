module.exports = (app) => {
  const controller = require("../../controllers/count_per_carrier/carrier_count.controller");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  router.post("/v1/create_carrier_count", requireAuth, controller.create);

  router.put("/v1/update_details/:id", requireAuth, controller.update);

  router.get("/v1/get_carrier_count_list", requireAuth, controller.list);

  router.get("/v1/get_details_by_id/:id", requireAuth, controller.getById);

  router.delete(
    "/v1/delete_carrier_count_details/:id",
    requireAuth,
    controller.delete
  );

  app.use("/api/products_carrier_count", router);
};
