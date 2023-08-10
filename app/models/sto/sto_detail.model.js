const mongoose =  require("mongoose");

module.exports = (mongoose) =>{
  var schema = mongoose.Schema({
    company_code: {
        type: String
    }, 
    plant_id: {
        type: String
    },  
    sto_po: {
        type: String
    }, 
    sto_no: {
        type: String
    },
    item: {
      type: [Object]
    },
    shiping_point: {
      type: String
    },
    invoice_no: {
      type: String
    }
  }, { timestamps: true })

  const stoDetail = mongoose.model("rapid_sto_details", schema);
  return stoDetail;
}