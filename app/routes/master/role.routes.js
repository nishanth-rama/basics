module.exports = (app) => {
  const tutorials = require("../../controllers/master/role.controller.js");
  const passport = require("passport");
  require("../../helpers/passport");

  let router = require("express").Router();

  const { requireAuth } = require("../../helpers/verifyJwtToken");

  // Create a new Tutorial
  router.post("/", requireAuth, tutorials.create);

  // Retrieve all Tutorials
  router.get("/", requireAuth, tutorials.findAll);

  router.get(
    "/get_all_rolemaster_by_company_code",
    requireAuth,
    tutorials.get_all_rolemaster_by_company_code
  );

  // Retrieve a single Tutorial with id
  router.get("/:id", requireAuth, tutorials.findOne);

  // Update a Tutorial with id
  router.put("/:id", requireAuth, tutorials.update);

  // Delete a Tutorial with id
  router.delete("/:id", requireAuth, tutorials.delete);

  // // Create a new Tutorial
  // router.delete("/", tutorials.deleteAll);
  //  // Retrieve all published Tutorials
  //  router.get("/published", tutorials.findAllPublished);

  app.use("/api/master/role", router);
};
