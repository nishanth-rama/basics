const { number, string } = require("joi");

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
      },
      plant_name: {
        type: String,
      },
      assert_type: {
        type: String,
      },
      pallet_id: {
        type: String,
      },
      pallet_no: {
        type: String,
      },
      prefix: {
        type: String,
        default: null,
      },
      suffix: {
        type: String,
        default: null,
      },
      mode: {
        type: String,
      },
      created_by: {
        type: String,
      },
      created_at: {
        type: Date,
        default: new Date(),
      },
      updated_by: {
        type: String,
        default: null,
      },
      updated_at: {
        type: Date,
        default: null,
      },

      active_status: {
        type: Number,
        enum: [1, 0],
        default: 1,
      },
      palletization_status: {
        type: String,
        enum: [
          "Unassigned",
          "Assigned",
          "Stacking",
          "Stacked",
          "Primary_storage",
          "Secondary_storage",
          "Dispatch_area",
        ],
        default: "Unassigned",
      },
    },
    { timestamps: true }
  );

  const Tutorial = mongoose.model("rapid_palletmasters", schema);
  return Tutorial;
};
