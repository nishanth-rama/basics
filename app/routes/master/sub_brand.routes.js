module.exports = (app) => {
  const tutorials = require("../../controllers/master/sub_brand.controller");

  let router = require("express").Router();

  const { requireAuth } = require("../../helpers/verifyJwtToken");

  // Create a new Tutorial
  router.post("/", tutorials.create);

  // console.log(req.data,"data")

  // Retrieve all Tutorials
  router.get("/get_all_details", requireAuth, tutorials.findAll);

  router.get(
    "/get_all_sub_brand_by_company_code",
    requireAuth,
    tutorials.get_all_subbrands_by_company_code
  );

  // Retrieve a single Tutorial with id
  router.get("/:id", requireAuth, tutorials.findOne);

  // Update a Tutorial with id
  router.put("/:id", requireAuth, tutorials.update);

  // Delete a Tutorial with id
  router.delete("/:id", requireAuth, tutorials.delete);

  app.use("/api/master/subbrand", router);
};
