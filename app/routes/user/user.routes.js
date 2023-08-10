module.exports = (app) => {
  const controller = require("../../controllers/user/user.controller");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  // Retrieve all controller
  router.post("/userlogin", controller.signin);

  // Create a new Tutorial
  router.post("/userRegister", controller.register);

  // router.get("/get_user", controller.get_all_user);

  router.get(
    "/get_employee_list",
    requireAuth,
    controller.get_employee_email_list
  );

  router.get("/update_status", controller.update_user_info);

  router.get(
    "/get_all_user_by_company_code",
    requireAuth,
    controller.get_all_user_by_company_code
  );

  //delete
  router.delete("/:id", requireAuth, controller.delete);

  //Get user by id
  router.get("/:id", requireAuth, controller.get_user_by_id);

  //Update user
  router.put("/:id", requireAuth, controller.edit_user_by_id);

  router.get("/v1/get_all_email_id", requireAuth, controller.getEmailAddress);

  router.get("/v1/signout/:id", requireAuth, controller.signOut);

  app.use("/api/user", router);
};
