module.exports = (app) => {
  const invoice_sto = require("../../controllers/invoice_sto/invoice_sto.controller");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  router.get("/get_invoice_sto", requireAuth, invoice_sto.invoice_sto);

  router.get(
    "/sto_invoice_creation",
    requireAuth,
    invoice_sto.sto_invoice_creation
  );

  router.get(
    "/v1/get_sap_sto_invoice_list",
    requireAuth,
    invoice_sto.sapStoInvoiceList
  );

  router.get("/v1/get_sap_logs_list", requireAuth, invoice_sto.getSapLogs);

  app.use("/api/invoicesto", router);
};
