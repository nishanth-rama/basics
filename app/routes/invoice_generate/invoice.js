"use strict";

module.exports = (app) => {
  const router = require("express").Router();
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const invoiceGenerateController = require("../../controllers/invoice_allocation/invoice_allocation.controller");

  router.get(
    "/v1/pending/invoice",
    requireAuth,
    invoiceGenerateController.getAllPendingInvoice
  );
  router.get(
    "/v1/invoice",
    requireAuth,
    invoiceGenerateController.generateInvoice
  );
  router.get(
    "/v1/successful/invoice",
    requireAuth,
    invoiceGenerateController.getAllSuccessInvoice
  );

  app.use("/api/invoice_generate", router);
};
