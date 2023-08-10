const db = require("../../models");

const plants_detail_table = db.plants;
const city_details = db.cityDetails;

exports.getAllCities = async (req, res) => {
  console.log("Getting request for all cities data");
  await city_details.find().sort({"city_name": 1})
    .then(data => {
      let resMessage = "";
      if(data.length === 0) {
         resMessage = "Cities data list not found"; 
      } else {
         resMessage = "List of all city data found"
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
        message: err.message || "Some error occurred while retrieving city data."
      });
    });
}

exports.getCities = (req, res) => {
  const stateId = req.query.state_id;
  const query = {
    state_id: stateId,
  };
  city_details
    .find(query)
    .sort({ _id: -1 })
    .then((data) => {
      return res.send({
        status_code: 200,
        message: "list of all city found",
        data: data,
      });
    })
    .catch((err) => {
      return res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving cities data.",
      });
    });
};

exports.addCity = async (req, res) => {
  console.log("getting request for add city api");
  const reqBody = req.body;
  if (!reqBody) {
    return res.status(400).send({
      status_code: 400,
      message: "Please provide city data body",
    });
  }

  if (
    !(
      reqBody.country_id &&
      reqBody.state_id &&
      reqBody.city_code &&
      reqBody.city_name &&
      reqBody.pin_code &&
      reqBody.area
    )
  ) {
    return res.status(400).send({
      status_code: 400,
      message:
        "Please provide country id, state id, city code, city name, pincode and area",
    });
  }

  await city_details
    .find({
      city_name: { $regex: new RegExp(reqBody.city_name, "i") },
      state_id: reqBody.state_id,
    })
    .then(async (result) => {
      if (result.length !== 0) {
        return res.status(404).send({
          status_code: 404,
          message: "City detail already exist",
        });
      } else {
        const cityData = new city_details({
          country_id: reqBody.country_id,
          state_id: reqBody.state_id,
          city_name: reqBody.city_name,
          city_code: reqBody.city_code,
          pin_code: reqBody.pin_code,
          area: reqBody.area,
        });

        await cityData
          .save(cityData)
          .then((result) => {
            return res.status(200).send({
              status_code: 200,
              message: "Successfully added city detail",
            });
          })
          .catch((err) => {
            return res.status(500).send({
              status_code: 500,
              message: err.message || "Error while inserting city data",
            });
          });
      }
    })
    .catch((err) => {
      return res.status(500).send({
        status_code: 500,
        message: err.message || "Error while inserting city data",
      });
    });
};

exports.updateCity = async (req, res) => {
  console.log("Getting request for update city data api");
  const reqBody = req.body;
  const city_id = req.query.city_id;
  if (!city_id) {
    return res.status(400).send({
      status_code: 400,
      message: "Please provide city id wants to be updated ..",
    });
  }

  if (!reqBody) {
    return res.status(400).send({
      status_code: 400,
      message: "Please provide city data body",
    });
  }

  if (
    !(
      reqBody.country_id &&
      reqBody.state_id &&
      reqBody.city_code &&
      reqBody.city_name &&
      reqBody.pin_code &&
      reqBody.area
    )
  ) {
    return res.status(400).send({
      status_code: 400,
      message:
        "Please provide country id, state id, city code, city name, pincode and area",
    });
  }

  await city_details
    .findOneAndUpdate({ city_id: city_id }, req.body)
    .then((data) => {
      if (!data) {
        return res.status(404).send({
          status_code: 404,
          message: `Can't update City data not found!`,
        });
      } else {
        return res.status(200).send({
          status_code: 200,
          message: "City data updated successfully.",
        });
      }
    })
    .catch((err) => {
      return res.status(500).send({
        status_code: 500,
        message: "Error updating with city id=" + city_id,
      });
    });
};

exports.deleteCity = async (req, res) => {
  console.log("Getting request for deleting city data ..");
  const city_id = req.query.city_id;
  if (!city_id) {
    return res.status(400).send({
      status_code: 400,
      message: "Please provide city id wants to delete ..",
    });
  }

  let plant  = await plants_detail_table.find({city_id: city_id});
  if(plant.length>0) {
    return res.status(400).send({
      status_code:400,
      message: "Can't delete city when plant exist"
    })
  }

  await city_details
    .deleteOne({ city_id: city_id })
    .then((data) => {
      return res.status(200).send({
        status_code: 200,
        message: "Deleted city id: " + city_id + " successfully",
      });
    })
    .catch((err) => {
      return res.status(500).send({
        status_code: 500,
        message: "Error deletion with city id=" + city_id,
      });
    });
};
