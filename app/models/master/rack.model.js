const { boolean } = require("joi");

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
      rack_type: {
        type: String,
      },
      unit_no: { type: Number },

      rack_id: {
        type: String,
      },
      level_id: {
        type: String,
      },

      column_id: {
        type: String,
      },

      location_id: {
        type: String,
      },
      location_name: {
        type: String,
      },
      created_by: {
        type: String,
      },
      updated_by: {
        type: String,
      },

      locked: {
        type: Boolean,
        default: false,
      },

      locked_by: {
        type: String,
        default: "",
      },

      active_status: {
        type: Number,
        enum: [1, 0],
        default: 1,
      },

      status: {
        type: String,
        enum: ["occupied", "unoccupied"],
        default: "unoccupied",
      },
    },
    { timestamps: true }
  );

  // schema.method("toJSON", function() {
  //   const { __v, _id, ...object } = this.toObject();
  //   object.id = _id;
  //   return object;
  // });

  const Rack_entry = mongoose.model("rapid_rack_masters", schema);
  return Rack_entry;
};
