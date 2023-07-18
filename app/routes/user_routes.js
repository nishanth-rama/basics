module.exports = (app) => {

    //console.log("user routes");
    const controller = require("../controllers/user_controller.js");

    let router = require("express").Router();
    const passport = require("passport");
    require("../helpers/passport.js");


    const requireAuth = passport.authenticate("jwt", { session: false });
    const requireSignin = passport.authenticate("local", { session: false });
    console.log("requireSignin", requireSignin, requireAuth);

    // Retrieve all Tutorials
    router.post("/", requireAuth, controller.findAll);
    router.post("/userlogin", controller.signin);

    app.use("/api/user", router);

}