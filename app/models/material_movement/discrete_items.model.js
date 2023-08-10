module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      company_code: {
        type: String,
      },
      plant_id: {
        type: String,
      },
      uom: {
        type: String,
      },
      material_code: {
        Type: String,
      },
      material_name: {
        type: String,
      },
      carrier_capacity : {
        type : Number
      }
    },
    { timestamps: true }
  );

  const discrete_item = mongoose.model("rapid_discrete_items", schema);
  return discrete_item;
};
