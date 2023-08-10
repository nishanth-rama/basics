module.exports = (app) => {
  const track_by_location = require("../../controllers/track_by_location/track_by_location.controller");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  router.get(
    "/list_rack_information",
    requireAuth,
    track_by_location.list_rack_information
  );

  app.use("/api/track_by_location", router);
};
