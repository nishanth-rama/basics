const db = require("../../models");
const moment_tz = require("moment-timezone");
const cc_crate_table = db.crateDetails;
const axios = require("axios");
const { filter } = require("lodash");

exports.add_crates_detail = async (req, res) => {
  const { company_code, from_date, to_date } = req.query;

  if (!(company_code && from_date && to_date)) {
    return res.send({
      status_code: 400,
      message: "Please provide company code,from_date and to_date",
    });
  }

  try {
    const today_date = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD");

    let crate_url = `https://uat-farmconnect.censanext.com/v1/History_Api/crate_history_wetdc?from_date=${from_date}&to_date=${to_date}`;

    let crate_data = await axios.get(crate_url);

    // console.log("crate_url", crate_data.data.data.length);

    // console.log("crate_data", crate_data.data.data);

    if (
      crate_data.data &&
      crate_data.data.data &&
      crate_data.data.data.length
    ) {
      let crate_result = crate_data.data.data.map(async (item, idx) => {
  
    
        let filter = {
          po_number: item.po_no,
          crate_id: item.crate_id,
          // allocated:{$ne:"true"}
        };

        let check_entry = await cc_crate_table.findOne(filter)


        if(check_entry && check_entry.allocated == true){
          var entry_obj = {
            company_code: req.query.company_code,
            po_number: item.po_no,
            po_type: item.doc_type,
            delivery_no:(item.delivery_no).trim(),
            invoice_number: item.invoice_no,
            item_no: item.item_no,
            order_qty: item.order_qty,
            cc_id: item.cc_id,
            cc_name: item.cc_name,
            dc_id: item.dc_id,
            dc_name: item.location_name,
            item_code: item.item_code,
            item_name: item.item_name,
            item_uom: item.item_uom,
            crate_id: item.crate_id,
            crate_weight: item.crate_weight_source,
            indent_number: item.indent_no,
            supplier_code: item.supplier_code,
            supplier_name: item.supplier_name,
            rn_number: item.rn_no,
            entry_date: today_date,
            allocated: true,
            po_delivery_date: item.po_delivery_date,
            po_document_date: item.po_document_date,
            purchase_group: item.purchase_group,
            stopo_order_qty: item.stopo_order_qty
  
          };
        }
        else {
          var entry_obj = {
            company_code: req.query.company_code,
            po_number: item.po_no,
            po_type: item.doc_type,
            delivery_no:(item.delivery_no).trim(),
            invoice_number: item.invoice_no,
            item_no: item.item_no,
            order_qty: item.order_qty,
            cc_id: item.cc_id,
            cc_name: item.cc_name,
            dc_id: item.dc_id,
            dc_name: item.location_name,
            item_code: item.item_code,
            item_name: item.item_name,
            item_uom: item.item_uom,
            crate_id: item.crate_id,
            crate_weight: item.crate_weight_source,
            indent_number: item.indent_no,
            supplier_code: item.supplier_code,
            supplier_name: item.supplier_name,
            rn_number: item.rn_no,
            entry_date: today_date,
            allocated: false,
            po_delivery_date: item.po_delivery_date,
            po_document_date: item.po_document_date,
            purchase_group: item.purchase_group,
            stopo_order_qty: item.stopo_order_qty
  
          };
        }
      
    
        return await cc_crate_table.updateOne(filter, entry_obj, {
          upsert: true,
          new: true,
        });
      });

      var result = await Promise.all(crate_result)
        .then((value) => {
          // console.log("value", value.length);
          return res.send({ status_code: 200, message: "Crate added!" });
        })
        .catch((error) => {
          return res.status(500).send({
            status_code: 500,
            message: error.message || "error occured while adding crates",
          });
        });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "No crate to add!",
      });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      status_message:
        error.message || "Some error occurred while saving crate detail",
    });
  }
};


exports.cron_add_crates_detail = async (parameter) => {
  const { company_code } = parameter;

  // if (!(company_code && from_date && to_date)) {
  //   return res.send({
  //     status_code: 400,
  //     message: "Please provide company code,from_date and to_date",
  //   });
  // }



  try {
    const today_date = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD");

    let crate_url = `https://uat-farmconnect.censanext.com/v1/History_Api/crate_history_wetdc?from_date=${today_date}&to_date=${today_date}`;

    let crate_data = await axios.get(crate_url);

    // console.log("crate_data", crate_data.data.data);

    if (
      crate_data.data &&
      crate_data.data.data &&
      crate_data.data.data.length
    ) {

      let crate_result = crate_data.data.data.map(async (item, idx) => {


        let filter = {
          po_number: item.po_no,
          crate_id: item.crate_id,
        };

        
        let entry_obj = {
          company_code: req.query.company_code,
          po_number: item.po_no,
          po_type: item.doc_type,
          delivery_no:(item.delivery_no).trim(),
          invoice_number: item.invoice_no,
          item_no: item.item_no,
          order_qty: item.order_qty,
          cc_id: item.cc_id,
          cc_name: item.cc_name,
          dc_id: item.dc_id,
          dc_name: item.location_name,
          item_code: item.item_code,
          item_name: item.item_name,
          item_uom: item.item_uom,
          crate_id: item.crate_id,
          crate_weight: item.crate_weight_source,
          indent_number: item.indent_no,
          supplier_code: item.supplier_code,
          supplier_name: item.supplier_name,
          rn_number: item.rn_no,
          entry_date: today_date,
          allocated: false,
          po_delivery_date: item.po_delivery_date,
          po_document_date: item.po_document_date

        };

        return await cc_crate_table.updateOne(filter, entry_obj, {
          upsert: true,
          new: true,
        });
      });

      var result = await Promise.all(crate_result)
        .then((value) => {
           return "Crate added!"
          // return res.send({ status_code: 200, message: "Crate added!" });
        })
        .catch((error) => {
          return error.message
          // return res.status(500).send({
          //   status_code: 500,
          //   message: error.message || "error occured while adding crates",
          // });
        });

        return result

        console.log("result",result);
    } else {
      return "No crate to add!"
      // return res.status(400).send({
      //   status_code: 400,
      //   message: "No crate to add!",
      // });
    }
  } catch (error) {
   
    return error.message
    // return res.status(500).send({
    //   status_code: 500,
    //   status_message:
    //     error.message || "Some error occurred while saving crate detail",
    // });
  }
};

exports.get_crates_detail =async (req,res)=>{
  try {

    var { plant_id, document_date, po_number } = req.query;

        
    if (!(plant_id && document_date )) {
        return res.send({
          status_code: 400,
          message: "Missing Parameters!",
        });
      }

      let filter = {dc_id:plant_id,po_document_date:document_date}

      if(po_number){
          filter.po_number = po_number
      }


      
    let crate_detail = await cc_crate_table.aggregate([{
      $match :filter
    },
    {
      $project :{
        _id:0,
        __v:0
      }
    },
    {$sort :{
      createdAt:1
    }}
  ])

    if(crate_detail.length){
      return res.send({ status_code: 200, message: "Crate list!",data:crate_detail });
    }
    else {
      return res.status(400).send({ status_code: 400, message: "Crate list not available!" });
    }

  }
  catch(error){
    return res.status(500).send({
      status_code: 500,
      status_message:
        error.message || "Some error occurred while getting crate detail",
    });
  }
}
