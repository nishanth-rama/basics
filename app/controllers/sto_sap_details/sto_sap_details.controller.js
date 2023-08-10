const axios = require("axios");
const { result } = require("lodash");
const moment = require("moment");
const db = require("../../models");

const sap_url = process.env.SAP_URL;

const stoSapModel = db.stoSapDetails;

exports.getStoSap = async (req, res) => {
  console.log("Getting request for sto sap data");
  const { from_date, to_date } = req.query;
  console.log(from_date, to_date);
  if (!(from_date && to_date)) {
    return res.status(404).send({
      status_code: 404,
      message: "Please provide from and to date.",
    });
  }

  var reqBody = {
    request: {
      from_date: from_date,
      to_date: to_date,
    },
  };

  var options = {
    method: "post",
    url: `${sap_url}/STO_Outbound_Delivery_Get`,
    // headers: { },
    data: reqBody,
  };
   console.log(options);
  await axios
    .request(options)
    .then(async (result) => {
      console.log(result);
      if (result.data.response.length !== 0) {
        let deliveryNumbers = [];
        await result.data.response.map((each) => {
          deliveryNumbers.push(each.delivery_no);
        });
        await stoSapModel
          .deleteMany({ delivery_no: { $in: deliveryNumbers } })
          .then(async (responseData) => {
            console.log(responseData);
            await stoSapModel
              .insertMany(result.data.response)
              .then((response) => {
                res.status(200).send({
                  status_code: 200,
                  message: "Data List found",
                  data: response,
                });
              });
          });
      }
    })
    .catch((err) => {
      return res.status(500).send({
        status_code: 500,
        message: "Sap Internal server error",
      });
    });
};

// increment date
function increment_days(date) {
  cloneDate = new Date(date.valueOf());
  cloneDate.setDate(cloneDate.getDate() + 1);
  return cloneDate;
}

exports.get_sto_details = async (req, res) => {
  console.log("calling get sto sap details api");
  const { company_code, plant_id, from_date, to_date } = req.query;

  if (!(company_code && plant_id && from_date && to_date))
    return res
      .status(400)
      .send({ status_code: 400, message: "Provide all required parameters" });
  //

  if (new Date(from_date).getTime() > new Date(to_date).getTime())
    return res.status(400).send({
      status_code: 400,
      message: "from_date should be less than to_date!",
    });

  try {
    let picking_date = from_date;

    let pickingDateArr = [];
    pickingDateArr.push(picking_date);

    if (from_date != to_date)
      do {
        picking_date = increment_days(new Date(picking_date));

        pickingDateArr.push(moment(picking_date).format("YYYY-MM-DD"));
        //
      } while (moment(picking_date).format("YYYY-MM-DD") != to_date);

    const getSTOdata = await db.stoSapDetails
      .find({
        // company_code: company_code,
        supply_plant: plant_id,
        picking_date: { $in: pickingDateArr },
      })
      .sort({ _id: -1 });

    let mssge = "STO list is available";

    if (getSTOdata.length == 0) mssge = "STO list is not available!";

    return res.send({
      status_Code: 200,
      message: mssge,
      data: getSTOdata,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting sto list!",
    });
  }
};
