const db = require("../../models");
const moment_ts = require("moment-timezone");
const primary_storage_table = db.primary_storage;
const palletization_table = db.palletization;
const smtpDetails = db.smtpDetails;
const Cryptr = require("cryptr");
const cryptr = new Cryptr("myTotallySecretKey");
const nodemailer = require("nodemailer");
const ExcelJS = require("exceljs");

// Inventory report mail
exports.send_mail = async (req, res) => {
  try {
    let format = "YYYY-MM-DD";
    let today_date = moment_ts(new Date(), format)
      .tz("Asia/Kolkata")
      .format(format);
    const pipeline = [
      {
        $match: {
          company_code: "1000",
          plant_id: "1023",
          pallet_status: "Primary_storage",
          is_deleted: false,
          stacked_date: today_date,
        },
      },
      {
        $project: {
          _id: 0,
          item_code: 1,
          item_name: 1,
          carrier_count: 1,
          uom: 1,
          location_id: 1,
          pallet_barcode_value: 1,
          carrier_count: 1,
          po_number: 1,
          expiry_date: 1,
          stacked_date: 1,
        },
      },
    ];

    const primary_storage = await palletization_table.aggregate(pipeline);

    const newObjects = [];

    const calculatePercentage = (days, maxDays) => {
      const percentage = Math.round((days / maxDays) * 100);
      return percentage;
    };

    const getColorCode = (percentage) => {
      if (percentage >= 70) {
        return "#00A953"; // Green color for >= 70%
      } else if (percentage >= 50) {
        return "#FBC20F"; // yellow color for >= 50% and < 70%
      } else {
        return "#E4382A"; // Red color for < 50%
      }
    };

    const expiry_days = (date, stacked_date) => {
      let expiry_in = {};
      const expiry = new Date(date);
      const today = new Date();
      const diffMs = expiry - today;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      //max Days
      const stack_days = new Date(stacked_date);
      const diffMs_stack = expiry - stack_days;
      const maxDays = Math.ceil(diffMs_stack / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        expiry_in.expiry_status = isNaN(diffDays) ? "" : `Expired`;
        expiry_in.color_code = isNaN(diffDays) ? "" : `#FF0000`;
      } else {
        expiry_in.expiry_status = isNaN(diffDays) ? "" : `${diffDays}`;
        const percentage = calculatePercentage(diffDays, maxDays);
        expiry_in.percentage = percentage;
        expiry_in.color_code = getColorCode(percentage);
      }
      return expiry_in;
    };

    primary_storage.forEach(function (doc) {
      doc.expiry_date = doc.expiry_date || "";
      doc.po_number = doc.po_number || "";
      doc.stacked_date = doc.stacked_date || "";
      doc.expiry_in = expiry_days(doc.expiry_date, doc.stacked_date) || "";
      newObjects.push(doc);
    });

    const inventory_data = newObjects.sort((a, b) => {
      // Check if either `expiry_status` is "Expired"
      if (
        a.expiry_in.expiry_status === "Expired" ||
        b.expiry_in.expiry_status === "Expired"
      ) {
        // If one of them is "Expired", it should come first
        return a.expiry_in.expiry_status === "Expired" ? -1 : 1;
      }
      if (
        a.expiry_in.expiry_status === "" ||
        b.expiry_in.expiry_status === ""
      ) {
        return a.expiry_in.expiry_status === "" ? 1 : -1;
      }
      // Compare numeric values
      return (
        parseInt(a.expiry_in.percentage) - parseInt(b.expiry_in.percentage)
      );
    });

    const email_settings = await db.inventory_email_settings.find({
      plant_id: "1023",
      status: "yes",
      report_name: "Inward",
    });

    // fetch email id from collection
    const recipients = email_settings.map((item) => item.email);

    if (!recipients || recipients.length == 0) {
      return res.status(200).send({
        message: "There is no email address in the DB for sending mail.",
      });
    }

    const smtp_detail = await smtpDetails.findOne({ company_code: "1000" });

    await sendEmail(
      recipients,
      "Daily Inward Report",
      inventory_data,
      smtp_detail,
      "Daily Inward Report-plant 1023",
      today_date
    );

    return res.status(200).send({
      status_code: "200",
      status_message: "Email sent successfully.",
    });
  } catch (err) {
    console.log(err);
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some Error Occurred While inventory list.",
    });
  }
};

