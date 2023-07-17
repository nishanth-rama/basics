const db = require("../models");
const users_detail_table = db.loginUser;
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