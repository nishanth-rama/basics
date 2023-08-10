module.exports = (app) => {
  const tutorials = require("../../controllers/user/passwordReset.controller.js");
  // const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  app.use("/api/user/passRest", router);

  // authentication;
  // router.use(requireAuth);

  // Create a new Tutorial
  router.post("/", tutorials.reset_link);

  // Retrieve all Tutorials
  router.post("/:userId/:token", tutorials.reset_password);

  // Retrieve all published Tutorials
  // router.get("/published", tutorials.findAllPublished);

  // // Retrieve a single Tutorial with id
  // router.get("/:id", tutorials.findOne);

  // // Update a Tutorial with id
  // router.put("/:id", tutorials.update);

  // // Delete a Tutorial with id
  // router.delete("/:id", tutorials.delete);

  // // Create a new Tutorial
  // router.delete("/", tutorials.deleteAll);
};
