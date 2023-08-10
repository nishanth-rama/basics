const db = require("../../models");
const moment = require("moment");
const { reset } = require("nodemon");
const axios = require("axios").default;
const invoice_master = db.invoicemasters;
const User_table = db.loginUser;
require("dotenv").config();
const sap_auth = process.env.SAP_AUTH;
const sap_url = process.env.SAP_URL;
const new_sap_url = process.env.NEW_SAP_URL;

exports.getInvoices = async (req, res) => {
  console.log("Getting request for invoice master data");
  let { invoice_date, company_code, plant_id } = req.query;
  if (!invoice_date && !plant_id && !company_code) {
    return res.status(400).send({
      status_code: 400,
      message: "Please provide plant id and invoice date!",
    });
  }
  const todaysDate = new Date(invoice_date);
  let tomorrowsDate = moment(todaysDate).add(1, "days");
  await invoice_master
    .find({
      invoiceDate: {
        $gte: new Date(
          moment(invoice_date).tz("Asia/Kolkata").format("YYYY-MM-DD") +
            "T00:00:00.000+05:30"
        ),
        $lte: new Date(
          moment(invoice_date).tz("Asia/Kolkata").format("YYYY-MM-DD") +
            "T23:59:59.999+05:30"
        ),
      },
      "invoiceDetails.company_code": company_code,
      "invoiceDetails.deliveryFrom": plant_id,
      // itemSupplied: {
      //   $elemMatch: {
      //     plant: plant_id
      //   }
      // },
    })
    .sort({ createdAt: -1 })
    .select({ invoiceDetails: 1, shipping_point: 1, deliveryNo: 1 })
    .then(async (data) => {
      // console.log("asdadasdasa",data)
      let responseData = [];
      let resMessage = "";
      if (data.length === 0) {
        resMessage = "Invoice data not found";
      } else {
        await data.map(async (each) => {
          let invoice_data = {};
          if (each.invoiceDetails) {
            invoice_data = each.invoiceDetails;
          }
          if (each.invoiceDetails) {
            let resObj = {
              invoice_no: invoice_data.invoiceNo,
              delivery_no: each.deliveryNo,
              sales_order_no: invoice_data.sales_order_no,
              plant: each.shipping_point,
              type: invoice_data.billing_type,
              customer_code: invoice_data.sold_to_party,
            };
            responseData.push(resObj);
            resMessage = "Invoice data available";
          }
        });
      }
      return res.status(200).send({
        status_code: 200,
        message: resMessage,
        data: responseData,
      });
    })
    .catch((err) => {
      return res.status(500).send({
        status_code: 500,
        message:
          err.message || "Some error occurred while retrieving invoice data.",
      });
    });
};

