module.exports = mongoose => {
  var schema = mongoose.Schema(
    {
      id : {
          type: String,
        },
        material_document_no : {
          type: String,
        },
        document_date : {
          type: String,
        },
        posting_date : {
          type: String,
        },
        reference : {
          type: String,
        },
        bill_of_landing : {
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
          default: null,
        },
        api_response  : {
            type :String
        },
        po_number  : {
            type : String
        }
        
    }
  );

  const grn = mongoose.model("rapid_grns", schema);
  return grn;
};
