module.exports = (app) => {
  const db_connection = require("../../controllers/db_connection/db_connection.controller.js");
  const router = require("express").Router();

  // router.post("/add_crates", crate_controller.add_crates_detail);
  router.put("/update_palletization", db_connection.update_palletization);
  router.delete("/delete", db_connection.deleteItem);
  router.put("/update_racks_master", db_connection.update_rack_master);

  app.use("/api/db_connection", router);
};
