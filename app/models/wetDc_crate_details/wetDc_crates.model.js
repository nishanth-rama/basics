module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      company_code: {
        type: String,
      },
      po_type: {
        type: String
      },
      po_number: {
        type: String,
      },
      delivery_no :{
        type: String,
      },
      invoice_number :{
        type : String
      },
      po_type: {
        type: String,
      },
      purchase_group:{
        type: String,
      },
      cc_id: {
        type: String,
      },
      cc_name: {
        type: String,
      },
      dc_id: {
        type: String,
      },
      dc_name: {
        type: String,
      },
      item_code: {
        type: String,
      },
      item_name: {
        type: String,
      },
      item_uom: {
        type: String,
      },
      item_no: {
        type: String,
      },
      order_qty: {
        type: Number,
      },
      stopo_order_qty: {
        type: Number,
      },
      crate_id: {
        type: String,
      },
      crate_weight: {
        type: Number,
      },
      indent_number: {
        type: String,
      },
      supplier_code: {
        type: String,
      },
      supplier_name: {
        type: String,
      },
      rn_number: {
        type: String,
      },
      entry_date: {
        type: String,
      },
      po_delivery_date:{
        type: String,
      },
      po_document_date:{
        type: String,
      },
      allocated: {
        type: Boolean,
        default: false,
      },
    },
    { timestamps: true }
  );

  const wetDc_crate = mongoose.model("rapid_wdc_crate_details", schema);
  return wetDc_crate;
};
