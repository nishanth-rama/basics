module.exports = (app) => {
  const master_controller = require("../../controllers/crate_management/master.create_management.controller");
  const db = require("../../models/crate_management/master.model");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const { Color, Size, Capacity, Ip } = db;

  const router = require("express").Router();

  router.get("/colors", requireAuth, master_controller.getList(Color));
  router.post(
    "/color/create",
    requireAuth,
    master_controller.createMaster(Color)
  );
  router.post(
    "/size/create",
    requireAuth,
    master_controller.createMaster(Size)
  );
  router.get("/sizes", requireAuth, master_controller.getList(Size));
  router.post(
    "/capacity/create",
    requireAuth,
    master_controller.createMaster(Capacity)
  );
  router.get("/capacities", requireAuth, master_controller.getList(Capacity));
  router.post("/ip/create", requireAuth, master_controller.createMaster(Ip));
  router.get("/ip", requireAuth, master_controller.getList(Ip));

  app.use("/api/crate_management", router);
};
