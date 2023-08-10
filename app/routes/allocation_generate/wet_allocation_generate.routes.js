module.exports = (app) => {
  const { requireAuth } = require("../../helpers/verifyJwtToken");
  const allocationGenerateController = require("../../controllers/allcation_generate/wet_allocation_generate.controller");

  const router = require("express").Router();

  router.post(
    "/v1/generate_allocation_id",
    requireAuth,
    allocationGenerateController.generate_allocation_id_v2
  );

  router.post(
    "/v2/auto_generate_allocation_id",
    requireAuth,
    allocationGenerateController.auto_generate_allocation_id_v2
  );

  // customer type list
  router.get(
    "/customer_type_list",
    requireAuth,
    allocationGenerateController.get_customer_type_list
  );

  // route list
  router.get(
    "/route_list",
    requireAuth,
    allocationGenerateController.get_route_list
  );

    // SO item list
    router.get("/so_item_list",requireAuth, allocationGenerateController.get_so_item_list);
  // so list
  router.get("/so_list", requireAuth, allocationGenerateController.get_so_list);

  // SO item list
  // router.get(
  //   "/item_list",
  //   requireAuth,
  //   allocationGenerateController.get_so_item_list
  // );

  app.use("/api/wdc/allocation_generate", router);
};
