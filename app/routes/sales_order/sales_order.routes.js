module.exports = (app) => {
  const controller = require("../../controllers/sales_order/sales_order.controller.js");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  // Create a new Tutorial
  router.post("/createSalesorder", requireAuth, controller.create);

  // Retrieve all Tutorials
  router.get("/getSalesorders", requireAuth, controller.findAll);

  // sales order apis for single bin
  router.get(
    "/v1/get_sales_order",
    requireAuth,
    controller.get_sales_order_detail
  );

  // get all sales order api for web
  router.get(
    "/v1/get_all_sales_order",
    requireAuth,
    controller.get_all_sales_order_detail
  );

  router.get(
    "/v2/get_all_sales_order",
    requireAuth,
    controller.get_all_sales_order_detail_v2
  );

  router.get(
    "/v1/download_all_sales_order",
    requireAuth,
    controller.download_all_sales_order_detail
  );

  router.get(
    "/v1/get_only_sales_order",
    requireAuth,
    controller.get_sales_order_detail_on_sales_order_number
  );

  // sales order apis for multi bin
  router.get(
    "/v2/get_sales_order",
    requireAuth,
    controller.get_sales_order_detail_multi_bin
  );

  router.get(
    "/v2/get_only_sales_order",
    requireAuth,
    controller.get_sales_order_detail_on_sales_order_number_multi_bin
  );

  //:plant_id

  // // Update a Tutorial with id
  router.put(
    "/updateSalesorders/:sales_order_no",
    requireAuth,
    controller.update
  );

  //findAll_dcoty_DD

  // salesorder collection

  router.get(
    "/v1/get_sales_document_type",
    requireAuth,
    controller.get_sales_document_type_on_delivery_date
  );

  // get data on dco type
  //findAll_On_DocType

  router.get(
    "/v1/get_sales_order_count",
    requireAuth,
    controller.get_sales_order_count
  );

  router.get(
    "/sku_allocation/v1/get_customer_list",
    requireAuth,
    controller.customerList_sku
  );

  router.get(
    "/sku_allocation/v1/get_item_details",
    requireAuth,
    controller.itemDetails_sku
  );

  // site based allocation

  router.get(
    "/site_allocation/v1/get_sales_order_no_list",
    requireAuth,
    controller.salesOrderNo_site
  );

  router.get(
    "/site_allocation/v1/get_item_name_list",
    requireAuth,
    controller.itemNameList_site
  );

  router.get(
    "/site_allocation/v1/get_item_details",
    requireAuth,
    controller.itemDetails_site
  );

  // pm

  // allocation

  router.get(
    "/allocation/v1/filter_sales_document_type",
    requireAuth,
    controller.get_sales_document_type
  );

  router.get(
    "/allocation/v1/filter_customer_group",
    requireAuth,
    controller.get_customer_group
  );

  router.get(
    "/site_allocation/v1/filter_customer_List",
    requireAuth,
    controller.get_customer_list
  );

  router.get(
    "/sku_allocation/v1/filter_item_list",
    requireAuth,
    controller.get_item_list
  );

  router.get("/allocation/v1/dispatch", requireAuth, controller.getRouteIds);

  app.use("/api/salesorder", router);
};

// get_siteBased_CustomerGrp_onDD_DocType
//didnt used
// router.get(
//   "/site_allocation/v1/customer_group_onDD&DocType/:plant_id",
//   controller.get_siteBased_CustomerGrp_onDD_DocType
// );

// get_siteBased_non_allocated_customer_onCustomerGroup

// router.get(
//   "/site_allocation/v1/filter_non_allocated_customer_List",
//   controller.get_non_allocated_customer_list
// );

// get_nonAllocated_skuItem_onCustomerGroup

//  router.get(
//   "/sku_allocation/v1/filter_non_allocated_item_list",
//   controller.get_non_allocated_item_list
// );
