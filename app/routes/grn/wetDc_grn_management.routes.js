// var passport = require("passport");
// require("../../helpers/passport")(passport);
const _ = require("lodash");
const passport = require("passport");
require("../../helpers/passport");

const { respondError_new } = require("../../helpers/response");

// const requireAuth = passport.authenticate("jwt", { session: false });

module.exports = (app) => {
  const { requireAuth } = require("../../helpers/verifyJwtToken");
  const wetDc_grn_controller = require("../../controllers/grn/wetDc_grn_management.controller.js");

  const router = require("express").Router();

  // pending
  router.get("/get_po_list", requireAuth, wetDc_grn_controller.get_grn_po_list);

  router.get(
    "/get_success_po_list",
    requireAuth,
    wetDc_grn_controller.get_success_po_list
  );
  router.get(
    "/get_success_grn_details",
    requireAuth,
    wetDc_grn_controller.get_success_grn_details
  );

  router.get(
    "/get_failed_po_list",
    requireAuth,
    wetDc_grn_controller.get_failed_po_list
  );

  

  // get failed po item list
  router.get(
    "/get_failed_po_item_list",
    requireAuth,
    wetDc_grn_controller.get_failed_po_item_list
  );


  // get failed item list for auto on po and sto number

  // item list api for all failed, pending and success

  router.get(
    "/get_grn_po_item_list_auto",
    // requireAuth,
    wetDc_grn_controller.get_grn_po_item_list_auto
  );

  // get failed item list for vendor on po and asn 

  router.get(
    "/get_grn_po_item_list_vendor",
    requireAuth,
    wetDc_grn_controller.get_grn_po_item_list_vendor
  );


  // updated get po list
  router.get(
    "/get_po_list_new",
    requireAuth,
    wetDc_grn_controller.get_grn_po_list_new
  );
  router.get(
    "/get_pending_po_details",
    requireAuth,
    wetDc_grn_controller.get_pending_po_details
  );

  // post grn
  router.post("/post_grn", requireAuth, wetDc_grn_controller.stock_transfer_in);
  router.post("/v2/post_grn", requireAuth, wetDc_grn_controller.stock_transfer_in_v2);

  // router.get(
  //   "/get_failed_po_list",
  //   wetDc_grn_controller.get_pending_failed_grn_po_list
  // );


    // get mode failed po list mode
    router.get(
      "/get_failed_po_mode_list",
      wetDc_grn_controller.get_failed_po_list_mode_type
    );


    //  mode list
      // get mode failed po list mode
    router.get(
      "/get_pending_po_mode_list",
      wetDc_grn_controller.get_pending_po_list_mode_type
    );


      // get mode failed po list mode
    router.get(
      "/get_success_po_mode_list",
      wetDc_grn_controller.get_success_po_list_mode_type
    );




  // so list  

  // failed

  router.get(
    "/v2/get_failed_po_list",
    wetDc_grn_controller.get_failed_po_list_type
  );
  


  // pending 
  router.get("/v2/get_po_list",
  //  requireAuth,
    wetDc_grn_controller.get_grn_po_list_with_mode);


  // success
  router.get(
    "/v2/get_success_po_list",
    requireAuth,
    wetDc_grn_controller.get_success_po_list_with_mode
  );

  
  router.get(
    "/get_success_po_item_list_auto",
    requireAuth,
    wetDc_grn_controller.get_success_po_item_list_auto
  );

  // get failed item list for vendor on po and asn 

  router.get(
    "/get_success_po_item_list_vendor",
    requireAuth,
    wetDc_grn_controller.get_success_po_item_list_vendor
  );




  app.use("/api/wetDc_grn", router);
};
