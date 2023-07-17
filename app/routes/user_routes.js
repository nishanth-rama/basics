module.exports = (app) => {

    //console.log("user routes");
    const controller = require("../controllers/user_controller.js");

    let router = require("express").Router();
    // Retrieve all Tutorials
    router.get("/", controller.findAll);

    app.use("/api/user", router);

}