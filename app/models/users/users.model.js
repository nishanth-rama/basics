const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcript = require("bcryptjs");
//const dbConfig = require("../../config/db.config.js");
const { string } = require("joi");

module.exports = (mongoose) => {
  var schema = mongoose.Schema({
    company_name: {
      type: String,
    },
    company_code: {
      type: String,
    },
    service_provider_company_code:{
      type: String,
    },
    service_provider_company_name:{
      type: String,
    },
    service_provider_plant_id:{
      type: String,
    },
    plant_id: {
      type: String,
    },
    user_name: {
      type: String,
      minlength: 2,
      maxlength: 40,
      validate: [
        /^[a-zA-Z ]*$/,
        "name should contain only alphabets, spaces and minimum of two characters and maximum upto 40",
      ],
      required: true,
    },
    full_name: {
      type: String,
    },
    email: {
      type: String,
      minlength: 10,
      maxlength: 44,
      lowercase: true,
      unique: true,
      validate: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "please provide a valid email",
      ],
      required: true,
    },
    employee_id: {
      type: String,
    },
    password: {
      type: String,
      // minlength: 5,
      // maxlength: 20,
    },
    // cpassword:{
    //    type: String,minlength:5, maxlength: 20,

    // }
    // ,
    phoneno: {
      type: Number,
      min: 1000000000,
      max: 9999999999,
      required: true,
    },
    address: {
      type: String,
      maxlength: 100,
    },
    role: {
      type: String,
      // required: true,
    },
    country_id: {
      type: Number,
    },
    state_id: {
      type: Number,
    },
    city_id: {
      type: Number,
    },
    pin_code: {
      type: Number,
    },
    active_status: {
      type: Number,
      enum: [0, 1],
      default: 1,
    },
    is_user_locked: {
      type: Number,
      enum: [0, 1],
      default: 0,
    },
    force_login: {
      type: Number,
      enum: [0, 1],
      default: 1,
    },
    no_of_invalid_action: {
      type: Number,
      default: 0,
    },
    last_loggedin_date: {
      type: String,
      default: "",
    },
    last_password_modified: {
      type: String,
      default: "",
    },
    created_by: {
      type: String,
      default: "",
    },
    modified_by: {
      type: String,
      default: "",
    },
  });

  // name, email, password, cpassword,phoneno,addredd,role

  // hashing here

  schema.pre("save", async function (next) {
    if (this.isModified("password")) {
      this.password = await bcript.hash(this.password, 12);
    }
    next();
  });

  // we are generating token
  schema.methods.generateAuthToken = async function () {
    try {
      let token = jwt.sign({ _id: this._id }, "supersecert", {
        expiresIn: 86400,
      });
      // this.tokens = this.tokens.concat({token:token});
      // await this.save();

      return token;
    } catch (err) {
      console.log(err);
    }
  };

  // module.exports= mongoose.model('userlogin',userSchema);

  schema.methods.comparePassword = function (candidatePassword, callback) {
    bcript.compare(candidatePassword, this.password, (err, isMatch) => {
      if (err) {
        return callback(err);
      }
      callback(null, isMatch);
    });
  };

  const Tutorial = mongoose.model("rapid_user", schema);
  return Tutorial;
};

// export const validatePassword = (psswd) => {
//     if (!psswd.match(/^(?=.{8,24})(?=.[a-z])(?=.[A-Z])(?=.[@#$%^&+=]).$/))
//       return [
//         'Failed',
//         '> password should contain min 8 characters,less than 25 characters and atleast one uppercase, one lowercase, one number and one special character',
//       ];
//     else return ['Success'];
//   };
