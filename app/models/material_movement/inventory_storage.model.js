module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      company_code: {
        type: String,
      },
      plant_id: {
        type: String,
      },
      inventory_date: {
        type: String,
      },
      rack_id: {
        type: String,
      },
      total_pallet: {
        type: String,
      },
      scanned_pallet: {
        type: String,
      },
      missed_pallet: {
        type: String,
      },

      pallet_details: [
        {
          location_id: {
            type: String,
          },
          po_number: {
            type: Number,
          },
          material_code: {
            type: String,
          },
          material_name: {
            type: String,
          },
          total_stock: {
            type: Number,
          },
          uom: {
            type: String,
          },
          pallet_barcode: {
            type: String,
          },
          expiry_date: {
            type: String,
          },
          expiry_in: {
            color_code: {
              type: String,
            },
            expiry_status: {
              type: String,
            },
          },
          stacked_date: {
            type: String,
          },
          is_checked: {
            type: Boolean,
            default: false,
          },
          carrier_count: {
            type: Number,
          },
          carrier_detail: [
            {
              carrier_barcode: { type: String },
              carrier_id: { type: String },
              carrier_type: { type: String },
              tare_weight: { type: Number },
              gross_weight: { type: Number },
              net_weight: { type: Number },
              carrier_status: {
                type: String,
                enum: ["PRESENT", "REMOVED"],
                default: "PRESENT",
              },
            },
          ],
        },
      ],
    },

    { timestamps: true }
  );

  const inventory_data = mongoose.model("rapid_inventory_data", schema);
  return inventory_data;
};
