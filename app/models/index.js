const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const db = {};
db.mongoose = mongoose;
// db.url = dbConfig.url;

//db.loginUser = require("./item_masters/item_masters.model")(mongoose);
db.itemMasters = require("./item_masters/item_masters.model")(mongoose);

module.exports = db;
