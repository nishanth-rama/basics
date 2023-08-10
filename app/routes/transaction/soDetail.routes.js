module.exports = (app) => {
  const transaction_sales_order_detail_cntr = require("../../controllers/transaction/soDetail.controller.js");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  router.get(
    "/sales_order_detail",
    requireAuth,
    transaction_sales_order_detail_cntr.getSalesOrderDetail
  );

  // allocation report - type of allocation mode

  router.get(
    "/allocation_mode",
    requireAuth,
    transaction_sales_order_detail_cntr.getAllocationMode
  );

  // allocation report

  router.get(
    "/allocation_report",
    requireAuth,
    transaction_sales_order_detail_cntr.getAllocationReport
  );

  router.get(
    "/list_so_allocated_ptl",
    requireAuth,
    transaction_sales_order_detail_cntr.list_so_allocated_ptl
  );

  app.use("/api/transaction", router);
};
