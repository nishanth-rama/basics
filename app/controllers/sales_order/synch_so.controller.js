const { default: axios } = require("axios");
const moment_tz = require("moment-timezone");
const new_sap_url = process.env.NEW_SAP_URL;
const api_base_url = process.env.BASE_URL;
const db = require("../../models");

exports.synch_so_on_plant_id = async (req, res) => {
  try {
    if (!req.query.plant_id) {
      return res.send({
        status_code: 400,
        message: "Please provide plant Id",
      });
    }

    const today_date = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD");


      let last_so_synched = await db.soAllocation.aggregate([
        {
          $match :{
          plant_id: req.query.plant_id,
        }},
        {
          $sort :{
            updatedAt :-1
          }
        },
        {
          $limit : 1
        },
        {
          $project :{
            updatedAt:1,
              last_date : {
                $dateToString :{
                  format: "%Y-%m-%d %H:%M:%S",
                  date: '$updatedAt',
                  timezone: "Asia/Kolkata",
                }
              },
       
          }
        }
    ])  

    // console.log("today_date", today_date,last_so_synched);

    let url_1 = `${new_sap_url}/Sales_Order_Get_Sync_Plant/${req.query.plant_id}`;
    // let url_1 = `https://uat-api-waycoolmaster.censanext.com/index.php/Sales_Order_Get_Sync_Plant/${req.query.plant_id}`;
    let sap_to_mdb = await axios.get(url_1);
    // console.log("sap_to_mdb",sap_to_mdb.status,sap_to_mdb.statusText)


    if (sap_to_mdb.data && sap_to_mdb.data.status == 200 ){
      let url_2 = `${new_sap_url}/masterToDms_SOSync_plant/${req.query.plant_id}`;
      // let url_2 = `https://uat-api-waycoolmaster.censanext.com/index.php/masterToDMS_specific_po/${req.query.purchase_order}`;
      let mdb_to_dms = await axios.get(url_2);

      // console.log("mdb_to_dms", mdb_to_dms.data);

      if (mdb_to_dms.data && mdb_to_dms.data.status == 200) {
        let url_3 = `${api_base_url}api/allocation/manual_synch_sales_order?plant_id=${req.query.plant_id}&delivery_date=${today_date}`;
        // let url_3 = `https://uat-api-rapid.censanext.com/api/allocation/manual_synch_sales_order?plant_id=${req.query.plant_id}&delivery_date=${today_date}`;
        let dms_to_so_allocation = await axios.get(url_3);
     
        if (dms_to_so_allocation.data) {
          return res.send({
            status_code: dms_to_so_allocation.data.status,
            so_last_synched : last_so_synched[0].last_date,
            message: mdb_to_dms.data.message,
          });
        } else {
          return res.send({
            status_code: 400,
            message:
              "Some error occurred while synching SO from sales order to sales order allocation collection",
          });
        }
        // if(dms_to_so_allocation.data && dms_to_so_allocation.data.status == 200){
        //     return dms_to_so_allocation.data
        // }
        return res.send({ status_code: 200, message: mdb_to_dms.data.message });
      } else if (mdb_to_dms.data && mdb_to_dms.data.status != 200) {
        return res.send({
          status_code: mdb_to_dms.data.status,
          message: mdb_to_dms.data.message,
        });
      } else {
        // if err  console.log(mdb_to_dms)
        return res.send({
          status_code: 400,
          message: "Some error occurred while synching so from mdb to dms",
        });
      }
    } else if (sap_to_mdb.data && sap_to_mdb.data.status != 200) {
      return res.send({ status_code: 400, message: sap_to_mdb.data.message });
    } else {
      // if err  console.log(sap_to_mdb)
      return res.send({
        status_code: 400,
        message: "Some error occurred while synching so from sap to mdb",
      });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message: error.message || "Some error occurred while retrieving data",
    });
  }
};
