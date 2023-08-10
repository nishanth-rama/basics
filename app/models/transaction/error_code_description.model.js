const mongoose = require("mongoose");
const autoIncrement=require("mongoose-sequence")(mongoose);

    
module.exports = mongoose => {
    var schema = mongoose.Schema(
        {
            company_code: {
                type: String,
              },
              plant_id: {
                type: String,
              },
            error_code: {
                type: String,
            },
            error_description: {
                type: String
            }

        },
    );

    const error_code = mongoose.model("rapid_error_code_description", schema,"rapid_error_code_description");
    return error_code;
};


