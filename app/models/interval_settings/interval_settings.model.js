module.exports = mongoose => {
  const schema = mongoose.Schema({
    company_code: {
        type: String
    },
    plant_id: {
        type: String
    },
    time_records: [
      {
        function_name: {
          type:String
        },
        time_interval: {
          type: String
        },
        conversion_value: {
          type: Number
        }
      }
    ] 
  })

  const IntervalModel = mongoose.model("rapid_time_settings", schema) 
  return IntervalModel;
}