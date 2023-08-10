module.exports = (app) => {
  const MulterAzureStorage = require("multer-azure-storage");
  const multer = require("multer");

  const router = require("express").Router();
  const { requireAuth } = require("../../helpers/verifyJwtToken");
  const controller = require("../../controllers/grn/grnController");

  const account = "waycoolstorage";
  const accountKey =
    "tjzgdLH4ZxpP0oDcZXZDyyvBWaVw+uBwLphrgilQ0xBm1vD62KN7qMuZNPwtq6jugDmhNiY6tCE3HMGXOmcmIw==";
  const containerName = "motherdc";

  const storage = new MulterAzureStorage({
    azureStorageConnectionString: `DefaultEndpointsProtocol=https;AccountName=${account};AccountKey=${accountKey};EndpointSuffix=core.windows.net`,
    containerName: `${containerName}`,
    containerSecurity: "blob",
  });

  let upload = multer({
    storage: storage,
    limits: {
      fileSize: 5 * 1024 * 1024 * 1024,
    },
    fileFilter: function (req, file, cb) {
      if (file.mimetype === "image/png" || file.mimetype === "image/jpeg") {
        return cb(null, true);
      }

      req["validateImageError"] = "Only PNG/JPEG files are allowed!";
      return cb(null, false);
    },
  });

  router.post(
    "/v1/upload_grn_receipt",
    requireAuth,
    upload.single("image"),
    controller.uploadGRNreceipt
  );

  router.get("/v1/get_grn_details", requireAuth, controller.getGrnDetails);

  router.get(
    "/v1/get_specific_grn_details",
    requireAuth,
    controller.getSpecificDetails
  );

  app.use("/api/grn", router);
};
