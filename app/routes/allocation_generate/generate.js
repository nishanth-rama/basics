"use strict";

module.exports = (app) => {
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const allocationGenerateController = require("../../controllers/allcation_generate/generate");

  const router = require("express").Router();

  router.get(
    "/v1/all/customer",
    requireAuth,
    allocationGenerateController.getAllCustomer
  );

  router.get(
    "/v1/customer/sales/order",
    requireAuth,
    allocationGenerateController.getCustomerSalesOrder
  );

  router.get(
    "/v1/customer/sales/items",
    requireAuth,
    allocationGenerateController.getCustomerSalesItems
  );

  router.get(
    "/v1/generate/allocateId",
    requireAuth,
    allocationGenerateController.generateAllocationId
  );

  router.get(
    "/v1/get_all_allocations",
    requireAuth,
    allocationGenerateController.getAllocationsByDate
  );

  router.get(
    "/v1/get_item_details",
    requireAuth,
    allocationGenerateController.getAllocationItemDetails
  );

  app.use("/api/allocation_generate", router);
};
