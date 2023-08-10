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
      soId: {
        type: Schema.Types.ObjectId,
      },
      so_db_id: {
        type: "Date",
        default: Date.now,
      },
      so_deliveryDate: {
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
      customerName: {
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
          type: Number,
        },
        pinCode: {
          type: Number,
        },
        gstNo: {
          type: Number,
        },
        email: {
          type: String,
        },
        cinNo: {
          type: Number,
        },
        websiteInfo: {
          type: Number,
        },
        contactNo: {
          type: Number,
        },
        fssaiNo: {
          type: Number,
        },
        cityId: {
          type: Number,
        },
      },
      companyDetails: {
        name: {
          type: String,
        },
        address: {
          type: String,
        },
        telephoneNo: {
          type: Number,
        },
        pinCode: {
          type: Number,
        },
        gstNo: {
          type: Number,
        },
        email: {
          type: String,
        },
        cinNo: {
          type: Number,
        },
        websiteInfo: {
          type: Number,
        },
        contactNo: {
          type: Number,
        },
        fssaiNo: {
          type: Number,
        },
        cityId: {
          type: Number,
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
          type: Number,
        },
        gstNo: {
          type: Number,
        },
        email: {
          type: String,
        },
        cityId: {
          type: Number,
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
          type: Date,
        },
        sapID: {
          type: Number,
        },
        billing_type: {
          type: String,
        },
        sales_Org: {
          type: Number,
        },
        distribution_channel: {
          type: String,
        },
        division: {
          type: Number,
        },
        customer_price_group: {
          type: String,
        },
        customer_group: {
          type: Number,
        },
        inco_terms: {
          type: String,
        },
        payment_terms: {
          type: String,
        },
        company_code: {
          type: Number,
        },
        cityId: {
          type: Number,
        },
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
        sales_order_no: {
          type: String,
        },
        deliveryFrom: {
          type: String,
        },
        irn_no:{
          type: String,
        },
        signed_qrcode:{
          type: String,
        }
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
      account_assignment_group: {
        type: String,
      },
      totalAmount: {
        type: Number,
      },
      totalTax: {
        type: Number,
      },
      totalDiscount: {
        type: Number,
      },
      totalNetValue: {
        type: Number,
      },
      totalWeight: {
        type: Number,
      },

      itemSupplied: [
        {
          item_no: {
            type: Number,
          },
          itemId: {
            type: String,
          },
          item_category: {
            type: String,
          },
          plant: {
            type: Number,
          },
          uom: {
            type: String,
          },
          itemName: {
            type: String,
          },
          salePrice: {
            type: Number,
          },
          quantity: {
            type: Number,
          },
          suppliedQty: {
            type: Number,
          },
          itemAmount: {
            type: Number,
          },
          taxPercentage: {
            type: Number,
          },
          discountAmount: {
            type: Number,
          },
          taxable_value: {
            type: Number,
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
          total_amount: {
            type: Number,
          },
          freeQty: {
            type: Number,
          },
          discountForSingleItem: {
            type: Number,
          },
          amountAfterTaxForSingle: {
            type: Number,
          },
          taxValueForSingleItem: {
            type: Number,
          },
          netValueForSingleItem: {
            type: Number,
          },
          weightInKg: {
            type: Number,
          },
          totalSuppliedQuantity: {
            type: Number,
          },
          requiredQuantity: {
            type: Number,
          },
        },
      ],
      updated_at: {
        type: "Date",
      },
      created_at: {
        type: "Date",
        default: Date.now,
      },
    }
    //   { timestamps: true }
  );

  // schema.method("toJSON", function() {
  //   const { __v, _id, ...object } = this.toObject();
  //   object.id = _id;
  //   return object;
  // });

  const Tutorial = mongoose.model("invoicemasters", schema);
  return Tutorial;
};
