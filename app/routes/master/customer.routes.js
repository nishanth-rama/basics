module.exports = (app) => {
  const tutorials = require("../../controllers/master/customer.controller.js");

  let router = require("express").Router();

  const { requireAuth } = require("../../helpers/verifyJwtToken");

  // Create a new Tutorial
  router.post("/", requireAuth, tutorials.create);

  // Retrieve all Tutorials
  router.get("/", requireAuth, tutorials.findAll);

  // Retrieve all published Tutorials

  // Retrieve a single Tutorial with id
  router.get("/:id", requireAuth, tutorials.findOne);

  // Update a Tutorial with id
  router.put("/:id", requireAuth, tutorials.update);

  // Delete a Tutorial with id
  router.delete("/:id", requireAuth, tutorials.delete);

  // Create a new Tutorial
  // router.delete("/", tutorials.deleteAll);
  // router.get("/published", tutorials.findAllPublished);

  app.use("/api/master/customer", router);
};
