const mongoose = require("mongoose");
const Schema = mongoose.Schema;

module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {

   tripId : {
     type : Number
   },

   salesOrder : {
    type : Array
   }


    },
    { timestamps: true }
  );

  const trips_date = mongoose.model("trips", schema);
  return trips_date;
};
