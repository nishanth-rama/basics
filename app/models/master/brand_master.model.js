const mongoose = require("mongoose");
const Schema = mongoose.Schema;

module.exports = (mongoose) => {


    var schema = mongoose.Schema(
      {
        company_code: {
          type: String,
        },
        company_name: {
          type: String,
        },
        brand: {
            type: String,
          },
        
       
      },
      { timestamps: true }
    );
  
  
    const Brand = mongoose.model("rapid_brand", schema);
    return Brand;
  };
  