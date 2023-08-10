module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      company_code: {
        type: String,
      },
      plant_id: {
        type: String,
      },
      po_number: {
        type: String,
      },
      pallet_barcode: {
        type: String,
      },

      damaged_carrier_details: [
        {
          carrier_barcode: {
            type: String,
          },
        },
      ],
    },

    { timestamps: true }
  );

  const damaged_carrier_details = mongoose.model(
    "rapid_damaged_carrier_list",
    schema
  );
  return damaged_carrier_details;
};
