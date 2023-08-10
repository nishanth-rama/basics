module.exports = (app) => {
  const tutorials = require("../../controllers/transaction/poDetail.controller.js");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  // router.post("/sales_order_detail", tutorials.create);

  // Create a new Tutorial
  router.post("/", requireAuth, tutorials.create);

  // Retrieve all Tutorials
  router.get(
    "/v1/purchase_order_detail",
    requireAuth,
    tutorials.get_purchase_order
  );

  router.get(
    "/v1/purchase_order_detail_new",
    requireAuth,
    tutorials.get_purchase_order_new
  );

  app.use("/api/transaction", router);
};
