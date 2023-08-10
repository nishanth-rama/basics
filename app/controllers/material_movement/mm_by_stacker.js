const db = require("../../models");
const dispatchColl = db.dispatch_storage;

exports.list_outward_pallet = async (req, res) => {
  console.log("list_outward_pallet");

  const { company_code, plant_id, delivery_date, route_id } = req.query;

  //   console.log(company_code, plant_id, delivery_date);
  if (!(delivery_date && company_code && plant_id && route_id)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }

  try {
    let response_data = await dispatchColl.aggregate([
      {
        $match: {
          delivery_date: delivery_date,
          plant_id: plant_id,
          company_code: company_code,
          route_id: route_id,
        },
      },
      { $unwind: "$items" },
      { $sort: { "items.invoice_no": 1 } },
      { $project: { _id: 0, pallet_barcode: 1, items: 1, location_id: 1 } },
    ]);

    let status = 200;
    let mssge = "Pallet details available";

    if (response_data.length == 0) {
      status = 404;
      mssge = "Pallet details not available!";
    }

    return res.status(200).send({
      status_code: status,
      status_message: mssge,
      data: response_data,
    });
  } catch (err) {
    return res.status(400).send({
      status_code: 500,
      status_message:
        "Some error occurred while extacting the outward pallet details!",
    });
  }
};

exports.list_outward_route_id = async (req, res) => {
  console.log("list_outward_pallet");
  let company_code = req.query.company_code;
  let plant_id = req.query.plant_id;
  let delivery_date = req.query.delivery_date;

  //   console.log(company_code, plant_id, delivery_date);
  if (!(delivery_date && company_code && plant_id)) {
    return res
      .status(400)
      .send({ status_code: "400", status_message: "Missing parameter." });
  }

  try {
    let response_data = await dispatchColl.aggregate([
      {
        $match: {
          delivery_date: delivery_date,
          plant_id: plant_id,
          company_code: company_code,
        },
      },
      {
        $group: { _id: "$route_id", route_id: { $first: "$route_id" } },
      },
      { $sort: { route_id: 1 } },
      { $project: { _id: 0, route_id: 1 } },
    ]);

    let message = response_data.length
      ? "Route id available"
      : "No Route id found";
    return res.status(200).send({
      status_code: "200",
      status_message: message,
      data: response_data,
    });
  } catch (err) {
    return res.status(400).send({
      status_code: "400",
      status_message:
        err.message || "Some error occurred while creating the customer.",
    });
  }
};
