const { boolean } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      sales_order_no: {
        type: String,
        required: true,
      },
      isSOCancelled : {
        type:Boolean
      },
      sales_document_type: {
        type: String,
      },
      distribution_channel: {
        type: String,
      },
      distribution_channel_description: {
        type: String,
      },

      item_no: {
        type: String,
        required: true,
      },
      material_no: {
        type: String,
        required: true,
      },

      material_name: {
        type: String,
        required: true,
      },

      // item_id : {
      //   type : String,
      // },

      customer_code: {
        type: String,
        required: true,
      },
      customer_name: {
        type: String,
        required: true,
      },
      uom: {
        type: String,
        required: true,
      },
      price: {
        type: Number,
      },
      order_qty: {
        type: Number,
        required: true,
      },
      allocated_qty: {
        // type: Schema.Types.Decimal128
        type: Number,
        required: true,
      },
      pending_qty: {
        type: Number,
        required: true,
      },
      delivery_date: {
        type: String,
      },
      entry_time: {
        type: Date,
        default: new Date(),
      },
      order_placing_date: {
        type: Date,
      },
      company_code: {
        type: String,
      },
      plant_id: {
        type: String,
        required: true,
      },
      create_count: {
        type: Number,
      },
      route_id: {
        type: String,
      },
      is_ready_for_invoice: {
        type: Boolean,
        default: false,
      },
      allocation_detail: [
        {
          // allocation_id : {
          //   type : String
          // },

          crate_barcode: {
            type: String,
          },

          tare_weight: {
            type: Number,
          },
          gross_weight: {
            type: Number,
          },
          net_weight: {
            type: Number,
          },
          exact_net_weight: { type: Number },
          user_name: {
            type: String,
          },
          entry_time: {
            type: Date,
            default: new Date(),
          },
          allocation_status: {
            type: String,
            default: "wait",
          },
          data_scanner: {
            type: String,
          },
          mode: {
            type: String,
          },
          location: {
            type: String,
          },
          pallet_barcode: { type: String },
          crate_type:{ type: String },
        },
      ],

      allocation_status: {
        type: String,
        enum: ["PENDING", "PICKED", "ALLOCATED"],
        default: "PENDING",
      },
      lotting_loss : {
        type: Number,
        default: 0
      },
      delivery_posted_qty:{
        type: Number,
        default: 0
      },
      inventory_delivery_posted_qty:{
        type: Number,
        default: 0
      },
      inventory_allocated_qty:{
        type: Number,
        default: 0
      },
      created_by: {
        type: String,
      },
    },
    { timestamps: true }
  );

  const soAllocation = mongoose.model("rapid_sales_order_allocations", schema);
  return soAllocation;
};
