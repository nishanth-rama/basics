module.exports = (app) => {
  const tutorials = require("../../controllers/transaction/inwardDetail.controller.js");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  // Create a new Tutorial
  router.post("/", requireAuth, tutorials.create);

  // Retrieve all Tutorials
  router.get("/", requireAuth, tutorials.findAll);

  app.use("/api/transaction/inwardDetail", router);
};
