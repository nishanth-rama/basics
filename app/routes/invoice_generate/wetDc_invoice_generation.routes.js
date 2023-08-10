module.exports = (app) => {
  const { requireAuth } = require("../../helpers/verifyJwtToken");
  const wetDc_invoice_controller = require("../../controllers/invoice_generate/wetDc_invoice_generation.controller");

  const router = require("express").Router();

  const MulterAzureStorage = require("multer-azure-storage");
  const multer = require("multer");


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
      console.log("file.mimetype",file.mimetype);
      if (file.mimetype === "image/png" || file.mimetype === "image/jpeg") {
        return cb(null, true);
      }

      req["validateImageError"] = "Only PNG/JPEG files are allowed!";
      return cb(null, false);
    },
  });


  router.post(
    "/v1/upload_invoice",
    requireAuth,
    upload.single("image"),
    wetDc_invoice_controller.upload_invoice
  );

  // invoice overview
  router.get(
    "/invoice_overview",
    requireAuth,
    wetDc_invoice_controller.get_invoice_overview
  );

  // customer type list
  router.get(
    "/customer_type_list",
    requireAuth,
    wetDc_invoice_controller.get_customer_type_list
  );

  // route list
  router.get(
    "/route_list",
    requireAuth,
    wetDc_invoice_controller.get_route_list
  );

  //  // completed so
  router.get("/so_list",requireAuth, wetDc_invoice_controller.get_so_list);

  // item list on SO
  router.get(
    "/so_item_list",
    // requireAuth,
    wetDc_invoice_controller.get_so_item_list
  );

  router.post(
    "/v1/generate_invoice_id",
    requireAuth,
    wetDc_invoice_controller.generate_invoice_id
  );

  router.post(
    "/v1/auto_generate_invoice_id",
    requireAuth,
    wetDc_invoice_controller.auto_generate_invoice_id
  );

  router.get(
    "/v1/download_invoice_by_number",
    // requireAuth,
    wetDc_invoice_controller.download_invoice_by_number
  );

  router.get(
    "/v2/download_invoice_by_number",
    // requireAuth,
    wetDc_invoice_controller.download_invoice_by_number_v2
  );

  router.get(
    "/v3/download_invoice_by_number",
    // requireAuth,
    wetDc_invoice_controller.download_invoice_by_number_v3
  );

  router.get(
    "/v4/download_invoice_by_number",
    // requireAuth,
    wetDc_invoice_controller.download_invoice_by_number_v4
  );

  router.get(
    "/v5/download_invoice",
    // requireAuth,
    wetDc_invoice_controller.download_invoice_by_number_v5
  );


  router.get(
    "/v6/download_invoice",
    // requireAuth,
    wetDc_invoice_controller.download_invoice_by_number_v6
  );






  app.use("/api/wdc/invoice_generate", router);
};
