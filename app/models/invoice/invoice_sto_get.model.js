const mongoose = require("mongoose");
mongoose.pluralize(null);

module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        id: {
            type: Number,
          },
          invoice_no : {
            type: String,
            unique: true
          },
          delivery_doc_no: {
            type: Number,
          },
          billing_type : {
            type: String,
          },
          document_currency : {
            type: String,
          },
          sales_org  : {
            type: Number,
          },
          distribution_channel  :{
            type: Number
          },
          division  :{
            type: Number
          },
          billing_date  :{
            type: String
          },
          customer_price_group  :{
            type: String
          },
          customer_group  :{
            type: String
          },
          inco_terms  :{
            type: String
          },
          payment_terms  :{
            type: String
          },
          company_code  :{
            type: Number
          },
          account_assignment_group  :{
            type: String
          },
          sold_to_party  :{
            type: String
          },
          bill_to_party  :{
            type: String
          },
          payer  :{
            type: String
          },
          api_response  :{
            type: String
          },
          plant  :{
            type: String
          },
          sales_order_no :{
            type: String
          },
          updated_at : {
            type: "Date",
          }
          ,
          created_at : {
            type: "Date",
            default: Date.now
          },
          item :[
              {
                item_no : {
                    type: Number
                  },
                  material : {
                    type: String
                  },
                  item_category : {
                    type: String
                  },
                  plant  : {
                    type: Number
                  },
                  qty  : {
                    type: Number
                  },
                  uom  : {
                    type: String
                  },
                  mrp_amount  : {
                    type: Number
                  },
                  discount_amount  : {
                    type: Number
                  },
                  net_price  : {
                    type: Number
                  },
                  taxable_value  : {
                    type: Number
                  },
                  cgst_pr  : {
                    type: Number
                  },
                  sgst_pr  : {
                    type: String
                  },
                  igst_pr   : {
                    type: Number
                  },
                  ugst_pr   : {
                    type: Number
                  },
                  total_amount   : {
                    type: Number
                  }
              }
          ]

      },
    //   { timestamps: true }
    );
  
    // schema.method("toJSON", function() {
    //   const { __v, _id, ...object } = this.toObject();
    //   object.id = _id;
    //   return object;
    // });

    
  
    const Tutorial = mongoose.model("invoice_sto_get", schema);
    return Tutorial;
  };

  
  