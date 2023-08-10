module.exports = (app) => {
  const cummulative_allocation_controller = require("../../controllers/cummulative_allocation/cummulative_allocation.controller");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  router.post(
    "/assign_pallet",
    requireAuth,
    cummulative_allocation_controller.assign_pallet
  );

  router.get(
    "/list_assigned_pallets",
    requireAuth,
    cummulative_allocation_controller.list_assigned_pallets
  );

  router.delete(
    "/delete_assigned_pallet/:id",
    requireAuth,
    cummulative_allocation_controller.delete_assigned_pallet
  ); // not using

  router.get(
    "/v1/get_cumulative_picked_list",
    requireAuth,
    cummulative_allocation_controller.cumulativePickedList
  );

  router.get(
    "/v1/get_sku_allocation_list",
    requireAuth,
    cummulative_allocation_controller.skuAllocationList
  );

  router.get(
    "/v1/list_pallets_for_sku",
    requireAuth,
    cummulative_allocation_controller.list_pallets_for_sku
  );

  router.post(
    "/v1/save_allocation_details",
    requireAuth,
    cummulative_allocation_controller.saveAllocation
  );

  router.get(
    "/v1/stacked_pallet_details",
    requireAuth,
    cummulative_allocation_controller.palletDetails
  );

  router.put(
    "/v1/update_allocation_pallet_status",
    requireAuth,
    cummulative_allocation_controller.update_allocation_pallet_status
  );

  app.use("/api/cummulative_allocation", router);
};
