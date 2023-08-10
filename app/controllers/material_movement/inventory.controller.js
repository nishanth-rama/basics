const db = require("../../models");
const ObjectId = require("mongodb").ObjectId;
const moment_ts = require("moment-timezone");
const primary_storage_table = db.primary_storage;
const palletization_table = db.palletization;
const smtpDetails = db.smtpDetails;
const Cryptr = require("cryptr");
const cryptr = new Cryptr("myTotallySecretKey");
const inventory_storage_table = db.inventory_storage;
const damaged_carrier_table = db.damaged_carrier_storage;
const nodemailer = require("nodemailer");
const cron = require("node-cron");
const ExcelJS = require("exceljs");
const inventory_email_settings = db.inventory_email_settings;

// list inventory data
exports.list_inventory_data = async (req, res) => {
  let company_code = req.query.company_code;
  let plant_id = req.query.plant_id;
  let rack_id = req.query.rack_id;

  if (!(plant_id && company_code && plant_id)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing Parameter!" });
  }
  try {
    const pipeline = [
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          rack_id: rack_id,
        },
      },
      {
        $lookup: {
          from: "rapid_palletization",
          localField: "pallet_barcode",
          foreignField: "pallet_barcode_value",
          as: "po_number",
        },
      },
      {
        $unwind: {
          path: "$po_number",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          "po_number.pallet_status": "Primary_storage",
          "po_number.is_deleted": false,
        },
      },
      {
        $project: {
          _id: 0,
          material_code: 1,
          material_name: 1,
          total_stock: 1,
          uom: 1,
          location_id: 1,
          pallet_barcode: 1,
          // expiry_date: 1,
          carrier_count: 1,
          po_number: "$po_number.po_number",
          expiry_date: "$po_number.expiry_date",
          stacked_date: "$po_number.stacked_date",
        },
      },
    ];

    const primary_storage = await primary_storage_table.aggregate(pipeline);

    const newObjects = [];
    let format = "YYYY-MM-DD";
    let stacked_date = moment_ts(new Date(), format)
      .tz("Asia/Kolkata")
      .format(format);

    const expiry_days = (date) => {
      let expiry_in = {};
      const expiry = new Date(date);
      const today = new Date();
      const diffMs = expiry - today;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        expiry_in.expiry_status = `Expired`;
        expiry_in.color_code = `#FF0000`;
      } else if (diffDays <= 15) {
        expiry_in.expiry_status = `${diffDays} Days`;
        expiry_in.color_code = `#f0ad4e`;
      } else {
        expiry_in.expiry_status = isNaN(diffDays) ? null : `${diffDays} Days`;
        expiry_in.color_code = `#7E7E7E`;
      }

      return expiry_in;
    };

    primary_storage.forEach(function (doc) {
      doc.inventory_date = stacked_date || "";
      doc.expiry_date = doc.expiry_date || "";
      doc.po_number = doc.po_number || "";
      doc.stacked_date = doc.stacked_date || "";
      doc.expiry_in = expiry_days(doc.expiry_date) || null;
      doc.is_checked = false;
      newObjects.push(doc);
    });

    return res.status(200).send({
      status_code: "200",
      status_message: "List inventory data!",
      data: newObjects,
    });
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some Error Occurred While inventory list.",
    });
  }
};

