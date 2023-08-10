"use strict";

module.exports = (app) => {
  const router = require("express").Router();
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const dispatchController = require("../../controllers/dispatch/dispatchController");

  router.get("/v1/all/route", requireAuth, dispatchController.getRouteDetails);

  router.get(
    "/v1/all/customer",
    requireAuth,
    dispatchController.getCustomerDetails
  );

  router.get(
    "/v1/all/sales_order",
    requireAuth,
    dispatchController.getSoDetails
  );

  router.get("/v1/so_no", requireAuth, dispatchController.getSoNoList);

  router.get(
    "/v1/all/invoices",
    requireAuth,
    dispatchController.getInvoiceDetail
  );

  router.get(
    "/v1/all/invoice_items",
    requireAuth,
    dispatchController.getInvoiceItems
  );

  router.get(
    "/v1/item/quantity",
    requireAuth,
    dispatchController.getItemQuantity
  );

  router.post("/v1/save", requireAuth, dispatchController.saveDispatch);

  router.post("/v2/save", requireAuth, dispatchController.v2SaveDispatch);

  router.get(
    "/v1/dispatch_details",
    requireAuth,
    dispatchController.getDispatchDetails
  );

  router.get("/v1/all", requireAuth, dispatchController.getOutwardDetails);

  router.get("/v1/items", requireAuth, dispatchController.getDispatchedItems);

  /////////// -- Aakash Ravikumar -- ////////////////

  router.get(
    "/v1/get_SKU_based_SO_picking_qty",
    requireAuth,
    dispatchController.getSoPickingQtyListV2
  );

  router.get(
    "/v1/get_SKU_based_SO_no",
    requireAuth,
    dispatchController.get_so_no
  );

  router.get("/v1/get_route_ids", requireAuth, dispatchController.getRouteIds);
  router.get(
    "/v2/get_allocation_route_ids",
    requireAuth,
    dispatchController.get_allocation_route_ids
  );

  router.get(
    "/v1/get_item_locations",
    requireAuth,
    dispatchController.getItemLocationsV3
  );
  router.get(
    "/v2/get_item_locations",
    requireAuth,
    dispatchController.getItemLocationsV4
  );

  router.get(
    "/v1/primary_location/get_item_locations",
    requireAuth,
    dispatchController.getPrimaryItemLocations
  );

  router.get(
    "/v1/confirm_item_picked",
    requireAuth,
    dispatchController.confirmItemPicked
  );

  router.post(
    "/v1/assign_pallet_and_stack_materials",
    requireAuth,
    dispatchController.dispatchPalletizationV3
  );
  router.post(
    "/v2/assign_pallet_and_stack_materials",
    requireAuth,
    dispatchController.dispatchPalletizationV4
  );

  router.get(
    "/v1/get_picked_barcodes",
    requireAuth,
    dispatchController.getPickedBarcodes
  );

  router.get(
    "/v1/get_stacked_pallets",
    requireAuth,
    dispatchController.stackedPallets
  );

  router.put(
    "/v1/confirm_pallet_stacked",
    requireAuth,
    dispatchController.confirmPalletStacked
  );

  router.get(
    "/v1/list_sku_based_on_invoice",
    requireAuth,
    dispatchController.list_sku_based_on_invoice
  );

  router.get(
    "/v1/get_empty_rack",
    requireAuth,
    dispatchController.getEmptyRackV2
  );

  router.put(
    "/v1/lock_and_unlock_rack",
    requireAuth,
    dispatchController.lockAndUnlockRack
  );

  router.post(
    "/v1/confirm_pallet_placed",
    requireAuth,
    dispatchController.confirmPalletPlaced
  );

  router.get(
    "/v1/get_stacking_pallets_details",
    requireAuth,
    dispatchController.getPalletDetails // not using
  );

  router.get(
    "/v1/get_invoice_based_sku_pick_locations",
    requireAuth,
    dispatchController.getInvoiceSkusPickLocation
  );

  router.put(
    "/v1/confirm_pallet_removed_from_rack",
    requireAuth,
    dispatchController.confirmPalletRemovedFromRack
  );

  router.get(
    "/v1/get_allocationwise_stacked_pallets",
    requireAuth,
    dispatchController.allocationWiseStackedPallets
  );

  router.get(
    "/v1/get_material_wise_pallets",
    requireAuth,
    dispatchController.materialWisePallets
  );

  router.put(
    "/v1/check_sku_picking_user",
    requireAuth,
    dispatchController.checkPickingUser
  );

  router.get(
    "/v1/pallet_barcode_list",
    requireAuth,
    dispatchController.palletBarcodeList
  );

  router.get(
    "/v1/customer_name_list",
    requireAuth,
    dispatchController.customerNameList
  );

  router.get(
    "/v1/invoice_number_list",
    requireAuth,
    dispatchController.invoiceNoList
  );

  router.get(
    "/v1/rack/route_ids",
    requireAuth,
    dispatchController.getRackBasedRouteIds
  );

  ////// only for development purpose //////

  router.delete(
    "/v1/delete_pallet_details",
    dispatchController.deletePalletInfo
  ); // temporary api for the ui developer

  router.get(
    "/v1/get_carrier_barcode_list",
    dispatchController.getCarriersBarcode
  ); // temporary api for the ui developer

  app.use("/api/dispatch", router);
};
