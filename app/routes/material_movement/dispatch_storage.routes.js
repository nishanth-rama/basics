"use strict";

module.exports = (app) => {
  const router = require("express").Router();
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const dispatchController = require("../../controllers/material_movement/dispatch_storage.controller");

  // authentication;
  // router.use(requireAuth);

  router.get(
    "/v1/material_wise_stocks",
    requireAuth,
    dispatchController.materialWiseStock
  );

  router.get(
    "/v1/material_based_rack_locations",
    requireAuth,
    dispatchController.materialBasedRacks
  );

  router.get(
    "/v1/carrier_barcodes",
    requireAuth,
    dispatchController.getMaterialBarcodes
  );

  app.use("/api/dispatch_storage", router);
};
