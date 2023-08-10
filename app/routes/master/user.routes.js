module.exports = (app) => {
  const controller = require("../../controllers/master/user.controller.js");

  let router = require("express").Router();

  const { requireAuth } = require("../../helpers/verifyJwtToken");

  // Create a new Tutorial
  router.post("/", requireAuth, controller.create);

  // Retrieve all Tutorials
  router.get("/", requireAuth, controller.findAll);

  // Retrieve a single Tutorial with id
  router.get("/:id", requireAuth, controller.findOne);

  // Update a Tutorial with id
  router.put("/:id", requireAuth, controller.update);

  // Delete a Tutorial with id
  router.delete("/:id", requireAuth, controller.delete);

  // // Create a new Tutorial
  // router.delete("/", controller.deleteAll);
  //  // Retrieve all published Tutorials
  //  router.get("/published", controller.findAllPublished);

  router.get(
    "/v1/employee_email_list",
    requireAuth,
    controller.getEmployeeEmails
  );

  router.get(
    "/v1/email_based_employee_details",
    requireAuth,
    controller.getEmployeeDetails
  );

  app.use("/api/master/user", router);
};
