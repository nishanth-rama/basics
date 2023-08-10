module.exports = (app) => {
  const controller = require("../../controllers/cold_room_temperature/cold_room_temperature.controller");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  router.post(
    "/add_temperature_detail",
    requireAuth,
    controller.add_device_temperature_detail
  );

  app.use("/api/cold_room", router);
};
