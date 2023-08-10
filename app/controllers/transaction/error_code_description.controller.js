const { result } = require("lodash");
const db = require("../../models");

const error_code_description = db.errorDescription

exports.getallerrors = async (req, res) => {
  console.log("All error details");

  await error_code_description.find({},{"__v":0})
  // .sort({"error_code":1})

  // await error_code_description.find({ "__v":0})
   
    .then(data => {
      let resMessage = "";
      if (data.length === 0) {
        resMessage = "no errors";
      } else {
        resMessage = "error found"
      }
      return res.send({
        status_code: 200,
        message: resMessage,
        data: data,
      });
    })
    .catch(err => {
      return res.status(500).send({
        status_code: 500,
        message: err.message || "Some error occurred while retrieving city data."
      });
    });
}
exports.post_error_details = async (req, res) => {

  const reqBody = req.body;
  const error_code = req.body.error_code;

  if (!(req.body.company_code && req.body.plant_id && req.body.error_code && req.body.error_description))
    return res.status(400).send({ status_code: "400", message: "please fill all requird field" })

   let result= await error_code_description
         .find  ({
      error_code:error_code
    });
      if(result.length!==0){
        return res.status(404).send({
          status_code:404,
          message:"error code details already exist......."
              })
      }    
  const tutorial = new error_code_description({
    company_code: req.body.company_code,
    plant_id: req.body.plant_id,
       error_code: req.body.error_code,
    error_description: req.body.error_description


  });   
  tutorial.save()
    .then(data => {
      return res.status(200).send({
        status_code: "200",
        status_message: "Data Added successfully",
        data: data,
      })
    })
    .catch(err => {
      res.status(500).send({
        message: err.message || "some error occurred while creating the error details"
      });
    });
}


exports.get_by_error_code = async (req, res) => {
  console.log('get_by_error_code');

  let { company_code, plant_id, error_code } = req.query;
  if (!(error_code && company_code && plant_id)) {
    return res.status(400).send({
      status_code: "400",
      message: " please fill error code, company_code & plant_id!"
    });
  }
  const query = {
    plant_id: plant_id,
    company_code: company_code,
    error_code: error_code
  }
      
      await error_code_description.find({...query},{ "__v":0})

    .then(data => {
      if (data.length == 0) {
        console.log(data)
        return res.status(404).send({ status: "400", message: ` Data Doesn't Exists !`, data: [] });
      }
      else res.status(200).send({
        status_code: "200",
        message: "error code details", data: data

      });
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving article."
      });
    });
};

exports.updateErrorDetails = async (req, res) => {
  const reqBody = req.body;

  const error_code = req.query.error_code;

  if (!error_code) {
    return res.status(400).send({
      status_code: 400,
      message: "please provide error code wants to be updated"
    });
  }
  if (!reqBody) {
    return res.status(400).send({
      status_code: 400,
      message: "Please provide error_description data body",
    });
  }

  if (
    !(
      reqBody.company_code &&
      reqBody.plant_id &&
      reqBody.error_code &&
      reqBody.error_description
    )
  ) {
    return res.status(400).send({
      status_code: 400,
      message:
        "Please provide company_code, plant_id, error_code, error_description",
    });
  }
  await error_code_description
    .findOneAndUpdate({ error_code: error_code }, req.body)
    .then((data) => {
      if (!data) {
        return res.status(404).send({
          status_code: 404,
          message: `Can't update error_description_details data not found!`,

        });
      } else {
        return res.status(200).send({
          status_code: 200,
          message: "error description details updated successfully.",
        });
      }
    })
    .catch((err) => {
      return res.status(500).send({
        status_code: 500,
        message: "Error updating with error code=" + error_code,
      });
    });
};

exports.deleteErrorCode = (req, res) => {

  const id = req.query.id;

  error_code_description.findByIdAndRemove(id, { useFindAndModify: false })
      .then(data => {
          if (!data) {
              res.status(404).send({
                  message: `Cannot delete  with id= ${id}. Maybe  was not found!`
              });
          } else {
              res.send({
                  status_code: "200",
                  message: "error code   deleted successfully!"
              });
          }
      })
      .catch(err => {
          res.status(500).send({
              message: "Could not delete error code with id=" + id
          });
      });
};
