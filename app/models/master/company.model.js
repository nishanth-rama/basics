module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      company_code: {
        type: String,
      },

      company_name: {
        type: String,
      },

      address: {
        type: String,
      },
      country_id: {
        type: Number,
      },
      state_id: {
        type: Number,
      },
      city_id: {
        type: Number,
      },
      postcode: {
        type: Number,
      },
      contact_number1: {
        type: Number,
        min: 1000000000,
        max: 9999999999,
      },

      contact_number2: {
        type: Number,
        min: 1000000000,
        max: 9999999999,
      },

      email: {
        type: String,
        lowercase: true,
        unique: true,
        validate: [
          /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
          "please provide a valid email",
        ],
        required: true,
      },

      website_url: {
        type: String,
      },

      logo_url: {
        type: String,
      },

      // pallet_prefix: {
      //   type: String,
      // },
      // pallet_suffix: {
      //   type: String,
      // },
      integrated_appl: {
        type: Number,
      },

      gst_number: {
        type: String,
      },

      cin_number: {
        type: String,
      },

      fssai_number: {
        type: String,
      },
      created_by: {
        type: Date,
        default: new Date(),
      },

      updated_by: {
        type: Date,
        default: null,
      },
      active_status: {
        type: Number,
        enum: [1, 0],
        default: 1,
      },
    },
    { timestamps: true }
  );

  const Tutorial = mongoose.model("rapid_companymasters", schema);
  return Tutorial;
};
