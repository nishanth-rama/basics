

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "user",
        },
        token: {
            type: String,
            required: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
            expires: 3600,
        },

      }
    );
  
    // schema.method("toJSON", function() {
    //   const { __v, _id, ...object } = this.toObject();
    //   object.id = _id;
    //   return object;
    // });
  
    const Tutorial = mongoose.model("rapid_token", schema);
    return Tutorial;
  };

  
  
