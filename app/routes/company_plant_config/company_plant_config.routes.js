module.exports = (app) => {
    const company_plant_config_controller = require("../../controllers/company_plant_config/company_plant_config.controller");
    const { requireAuth } = require("../../helpers/verifyJwtToken");
  
    const router = require("express").Router();
  
    router.get(
      "/get_status",
      requireAuth,
      company_plant_config_controller.get_co_plant_config
    );
  
    app.use("/api/company_plant_config", router);
  };
  