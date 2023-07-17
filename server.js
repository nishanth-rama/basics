const express = require("express");
// const bodyParser = require("body-parser"); /* deprecated */
const cors = require("cors");
const app = express();

var cookieParser = require("cookie-parser");
app.use(cookieParser());
// var corsOptions = {
//   origin: "http://localhost:8081"
// };
// app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.urlencoded({ extended: true }));

app.use("/logs", express.static("logs"));
app.use(cors());

// parse requests of content-type - application/json
app.use(express.json()); /* bodyParser.json() is deprecated */

// parse requests of content-type - application/x-www-form-urlencoded
app.use(
    express.urlencoded({ extended: true })
); /* bodyParser.urlencoded() is deprecated */

const db = require("./app/models");
const { mongoose } = require("./app/models");
const res = require("express/lib/response");

require("dotenv").config();

const connectionString = `${process.env.Protocol}${process.env.DB_USERNAME}:${process.env.DB_PASSWD}@${process.env.Host}/${process.env.DatabaseName}`;
//const { mongoose } = require("./app/models");

console.log("connectionString",connectionString);
db.mongoose
    .connect(connectionString, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        //useCreateIndex: true,
    })
    .then(() => {
        // mongoose.set('debug',true)
        console.log("Connected to the database!");
    })
    .catch((err) => {
        console.log("Cannot connect to the database!", err);
        process.exit(1);
    });


const conn = mongoose.connection;
// console.log("connnn", conn);
module.exports = conn;


const PORT = 3045;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});