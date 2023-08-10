const _ = require("lodash");
const passport = require("passport");
require("../../helpers/passport");

const { requireAuth } = require("../../helpers/verifyJwtToken");

module.exports = (app) => {
  const wetDc_allocation_controller = require("../../controllers/allocation/wetDc_manual_allocation.controller.js");

  const router = require("express").Router();

  router.get(
    "/get_so_list",
    // requireAuth,
    wetDc_allocation_controller.get_so_list_manual_allocation
  );

  router.get(
    "/get_route_list",
    requireAuth,
    wetDc_allocation_controller.get_route_list_manual_allocation
  );

  router.get(
    "/get_route_list_by_delivery_date",
    requireAuth,
    wetDc_allocation_controller.get_route_list_by_delivery_date
  );

  router.get(
    "/get_customer_type",
    requireAuth,
    wetDc_allocation_controller.get_customer_type_manual_allocation
  );

  router.get(
    "/sku_allocation_overview",
    requireAuth,
    wetDc_allocation_controller.get_sku_allocation_overview
  );

  router.get(
    "/so_allocation_overview",
    requireAuth,
    wetDc_allocation_controller.get_so_allocation_overview
  );

  router.get(
    "/sku_list",
    requireAuth,
    wetDc_allocation_controller.get_sku_item_list
  );

  router.get(
    "/sku_stock_detail",
    requireAuth,
    wetDc_allocation_controller.get_sku_stock_detail
  );

  // so list with selected item detail
  router.get(
    "/sku_so_list",
    // requireAuth,
    wetDc_allocation_controller.get_so_list_sku
  );

  router.get(
    "/sku_crate_detail",
    requireAuth,
    wetDc_allocation_controller.get_sku_crate_detail
  );

  router.put(
    "/sku_remove_crate",
    requireAuth,
    wetDc_allocation_controller.remove_allocated_crate
  );

  router.put(
    "/add_allocation_crates/:id",
    requireAuth,
    wetDc_allocation_controller.add_allocation_crates
  );

  app.use("/api/wetDc_allocation", router);
};
