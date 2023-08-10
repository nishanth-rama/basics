module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      company_code: {
        type: String,
      },
      // company_name: {
      //   type: String,
      // },
      plant_id: {
        type: String,
      },
      driverId: {
        type: String,
        unique: true,
      },
      driverName: {
        type: String,
      },
      driverNumber: {
        type: Number,
      },

      created_by: {
        type: String,
      },
      updated_by: {
        type: String,
      },
      active_status: {
        type: Number,
        enum: [1, 0],
        default: 1,
      },
    },
    { timestamps: true }
  );

  // schema.method("toJSON", function() {
  //   const { __v, _id, ...object } = this.toObject();
  //   object.id = _id;
  //   return object;
  // });

  const Tutorial = mongoose.model("rapid_drivermasters", schema);
  return Tutorial;
};
