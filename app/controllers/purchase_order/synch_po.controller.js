const { default: axios } = require("axios");

const new_sap_url = process.env.NEW_SAP_URL;

exports.synch_po_on_po_number = async (req, res) => {
  try {
    if (!req.query.purchase_order) {
      return res.send({
        status_code: 400,
        message: "Please provide purchase order number",
      });
    }

    let url_1 = `${new_sap_url}/purchaseOrderDataSync/${req.query.purchase_order}`;
    let sap_to_mdb = await axios.get(url_1);
    // console.log("sap_to_mdb",sap_to_mdb.status,sap_to_mdb.statusText)
    // console.log("sap_to_mdb",sap_to_mdb.data)

    if (sap_to_mdb.data && sap_to_mdb.data.status == 200) {
      let url_2 = `${new_sap_url}/masterToDepotApplication_PO`;
      let mdb_to_dms = await axios.get(url_2);

      if (mdb_to_dms.data && mdb_to_dms.data.status == 200) {
        return res.send({ status_code: 200, message: mdb_to_dms.data.message });
      } else if (mdb_to_dms.data && mdb_to_dms.data.status != 200) {
        return res.send({
          status_code: mdb_to_dms.data.status,
          message: mdb_to_dms.data.message,
        });
      } else {
        // if err  console.log(mdb_to_dms)
        return res.send({
          status_code: 400,
          message: "Some error occurred while synching po from mdb to dms",
        });
      }
    } else if (sap_to_mdb.data && sap_to_mdb.data.status == 500) {
      return res.send({ status_code: 400, message: sap_to_mdb.data.message });
    } else {
      // if err  console.log(sap_to_mdb)
      return res.send({
        status_code: 400,
        message: "Some error occurred while synching po from sap to mdb",
      });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message: error.message || "Some error occurred while retrieving data",
    });
  }
};

exports.synch_po_on_plant_id = async (req, res) => {
  console.log("Asd", req.query.plant_id);
  try {
    if (!req.query.plant_id) {
      return res.send({
        status_code: 400,
        message: "Please provide plant id",
      });
    }

    let url_1 = `${new_sap_url}/purchaseOrderSync_plant/${req.query.plant_id}`;
    let sap_to_mdb = await axios.get(url_1);
    // console.log("sap_to_mdb",sap_to_mdb.status,sap_to_mdb.statusText)
    // console.log("sap_to_mdb",sap_to_mdb.data)

    console.log("sap_to_mdb", sap_to_mdb.data);

    if (sap_to_mdb.data && sap_to_mdb.data.status == 200) {
      let url_2 = `${new_sap_url}/masterToDepotApplication_PO`;
      let mdb_to_dms = await axios.get(url_2);

      if (mdb_to_dms.data && mdb_to_dms.data.status == 200) {
        return res.send({ status_code: 200, message: mdb_to_dms.data.message });
      } else {
        // if err  console.log(mdb_to_dms)
        return res.send({
          status_code: 400,
          message: "Some error occurred while synching po from mdb to dms",
        });
      }
    } else {
      // if err  console.log(sap_to_mdb)
      return res.send({
        status_code: 400,
        message: "Some error occurred while synching po from sap to mdb",
      });
    }
  } catch (error) {
    return res.status(500).send({
      message: error.message || "Some error occurred while retrieving ",
    });
  }
};
