module.exports = (mongoose) => {
    var mongoose = require("mongoose");
    const Schema = mongoose.Schema;
    const item_master_schema = new Schema(
      {
        material_number:{},
        material_desc:{},
        material_type: {},
        material_group: {},
        uom: {},
        altuom: {},
      },
      { timestamps: true,strict : false }
    );
    const item_masters = mongoose.model("rapid_wdc_item_masters", item_master_schema);
  
    return item_masters;
  };
  