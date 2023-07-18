const db = require("../models");
const users_detail_table = db.loginUser;
const jwt = require("jsonwebtoken");


// Retrieve all
exports.findAll = (req, res) => {
  // const title = req.query.title;
  // var condition = title ? { title: { $regex: new RegExp(title), $options: "i" } } : {};
  console.log("findAll");
  users_detail_table
    .find({})
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while retrieving user.",
      });
    });
};

// generating token
function tokenForUser(user) {
  return jwt.sign(
    {
      userId: user._id,
    },
    "QupWI8MjPYIR38jDC9y2JtWsEb7TwRZ9QejtzuabK93udRsztPuTQYRkrMdz9BHlJ31isgK3ba4petvTixItdR8Z63sC6LT6DNdBRVKZd1twgso24d28c58cXab8GZ93",
    { expiresIn: 86400 }
  );
}

exports.signin = async (req, res) => {
  try {
    const { email, password, service_provider_company_code, language } = req.body;

    if (!email || !password || !service_provider_company_code) {
      return res.status(400).json({ error: "please filled the data" });
    }

    const userLogins = await users_detail_table.findOne({
      email: email.toLowerCase(),
      service_provider_company_code: service_provider_company_code,
    });
    // console.log('-------------', userLogins, '=============')
    if (!userLogins) {
      // return respondSuccess(res, convertLocaleMessage('de', 'USER_LOGGEDIN_SUCCESSFULLY'))
      return res.status(400).json({ error: "user not found" });
    }

    if (userLogins.active_status === 0) {
      return res.status(400).json({ error: "Please contact to admin, your account is inactive." });
    }

    const access_token = await tokenForUser(userLogins);
    console.log("access_token",access_token);


    return res.send("hello");
  } catch (error) {
    console.log("error",error);
    res.status(500).send({
      message: error.message || "Some error occurred login",
    });
  }
}