module.exports = (app) => {
  const machine_monitoring = require("../../controllers/machine_monitoring_system/machine_monitoring.controller.js");
  const router = require("express").Router();

  router.post("/add", machine_monitoring.add_machine_monitoring);

  router.get("/get_all", machine_monitoring.get_all);

  router.get("/get_plants", machine_monitoring.get_plants);

  app.use("/api/machine_monitoring_system", router);
};
