const _ = require('lodash');
const passport = require("passport");
require("./passport");
const {respondError_new } = require("./response");


const requireAuth=(req,res,next)=>{

    passport.authenticate("jwt", { session: false },function(err, user, info){

    if (err || !user || _.isEmpty(user)) {
  
     return  respondError_new(res, info)
     
    } else {
      return next();
    }
  })(req, res, next);
  }

  module.exports={
    requireAuth:requireAuth
}