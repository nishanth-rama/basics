"use strict";

module.exports = (mongoose) => {
  var mongoose = require("mongoose");

  var schema = mongoose.Schema(
    {
      company_code: {
        type: String,
        default: null,
      },

      plant_id: {
        type: String,
        required: true,
      },

      cc_id: {
        type: String,
      },

      delivery_date: {
        type: String,
        required: true,
      },

      document_date: {
        type: String,
      },

      supplier_no: {
        type: String,
        required: true,
      },

      supplier_name: {
        type: String,
        required: true,
      },

      po_no: {
        type: String,
        required: true,
      },

      po_type: {
        type: String,
        required: true,
      },

      item_no: {
        type: String,
        required: true,
      },

      item_code: {
        type: String,
        required: true,
      },

      item_name: {
        type: String,
        required: true,
      },

      invoice_no: {
        type: String,
      },

      ordered_qty: {
        type: Number,
        required: true,
      },
      po_qty: {
        type: Number,
      },
      asn_item_no: {
        type: String,
      },
      // outward_qty: {
      //   type: Number,
      // },

      purchase_group: {
        type: String,
      },

      sto_number: {
        type: String,
      },

      uom: {
        type: String,
        required: true,
      },

      unit_price: {
        type: String,
        default: null,
      },

      total_inwarded_qty: {
        type: Number,
        required: true,
      },

      total_pending_qty: {
        type: Number,
        required: true,
      },

      total_extra_qty: {
        type: Number,
        default: 0,
      },
      total_grn_post_qty: {
        type: Number,
        default: 0,
      },
      inventory_grn_posted_qty: {
        type: Number,
        default: 0,
      },
      inventory_net_qty: {
        type: Number,
      },

      total_crates: {
        type: Number,
        required: true,
      },

      total_crates_weight: {
        type: Number,
        required: true,
      },
      po_grn_status: {
        type: String,
        default: "pending",
      },
      total_net_qty: {
        type: Number,
        required: true,
      },

      rejected_qty: {
        type: Number,
        default: 0,
      },

      grn_posted: {
        type: Boolean,
        default: false,
      },
      // pallet_stacked_count: {
      //   type: Number,
      //   required: true,
      // },
      inbound_delivery_number: {
        type: String,
      },

      inward_crate_details: [
        {
          crate_barcode_value: {
            type: String,
            required: true,
          },
          crate_type: {
            type: String,
            default: "",
          },
          inwarded_qty: { type: Number, required: true },

          crate_tare: { type: Number, required: true, default: 0 },

          net_qty: { type: Number, required: true },

          pallet_barcode: {
            type: String,
            // default: "",
          },
          expiry_date: {
            type: String,
          },

          inwarded_by: {
            type: String,
            required: true,
          },
          inwarded_time: {
            type: String,
            default: null,
          },

          grn_no: {
            type: String,
            default: null,
          },

          grn_status: {
            type: String,
            default: "wait",
          },
          mode: {
            type: String,
          },
          so_delivery_date: {
            type: String,
          },
          auto_allocation: {
            type: Boolean,
          },
          allocated: {
            type: Boolean,
            default: false,
          },
        },
      ],

      created_at: {
        type: Date,
        default: new Date(),
      },

      updated_at: {
        type: Date,
        default: null,
      },
    },
    { timestamps: true }
  );
  const inward_process = mongoose.model(
    "rapid_purchase_order_inward_details",
    schema
  );

  return inward_process;
};
