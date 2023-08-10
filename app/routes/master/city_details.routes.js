module.exports = (app) => {
  const cityController = require("../../controllers/master/city_details.controller");

  let router = require("express").Router();

  const { requireAuth } = require("../../helpers/verifyJwtToken");

  //get all cities
  router.get("/get_all_cities", requireAuth, cityController.getAllCities);

  //get all city by state id routes
  router.get("/get_all_city_details", requireAuth, cityController.getCities);

  //add state api route
  router.post("/add_city_detail", requireAuth, cityController.addCity);

  //update country detail route
  router.put("/update_city_detail", requireAuth, cityController.updateCity);

  //delete country detail route
  router.delete("/delete_city_detail", requireAuth, cityController.deleteCity);

  app.use("/api/master/cities", router);
};
