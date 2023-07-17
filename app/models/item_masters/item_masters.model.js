module.exports = (mongoose) => {
    var mongoose = require("mongoose");
    const Schema = mongoose.Schema;
    const item_master_schema = new Schema(
      {
        itemName: {},
        material_type: {},
        material_group: {},
        uom: {},
        alt_uom: {},
      },
      { strict: false }
    );
    const item_masters = mongoose.model("itemmasters", item_master_schema);
  
    return item_masters;
  };
  