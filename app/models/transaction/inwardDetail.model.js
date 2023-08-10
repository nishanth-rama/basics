module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        pono: {
            type: String,
          },
          orderedQty: {
            type: Number
          },
          inwardQty: {
            type: String,
          },
          inwardDate: {
            type: Date,
            required: true
          },
          deliveryDate: {
            type: Date,
            default: Date.now
          },
          company_code : {
            type: String,
          }
         

      },
      { timestamps: true }
    );
  
    // schema.method("toJSON", function() {
    //   const { __v, _id, ...object } = this.toObject();
    //   object.id = _id;
    //   return object;
    // });
  
    const Tutorial = mongoose.model("rapid_inward_detail", schema);
    return Tutorial;
  };

  
  