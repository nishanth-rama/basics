module.exports = (app) => {
  const tutorials = require("../../controllers/master/article_master.controller");

  let router = require("express").Router();

  const { requireAuth } = require("../../helpers/verifyJwtToken");

  // Create a new Tutorial
  router.post("/", requireAuth, tutorials.create);

  // Retrieve all Tutorials
  router.get("/", requireAuth, tutorials.findAll);

  router.get(
    "/get_all_article_master_by_company_code",
    requireAuth,
    tutorials.get_all_articles_by_company_code
  );

  // Retrieve a single Tutorial with id
  router.get("/:id", requireAuth, tutorials.findOne);

  // Update a Tutorial with id
  router.put("/:id", requireAuth, tutorials.update);

  // Delete a Tutorial with id
  router.delete("/:id", requireAuth, tutorials.delete);

  app.use("/api/master/article", router);
};
