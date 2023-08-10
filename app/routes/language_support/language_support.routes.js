module.exports = (app) => {
    const language_support_controller = require("../../controllers/language_support/language_support.controller");
    const { requireAuth } = require("../../helpers/verifyJwtToken");
  
    const router = require("express").Router();
  
    router.get(
      "/get_labels",
      // requireAuth,
      language_support_controller.get_fields_in_require_language
    );

    // router.get(
    //   "/get_json_file",
    //   // requireAuth,
    //   language_support_controller.download_fields_in_require_language
    // );
    

    router.post(
        "/add_labels",
        requireAuth,
        language_support_controller.add_field_in_require_language
      );

        
    router.get(
      "/get_xml",
      // requireAuth,
      language_support_controller.get_xml
    );

  
    app.use("/api/wetDc_language_support", router);
  };
  