exports.getInvoicesV2 = async (req, res) => {
  console.log("Getting request for invoice master data");
  let { invoice_date, company_code, plant_id } = req.query;
  if (!invoice_date && !plant_id && !company_code) {
    return res.status(400).send({
      status_code: 400,
      message: "Please provide plant id and invoice date!",
    });
  }
  const todaysDate = new Date(invoice_date);
  let tomorrowsDate = moment(todaysDate).add(1, "days");
  await invoice_master
    .find({
      invoiceDate: {
        $gte: new Date(
          moment(invoice_date).tz("Asia/Kolkata").format("YYYY-MM-DD") +
            "T00:00:00.000+05:30"
        ),
        $lte: new Date(
          moment(invoice_date).tz("Asia/Kolkata").format("YYYY-MM-DD") +
            "T23:59:59.999+05:30"
        ),
      },
      "invoiceDetails.company_code": company_code,
      "invoiceDetails.deliveryFrom": plant_id,
      // itemSupplied: {
      //   $elemMatch: {
      //     plant: plant_id
      //   }
      // },
    })
    .sort({ createdAt: -1 })
    .select({ invoiceDetails: 1, shipping_point: 1, deliveryNo: 1 })
    .then(async (data) => {
      // console.log("asdadasdasa",data)
      let responseData = [];
      let resMessage = "";
      var result_array = [];
      if (data.length === 0) {
        resMessage = "Invoice data not found";
      } else {
        resMessage = "Invoice data available";
        result_array = await Promise.all(
          data.map(async (data, idx) => {
            let response_obj = {};
            response_obj.invoice_no = data["invoiceDetails"]["invoiceNo"];
            response_obj.signed_qrcode = data["invoiceDetails"]["signed_qrcode"]
              ? data["invoiceDetails"]["signed_qrcode"]
              : "";
            response_obj.irn_no = data["invoiceDetails"]["irn_no"]
              ? data["invoiceDetails"]["irn_no"]
              : "";
            response_obj.delivery_no = data["deliveryNo"];
            response_obj.sales_order_no =
              data["invoiceDetails"]["sales_order_no"];
            response_obj.plant = data["shipping_point"];
            response_obj.type = data["invoiceDetails"]["billing_type"];
            response_obj.customer_code =
              data["invoiceDetails"]["sold_to_party"];
            response_obj.invoice_details = await invoice_master.aggregate([
              {
                $match: {
                  "invoiceDetails.invoiceNo":
                    data["invoiceDetails"]["invoiceNo"],
                },
              },
              {
                $addFields: {
                  payer_id: { $toInt: "$invoiceDetails.payer" },
                  sold_to_party_id: { $toInt: "$invoiceDetails.sold_to_party" },
                  cgstAmount: { $sum: "$itemSupplied.cgst_value" },
                  sgstAmount: { $sum: "$itemSupplied.sgst_value" },
                  igstAmount: { $sum: "$itemSupplied.igst_value" },
                  ugstAmount: { $sum: "$itemSupplied.ugst_value" },
                },
              },
              {
                $lookup: {
                  from: "customers",
                  localField: "payer_id",
                  // localField: "0001000024",
                  foreignField: "goFrugalId",
                  as: "payer_detail",
                },
              },
              {
                $project: {
                  _id: 0,
                  gstAmount: {
                    $add: [
                      "$cgstAmount",
                      "$sgstAmount",
                      "$igstAmount",
                      "$ugstAmount",
                    ],
                  },
                  "payer_detail.gstNumber": 1,
                },
              },
            ]);
            return response_obj;
          })
        );
      }
      return res.status(200).send({
        status_code: 200,
        message: resMessage,
        data: result_array,
      });
    })
    .catch((err) => {
      return res.status(500).send({
        status_code: 500,
        message:
          err.message || "Some error occurred while retrieving invoice data.",
      });
    });
};

