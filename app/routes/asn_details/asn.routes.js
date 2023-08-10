module.exports = (app) => {
  const controller = require("../../controllers/asn_details/asn.controller");
  const { requireAuth } = require("../../helpers/verifyJwtToken");
  const router = require("express").Router();

  router.put("/v1/save_asn_details", controller.save_asn_details);
  router.put("/v2/save_asn_details", controller.save_asn_details_v2);

  router.get(
    "/v1/po_based_asn_details",
    requireAuth,
    controller.getAsnDetailsBasedOnPoNo
  );

  router.get(
    "/v2/po_based_asn_details",
    requireAuth,
    controller.getAsnDetailsBasedOnPoNoV2
  );

  router.get("/v1/po_based_asn_no", requireAuth, controller.getAsnNumBasedOnPo);

  app.use("/api/asn", router);
};