// updated inventory save to new collection
exports.update_inventory_data = async (req, res) => {
  if (!req.body) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing Parameter!" });
  }
  const {
    company_code,
    plant_id,
    inventory_date,
    rack_id,
    total_pallet,
    scanned_pallet,
    missed_pallet,
    pallet_details,
  } = req.body;

  let inventory_data = {
    company_code: company_code,
    plant_id: plant_id,
    inventory_date: inventory_date,
    rack_id: rack_id,
    total_pallet: total_pallet,
    scanned_pallet: scanned_pallet,
    missed_pallet: missed_pallet,
    pallet_details: pallet_details,
  };

  let palletBarcodes = pallet_details.map((e) => {
    pallets = e.pallet_barcode;
    return pallets;
  });

  // Define a function to fetch the carrier details for a single pallet barcode
  async function getCarrierDetails(palletBarcode) {
    const palletDetail = await palletization_table.findOne(
      {
        pallet_barcode_value: palletBarcode,
      },
      {
        // _id: 1,
        pallet_barcode_value: 1,
        carrier_detail: 1,
      }
    );

    return palletDetail;
  }

  // Define a function to fetch the carrier details for all pallet barcodes
  async function getAllCarrierDetails() {
    const carrierDetailsArray = [];
    for (const palletBarcode of palletBarcodes) {
      const carrierDetails = await getCarrierDetails(palletBarcode);
      carrierDetailsArray.push(carrierDetails);
    }
    return carrierDetailsArray;
  }
  // Call the function to fetch the carrier details for all pallet barcodes
  let carrier = await getAllCarrierDetails();

  inventory_data.pallet_details = inventory_data.pallet_details.map((item) => {
    return {
      ...item,
      carrier_detail:
        carrier.filter(
          (e) => e.pallet_barcode_value === item.pallet_barcode
        )?.[0]?.carrier_detail ?? [],
    };
  });

  try {
    let updated_inventory = await inventory_storage_table.create(
      inventory_data
    );
    if (updated_inventory == null) {
      return res.status(200).send({
        status_code: "200",
        message: "Some Error Occurred While Update the data!",
        data: updated_inventory,
      });
    }

    return res.status(200).send({
      status_code: "200",
      status_message: "Updated inventory data",
      data: updated_inventory,
    });
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some Error Occurred While Update the data!",
    });
  }
};

exports.inventory_carrier_details = async (req, res) => {
  try {
    const { company_code, plant_id, pallet_barcode } = req.query;

    if (!(company_code && plant_id && pallet_barcode))
      return res
        .status(400)
        .send({ status_code: "400", message: "Missing parameter!" });

    const palletDetails = await palletization_table.aggregate([
      {
        $match: {
          company_code: company_code,
          plant_id: plant_id,
          pallet_barcode_value: pallet_barcode,
          is_deleted: false,
        },
      },

      {
        $project: {
          _id: 1,
          pallet_barcode_value: 1,
          company_code: 1,
          plant_id: 1,
          carrier_count: 1,
          item_code: 1,
          item_name: 1,
          item_no: 1,
          po_document_type: 1,
          po_number: 1,
          stacked_date: 1,
          stacked_date_time: 1,
          carrier_detail: 1,

          carrier_detail: {
            $map: {
              // input: {
              //   $filter: {
              //     as: "carrier",
              //     cond: { $eq: ["$$carrier.is_damaged", false] },
              //   },
              // },
              input: "$carrier_detail",
              as: "carrier",
              in: {
                $mergeObjects: ["$$carrier", { is_count: "0" }],
              },
            },
          },

          uom: 1,
          pallet_weight: {
            $round: [{ $sum: "$carrier_detail.gross_weight" }, 3],
          },
        },
      },
    ]);

    if (palletDetails == null) {
      return res.status(200).send({
        status_code: "200",
        message: "pallet is not available in palletization collection!",
        data: palletDetails,
      });
    }

    return res.status(200).send({
      status_code: "200",
      message: "inventory carrier details",
      data: { palletDetails },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message:
        "Some error occurred while extracting details from primary storage pallet!",
    });
  }
};

