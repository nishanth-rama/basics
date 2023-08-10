const mongoose = require("mongoose");
const Schema = mongoose.Schema;

module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        sales_order_no: {
            type: String
          },
          customer_ref_no: {
            type: String
          },
          // customerName: {
          //   type: String,
          // },
          cust_ref_date : {
            type: "Date",
            default: Date.now
          },
          ship_to_party: {
            type: String,
          },
          sold_to_party : {
            type: String,
          },
          sold_to_party_description  : {
            type: String,
          },
          updated_at : {
            type: "Date",
            default: Date.now
          }
          ,
          created_at : {
            type: "Date",
            default: Date.now
          },
          salesDocumentType : {
            type: String
          }
          ,
          salesOrganization : {
            type: Number,
          },
          distributionChannel : {
            type: String
          }
          ,
          division : {
            type: String,
          },
          plant : {
            type: String
          }
          ,
          storageLocation : {
            type: String,
          },
          salesmanId  : {
            type: Schema.Types.ObjectId,
            // required: true
          }
          ,
          customerId  : {
            type: Schema.Types.ObjectId,
            // required: true
          },
          dateOfOrderPlacing : {
            type: "Date",
            default: Date.now
          },
          
          delivery_date : {
            type: String
          },
          warehouseId  : {
            type: Schema.Types.ObjectId,
            // required: true
          },
          cartId : {
            type: Schema.Types.ObjectId,
            // required: true
          },
          binId: {
            type :String
          },
          status : {
            type : String
          },
          
        updatedBy : {
          type: Schema.Types.ObjectId,
        },

          items : [
            {
              'sale_order_id': {
                type: 'Number'
              },
              'item_no': {
                type: 'String'
              },
              'material_no': {
                type: 'String'
              },
              'qty': {
                type: 'Number'
              },
              'storage_location': {
                type: 'String'
              },
              'payment_terms': {
                type: 'String'
              },
              'uom': {
                type: 'String'
              },
              'mrp_amount': {  
                type: Number
              },
              'discount_amount': {
                type: Number
              },
              'net_price': {
                
                type: Number
              },
              'taxable_value': {
                type: Number
              },
              'cgst_pr': {
                type: Number
              },
              'sgst_pr': {
                type: Number
              },
              'igst_pr': {
                type: Number
              },
              'ugst_pr': {
                type: Number
              },
              'total_amount': {
                type: 'Number'
              },
              'plant': {
                type: 'String'
              },
              
              'material_description':{
                type: 'String',
              },
            }
          ],
          merchantRequestId : {
            type: String
          },
          invoceId  : {
            type: String
          },
          salesOrderId : {
            type: String
          },
          application_from  : {
            type: String
          },
          source  : {
            type: String
          }

      },
      // { timestamps: true }
    );
  
    // schema.method("toJSON", function() {
    //   const { __v, _id, ...object } = this.toObject();
    //   object.id = _id;
    //   return object;
    // });
  
    const Tutorial = mongoose.model("salesorder", schema);
    return Tutorial;
  };

  
  