"use strict";
const passport = require("passport");
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const LocalStrategy = require("passport-local");
var CryptoJS = require("crypto-js");


// models
const db = require("../models");
// const { respondSuccess, respondError } = require('./response');

const User = db.loginUser;

// Create local strategy
// const localOptions = { usernameField: "email", passReqToCallback: true };
// const localLogin = new LocalStrategy(
//     localOptions,
//     (req, email, password, done) => {
//         //console.log(req.body);
//         User.findOne({ email: email.toLowerCase() }, (err, user) => {
//             // console.log(user);
//             if (err) {
//                 // return done(respondError(req.__(localesKeys.global.TRY_AGAIN), constValues.StatusCode.INTERNAL_SERVER_ERROR), false);
//                 return done(err);
//             }
//             if (!user) {
//                 return done("Invalid credential", false);
//             }
//             if (user.is_user_locked === 1 || user.no_of_invalid_action >= 3) {
//                 return done(
//                     "Your account is locked, please contact system admin",
//                     false
//                 );
//             }

//             var bytes = CryptoJS.AES.decrypt(
//                 password,
//                 "TSFFGDcqfPmwKQKJkGh3NRLk7mqnWzeWXw2"
//             );
//             password = bytes.toString(CryptoJS.enc.Utf8);
//             //console.log("originalText",password);

//             user.comparePassword(password, (error, isMatch) => {
//                 if (error) {
//                     return done(error);
//                 }
//                 if (!isMatch) {
//                     if (user.no_of_invalid_action === 3) {
//                         user.is_user_locked = 1;
//                         user.no_of_invalid_action = 3;
//                         user.save();
//                         return done(
//                             "Your account is locked, please contact system admin",
//                             false
//                         );
//                     }
//                     user.no_of_invalid_action = user.no_of_invalid_action + 1;
//                     user.save();
//                     return done("Invalid credential", false);
//                 }

//                 return done(null, user);
//             });
//         });
//     }
// );

// Setup options for JWT Strategy

const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromHeader("authorization"),
    secretOrKey:
        "QupWI8MjPYIR38jDC9y2JtWsEb7TwRZ9QejtzuabK93udRsztPuTQYRkrMdz9BHlJ31isgK3ba4petvTixItdR8Z63sC6LT6DNdBRVKZd1twgso24d28c58cXab8GZ93",
};

// Create JWT strategy
const jwtLogin = new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
        let user_data = await User.findById(payload.userId);
        console.log("user_data",user_data);
        if (user_data) {
            // console.log("user",user);
            done(null, user_data);
        } else {
            done("please login", false);
        }
    } catch (err) {
        return done(err, false);
    }
});

// Tell passport to use this strategy
passport.use(jwtLogin);
// passport.use(localLogin);
