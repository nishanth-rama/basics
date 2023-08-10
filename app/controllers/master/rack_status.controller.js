

const db = require("../../models");

const racks_detail_table = db.racks;

exports.getRackStatus = async (req, res) => {
    const { company_code, plant_id } = req.query;
  
    try {
        
      if (!(company_code && plant_id))
        return res
          .status(400)
          .send({ message: "Please provide company code rack type and status" });
       
      const totalcount = await racks_detail_table.find(
        {
          company_code: company_code,
          plant_id: plant_id,
         
        } ).countDocuments();
      
        var total = totalcount;
      
   
      const rack_type = "primary";
      const rack_type1 = "secondary";
      const rack_type2 = "secondary_discrete";
      const rack_type3 = "dispatch";
      const status = "occupied";
      const status1 = "unoccupied";
  // primari occupied    
 const getbyPrimary_Occupied = await racks_detail_table.find(
    {
        company_code: company_code,
        plant_id: plant_id,
        rack_type: rack_type,
        status : status,
      
      } ).countDocuments();
     
const primary_occupied = getbyPrimary_Occupied;
   // primary unoccupied   
 const getbyPrimary_Unoccupied = await racks_detail_table.find(
    {
        company_code: company_code,
        plant_id: plant_id,
        rack_type: rack_type,
        status : status1,
      } ).countDocuments();
  

const primary_unoccupied = getbyPrimary_Unoccupied;
// secondary occupied
const getbySecondary_Occupied = await racks_detail_table.find(
    {
        company_code: company_code,
        plant_id: plant_id,
        rack_type: rack_type1,
        status : status,
      } ).countDocuments();
  

const secondary_occupied = getbySecondary_Occupied;
// secondary unoccupied
const getbySecondary_Unoccupied = await racks_detail_table.find(
    {
        company_code: company_code,
        plant_id: plant_id,
        rack_type: rack_type1,
        status : status1,
      } ).countDocuments();
  

const secondary_unoccupied = getbySecondary_Unoccupied;
// discrete occupied
const secondary_discrete_occupied = await racks_detail_table.find(
    {
        company_code: company_code,
        plant_id: plant_id,
        rack_type: rack_type2,
        status : status,
      } ).countDocuments();
  

const discrete_occupied = secondary_discrete_occupied;

// discrete unoccupied
const secondary_discrete_unoccupied = await racks_detail_table.find(
    {
        company_code: company_code,
        plant_id: plant_id,
        rack_type: rack_type2,
        status : status1,
      } ).countDocuments();
  

const discrete_unoccupied = secondary_discrete_unoccupied;

// dispatch occupied
const getdispatch_occupied = await racks_detail_table.find(
    {
        company_code: company_code,
        plant_id: plant_id,
        rack_type: rack_type3,
        status : status,
      } ).countDocuments();
  

const dispatch_occupied = getdispatch_occupied;

// dispatch unoccupied
const getdispatch_unoccupied = await racks_detail_table.find(
    {
        company_code: company_code,
        plant_id: plant_id,
        rack_type: rack_type3,
        status : status1,
      } ).countDocuments();
  

const dispatch_unoccupied = getdispatch_unoccupied;



let mssge = "Racks are available";
if (total.length == 0) mssge = "Racks are not available!";


var primary = {primary_occupied,primary_unoccupied};
var secondary = {secondary_occupied,secondary_unoccupied};
var secondary_discrete = {discrete_occupied,discrete_unoccupied};
var dispatch = {dispatch_occupied,dispatch_unoccupied};

var Racks = [
    {primary,secondary,secondary_discrete,dispatch}
]


return res.status(200).send({status_code: "200", message: mssge, Rack: Racks });

    } catch (err) {
      console.log(err);
      return res.status(500).send({status_code: "500",
        message: "Some error occurred while fetching user module names!",
      });
    }
  };