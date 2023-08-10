module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        allocation_id: { type: String },
        plant_id: { type: String },
        company_code: { type: String },
        invoice_no: { type: String },
        create_date: { type: String },
        sales_order_no: { type: String },
        delivery_date: { type: String },
        company_code: { type: String },
        customer_code: { type: String },
        route_id: { type: String },
        pallet_details: [{ _id: false, pallet_id: { type: String } }]
      },
      { timestamps: true }
    );
  
    const invoice_allocation = mongoose.model("rapid_allocation_invoice_details", schema);
    return invoice_allocation;
  };
  