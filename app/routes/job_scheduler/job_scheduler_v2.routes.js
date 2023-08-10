module.exports = (app) => {
  const jobScheduler = require("../../controllers/job_scheduler/job_scheduler_v2.controller.js");
  const { requireAuth } = require("../../helpers/verifyJwtToken");
  const router = require("express").Router();

  // // Update a Tutorial with id

  router.get("/get_no_of_bins", requireAuth, jobScheduler.get_no_of_bins_v4);

  router.put("/updatejobScheduler", requireAuth, jobScheduler.update);

  // new update api with bin_detail
  router.put(
    "/updatejobScheduler_binDetail",
    requireAuth,
    jobScheduler.update_bin_with_bin_detail
  );

  router.put("/update_bin_status", requireAuth, jobScheduler.update_bin_status);

  app.use("/api/jobscheduler/v2", router);
};
