const { string } = require("joi");
const mongoose = require("mongoose");
const autoIncrement = require("mongoose-sequence")(mongoose);

module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      company_code :{
        type :String
      } ,
      plant_id :{
        type : String
      },
      invoice_template_type :{
        type :String
      },
      inward_weighing_scale :{
        type : Boolean,
        default: false
      },
      allocation_weighing_scale :{
        type : Boolean,
        default: false
      },
      
      manual_inward :{
        type : Boolean,
        default: false
      },
      allocated_inward_qty :{
        type : Boolean,
        default: false
      },
      manually_so_allocated :{
        type : Boolean,
        default: false
      },
      inward_print_status :{
        type : Boolean,
        default: false
      },
      
      allocation_print_status :{
        type : Boolean,
        default: false
      },
      auto_allocation :{
        type:Boolean,
        default:false
      }

    },
    { timestamps: true }
  );

  const company_plant_config = mongoose.model("rapid_company_plant_config", schema);
  return company_plant_config;
};
