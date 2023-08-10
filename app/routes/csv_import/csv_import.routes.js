module.exports = (app) => {
  const file_convert = require("../../controllers/csv_import/csv_import.js");
  const { requireAuth } = require("../../helpers/verifyJwtToken");

  const multer = require("multer");

  const router = require("express").Router();

  const upload = multer({ dest: "app/controllers/csv_import/csv_upload" });

  const upload1 = multer({ dest: "app/controllers/csv_import/csv_upload" });

  // ../../company_logo

  router.post(
    "/import_csv_file",
    requireAuth,
    upload.single("csv_file"),
    file_convert.parse_to_json
  );

  router.post(
    "/import_po_csv_file",
    requireAuth,
    upload1.single("po_csv_file"),
    file_convert.parse_po_to_json
  );

  router.post(
    "/import_so_trips",
    requireAuth,
    upload1.single("so_trip_file"),
    file_convert.synch_trip_to_so_allocation
  );

  app.use("/api", router);
};
