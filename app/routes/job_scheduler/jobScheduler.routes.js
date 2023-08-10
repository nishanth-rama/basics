module.exports = (app) => {
  const jobScheduler = require("../../controllers/job_scheduler/jobScheduler.controller.js");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const router = require("express").Router();

  router.post("/createjobScheduler", requireAuth, jobScheduler.create);

  // Retrieve all jobScheduler
  router.get("/getjobScheduler", requireAuth, jobScheduler.findAll);

  // router.get("/published", jobScheduler.findAllPublished);

  // // Retrieve a single Tutorial with id
  router.get(
    "/getjobScheduler/:sales_order_no",
    requireAuth,
    jobScheduler.findOne
  );

  // // Update a Tutorial with id
  router.put(
    "/updatejobScheduler/:sales_order_no",
    requireAuth,
    jobScheduler.update
  );

  app.use("/api/jobscheduler", router);
};
