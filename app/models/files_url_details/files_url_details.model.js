module.exports = (mongoose) => {
    var schema = mongoose.Schema(
        {
            is_deleted: {
                type: Boolean,
                default: false
            },
            company_code: {
                type: String,
            },
            plant_id: {
                type: String,
            },
            po_number: {
                type: String,
            },
            po_creation_date :{
                type : String
            },
            po_type :{
                type:String
            },
            asn_number : {
               type :String
            },
            vendor_name :{
                type : String
            },
            invoice_url: {
                type: String,
            },
            grn_no: {
                type: String,
            },
            invoice_no: {
                type: String,
            },
            invoice_date: {
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

    const Tutorial = mongoose.model("rapid_files_invoice_details", schema);
    return Tutorial;
};
