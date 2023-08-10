const { string } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;


module.exports = mongoose => {
    var schema = mongoose.Schema(
      {

        module_name : {
          type : String
        }
      },
      { timestamps: true }
    );
  
   
    
    const Module_name = mongoose.model("rapid_module_names", schema);
    return Module_name;
  };

  
  