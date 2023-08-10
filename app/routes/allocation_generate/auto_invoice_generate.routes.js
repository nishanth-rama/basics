"use strict";

module.exports = (app) => {
  const router = require("express").Router();

  const { requireAuth } = require("../../helpers/verifyJwtToken");
  const autoInvoiceController = require("../../controllers/allcation_generate/auto_invoice_generate.controller");

  router.get("/", requireAuth, autoInvoiceController.getListOfSo);

  router.get(
    "/generate",
    requireAuth,
    autoInvoiceController.autoInvoiceGenerate
  );

  app.use("/api/auto_invoice_generate", router);
};
