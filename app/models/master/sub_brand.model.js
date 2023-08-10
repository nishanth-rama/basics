module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      company_code: {
        type: String,
      },
      plant_id: {
        type: String,
      },
      brand_name: {
        type: String,
      },
      sub_brand: {
        type: String,
      }
    },
    { timestamps: true }
  );



  const subBrand = mongoose.model("rapid_sub_brand", schema);
  return subBrand;
};
