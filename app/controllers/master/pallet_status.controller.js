

const db = require("../../models");

const pallets_detail_table = db.pallets;

exports.getPalletStatus = async (req, res) => {
    const { company_code, plant_id } = req.query;
  
    try {
        
      if (!(company_code && plant_id))
        return res
          .status(400)
          .send({ message: "Please provide company code rack type and status" });
       
      const totalcount = await pallets_detail_table.find(
        {
          company_code: company_code,
          plant_id: plant_id,
         
        } ).countDocuments();
      
        var total = totalcount;
      console.log(total);
      const palletization_status = "Primary_storage";
      const palletization_status1 = "Secondary_storage";
      const palletization_status2 = "Dispatch_area";
      const palletization_status3 = "Unassigned";
  // primari storage   
 const getbyPrimary_Occupied = await pallets_detail_table.find(
    {
        company_code: company_code,
        plant_id: plant_id,
        palletization_status : palletization_status,
      
      } ).countDocuments();
     
const primary_occupied = getbyPrimary_Occupied;
   // Secondary_storage  
 const getbySecondary_Occupied = await pallets_detail_table.find(
    {
        company_code: company_code,
        plant_id: plant_id,
        palletization_status : palletization_status1,
      } ).countDocuments();
  

const secondary_occupied = getbySecondary_Occupied;
// Dispatch_area
const getbydispatch_Occupied = await pallets_detail_table.find(
    {
        company_code: company_code,
        plant_id: plant_id,
        palletization_status : palletization_status2,
      } ).countDocuments();
  

const dispatch_occupied = getbydispatch_Occupied;
// Unassigned
const getbyUnassigned = await pallets_detail_table.find(
    {
        company_code: company_code,
        plant_id: plant_id,
        palletization_status : palletization_status3,
      } ).countDocuments();
  

const unassigned = getbyUnassigned;


let mssge = "Pallets are available";
if (total.length == 0) mssge = "Pallets are not available!";
var assigned = total - unassigned;

var primary_pallet = {primary_occupied};
var secondary_pallet = {secondary_occupied};
var dispatch_pallet = {dispatch_occupied};
var total_pallet = {assigned,unassigned};

var Pallets = [
    {primary_pallet,secondary_pallet,dispatch_pallet,total_pallet}
]


return res.status(200).send({status_code: "200", message: mssge, Pallet: Pallets });

    } catch (err) {
      console.log(err);
      return res.status(500).send({status_code: "500",
        message: "Some error occurred while fetching user module names!",
      });
    }
  };