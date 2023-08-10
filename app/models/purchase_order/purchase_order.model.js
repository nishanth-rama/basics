"use strict";

module.exports = (mongoose) => {
  var schema = mongoose.Schema({
    id: {
      type: Number,
      // integer: true,
      // required: true,
    },
    po_number: {
      type: String,
    },
    po_document_type: {
      type: String,
    },
    company_code: {
      type: String,
    },
    vendor_no: {
      type: String,
    },
    purchase_organisation: {
      type: String,
    },
    purchase_group: {
      type: String,
    },
    document_date: {
      type: String,
    },
    delivery_date: {
      type: String,
    },
    start_of_validity_period: {
      type: String,
    },
    end_of_validity_period: {
      type: String,
    },
    referance_no: {
      type: String,
    },
    updated_at: {
      type: Date,
      default: null,
    },
    created_at: {
      type: Date,
      default: new Date(),
    },
    api_response: {
      type: String,
      default: null,
    },
    plant : {
      type : Number
    },
    supplying_plant: {
      type: String,
    },
    shiping_plant: {
      type: String,
      default: null,
    },
    vendor_name: {
      type: String,
    },
    isDeleted: {
      type: Number,
    },
    status: {
      type: Number,
    },
    createdAt: {
      type: Object,
    },
    updatedAt: {
      type: Object,
    },
    created_by :{
      type : String,
    },
    item : [
      {
        item_no : {
          type : String
        },
        material_no : {
          type : String
        },
        plant : {
          type : String
        },
        delivery_date : {
          type : String
        },
        quantity : {
          type : Number
        },
        storage_location : {
          type : String
        },
        uom : {
          type : String
        },
        conversion_factor_status : {
          type : String
        },
        tax_code : {
          type : Number
        },
        net_price : {
          type : Number
        },
        selling_price : {
          type : Number
        },
        taxable_value : {
          type : Number
        },
        mrp_amount : {
          type : Number
        },
        discount_amount : {
          type : Number
        },
        discount_perc : {
          type : Number
        },
        material_description : {
          type : String
        }
       
      }
    ],
  
  },
  { timestamps: true }
  );
  const purchase_order = mongoose.model("purchaseorder", schema);
  return purchase_order;
};
