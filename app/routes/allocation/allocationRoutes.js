module.exports = (app) => {
  const allocation_controller = require("../../controllers/allocation/soAllocationController.js");
  const router = require("express").Router();

  const { requireAuth } = require("../../helpers/verifyJwtToken");

  router.get(
    "/manual_synch_sales_order",
    allocation_controller.manual_synch_sales_order_to_allocation
  );

  // synch trips on sos
  router.get(
    "/synch_trips/:plant_id",
    allocation_controller.synch_trips_to_sales_order_allocation
  );

  // synch trips on invoice
  router.get(
    "/synch_trips_to_invoice/:plant_id",
    allocation_controller.synch_trips_to_invoice_detail_allocation
  );

  // Add button through sku/site based allocation
  router.post(
    "/add_allocation",
    requireAuth,
    allocation_controller.addAllocation
  );

  router.get(
    "/get_sku_based_allocation",
    requireAuth,
    allocation_controller.findSkuBasedAllocation
  );
  // router.delete("/removeSkuBasedAllocation", allocation_controller.removeSkuBasedAllocation);
  router.put(
    "/update_sku_based_allocation",
    requireAuth,
    allocation_controller.updateSkuBasedAllocation
  );

  //cron synch_sales_order_to_allocation
  router.get(
    "/synch_sales_order/:plant_id",
    allocation_controller.synch_sales_order_to_allocation
  );

  // manual synch sales order to allocation

  router.get(
    "/get_picked_item",
    requireAuth,
    allocation_controller.picked_item_list
  );
  router.get(
    "/summary_report",
    requireAuth,
    allocation_controller.summary_report
  );

  router.get(
    "/list_discrete_allocations",
    requireAuth,
    allocation_controller.list_discrete_allocations
  );
  router.get(
    "/V2/list_discrete_allocations",
    requireAuth,
    allocation_controller.list_discrete_allocations_v2
  );

  router.get(
    "/show_sales_order_allocation/:id",
    requireAuth,
    allocation_controller.show_sales_order_allocation
  );
  router.get(
    "/get_salesorder_pending_quantity_ptl",
    requireAuth,
    allocation_controller.get_salesorder_pending_quantity_ptl
  );

  router.get(
    "/get_pick_list_by_customer_orders",
    requireAuth,
    allocation_controller.get_pick_list_by_customer_orders
  );

  router.get(
    "/get_customer_code_by_delivery_date",
    requireAuth,
    allocation_controller.get_customer_code_by_delivery_date
  );

  router.get(
    "/get_sales_order_no_by_customer_order",
    requireAuth,
    allocation_controller.get_sales_order_no_by_customer_order
  );

  router.get(
    "/get_pick_list_by_sku_id",
    requireAuth,
    allocation_controller.get_pick_list_by_sku_id
  );

  router.get(
    "/v1/get_picklist_by_so",
    requireAuth,
    allocation_controller.get_pickList_by_SO
  );

  router.get(
    "/v1/get_picklist_by_sku_id_details",
    requireAuth,
    allocation_controller.getPickList_By_SKUIdDetails
  );

  router.get(
    "/get_material_list_by_delivery_date",
    requireAuth,
    allocation_controller.get_material_list_by_delivery_date
  );

  router.get(
    "/get_customer_list_by_material_no",
    requireAuth,
    allocation_controller.get_customer_list_by_material_no
  );

  router.get(
    "/get_so_allocation_table",
    requireAuth,
    allocation_controller.get_so_allocation_table
  );

  router.get(
    "/v1/get_device_ip",
    requireAuth,
    allocation_controller.getDeviceIp
  );

  app.use("/api/allocation", router);
};
