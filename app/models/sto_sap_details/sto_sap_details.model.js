const mongoose =  require("mongoose");

module.exports = (mongoose) =>{
  var schema = mongoose.Schema({
    delivery_type: {
         type: String
    },
    delivery_no: {
        type: String
    },
    picking_date: {
        type: String
    },
    picking_time: {
        type: String
    },
    supply_plant: {
        type: String
    },
    receiving_plant: {
        type: String
    },
    po_number: {
        type: String
    },
    item: {
        type: [Object]
    }
  }, { timestamps: true })

  const stoDetail = mongoose.model("rapid_sto_sap_details", schema);
  return stoDetail;
}