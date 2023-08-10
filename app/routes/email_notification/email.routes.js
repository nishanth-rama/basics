const router = require("express").Router();

module.exports = (app) => {
  const email_notification = require("../../controllers/email_notification/email.controller.js");

  router.get("/inward_report/send_mail", email_notification.send_mail);

  app.use("/api/email_notification", router);
};
