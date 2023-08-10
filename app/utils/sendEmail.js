const nodemailer = require("nodemailer");
const db = require("../models");
const smtpDetails = db.smtpDetails;
const Cryptr = require("cryptr");
const cryptr = new Cryptr("myTotallySecretKey");

const sendEmail = async (email, subject, text) => {
  // console.log("values",email,subject,text)
  try {
    let smtp_detail = await smtpDetails.findOne({
      company_code: "1000",
    });

    const decryptedString = cryptr.decrypt(smtp_detail.password);


  


    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      service: "gmail",
      // port: 587,
      secure: false,
      auth: {
        user: "rapidsupport@waycool.in",
        pass: decryptedString,
      },
    });

    await transporter.sendMail({
      from: "rapidsupport@waycool.in",
      to: email,
      subject: subject,
      text: text,
    });

    console.log("email sent sucessfully");
  } catch (error) {
    console.log(error, "email not sent");
  }
};

module.exports = sendEmail;
