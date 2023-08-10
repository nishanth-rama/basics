const db = require("../../models");

const state_details = db.stateDetails;
const city_details = db.cityDetails;
const plants_detail_table = db.plants;

exports.getAllStates = async (req, res) => {
  console.log("Getting request for all states data");
  await state_details.find().sort({"state_name": 1})
    .then(data => {
      let resMessage = "";
      if(data.length === 0) {
         resMessage = "States data list not found"; 
      } else {
         resMessage = "List of all state data found"
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
        message: err.message || "Some error occurred while retrieving states data."
      });
    });
}

exports.getStates = async (req, res) => {
  console.log("Getting request for state data ..");
  const countryId = req.query.country_id;
  const query = {
    country_id: countryId,
  };
  await state_details
    .find(query)
    .sort({ "state_name": 1 })
    .then((data) => {
      let resMessage = "";
      if (data.length === 0) {
        resMessage = "State data list not found";
      } else {
        resMessage = "List of all state data found";
      }
      return res.send({
        status_code: 200,
        message: resMessage,
        data: data,
      });
    })
    .catch((err) => {
      return res.status(500).send({
        status_code: 500,
        message:
          err.message || "Some error occurred while retrieving states data.",
      });
    });
};

exports.addState = async (req, res) => {
  console.log("Getting request for add state api");
  const reqBody = req.body;
  if (!reqBody) {
    return res.status(400).send({
      status_code: 400,
      message: "Please provide state data body",
    });
  }

  if (!(reqBody.country_id && reqBody.state_code && reqBody.state_name)) {
    return res.status(400).send({
      status_code: 400,
      message: "Please provide country id, state code and state name",
    });
  }

  await state_details
    .find({
      state_name: { $regex: new RegExp(reqBody.state_name, "i") },
      country_id: reqBody.country_id,
    })
    .then(async (result) => {
      if (result.length !== 0) {
        return res.status(400).send({
          status_code: 400,
          message: "State details already exist.",
        });
      } else {
        const stateData = new state_details({
          country_id: reqBody.country_id,
          state_name: reqBody.state_name,
          state_code: reqBody.state_code,
        });

        await stateData
          .save(stateData)
          .then((result) => {
            return res.status(200).send({
              status_code: 200,
              message: "Successfully added state detail.",
            });
          })
          .catch((err) => {
            return res.status(500).send({
              status_code: 500,
              message: err.message || "Error while inserting state data",
            });
          });
      }
    })
    .catch((err) => {
      return res.status(500).send({
        status_code: 500,
        message: err.message || "Error while inserting state data",
      });
    });
};

exports.updateState = async (req, res) => {
  console.log("Getting request for update state data api");
  const reqBody = req.body;
  const state_id = req.query.state_id;
  if (!state_id) {
    return res.status(400).send({
      status_code: 400,
      message: "Please provide state id wants to be updated ..",
    });
  }

  if (!reqBody) {
    return res.status(400).send({
      status_code: 400,
      message: "Please provide state data body",
    });
  }

  if (
    !(
      reqBody.country_id &&
      reqBody.state_id &&
      reqBody.state_code &&
      reqBody.state_name
    )
  ) {
    return res.status(400).send({
      status_code: 400,
      message: "Please provide country id, state id, state code and state name",
    });
  }

  await state_details
    .findOneAndUpdate({ state_id: state_id }, req.body)
    .then((data) => {
      if (!data) {
        return res.status(404).send({
          status_code: 404,
          message: `Can't update State data not found!`,
        });
      } else {
        return res.status(200).send({
          status_code: 200,
          message: "State data updated successfully.",
        });
      }
    })
    .catch((err) => {
      return res.status(500).send({
        status_code: 500,
        message: "Error updating with state id=" + state_id,
      });
    });
};

exports.deleteState = async (req, res) => {
  console.log("Getting request for deleting state data ..");
  const state_id = req.query.state_id;
  if (!state_id) {
    return res.status(400).send({
      status_code: 400,
      message: "Please provide state id wants to delete..",
    });
  }

  await city_details.find({ state_id: state_id }).then(async (data) => {
    if (data.length !== 0) {
      return res.status(400).send({
        status_code: 400,
        message: "Can't delete city data is present",
      });
    } else {
      let plant  = await plants_detail_table.find({state_id: state_id});
      if(plant.length>0) {
        return res.status(400).send({
          status_code:400,
          message: "Can't delete state when plant exist"
        })
      }
      await state_details
        .deleteOne({ state_id: state_id })
        .then((data) => {
          return res.status(200).send({
            status_code: 200,
            message: "Deleted state id: " + state_id + " successfully",
          });
        })
        .catch((err) => {
          return res.status(500).send({
            status_code: 500,
            message: "Error deletion with state id=" + state_id,
          });
        });
    }
  });
};
