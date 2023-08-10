module.exports = (app) => {
  const daily_report_email_controller = require("../../controllers/user/dailyReportEmail.controller");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  router.get(
    "/get_email_list",
    requireAuth,
    daily_report_email_controller.get_all_email_list
  );

  router.put(
    "/update_email_list",
    requireAuth,
    daily_report_email_controller.update_email_list
  );

  app.use("/api/daily_report", router);
};
