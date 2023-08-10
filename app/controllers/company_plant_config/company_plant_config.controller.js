const db = require("../../models");


const company_plant_config = db.company_plant_config;

exports.get_co_plant_config = async (req, res) => {
  const { company_code, plant_id } = req.query;


  if (!(company_code && plant_id))
    return res
      .status(400)
      .send({ status_code: 400, message: "Missing parameter!" });

  try {
    //     let company_plant_config = await company_plant_config.aggregate([
    //         {$mathc:{
    //             company_code:company_code,
    //             plant_id:plant_id
    //     }}
    // ])

    let company_plant_config_detail = await db.company_plant_config.findOne({
      company_code: company_code,
      plant_id: plant_id,
    },{_id:0});

    if (company_plant_config_detail) {
      return res.status(200).send({
        status_code: 200,
        message: "Company plant configuration detail!",
        data:company_plant_config_detail
      });
    } else {
      return res.status(400).send({
        status_code: 400,
        message: "Company plant configuration detail not available!",
      });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message ||
        "Some error occurred while retrieving company plant config detail",
    });
  }
};
