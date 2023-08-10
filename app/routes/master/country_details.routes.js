module.exports = (app) => {
  const countryController = require("../../controllers/master/country_details.controller");

  let router = require("express").Router();

  const { requireAuth } = require("../../helpers/verifyJwtToken");

  //get all country route
  router.get("/get_all_details", requireAuth, countryController.getCountries);

  //add new country route
  router.post("/add_country_detail", requireAuth, countryController.addCountry);

  //update country detail route
  router.put(
    "/update_country_detail",
    requireAuth,
    countryController.updateCountry
  );

  //delete country detail route
  router.delete(
    "/delete_country_detail",
    requireAuth,
    countryController.deleteCountry
  );

  app.use("/api/master/countries", router);
};
