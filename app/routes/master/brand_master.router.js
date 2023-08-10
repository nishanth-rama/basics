module.exports = (app) => {
  const tutorials = require("../../controllers/master/brand_master.controller");

  let router = require("express").Router();

  const { requireAuth } = require("../../helpers/verifyJwtToken");

  // Create a new Tutorial
  router.post("/", requireAuth, tutorials.create);

  router.get("/findone", requireAuth, tutorials.findone);

  router.get("/", requireAuth, tutorials.findAll);

  router.put("/:id", requireAuth, tutorials.update);

  router.delete("/:id", requireAuth, tutorials.delete);

  app.use("/api/master/brand", router);
};