exports.get_update_inventory_data = async (req, res) => {
  try {
    const { company_code, plant_id, inventory_date } = req.query;

    if (!(company_code && plant_id && inventory_date))
      return res
        .status(400)
        .send({ status_code: "400", message: "Missing parameter!" });

    const updated_inventory_data = await inventory_storage_table.aggregate([
      {
        $match: {
          company_code: company_code,
          inventory_date: inventory_date,
          plant_id: plant_id,
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          _id: 1,
          company_code: 1,
          plant_id: 1,
          inventory_date: 1,
          rack_id: 1,
          total_pallet: 1,
          scanned_pallet: 1,
          missed_pallet: 1,
          pallet_details: {
            $filter: {
              input: "$pallet_details",
              as: "pallet",
              cond: { $eq: ["$$pallet.is_checked", true] },
            },
          },
        },
      },
    ]);
    let response = updated_inventory_data[0];
    if (updated_inventory_data.length == 0 || response == undefined) {
      return res.status(200).send({
        status_code: "200",
        message: "data not available",
        data: response,
      });
    }

    return res.status(200).send({
      status_code: "200",
      message: "inventory data",
      data: response,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message:
        "Some error occurred while extracting details from inventory storage table!",
    });
  }
};
exports.add_damaged_carriers = async (req, res) => {
  try {
    const {
      po_number,
      company_code,
      plant_id,
      pallet_barcode,
      damaged_carrier_details,
    } = req.body;

    if (
      !(
        company_code &&
        plant_id &&
        po_number &&
        pallet_barcode &&
        damaged_carrier_details
      )
    )
      return res
        .status(400)
        .send({ status_code: "400", message: "Missing parameter!" });

    let carrier_barcode = damaged_carrier_details.map((e) => e.carrier_barcode);

    const palletization = await palletization_table.findOne({
      company_code,
      plant_id,
      pallet_barcode_value: pallet_barcode,
      "carrier_detail.carrier_barcode": carrier_barcode,
    });

    palletization.carrier_detail.forEach((carrier_detail) => {
      if (carrier_barcode.includes(carrier_detail.carrier_barcode)) {
        carrier_detail._doc.is_damaged = true;
      } else {
        carrier_detail._doc.is_damaged = false;
      }
    });

    let update_damaged_carrier_details = await palletization_table.updateOne(
      { _id: palletization._id },
      { $set: { carrier_detail: palletization.carrier_detail } }
    );

    const damagedCarrier = async (palletization) => {
      if (!palletization) {
        throw new Error(
          `Could not find palletization document for company ${company_code}, plant ${plant_code}, pallet ${pallet_barcode}, carrier ${carrier_barcode}`
        );
      } else {
        let damaged_carrier = {
          company_code: company_code,
          plant_id: plant_id,
          pallet_barcode: pallet_barcode,
          po_number: po_number,
          damaged_carrier_details: damaged_carrier_details,
        };
        let damaged_carrier_detail = await damaged_carrier_table.create(
          damaged_carrier
        );
        return damaged_carrier_detail;
      }
    };

    const damaged_carrier_detail = damagedCarrier(palletization);
    if (damaged_carrier_detail == null) {
      return res.status(200).send({
        status_code: "200",
        message: "damaged carrier list is not available",
        data: damaged_carrier_details,
      });
    }

    return res.status(200).send({
      status_code: "200",
      message: "inventory updated",
      // data: damaged_carrier_details,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message: "Some error occurred while extracting details !",
    });
  }
};

exports.get_update_inventory_carrier_data = async (req, res) => {
  try {
    const { id } = req.query;

    if (!id)
      return res
        .status(400)
        .send({ status_code: "200", message: "Missing parameter!" });

    const palletDetails = await inventory_storage_table.findOne(
      {
        pallet_details: {
          $elemMatch: {
            _id: ObjectId(id),
          },
        },
      },
      {
        "pallet_details.$": 1, // projection to return only the matched element
      }
    );

    if (palletDetails == null) {
      return res.status(200).send({
        status_code: "200",
        message: "pallet is not available in collection!",
        data: palletDetails,
      });
    }

    let pallet_details = palletDetails.pallet_details.map((e) => e);
    let data = pallet_details.map((e) => e);
    pallet_details = data[0];

    return res.status(200).send({
      status_code: "200",
      message: "inventory carrier details",
      data: pallet_details,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message: "Some error occurred while extracting details !",
    });
  }
};

