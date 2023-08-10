const controller = require("../../controllers/user/web_user.controller");
const { requireAuth } = require("../../helpers/verifyJwtToken");

const router = require("express").Router();

const passport = require("passport");
require("../../helpers/passport");

const requireAuth_user = passport.authenticate("jwt", { session: false });
const requireSignin = passport.authenticate("local", { session: false });

// require("../../locales")
module.exports = (app) => {
  // Create a new Tutorial
  router.post("/userRegister", controller.register);

  // Retrieve all controller
  router.post("/userlogin", requireSignin, controller.signin);

  router.post("/company/code", controller.get_company_code);

  //delete
  router.delete("/:id", requireAuth, controller.delete);

  //Get user by idl
  router.get("/:id", requireAuth, controller.get_user_by_id);

  //Update user
  router.put("/:id", requireAuth, controller.edit_user_by_id);

  //update password
  router.put("/change/password",requireAuth_user, controller.direct_password_change);

  router.post("/password/config", requireAuth_user, controller.password_config);

  router.post("/unblock", requireAuth_user, controller.unblock_user);

  router.post("/change/status", requireAuth_user, controller.change_status);

  app.use("/api/web_user", router);
};