exports.getInvoiceByNo = async (req, res) => {
  console.log("Getting request for specific invoice");
  const { invoice_no } = req.query;
  if (!invoice_no) {
    return res.status(400).send({
      status_code: 400,
      message: "Please provide invoice number and delivery number",
    });
  }

  await invoice_master
    .aggregate([
      {
        $match: {
          "invoiceDetails.invoiceNo": invoice_no,
        },
      },
      // {
      //   $project:{
      //     invoiceDetails:1
      //   }
      // },
      // console.log("wqeqwe",plant_id)
      // const previous = new Date();
      // previous.setDate(previous.getDate() - 1);
      // console.log("todaye",new Date(new Date(new Date()).setHours(00, 00, 00)));
      // console.log("today",new Date(new Date(new Date()).setHours(23, 59, 59)));
      // console.log("yesterdays",previous);
      // console.log("yesterdays",new Date(previous.setHours(00, 00, 00)));
      // console.log("yesterdays",new Date(previous.setHours(23, 59, 59)));
      {
        $addFields: {
          payer_id: { $toInt: "$invoiceDetails.payer" },
          sold_to_party_id: { $toInt: "$invoiceDetails.sold_to_party" },
          cgstAmount: { $sum: "$itemSupplied.cgst_value" },
          sgstAmount: { $sum: "$itemSupplied.sgst_value" },
          igstAmount: { $sum: "$itemSupplied.igst_value" },
          ugstAmount: { $sum: "$itemSupplied.ugst_value" },
        },
        // $addFields: {
        //   "payer_id": {
        //     $toInt: "invoiceDetails.payer"
        //   }
        // }
      },
      {
        $lookup: {
          from: "customers",
          localField: "payer_id",
          // localField: "0001000024",
          foreignField: "goFrugalId",
          as: "payer_detail",
        },
      },
      {
        $lookup: {
          from: "customers",
          localField: "sold_to_party_id",
          // localField: "0001000024",
          foreignField: "goFrugalId",
          as: "sold_to_party_detail",
        },
      },
      {
        $lookup: {
          from: "rapid_plantmasters",
          localField: "shipping_point",
          // localField: "0001000024",
          foreignField: "plant_id",
          as: "plant_detail",
        },
      },
      {
        $project: {
          gstAmount: {
            $add: ["$cgstAmount", "$sgstAmount", "$igstAmount", "$ugstAmount"],
          },
          _id: 1,
          isSelected: 1,
          isDelivered: 1,
          isInvoiceViewed: 1,
          soId: 1,
          isHybrid: 1,
          so_db_id: 1,
          so_deliveryDate: 1,
          shipping_point: 1,
          isDistributor: 1,
          isStandalone: 1,
          storageLocation: 1,
          deliveryNo: 1,
          cityId: 1,
          customerName: 1,
          companyDetails: 1,
          payerDetails: 1,
          shippingDetails: 1,
          invoiceDetails: 1,
          invoiceDate: 1,
          totalQuantitySupplied: 1,
          totalQuantityDemanded: 1,
          totalWeight: 1,
          totalAmount: 1,
          totalTax: 1,
          totalDiscount: 1,
          totalNetValue: 1,
          itemSupplied: 1,
          createdAt: 1,
          updatedAt: 1,
          payer_id: 1,
          sold_to_party_id: 1,
          payer_detail: 1,
          sold_to_party_detail: 1,
          plant_detail: 1,
          cashfreeQr:1
        },
      },
      // {
      //   $project :{
      //     invoiceDetails:1,
      //       "customer_detail.address1":1,
      //       "customer_detail.address2":1,
      //       "customer_detail.address3":1,
      //       "customer_detail.name":1,
      //       "customer_detail.email":1,
      //       "customer_detail.mobile":1,
      //       "customer_detail.gstNumber":1,

      //   }
      // }
    ])

    // await invoice_master
    //   .find({
    //     "invoiceDetails.invoiceNo": invoice_no,
    //   })
    .then(async (invoiceData) => {
      // console.log("grn_items", invoiceData);
      let message = "";
      if (invoiceData.length === 0) {
        message = "Invoice data not found";
      } else {
        const newRequest = {};
        const request = {
          // invoice_number: "0901284670",
          // invoice_number: "0901284669",
          // invoice_number: "0901290489",
          // invoice_number: "0901288619",
          invoice_number: invoice_no,
        };

        newRequest.request = request;
        var options = {
          method: "get",
          // url: `${sap_url}/credit_debit_note_get`,
          url: `${sap_url}/credit_debit_note_get`,
          headers: { Authorization: `${sap_auth}` },
          data: newRequest,
        };

        let cn_dn_data = await axios.request(options);
      
        let cndn_obj = {
          "dn_invoice":"",
          "dn_date":"",
          "dn_amount" : "",
          "cn_invoice":"",
          "cn_date":"",
          "cn_amount" : "",
          "cn_dn_amount":"",
          "cn_dn_doc_type":""
        };

        if (
          cn_dn_data.data &&
          cn_dn_data.data.response &&
          cn_dn_data.data.response.length
        ) {
      
          var cn_dn_total = 0;
          var cn_dn_array = [];
          cn_dn_data.data.response.map((item, idx) => {
            // (cndn_obj["invoice_number"] = item.invoice_number),
            //   (cndn_obj["cn_dn_doc_type"] = "CN_DN"),
            if(item.cn_dn_doc_type == "DN"){
              cndn_obj["dn_invoice"] = item.cn_dn_invoice; 
              cndn_obj["dn_date"] = item.cn_dn_date; 
              cndn_obj["dn_amount"] = item.cn_dn_amount; 
              cn_dn_total = cn_dn_total + parseInt(item.cn_dn_amount);
            }else {
              cndn_obj["cn_invoice"] = item.cn_dn_invoice; 
              cndn_obj["cn_date"] = item.cn_dn_date; 
              cndn_obj["cn_amount"] = item.cn_dn_amount; 
              cn_dn_total = cn_dn_total - parseInt(item.cn_dn_amount);
            }
            // cn_dn_total = cn_dn_total + parseInt(item.cn_dn_amount);

            if (!cn_dn_array.includes(item.cn_dn_doc_type)) {
              cn_dn_array.push(item.cn_dn_doc_type);
            }
          });
         
          cndn_obj["cn_dn_amount"] = cn_dn_total;
          cndn_obj["cn_dn_doc_type"] = cn_dn_array.reverse().join("");

          invoiceData[0].cn_dn_detail = cndn_obj;
        } else if (cn_dn_data.data && cn_dn_data.data.response) {
          // let cndn_obj = { cn_dn_total:0};
          // (cndn_obj["invoice_number"] =
          //   cn_dn_data.data.response.invoice_number),
          
          (cndn_obj["cn_dn_doc_type"] =
            cn_dn_data.data.response.cn_dn_doc_type)
            if(cn_dn_data.data.response.cn_dn_doc_type == "DN"){
              cndn_obj["dn_invoice"] = cn_dn_data.data.response.cn_dn_invoice; 
              cndn_obj["dn_date"] = cn_dn_data.data.response.cn_dn_date; 
              cndn_obj["dn_amount"] = cn_dn_data.data.response.cn_dn_amount; 
              cndn_obj["cn_dn_amount"] = cndn_obj["cn_dn_amount"] + parseInt(
                cn_dn_data.data.response.cn_dn_amount
              );
            }
            else{
              cndn_obj["cn_invoice"] = cn_dn_data.data.response.cn_dn_invoice; 
              cndn_obj["cn_date"] = cn_dn_data.data.response.cn_dn_date; 
              cndn_obj["cn_amount"] = cn_dn_data.data.response.cn_dn_amount; 
              cndn_obj["cn_dn_amount"] = cndn_obj["cn_dn_amount"] - parseInt(
                cn_dn_data.data.response.cn_dn_amount
              );
            }
          
          invoiceData[0].cn_dn_detail = cndn_obj;
        } else {
          // let cndn_obj = {};
          // cndn_obj["invoice_number"] = invoice_no,
          // cndn_obj["cn_dn_doc_type"] = "",
          // cndn_obj["cn_dn_amount"] = "";
          invoiceData[0].cn_dn_detail = cndn_obj;
        }

        // if(cn_dn_data.length){

        // }

        if (invoiceData[0].invoiceDate) {
          invoiceData[0].invoiceDate.setDate(
            invoiceData[0].invoiceDate.getDate() + 1
          );
        }

        if (
          invoiceData[0].invoiceDetails &&
          invoiceData[0].invoiceDetails.invoiceDate
        ) {
          invoiceData[0].invoiceDetails.invoiceDate.setDate(
            invoiceData[0].invoiceDetails.invoiceDate.getDate() + 1
          );
        }
        message = "Invoice data found";
      }
      return res.status(200).send({
        status_code: 200,
        message: message,
        data: invoiceData,
      });
    })
    .catch((err) => {
      return res.status(500).send({
        status_code: 500,
        message: err.message || "Error while doing db query!",
      });
    });
};

