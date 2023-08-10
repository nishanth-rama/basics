module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      company_code: {
        type: String,
      },
      plant: {
        type: String,
      },
      po_number: {
        type: String,
      },
      item: [
        {
          item_no: {
            type: String,
          },
          material_no: {
            type: String,
          },
          batch: {
            type: String,
          },
          expiry: {
            type: String,
          },
          hsn_code: {
            type: String,
          },
        },
      ],
    },
    { timestamps: true }
  );
  const purchase_order_batch = mongoose.model(
    "rapid_purchase_order_batch_details",
    schema
  );
  return purchase_order_batch;
};
