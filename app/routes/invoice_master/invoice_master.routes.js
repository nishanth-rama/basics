module.exports = (app) => {
  const invoiceController = require("../../controllers/invoice_master/invoice_master.controller");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  router.get(
    "/get_invoice_based_on_invoice_date",
    requireAuth,
    invoiceController.getInvoicesV2
  );

  router.get(
    "/get_specific_invoice",
    invoiceController.getInvoiceByNo
  );

  router.get(
    "/get_invoice_status",
    requireAuth,
    invoiceController.invoice_status
  );


  router.get(
    "/irn_synch",
    requireAuth,
    invoiceController.irn_synch_sap
  );

  app.use("/api/invoicemaster", router);
};
