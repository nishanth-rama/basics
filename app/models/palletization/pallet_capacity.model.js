module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      company_code: {
        type: String,
      },
      plant_id: {
        type: String,
      },
      material_no: {
        type: String,
      },
      material_name: {
        type: String,
      },
      capacity: {
        type: Number,
      },
    },
    { timestamps: true }
  );

  // schema.method("toJSON", function() {
  //   const { __v, _id, ...object } = this.toObject();
  //   object.id = _id;
  //   return object;
  // });

  const Pallet_capacity = mongoose.model("rapid_pallet_capacities", schema);
  return Pallet_capacity;
};
