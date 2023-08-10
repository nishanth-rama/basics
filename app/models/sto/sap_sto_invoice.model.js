const mongoose = require("mongoose");
const Schema = mongoose.Schema;

module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      isSelected: {
        type: Boolean,
        unique: true,
      },
      isDelivered: {
        type: Number,
      },
      isInvoiceViewed: {
        type: Number,
      },
      poId: {
        type: Schema.Types.ObjectId,
      },
      po_db_id: {
        type: "Date",
        default: Date.now,
      },
      po_deliveryDate: {
        type: Date,
      },
      deliveryNo: {
        type: String,
      },
      shipping_point: {
        type: String,
      },
      cityId: {
        type: String,
      },

      companyDetails: {
        name: {
          type: String,
        },
        address: {
          type: String,
        },
        telephoneNo: {
          type: String,
        },
        pinCode: {
          type: Number,
        },
        gstNo: {
          type: String,
        },
        email: {
          type: String,
        },
        cinNo: {
          type: String,
        },
        websiteInfo: {
          type: String,
        },
        contactNo: {
          type: Number,
        },
        fssaiNo: {
          type: Number,
        },
        cityId: {
          type: String,
        },
      },
      payerDetails: {
        name: {
          type: String,
        },
        address: {
          type: String,
        },
        mobileNo: {
          type: String,
        },
        gstNo: {
          type: String,
        },
        email: {
          type: String,
        },
        cityId: {
          type: String,
        },
      },

      shippingDetails: {
        name: {
          type: String,
        },
        address1: {
          type: String,
        },
        address2: {
          type: String,
        },
        address3: {
          type: String,
        },
        mobileNo: {
          type: Number,
        },
        pan: {
          type: Number,
        },
        gstNo: {
          type: Number,
        },
        email: {
          type: String,
        },
        cityId: {
          type: String,
        },
        country: {
          type: String,
        },
      },

      invoiceDetails: {
        invoiceNo: {
          type: String,
        },
        invoiceDate: {
          type: String,
        },
        sapID: {
          type: String,
        },
        billing_type: {
          type: String,
        },
        sales_Org: {
          type: Number,
        },
        distribution_channel: {
          type: Number,
        },
        division: {
          type: Number,
        },
        customer_price_group: {
          type: String,
        },
        customer_group: {
          type: String,
        },
        inco_terms: {
          type: String,
        },
        payment_terms: {
          type: String,
        },
        payment_terms_description: { type: String },
        company_code: {
          type: Number,
        },
        //   cityId: {
        //     type: Number,
        //   },
        account_assignment_group: {
          type: String,
        },
        sold_to_party: {
          type: String,
        },
        bill_to_party: {
          type: String,
        },
        payer: {
          type: String,
        },
        paymentTerms: {
          type: String,
        },

        deliveryFrom: {
          type: String,
        },
        sales_order_no: {
          type: String,
        },
        deliveryNo: {
          type: String,
        },
        document_currency: {
          type: String,
        },
        source: {
          type: String,
        },
      },

      invoiceDate: {
        type: Date,
      },
      totalQuantitySupplied: {
        type: String,
      },
      totalQuantityDemanded: {
        type: String,
      },
      totalWeight: {
        type: String,
      },
      totalAmount: {
        type: String,
      },
      totalTax: {
        type: String,
      },
      totalDiscount: {
        type: String,
      },
      totalNetValue: {
        type: String,
      },

      itemSupplied: [
        {
          _id: { type: Schema.Types.ObjectId },
          item_no: {
            type: Number,
          },
          itemId: {
            type: String,
          },
          itemName: {
            type: String,
          },
          batch: {
            type: String,
          },
          item_category: {
            type: String,
          },
          plant: {
            type: Number,
          },
          quantity: {
            type: Number,
          },
          uom: {
            type: String,
          },
          salePrice: {
            type: String,
          },
          cgst_pr: {
            type: Number,
          },
          sgst_pr: {
            type: Number,
          },
          igst_pr: {
            type: Number,
          },
          ugst_pr: {
            type: Number,
          },
          cgst_value: {
            type: Number,
          },
          sgst_value: {
            type: Number,
          },
          igst_value: {
            type: Number,
          },
          ugst_value: {
            type: Number,
          },
          total_amount: {
            type: Number,
          },
          itemAmount: {
            type: Number,
          },
          taxable_value: {
            type: Number,
          },

          mrp_amount: {
            type: Number,
          },
          discountAmount: {
            type: Number,
          },
          HSN_number: {
            type: String,
          },
          TCS_amount: {
            type: Number,
          },
          TCS_rate: {
            type: Number,
          },
        },
      ],
      invoiceType: {
        type: String,
      },
    },
    { timestamps: true }
  );

  const sapStoInvoice = mongoose.model("rapid_sap_sto_invoice", schema);
  return sapStoInvoice;
};
