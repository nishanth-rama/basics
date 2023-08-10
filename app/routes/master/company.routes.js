"use strict";

module.exports = (app) => {
  const controller = require("../../controllers/master/company.controller.js");

  let router = require("express").Router();
  const multer = require("multer");

  const db = require("../../models");
  const imageHandling = require("./imageHandling");

  const { requireAuth } = require("../../helpers/verifyJwtToken");

  // storing files in created directory
  const upload = multer({ storage: imageHandling.storingAudioFile });

  router.post(
    "/create_company",
    imageHandling.createDir,
    upload.single("logo"),
    controller.create
  );

  router.get("/get_all_company", requireAuth, controller.findAll);

  router.get(
    "/get_all_by_company_code",
    controller.get_all_by_company_code
  );

  router.get("/get_company_by_id/:id", requireAuth, controller.findOne);

  router.get("/get_company_logo", requireAuth, controller.getLogo);

  router.put(
    "/update_company/:id",
    requireAuth,
    upload.single("logo"),
    controller.update
  );

  router.delete("/delete_company/:id", requireAuth, controller.delete);

  app.use("/api/master/company", router);
};
