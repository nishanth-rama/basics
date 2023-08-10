const { requireAuth } = require("../../helpers/verifyJwtToken");
module.exports = (app) => {
  const controller = require("../../controllers/purchase_order/purchase_order.controller");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  router.get("/v1/get_all_order_details", requireAuth, controller.findAll); // get all purchase orders

  router.get(
    "/v1/get_all_order_details_by_company_code",
    requireAuth,
    controller.get_all_order_details_by_company_code
  );

  router.put("/v1/new_order_entry", requireAuth, controller.createOne); // post purchase order details

  router.get("/v1/get_po_type_list", requireAuth, controller.findPoType); // get po doc type


  router.get("/v2/get_po_type_list",
  //  requireAuth, 
   controller.findPoType_wdc); // get po doc type for wet dc

   router.get("/v2/get_vendor_list",
    // requireAuth,
     controller.findVendorList_wdc); // get supplier list for wet dc

  router.get("/v1/get_vendor_list", requireAuth, controller.findVendorList); // get supplier list

  router.get("/v1/get_po_number_list", requireAuth, controller.findPoNo); // get po number

  router.get("/v1/get_item_list", requireAuth, controller.findItemList); // get po item list

  router.get("/v2/get_item_list", requireAuth, controller.findItemList_v2); // get po item list

  router.get("/v2/get_item_details", requireAuth, controller.itemDetails_v2); // get po item details

  router.get("/v1/doc_type_onDD", requireAuth, controller.findPoDocType); // get po item list

  router.get(
    "/v1/specific_order_details",
    // requireAuth,
    controller.specificPoDetails
  );

  // router.post("/v1/filtering_details",controller.filter); // filtering details for inward process

  app.use("/api/purchaseorder", router);
};
