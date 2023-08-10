const db = require("../../models");
const Joi = require("joi");
const reportEmail = db.reportEmail;

exports.get_all_email_list = async (req, res) => {
  try {
    const { company_code, plant_id } = req.query;

    if (!(company_code && plant_id)) {
      return res
        .status(400)
        .send({ status_code: 400, message: "Missing parameter." });
    }

    let report_email_detail = await reportEmail
      .findOne({
        company_code,
        plant_id,
      })
      .select("-_id");

    if (report_email_detail) {
      return res.status(200).send({
        status_code: 200,
        message: "email list available",
        data: report_email_detail,
      });
    } else {
      return res.status(200).send({
        status_code: 200,
        message: "email list is not available",
        data: [],
      });
    }

    console.log("report_email_detail", report_email_detail);
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message || "Some error occurred while retrieving email detail",
    });
  }
};

exports.update_email_list = async (req, res) => {
  try {
    const { plant_id, company_code, email } = req.body;

    if (!(plant_id && company_code && email)) {
      return res
        .status(400)
        .send({ status_code: 400, message: "Missing parameter." });
    }

    let array_list = email.split(",");
    let uniqueArrayList = [...new Set(array_list)];
    // console.log("email", array_list, uniqueArrayList);

    const schema = Joi.array().items(Joi.string().email());
    // console.log("mithasagum",schema)
    const { error } = schema.validate(uniqueArrayList);
    if (error)
      return res
        .status(400)
        .send({ status_code: 400, message: error.details[0].message });

    let update_email_list = await reportEmail.updateOne(
      { plant_id, company_code },
      { $set: { email_adddress: uniqueArrayList } },
      { upsert: true }
    );

    if (update_email_list && update_email_list.n == 1) {
      return res
        .status(200)
        .send({ status_code: 200, data: "email updated successfuly" });
    }

    // let validate_email = {
    //   email: email,
    // };

    // const schema = Joi.object({ email: Joi.string().email().required() });
    // // console.log("mithasagum",schema)
    // const { error } = schema.validate(validate_email);
    // if (error)
    //   return res
    //     .status(400)
    //     .send({ status_code: 400, message: error.details[0].message });

    // // console.log("update_email_list", update_email_list);

    // // let report_email_detail = await reportEmail.find({
    // //   plant_id,
    // //   company_code,
    // // });

    // if (update_email_list && update_email_list.n == 1) {
    //   return res
    //     .status(200)
    //     .send({ status_code: 200, data: "email updated successfuly" });
    // }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message || "Some error occurred while retrieving email detail",
    });
  }
};