async function sendEmail(
  recipient,
  subject,
  inventoryData,
  smtp_detail,
  header,
  today_date
) {
  try {
    const emailTemplate = `  <h1 style="background-color: #07cdf5; color: white; text-align: center; padding: 10px; font-size: 24px;">${
      inventoryData.length == 0
        ? `Inward Report not available_${today_date}`
        : header + `_` + today_date
    }</h1>

  <table style="border-collapse: collapse; width: 100%;">
    <tr>
     <th style="border: 1px solid #ccc; padding: 8px; background-color: #f2f2f2;">S No</th>
      <th style="border: 1px solid #ccc; padding: 8px; background-color: #f2f2f2;">Pallet ID</th>
      <th style="border: 1px solid #ccc; padding: 8px; background-color: #f2f2f2;">Material Name</th>
      <th style="border: 1px solid #ccc; padding: 8px; background-color: #f2f2f2;">Expiry Date</th>
      <th style="border: 1px solid #ccc; padding: 8px; background-color: #f2f2f2;">Carrier Count</th>
      <th style="border: 1px solid #ccc; padding: 8px; background-color: #f2f2f2;">Inward Date</th>
      <th style="border: 1px solid #ccc; padding: 8px; background-color: #f2f2f2;">Location ID</th>
      <th style="border: 1px solid #ccc; padding: 8px; background-color: #f2f2f2;">About to Expire (Days)</th>
    </tr>
    ${inventoryData
      .map(
        (item, index) => `
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;">${index + 1}</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${
              item.pallet_barcode_value
            }</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${
              item.item_name
            }</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${
              item.expiry_date
            }</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${
              item.carrier_count
            }</td>
             <td style="border: 1px solid #ccc; padding: 8px;">${
               item.stacked_date
             }</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${
              item.location_id
            }</td>
            <td style="border: 1px solid #ccc; padding: 8px; font-weight: bold; color:${
              item.expiry_in.color_code
            };">${item.expiry_in.expiry_status}</td>
          </tr>
        `
      )
      .join("")}
  </table>
`;

    const decryptedString = cryptr.decrypt(smtp_detail.password);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtp_detail.user_name,
        pass: decryptedString,
      },
    });

    // Create a new Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Inventory");

    // Add headers to the worksheet
    worksheet.addRow([
      "S No",
      "Pallet ID",
      "Material Name",
      "Material Code",
      "Expiry Date",
      "Carrier Count",
      "Inward Date",
      "Location ID",
      "PO Number",
      "About to Expire (Days)",
    ]);

    // Add data to the worksheet
    inventoryData.forEach((item, ind) => {
      worksheet.addRow([
        ind + 1,
        item.pallet_barcode_value,
        item.item_name,
        item.item_code,
        item.expiry_date,
        item.carrier_count,
        item.stacked_date,
        item.location_id,
        item.po_number,
        item.expiry_in.expiry_status,
      ]);
    });

    // Generate the Excel file buffer
    const buffer = await workbook.xlsx.writeBuffer();

    const currentDate = new Date()
      .toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
      .replace(/\//g, "-");

    const fileName = `${currentDate}_Inward_Report-plant 1023.xlsx`; //adding date in file name

    // Define the email options
    const mailOptions = {
      from: "rapidsupport@waycool.in",
      to: recipient,
      subject: subject,
      html: emailTemplate,
      attachments: [
        {
          filename: fileName,
          content: buffer,
        },
      ],
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    console.log("Email notification sent successfully.");
  } catch (error) {
    console.error(
      "An error occurred while sending the email notification:",
      error
    );
  }
}
