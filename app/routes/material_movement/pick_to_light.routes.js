module.exports = (app) => {
  const pick_to_light_controller = require("../../controllers/material_movement/pick_to_light.controller.js");
  const { requireAuth } = require("../../helpers/verifyJwtToken");
  const router = require("express").Router();

  router.get(
    "/get_pick_to_light_rack_route",
    requireAuth,
    pick_to_light_controller.get_pick_to_light_rack_route
  );
  router.get(
    "/get_pick_to_light_items_rack",
    requireAuth,
    pick_to_light_controller.get_pick_to_light_items_rack
  );
  router.put(
    "/update_total_Stock_secondary_discrete",
    requireAuth,
    pick_to_light_controller.update_total_Stock_secondary_discrete
  );
  router.get(
    "/verify_so_weight",
    requireAuth,
    pick_to_light_controller.verify_so_weight
  );
  router.get("/show_route", requireAuth, pick_to_light_controller.show_route);

  router.get(
    "/get_pick_to_light_rack_route_v2",
    requireAuth,
    pick_to_light_controller.get_pick_to_light_rack_route_v2
  );
  router.get(
    "/get_pick_to_light_items_rack_v2",
    requireAuth,
    pick_to_light_controller.get_pick_to_light_items_rack_v2
  );
  router.put(
    "/update_total_Stock_secondary_discrete_v2",
    requireAuth,
    pick_to_light_controller.update_total_Stock_secondary_discrete_v2
  );
  router.put(
    "/verify_bin_weight_v2",
    requireAuth,
    pick_to_light_controller.verify_bin_weight_v2
  );
  router.get(
    "/show_route_v2",
    requireAuth,
    pick_to_light_controller.show_route_v2
  );

  //delete bins
  router.delete(
    "/delete_bin",
    requireAuth,
    pick_to_light_controller.delete_bin
  );
  router.delete(
    "/v2/delete_bin",
    requireAuth,
    pick_to_light_controller.delete_bin_v2
  );

  app.use("/api/material_movement", router);
};
