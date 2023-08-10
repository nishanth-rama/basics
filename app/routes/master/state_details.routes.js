module.exports = (app) => {
  const stateController = require("../../controllers/master/state_details.controller");

  let router = require("express").Router();

  const { requireAuth } = require("../../helpers/verifyJwtToken");

  //get all states
  router.get("/get_all_states", requireAuth, stateController.getAllStates);

  //get all states details by country id routes
  router.get("/get_all_state_details", requireAuth, stateController.getStates);

  //add state api route
  router.post("/add_state_detail", requireAuth, stateController.addState);

  //update state api route
  router.put("/update_state_detail", requireAuth, stateController.updateState);

  //delete state api route
  router.delete(
    "/delete_state_detail",
    requireAuth,
    stateController.deleteState
  );

  app.use("/api/master/states", router);
};
