var mongoose = require('mongoose');

module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        id : {
            type: mongoose.Schema.Types.Mixed ,
          },
          grn_id  : {
            type: mongoose.Schema.Types.Mixed,
          },
          item_no  : {
            type: String,
          },
          material_document_year  : {
            type: String,
          },
          material_no  : {
            type: String,
          },
          plant  : {
            type: String,
          },
          storage_location   : {
            type: String,
          },
          batch   : {
            type: String,
          },
          vendor    : {
            type: String,
          },
          quantity   : {
            type: String,
          },
          base_unit_of_measure    : {
            type: String,
          },
          purchase_order     : {
            type: String,
          },
          delivery_note_quantity    : {
            type: String,
          },
          delivery_note_unit     : {
            type: String,
          },
          company_code : {
            type: String,
          },
          created_at: {
            type: Date,
            default: new Date(),
          },
          updated_at: {
            type: Date,
            default: new Date(),
          },
          date_of_manufacture   : {
              type :String
          },
          api_response   : {
              type : String
          }
          
      }
    );
  
    const grn_item = mongoose.model("rapid_grn_items", schema);
    return grn_item;
  };
  