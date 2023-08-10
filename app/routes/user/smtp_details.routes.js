module.exports = (app) => {
  const smtp_details_controller = require("../../controllers/user/smtp_details.controller");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  // authentication;
  router.use(requireAuth);

  // router.get("/get_email_list",smtp_details_controller.get_all_email_list)

  router.put("/update_smtp_details", smtp_details_controller.update_smtp_list);

  app.use("/api/smtp", router);
};
