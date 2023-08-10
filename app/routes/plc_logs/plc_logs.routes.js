module.exports = (app) => {
  const plc_logs_controller = require("../../controllers/plc_logs/plc_logs.controller");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  router.get(
    "/get_all_plc_logs",
    requireAuth,
    plc_logs_controller.get_all_plc_logs
  );
  router.post("/add_plc_logs", requireAuth, plc_logs_controller.add_plc_logs);

  app.use("/api/plc_commands", router);
};
