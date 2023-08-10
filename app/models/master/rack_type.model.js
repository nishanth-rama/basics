module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      company_code: {
        type: String,
        minlength: 1,
        maxlength: 16,
        required: true,
      },
      company_name: {
        type: String,
        minlength: 4,
        maxlength: 50,
        required: true,
      },
      plant_id: {
        type: String,
        minlength: 1,
        maxlength: 16,
        required: true,
      },
      plant_name: {
        type: String,
        minlength: 4,
        maxlength: 50,
        required: true,
      },
      rack_type: {
        type: String,
        minlength: 4,
        maxlength: 24,
        required: true,
      },

      approximate_capacity: {
        type: Number,
        min: 1,
        max: [10000, "Not allowed more than 10 tons per rack!"],
        required: true,
      },

      created_by: {
        type: String,
        minlength: 4,
        maxlength: 30,
        required: true,
      },
      updated_by: {
        type: String,
        minlength: 4,
        maxlength: 30,
        required: true,
      },
    },
    { timestamps: true }
  );

  const Rack_entry = mongoose.model("rapid_rack_types", schema);
  return Rack_entry;
};
