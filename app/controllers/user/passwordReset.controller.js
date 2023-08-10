const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Joi = require("joi");
const db = require("../../models");
const crypto = require("crypto");
const Token = db.loginToken;
const sendEmail = require("../../utils/sendEmail");
const User = db.loginUser;

// Create and Save a new Tutorial

exports.reset_link = async (req, res) => {
 
  // Validate request
  try {
    const schema = Joi.object({ email: Joi.string().email().required() });
    const { error } = schema.validate(req.body);
    if (error)
      return res
        .status(400)
        .send({ status_code: 400, message: error.details[0].message });

    const user = await User.findOne({ email: req.body.email });
    if (!user)
      return res.status(400).send({
        status_code: 400,
        message: "user with given email doesn't exist",
      });

    let token = await Token.findOne({ userId: user._id });
    if (!token) {
      token = await new Token({
        userId: user._id,
        token: crypto.randomBytes(32).toString("hex"),
      }).save();
    }

    // pasword reset

    let update_pass = await db.loginUser.updateOne(
      { email: req.body.email },
      {
        password:
          "$2a$12$iFkCRf1HoW6jiyDUP8aRTeWmRX0bFartsxKV2shOkY.nmHpnI5Fza",
          no_of_invalid_action : 0  
      }
    );

    const link = "Hi,Your password for rapid.waycool.in reset to - Welcome@123";
    // console.log(link);
    await sendEmail(user.email, "Password reset", link);

    // console.log("param",user,token)

    // const link = `http://20.187.109.122:3030/password-reset/${user._id}/${token.token}`;
    // // console.log(link);
    // await sendEmail(user.email, "Password reset", link);

    return res.send({
      status_code: 200,
      message: "Reset password sent to your email account",
    });
  } catch (error) {
    return res.status(500).send({ status_code: 500, message: error.message });
  }
};

exports.reset_password = async (req, res) => {
  // Validate request
  try {
    const schema = Joi.object({ password: Joi.string().required() });
    const { error } = schema.validate(req.body);
    if (error)
      return res
        .status(400)
        .send({ status_code: 400, message: error.details[0].message });

    const user = await User.findById(req.params.userId);
    if (!user)
      return res
        .status(400)
        .send({ status_code: 400, message: "invalid link or expired!" });

    const token = await Token.findOne({
      userId: user._id,
      token: req.params.token,
    });
    if (!token)
      return res
        .status(400)
        .send({ status_code: 400, message: "invalid link or expired!" });

    user.password = req.body.password;
    await user.save();
    await token.delete();

    res.send({ status_code: 200, message: "password reset successfully" });
  } catch (error) {
    res.status(500).send({ status_code: 500, message: "An error occurred!" });
    console.log(error);
  }
};