// Inventory report mail
exports.send_mail = async (req, res) => {
  try {
    const pipeline = [
      {
        $match: {
          company_code: "1000",
          plant_id: "1023",
        },
      },
      {
        $lookup: {
          from: "rapid_palletization",
          localField: "pallet_barcode",
          foreignField: "pallet_barcode_value",
          as: "po_number",
        },
      },
      {
        $unwind: {
          path: "$po_number",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          "po_number.pallet_status": "Primary_storage",
          "po_number.is_deleted": false,
        },
      },
      {
        $project: {
          _id: 0,
          material_code: 1,
          material_name: 1,
          total_stock: 1,
          uom: 1,
          location_id: 1,
          pallet_barcode: 1,
          // expiry_date: 1,
          carrier_count: 1,
          po_number: "$po_number.po_number",
          expiry_date: "$po_number.expiry_date",
          stacked_date: "$po_number.stacked_date",
        },
      },
    ];

    const primary_storage = await primary_storage_table.aggregate(pipeline);
    const newObjects = [];

    const calculatePercentage = (days, maxDays) => {
      const percentage = Math.round((days / maxDays) * 100);
      return percentage;
    };

    const getColorCode = (percentage) => {
      if (percentage >= 70) {
        return "#00A953"; // Green color for >= 70%
      } else if (percentage >= 50) {
        return "#FBC20F"; // orange color for >= 50% and < 70%
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
      // doc.inventory_date = stacked_date || "";
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
    });

    // Send the email notification
    const recipients = email_settings.map((item) => item.email);

    const smtp_detail = await smtpDetails.findOne({ company_code: "1000" });

    await sendEmail(
      recipients,
      "Weekly Inventory Report",
      inventory_data,
      smtp_detail
    );

    return res.status(200).send({
      status_code: "200",
      status_message: "Email sent successfully.",
    });
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some Error Occurred While inventory list.",
    });
  }
};

async function sendEmail(recipient, subject, inventoryData, smtp_detail) {
  try {
    const emailTemplate = `
  <h1 style="background-color: #07cdf5; color: white; text-align: center; padding: 10px; font-size: 24px;">Weekly Inventory Report-plant 1023</h1>
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
              item.pallet_barcode
            }</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${
              item.material_name
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
        item.pallet_barcode,
        item.material_name,
        item.material_code,
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

    const fileName = `${currentDate}_Inventory_Report.xlsx`; //adding date in file name

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

exports.send_mail_update = async (req, res) => {
  try {
    const id = req.params.id;
    const status = req.query.status;

    // const is_deleted = req.body.is_deleted;
    if (!id) {
      return res.status(404).json({
        status_code: 404,
        message: "Missing Parameter!",
      });
    }

    const updatedItem = await inventory_email_settings.findByIdAndUpdate(
      id,
      { $set: { status: status } },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({
        status_code: 404,
        message: "Item not found",
      });
    }

    return res.status(200).json({
      status_code: 200,
      message: "Item status updated successfully",
      data: updatedItem,
    });
  } catch (error) {
    console.error("An error occurred while updating item status:", error);
    return res.status(500).json({
      status_code: 500,
      message: "Internal server error",
    });
  }
};

exports.mailId_create = async (req, res) => {
  try {
    const { email, plant_id, report_name, status } = req.body;
    const data = {
      email: email,
      plant_id: plant_id,
      report_name: report_name,
      status: status,
    };

    // const is_deleted = req.body.is_deleted;
    // if (!id) {
    //   return res.status(404).json({
    //     status_code: 404,
    //     message: "Missing Parameter!",
    //   });
    // }

    const updatedItem = await inventory_email_settings.create(data);

    if (!updatedItem) {
      return res.status(404).json({
        status_code: 404,
        message: "Item not found",
      });
    }

    return res.status(200).json({
      status_code: 200,
      message: "Item status updated successfully",
      data: updatedItem,
    });
  } catch (error) {
    console.error("An error occurred while updating item status:", error);
    return res.status(500).json({
      status_code: 500,
      message: "Internal server error",
    });
  }
};
