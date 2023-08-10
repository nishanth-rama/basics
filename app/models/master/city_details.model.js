const mongoose = require("mongoose");
const autoIncrement=require("mongoose-sequence")(mongoose);


module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      country_id: {
        type: Number
      },
      state_id: {
        type: Number
      },
      city_id: {
        type: Number,
        default:0,
        unique: true
      },
      city_code: {
        type: String,
      },
      city_name: {
        type: String,
      },   
      pin_code: {
        type: Number,
      },
      area: {
        type: String,
      }
     
    
    },
    { timestamps: true }
  );
schema.plugin(autoIncrement, {inc_field: "city_id"});
  // schema.method("toJSON", function() {
  //   const { __v, _id, ...object } = this.toObject();
  //   object.id = _id;
  //   return object;
  // });

  const Tutorial = mongoose.model("rapid_city_details", schema);
  return Tutorial;
};
