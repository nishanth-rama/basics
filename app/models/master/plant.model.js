module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      company_code: {
        type: String,
      },
      company_name: {
        type: String,
      },
      plant_id: {
        type: String,
        unique: true,
      },
      plant_region: {
        type: String,
      },
      plant_name: {
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
      plant_address: {
        type: String,
      },
      pin_code: {
        type: Number,
      },
      official_mail_id: {
        type: String,
        lowercase: true,
        unique: true,
        validate: [
          /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
          "please provide a valid email",
        ],
        required: true,
      },

      contact_number: {
        type: Number,
        min: 1000000000,
        max: 9999999999,
      },

      gst_number: {
        type: String,
      },
      fssai_number: {
        type: String,
      },
      cin_number: {
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
      plant_type: {
        type: String,
      },
      dc_type: {
        type: String,
      }
    },
    { timestamps: true }
  );

  const Tutorial = mongoose.model("rapid_plantmasters", schema);
  return Tutorial;
};
