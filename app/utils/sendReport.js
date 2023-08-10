const nodemailer = require("nodemailer");
const Cryptr = require("cryptr");
const cryptr = new Cryptr("myTotallySecretKey");
const db = require("../models");
const res = require("express/lib/response");
const smtpDetails = db.smtpDetails;

const sendReport = async (
  email,
  subject,
  link,
  dashboard_data,
  smtp_detail,
  param_data
) => {
  // console.log("values",email,subject,text)

  //  var web_rapid_uat = "https://uat-rapid.censanext.com/login";

  // console.log(
  //   "sent_detail",
  //   email,
  //   subject,
  //   link,
  //   dashboard_data,
  //   smtp_detail,
  //   param_data
  // );

  let fe_base_url = process.env.FE_BASE_URL;

  var web_rapid_uat = `${fe_base_url}/login`;

  // console.log("email", email);

  try {
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

    const sent_mail_cnf = await transporter.sendMail({
      from: "rapidsupport@waycool.in",
      to: email,
      subject: subject,
      html: `
      <body style="width:100%; margin:0;background-color: #f1f1f1; padding: 20px">
         <img style="display: block; margin: 0 auto;" src="https://ci4.googleusercontent.com/proxy/dUlQLP5jjr61rwmwn1-fs_m5SgHKSrnfTzw3ZhgUaTxxIPFtuUz8zctkKlgv6llxFWi4N2E3wFe43u4E9i5z_1iJVA_EJWAhf1uQ=s0-d-e1-ft#http://uat.waycool.in/home/images/waycool_logo_color.png" alt="Waycool">
         <div style="color:black">
         <h4>Dear Team,</h4>
         <p>Please find below the Mother Dc dashboard report for plant <b>${param_data.plant_name}</b>.</p>
         <p>Report for : ${param_data.today_date}</p>
         </div>
        
        
        
      <div >
       <div style="display:flex;flex-direction:row;">
       <div style="display:inline-block;height:100px;width:200px;margin-left:10px;margin-right:10px;">
       <p style="margin:0;color:white;font-family: 'Segoe UI', Roboto, 'Open Sans', 'Helvetica Neue',sans-serif;   padding: 6px; text-align: center; font-size: 15px;background-image: linear-gradient(-135deg,rgb(33, 197, 156),  rgb(13, 110, 253));">PO Quantity</p>
       <p style="height:40px;padding-top:10px;margin:0;color:black; background-color: rgb(255, 255, 255);font-family: 'Segoe UI', Roboto, 'Open Sans', 'Helvetica Neue',sans-serif;text-align: center;font-size: 15px;">${dashboard_data.po_quantity_sum} kg</p>
       </div>
       <div style="display:inline-block;height:100px;width:200px;margin-left:10px;margin-right:10px;">
       <p style="margin:0;color:white;font-family: 'Segoe UI', Roboto, 'Open Sans', 'Helvetica Neue',sans-serif;   padding: 6px; text-align: center; font-size: 15px;background-image: linear-gradient(-135deg,rgb(33, 197, 156),  rgb(13, 110, 253));">Inward Quantity</p>
       <p style="height:40px;padding-top:10px;margin:0;color:black; background-color: rgb(255, 255, 255);font-family: 'Segoe UI', Roboto, 'Open Sans', 'Helvetica Neue',sans-serif;text-align: center;font-size: 15px;">${dashboard_data.total_inward_qty} kg</p>
       </div>
       <div style="display:inline-block;height:100px;width:200px;margin-left:10px;margin-right:10px;">
       <p style="margin:0;color:white;font-family: 'Segoe UI', Roboto, 'Open Sans', 'Helvetica Neue',sans-serif;   padding: 6px; text-align: center; font-size: 15px;background-image: linear-gradient(-135deg,rgb(33, 197, 156),  rgb(13, 110, 253));">GRN Quantity</p>
       <p style="height:40px;padding-top:10px;margin:0;color:black; background-color: rgb(255, 255, 255);font-family: 'Segoe UI', Roboto, 'Open Sans', 'Helvetica Neue',sans-serif;text-align: center;font-size: 15px;">${dashboard_data.grns_quantity_sum} kg</p>
       </div>
       <div style="display:inline-block;height:100px;width:200px;margin-left:10px;margin-right:10px;">
       <p style="margin:0;color:white;font-family: 'Segoe UI', Roboto, 'Open Sans', 'Helvetica Neue',sans-serif;   padding: 6px; text-align: center; font-size: 15px;background-image: linear-gradient(-135deg,rgb(33, 197, 156),  rgb(13, 110, 253));">STO-PO Quantity</p>
       <p style="height:40px;padding-top:10px;margin:0;color:black; background-color: rgb(255, 255, 255);font-family: 'Segoe UI', Roboto, 'Open Sans', 'Helvetica Neue',sans-serif;text-align: center;font-size: 15px;">${dashboard_data.po_sto_quantity_sum} kg</p>
       </div>
       </div>
        <div style="display:flex;flex-direction:row;margin-top:10px;margin-bottom:3px">
       <div style="display:inline-block;height:100px;width:200px;margin-left:10px;margin-right:10px;">
       <p style="margin:0;color:white;font-family: 'Segoe UI', Roboto, 'Open Sans', 'Helvetica Neue',sans-serif;   padding: 6px; text-align: center; font-size: 15px;background-image: linear-gradient(-135deg,rgb(33, 197, 156),  rgb(13, 110, 253));">STO-Invoice Quantity</p>
       <p style="height:40px;padding-top:10px;margin:0;color:black; background-color: rgb(255, 255, 255);font-family: 'Segoe UI', Roboto, 'Open Sans', 'Helvetica Neue',sans-serif;text-align: center;font-size: 15px;">${dashboard_data.invoice_sto_quantity_sum} kg</p>
       </div>
       <div style="display:inline-block;height:100px;width:200px;margin-left:10px;margin-right:10px;">
       <p style="margin:0;color:white;font-family: 'Segoe UI', Roboto, 'Open Sans', 'Helvetica Neue',sans-serif;   padding: 6px; text-align: center; font-size: 15px;background-image: linear-gradient(-135deg,rgb(33, 197, 156),  rgb(13, 110, 253));">SO Quantity</p>
       <p style="height:40px;padding-top:10px;margin:0;color:black; background-color: rgb(255, 255, 255);font-family: 'Segoe UI', Roboto, 'Open Sans', 'Helvetica Neue',sans-serif;text-align: center;font-size: 15px;">${dashboard_data.so_quantity_sum} kg</p>
       </div>
       <div style="display:inline-block;height:100px;width:200px;margin-left:10px;margin-right:10px;">
       <p style="margin:0;color:white;font-family: 'Segoe UI', Roboto, 'Open Sans', 'Helvetica Neue',sans-serif;   padding: 6px; text-align: center; font-size: 15px;background-image: linear-gradient(-135deg,rgb(33, 197, 156),  rgb(13, 110, 253));">Allocated Quantity</p>
       <p style="height:40px;padding-top:10px;margin:0;color:black; background-color: rgb(255, 255, 255);font-family: 'Segoe UI', Roboto, 'Open Sans', 'Helvetica Neue',sans-serif;text-align: center;font-size: 15px;">${dashboard_data.allocated_qty} kg</p>
       </div>
       <div style="display:inline-block;height:100px;width:200px;margin-left:10px;margin-right:10px;">
       <p style="margin:0;color:white;font-family: 'Segoe UI', Roboto, 'Open Sans', 'Helvetica Neue',sans-serif;   padding: 6px; text-align: center; font-size: 15px;background-image: linear-gradient(-135deg,rgb(33, 197, 156),  rgb(13, 110, 253));">Invoice Quantity</p>
       <p style="height:40px;padding-top:10px;margin:0;color:black; background-color: rgb(255, 255, 255);font-family: 'Segoe UI', Roboto, 'Open Sans', 'Helvetica Neue',sans-serif;text-align: center;font-size: 15px;">${dashboard_data.invoice_quantity_sum} kg</p>
       </div>
    
       </div>
      </div>
           <div style="color:black; margin-top:20px">
           <div style="margin-bottom:13px">
           <p style="display:inline">For Other Details</p>
           <a href=${link}  style="text-decoration:none">- ${link}</a>
           </div>
           <p style="display: inline">For More Details Login to</p>
           <a style="text-decoration:none" href=${web_rapid_uat}>Mother Dc</a>
           <p>Thanks and Regards,</p>
           <p>Support - Automation | Waycool</p>
           </div>
      </body>
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

module.exports = sendReport;
