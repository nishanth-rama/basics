module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      company_code: {
        type: String,
      },
      name: {
        type: String,
      },
      email: {
        type: String,
      },
      mobile: {
        type: Number,
      },
      password: {
        type: String,
      },
      roleId: {
        type: String,
      },
      address: {
        type: String,
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

  const Tutorial = mongoose.model("rapid_cratemasters", schema);
  return Tutorial;
};
