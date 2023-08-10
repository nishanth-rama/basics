// const mongoose = require("mongoose");
// const Schema = mongoose.Schema;

// module.exports = (mongoose) => {
//   var schema = mongoose.Schema(
//     {
//       company_code: {
//         type: String,
//         required: true,
//       },

//       plant_id: {
//         type: String,
//         required: true,
//       },

//       item_code: {
//         type: String,
//         required: true,
//       },

//       item_name: {
//         type: String,
//         required: true,
//       },

//       brand: {
//         type: String,
//         required: true,
//       },

//       carrier_count: {
//         type: Number,
//         required: true,
//       },

//       carrier_type: {
//         type: String,
//         required: true,
//       },

//       rack_capacity: {
//         type: Number,
//         required: true,
//       },

//       created_by: {
//         type: String,
//       },

//       updated_by: {
//         type: String,
//       },
//     },
//     { timestamps: true }
//   );

//   const product_weight_model = mongoose.model(
//     "rapid_products_carrier_count",
//     schema
//   );
//   return product_weight_model;
// };
