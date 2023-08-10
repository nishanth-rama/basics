module.exports = (mongoose) => {
    var mongoose = require("mongoose");
    const Schema = mongoose.Schema;
    const transaction_company_code_schema = new Schema(
      {
        company_code:{},
        transaction_company_code:{}
      },
      { timestamps: true,strict : false }
    );
    const transaction_company_code = mongoose.model("rapid_transaction_company_code", transaction_company_code_schema);
  
    return transaction_company_code;
  };