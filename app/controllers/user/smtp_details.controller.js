const db = require("../../models");
const Joi = require("joi");
const reportEmail = db.reportEmail;
const smtpDetails = db.smtpDetails;
const bcript = require("bcryptjs");
const Cryptr = require("cryptr");

exports.update_smtp_list = async (req, res) => {
  try {
    const { plant_id, company_code, user_name, password } = req.body;

    if (!(company_code && user_name && password)) {
      return res
        .status(400)
        .send({ status_code: 400, message: "Missing parameter." });
    }

    // const schema = Joi.array().items(Joi.string().email());
    // // console.log("mithasagum",schema)
    // const { error } = schema.validate(uniqueArrayList);
    // if (error)
    //   return res
    //     .status(400)
    //     .send({ status_code: 400, message: error.details[0].message });

    // this.password = await bcript.hash(this.password, 12);

    // req.body.password = await bcript.hash(req.body.password, 12);

    const cryptr = new Cryptr("myTotallySecretKey");

    req.body.password = cryptr.encrypt(req.body.password);

    let obj_data = req.body;

    console.log("obj_data", obj_data);

    let update_smtp_detail = await smtpDetails.updateOne(
      { company_code, company_code },
      //   { $set: { email_adddress: uniqueArrayList } },
      { $set: { password: req.body.password, user_name: req.body.user_name } },
      //   { obj_data },
      { upsert: true }
    );

    if (update_smtp_detail && update_smtp_detail.n == 1) {
      return res
        .status(200)
        .send({ status_code: 200, data: "smtp_detail updated successfuly" });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message || "Some error occurred while updating email detail",
    });
  }
};
