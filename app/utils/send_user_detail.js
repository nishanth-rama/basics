const nodemailer = require("nodemailer");
const db = require("../models");
const res = require("express/lib/response");
const smtpDetails = db.smtpDetails;
const Cryptr = require("cryptr");
const cryptr = new Cryptr("myTotallySecretKey");

const send_module_detail = async (
  email,
  subject,
  user_module_detail,
  smtp_detail
) => {
  try {
    // console.log("enteredmail");
    const decryptedString = cryptr.decrypt(smtp_detail.password);

    // console.log("decryptedString", decryptedString);

    const transporter = nodemailer.createTransport({
      // host: "smtp.gmail.com",
      service: "gmail",
      // port: 587,
      // secure: false,
      auth: {
        user: smtp_detail.user_name,
        pass: decryptedString,
        // user: "rapidsupport@waycool.in",
        // pass: "Automation123##",
      },

      
    });

    // console.log("emailsa", email);

    const sent_mail_cnf = await transporter.sendMail({
      from: "rapidsupport@waycool.in",
      to: email,
      subject: subject,
      html: `
      <div>
        <p>
        Hi User,
        </p>
        <p>
           Welcome to <b>Mother DC</b>
        </p>
        <p
        <p>
           Your login credentials are
        </p>
        
        <p style="marign:0">User Name - <b>${email}</b></p>
        <p style="marign:0">Password - <b>Welcome@123</b></p>
        <p style="marign:0">Module Name - <b>${user_module_detail.module_name
          .split("_")
          .join(" ")}</b></p>
        <p>Thanks and Regards,</p>
        <p>Support - Automation | Waycool</p>  
      </div>
       `,
    });

    // // console.log("sent_mail_cnf",sent_mail_cnf)

    if (sent_mail_cnf && sent_mail_cnf.messageId) {
      // console.log("sent_mail_cnf",sent_mail_cnf)
      return "success";
    }

    // console.log("email sent sucessfully");
  } catch (error) {
    return error.message;
    // console.log(error.message, "email not sent");
  }
};

module.exports = send_module_detail;
