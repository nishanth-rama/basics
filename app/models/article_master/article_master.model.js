const mongoose = require("mongoose");
const Schema = mongoose.Schema;

module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      company_code: { type: String },
      plant_id: { type: String },
      brand: { type: String },
      sub_brand: { type: String },
      material_name: { type: String },
      material_code: { type: String },
      max_stock: {type: Number},
      uom: { type: String },
      price: { type: String }
    },
    {
      timestamps: true,
    }
  );
  const articleMaster = mongoose.model("rapid_article_master", schema);
  return articleMaster;
};
