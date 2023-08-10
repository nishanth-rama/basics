module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      company_code : {
        type: String,
        default: ''
      },
      company_name : {
        type: String, 
        default: ''
      },
      minimum_password_length: {
        type: Number,
        default: 8,
      },
      atleast_one_number: {
        type: Number,
        enum: [0,1],
        default: 1,
      },
      atleast_one_special_character: {
        type: Number,
        enum: [0,1],
        default: 1,
      },
      atleast_one_capital_letter: {
        type: Number,
        enum: [0,1],
        default: 1,
      },
      atleast_one_small_letter: {
        type: Number,
        enum: [0,1],
        default: 1,
      },
      password_expiry_time : {
        type: Number,
        default: 30,
      },
      user_session_expiry_time: {
        type: Number,
        default: 30
      },
      max_invalid_attempt: {
        type: Number,
        default: 3
      },
    },
    { timestamps: true }
  );

  const system_config = mongoose.model("rapid_company_configuration", schema);
  return system_config;
};