module.exports = (app) => {
  const tutorials = require("../../controllers/asset_prefix_suffix/asset_prefix_suffix.controller.js");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  // Create a new Tutorial
  router.post("/", requireAuth, tutorials.create);

  router.get("/get_all_assets", requireAuth, tutorials.findAll);

  // Retrieve all Tutorials
  router.get("/", requireAuth, tutorials.assetsdata);

  // Retrieve all published Tutorials
  router.get("/published", requireAuth, tutorials.findAllPublished);

  // Retrieve a single Tutorial with id
  router.get("/:id", requireAuth, tutorials.findOne);

  // Update a Tutorial with id
  router.put("/:id", requireAuth, tutorials.update);

  // Delete a Tutorial with id
  router.delete("/:id", requireAuth, tutorials.delete);

  // Create a new Tutorial
  router.delete("/", requireAuth, tutorials.deleteAll);

  app.use("/api/asset_prefix_suffix", router);
};
