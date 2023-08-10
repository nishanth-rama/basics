const db = require("../../models");

const country_details = db.countryDetails;
const state_details = db.stateDetails;
const plants_detail_table = db.plants;

exports.getCountries = async (req, res) => { 
  console.log("Getting request for countries data");
  await country_details.find({}).sort({"country_name":1})
      .then(data => {
        let resMessage = "";
        if(data.length === 0) {
           resMessage = "Country data list not found"; 
        } else {
           resMessage = "List of all country data found"
        }
        return res.send({ 
            status_code:200,
            message: resMessage,
            data:data
          });
      })
      .catch(err => {
        return res.status(500).send({
          status_code: 500,
          message: err.message || "Some error occurred while retrieving countries data."
        });
      });
};

exports.addCountry = async (req, res) => {
    console.log("getting request for add country api");
    const reqBody = req.body;
    if(!reqBody){
      return res.status(400).send({
        status_code:400,
        message: "Please provide country data body"
      })
    }

    if(!(reqBody.country_name && reqBody.country_code)){
      return res.status(400).send({
        status_code:400,
        message: "Please provide country name and country code"
      })
    }

    await country_details.find({ country_name: { $regex : new RegExp(reqBody.country_name, "i")}})
    .then(async result=>{
      if(result.length !== 0){
        return res.status(404).send({
          status_code:404,
          message: "Country detail already exist"
        });
      } else {
        const countryData = new country_details({
          country_name : reqBody.country_name,
          country_code : reqBody.country_code
        })
     
        await countryData.save(countryData).then(result=> {
          return res.status(200).send({
            status_code:200,
            message: "Successfully added country detail"
          })
        })
        .catch(err=> {
         return res.status(500).send({
           status_code:500,
           message: err.message || "Error while inserting country data"
         })
        })
      }
    })     
       .catch(err=> {
      return res.status(500).send({
        status_code:500,
        message: err.message || "Error while inserting country data"
      })
     })
}

exports.updateCountry = async (req, res) => {
  console.log("Getting request for update country data api");
  const reqBody = req.body;
  const country_id = req.query.country_id;
  if(!country_id){
    return res.status(400).send({
      status_code:400,
      message: "Please provide country id wants to be updated .."
    })
  }
 
  if(!reqBody){
    return res.status(400).send({
      status_code:400,
      message: "Please provide country data body"
    })
  }

  if(!(reqBody.country_name && reqBody.country_code)){
    return res.status(400).send({
      status_code:400,
      message: "Please provide country name and country code"
    })
  }

  await country_details.findOne({country_code: reqBody.country_code}).then(async data => {
    if(data) {
      return res.status(400).send({
        status_code: 400,
        message: "Country code already exist",
      });
    } else {
      await country_details.findOneAndUpdate({country_id: country_id}, req.body)
      .then((data) => {
        if (!data) {
          return res.status(404).send({
            status_code : 404,
            message: `Can't update Country data not found!`,
          });
        } else {
          return res.status(200).send({
           status_code: 200,
           message: "Country data updated successfully." 
          });
        }
      })
      .catch((err) => {
        return res.status(500).send({
          status_code: 500,
          message: "Error updating with country id=" + country_id,
        });
      })
    }
  })
}

exports.deleteCountry = async (req, res) => {
  console.log("Getting request for deleting country data ..");
  const country_id = req.query.country_id;
  if(!country_id){
    return res.status(400).send({
      status_code:400,
      message: "Please provide country id wants to be updated .."
    })
  } 

  await state_details.find({country_id: country_id}).then(async data => {
    if(data.length !== 0) {
      return res.status(400).send({
        status_code:400,
        message: "Can't delete state data is present"
      })
    } else {
     let plant  = await plants_detail_table.find({country_id: country_id});
      if(plant.length>0) {
        return res.status(400).send({
          status_code:400,
          message: "Can't delete country when plant exist"
        })
      }
     await country_details.deleteOne({country_id:country_id}).then(data => {
       return res.status(200).send({
        status_code: 200,
        message: "Deleted country id: " + country_id +" successfully",
      });
      }).catch(err=> {
        return res.status(500).send({
          status_code: 500,
          message: "Error deletion with country id=" + country_id,
        }); 
      })
    }
  })
}