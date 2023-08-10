const { string } = require("joi");
const mongoose = require("mongoose");
const autoIncrement = require("mongoose-sequence")(mongoose);

module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      application :{
        type:String
        // wet dc
      },
      label_name :{
        type: String
      } ,
      english :{
        type : String
      },
      french :{
        type : String
      }
    },
    { timestamps: true }
  );

  const language_support = mongoose.model("rapid_language_support", schema);
  return language_support;
};
