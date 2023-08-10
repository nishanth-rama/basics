module.exports = (app) => {
  const inventory_controller = require("../../controllers/material_movement/inventory.controller");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  router.get(
    "/inventory_data/v2",
    requireAuth,
    inventory_controller.list_inventory_data
  );

  router.post(
    "/update_inventory_data/v2",
    requireAuth,
    inventory_controller.update_inventory_data
  );
  router.get(
    "/inventory_carrier_details/v2",
    requireAuth,
    inventory_controller.inventory_carrier_details
  );
  router.put(
    "/v2/add_damaged_carriers",
    requireAuth,
    inventory_controller.add_damaged_carriers
  );

  router.get(
    "/v2/get_update_inventory_data",
    requireAuth,
    inventory_controller.get_update_inventory_data
  );
  router.get(
    "/v2/get_update_inventory_carrier_data",
    requireAuth,
    inventory_controller.get_update_inventory_carrier_data
  );

  router.get("/inventory_report/send_mail", inventory_controller.send_mail);

  router.put(
    "/inventory_report/send_mail_update/:id",
    inventory_controller.send_mail_update
  );

  router.post(
    "/inventory_report/mailId_create",
    inventory_controller.mailId_create
  );

  app.use("/api/material_movement", router);
};