exports.invoice_status = async (req, res) => {
  try {
    const { invoice_no } = req.query;
    if (!invoice_no) {
      return res.status(400).send({
        status_code: 400,
        message: "Missing parameter.",
      });
    }

    var options = {
      method: "get",
      url: `${new_sap_url}/invoice_sto_get_specific/${invoice_no}`,
    };

    console.log("options", options);

    // var options = {
    //   method: "post",
    //   url: `${sap_url}/Picking_Allocation_Creation`,
    //   data: newRequest,
    // };

    await axios.request(options).then(async (response) => {
      // console.log(response.data)
      if (response.data && response.data.invoice_no) {
        return res.send({
          status_code: 200,
          data: response.data,
        });
      } else {
        return res.send({
          status_code: 400,
          message: "No Data Found",
          // data : response.data
        });
      }
    });
    // .catch(function (error) {
    //   return res.status(400).send({
    //     status_code: 400,
    //     message:
    //       error.message ||
    //       "Some error occurred while retrieving invoice detail from sap.",
    //   });
    // });
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message: error.message || "Some error occurred while retrieving detail!",
    });
  }
};


exports.irn_synch_sap = async (req, res) => {
  try {
    const { invoice_no } = req.query;
    if (!invoice_no) {
      return res.status(400).send({
        status_code: 400,
        message: "Missing parameter.",
      });
    }

    var options = {
      method: "get",
      url: `${new_sap_url}/invoice_sto_get_specific/${invoice_no}`,
    };

    // console.log("options",options);

    // var options = {
    //   method: "post",
    //   url: `${sap_url}/Picking_Allocation_Creation`,
    //   data: newRequest,
    // };

    await axios.request(options).then(async (response) => {
      console.log(response.data)
      if (response.data && response.data.status == 200) {
        return res.send({
          status_code: 200,
          message: response.data.message,
        });
      } else {
        return res.send({
          status_code: 400,
          message: "IRN not Synced",
          // data : response.data
        });
      }
    });
    // .catch(function (error) {
    //   return res.status(400).send({
    //     status_code: 400,
    //     message:
    //       error.message ||
    //       "Some error occurred while retrieving invoice detail from sap.",
    //   });
    // });
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message: error.message || "Some error occurred while retrieving detail!",
    });
  }
};

