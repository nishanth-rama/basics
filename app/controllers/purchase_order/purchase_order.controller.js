"use strict";

const e = require("express");
const { type, status } = require("express/lib/response");
const db = require("../../models");

const purchaseOrder = db.purchaseOrder;
const asn_details = db.asnDetails;
const inwardProcess = db.inwardProcess;

const asn_table = db.asnDetails;

// get all purchase order
exports.findAll = async (req, res) => {
  console.log("calling get purchase order..");

  let { page, po_document_type, delivery_date, plant_id, company_code } =
    req.query;

  console.log(po_document_type, delivery_date, company_code, plant_id);

  if (!(page && po_document_type && delivery_date && plant_id && company_code))
    return res
      .status(400)
      .send({ message: "Please provide all required parameters" });

  let skipCount = page == 1 ? 0 : +page * 25 - 25;
  let dataCount = page * 25;

  let filter = {};

  // if (po_document_type == "ZWST" || po_document_type == "ZWSI")
  //   return res
  //     .status(422)
  //     .send({ message: "Wrong purchase order document type!" });
  if (po_document_type == "ALL") {
    filter = {
      company_code: company_code,
      supplying_plant: plant_id,
      delivery_date: delivery_date,
    };
  } else {
    filter = {
      company_code: company_code,
      supplying_plant: plant_id,
      po_document_type: po_document_type,
      delivery_date: delivery_date,
    };
  }

  const totalDataCount = await purchaseOrder.find(filter).countDocuments();

  await purchaseOrder
    .find(filter)
    .sort({ id: -1 })
    .skip(skipCount)
    .limit(dataCount)
    .then((purchaseOrderDetails) => {
      let data = [];
      let serialNo = page == 1 ? 0 : page * 25 - 25;

      const addingSerialNo = (ele) => {
        data.push({
          serial_no: ++serialNo,
          id: ele.id,
          po_number: ele.po_number,
          po_document_type: ele.po_document_type,
          company_code: ele.company_code,
          vendor_no: ele.vendor_no,
          purchase_organisation: ele.purchase_organisation,
          purchase_group: ele.purchase_group,
          document_date: ele.document_date,
          delivery_date: ele.delivery_date,
          start_of_validity_period: ele.start_of_validity_period,
          end_of_validity_period: ele.end_of_validity_period,
          referance_no: ele.referance_no,
          updated_at: ele.updated_at,
          created_at: ele.created_at,
          api_response: ele.api_response,
          plant_id: ele.supplying_plant,
          shiping_plant: ele.shiping_plant,
          vendor_name: ele.vendor_name,
          isDeleted: ele.isDeleted,
          status: ele.status,
          createdAt: ele.createdAt,
          updatedAt: ele.updatedAt,
          item: ele.item,
        });
      };
      purchaseOrderDetails.map(addingSerialNo);

      let mssge = "PO details are available";

      if (data.length == 0) mssge = "PO details are not available!";

      return res.send({
        message: mssge,
        totalDataCount: totalDataCount,
        data: data,
      });
    })
    .catch((err) => {
      return res.status(500).send({
        message: "Some error occurred while retrieving purchase orders.",
      });
    });
};

// creating new purchase order entry
exports.createOne = async (req, res) => {
  console.log("calling create purchase order..");

  if (!req.body) return res.status(400).send({ message: "Missing parameter" });

  await purchaseOrder
    .create(req.body)
    .then((newDataAdded) => {
      return res.send({ data: newDataAdded });
    })
    .catch((err) => {
      return res.status(500).send({
        message: "Some error occurred while creating new purchase order",
      });
    });
};

//get po type
exports.findPoType = async (req, res) => {
  console.log("calling get po type api");

  const { company_code, plant_id, delivery_date } = req.query;

  if (!(company_code && plant_id && delivery_date))
    return res
      .status(400)
      .send({ status_code: 400, message: "Missing parameter" });

  await purchaseOrder
    .find(
      {
        company_code: company_code,
        supplying_plant: plant_id,
        delivery_date: delivery_date,
      },
      { _id: 0, po_document_type: 1 }
    )
    .then((po_document_type) => {
      const uniqueObjects = [
        ...new Map(
          po_document_type.map((type) => [type.po_document_type, type])
        ).values(),
      ];

      let mssge = "PO type list is available";
      let status = 200;

      if (uniqueObjects.length == 0) {
        status = 404;
        mssge = "PO type list is not available!";
      }

      return res.send({
        status_code: status,
        message: mssge,
        data: uniqueObjects,
      });
    })
    .catch((err) => {
      return res.status(500).send({
        status_code: 500,
        message: "Some error occurred while extracting po document type list",
      });
    });
};

//get supplier list
exports.findVendorList = async (req, res) => {
  console.log("calling get vendor list api");

  const { company_code, plant_id, delivery_date, po_document_type } = req.query;

  if (!(company_code && plant_id && delivery_date && po_document_type))
    return res
      .status(400)
      .send({ status_code: 400, message: "Missing parameter" });

  if (po_document_type == "all") {
    var filter = {
      company_code: company_code,
      supplying_plant: plant_id,
      delivery_date: delivery_date,
    };
  } else {
    var filter = {
      company_code: company_code,
      supplying_plant: plant_id,
      delivery_date: delivery_date,
      po_document_type: po_document_type,
    };
  }

  // console.log("filter",filter);

  await purchaseOrder
    .find(filter, { _id: 0, vendor_name: 1, vendor_no: 1, supplying_plant: 1 })
    .then((vendor_list) => {
      let vendorList = vendor_list.map((id) => {
        if (id.vendor_no == "" && id.vendor_name == "")
          return {
            vendor_no: id.supplying_plant,
            vendor_name: id.supplying_plant + " - Own Brand",
          };
        else
          return {
            vendor_no: id.vendor_no,
            vendor_name: id.vendor_name,
          };
      });
      const uniqueObjects = [
        ...new Map(
          vendorList.map((vndr_list) => [vndr_list.vendor_no, vndr_list])
        ).values(),
      ];

      let mssge = "Supplier list is available";
      let status = 200;

      if (uniqueObjects.length == 0) {
        status = 404;
        mssge = "Supplier list is not available!";
      }

      return res.send({
        status_code: status,
        message: mssge,
        data: uniqueObjects,
      });
    })

    .catch((err) => {
      return res.status(500).send({
        status_code: 500,
        message: "Some error occurred while extracting supplier list",
      });
    });
};

//get po number
exports.findPoNo = async (req, res) => {
  console.log("calling get po number api");

  const { company_code, plant_id, delivery_date, po_document_type, vendor_no } =
    req.query;

  if (
    !(
      company_code &&
      plant_id &&
      delivery_date &&
      po_document_type &&
      vendor_no
    )
  )
    return res
      .status(400)
      .send({ status_code: 400, message: "Missing parameter" });

  const vendorNo = vendor_no == plant_id ? "" : vendor_no;

  await purchaseOrder
    .find(
      {
        company_code: company_code,
        supplying_plant: plant_id,
        delivery_date: delivery_date,
        po_document_type: po_document_type,
        vendor_no: vendorNo,
      },
      { _id: 0, po_number: 1 }
    )
    .then((po_number) => {
      const uniqueObjects = [
        ...new Map(po_number.map((po_no) => [po_no.po_number, po_no])).values(),
      ];

      let mssge = "PO number list is available";
      let status = 200;

      if (uniqueObjects.length == 0) {
        status = 404;
        mssge = "PO number list is not available!";
      }

      return res.send({
        status_code: status,
        message: mssge,
        data: uniqueObjects,
      });
    })
    .catch((err) => {
      return res.status(500).send({
        status_code: 500,
        message: "Some error occurred while extracting po number list",
      });
    });
};

//get item list
exports.findItemList = async (req, res) => {
  console.log("calling get item list");

  const {
    company_code,
    plant_id,
    delivery_date,
    po_document_type,
    vendor_no,
    po_number,
  } = req.query;

  if (
    !(
      company_code &&
      plant_id &&
      delivery_date &&
      po_document_type &&
      vendor_no &&
      po_number
    )
  )
    return res.status(400).send({ message: "Missing parameter" });

  const vendorNo = vendor_no == plant_id ? "" : vendor_no;

  await purchaseOrder
    .find(
      {
        company_code: company_code,
        supplying_plant: plant_id,
        delivery_date: delivery_date,
        po_document_type: po_document_type,
        vendor_no: vendorNo,
        po_number: po_number,
      },
      { _id: 0, item: 1 }
    )
    .then((item_list) => {
      let itemList = [];

      item_list = item_list.map((ele) => {
        return {
          item: ele.item.map((ele) => {
            itemList.push({
              item_no: ele.item_no,
              item_code: ele.material_no,
              item_name: ele.material_description,
            });
          }),
        };
      });

      const uniqueObjects = [
        ...new Map(itemList.map((code) => [code.item_code, code])).values(),
      ];

      let mssge = "Item list is available";
      if (uniqueObjects.length == 0) mssge = "Item list is not available!";

      return res.send({ message: mssge, data: uniqueObjects });
    })
    .catch((err) => {
      return res.status(500).send({
        message: "Some error occurred while extracting item list",
      });
    });
};

exports.findItemList_v2 = async (req, res) => {
  console.log("calling get item list");

  const {
    company_code,
    plant_id,
    delivery_date,
    po_document_type,
    vendor_no,
    po_number,
  } = req.query;

  if (
    !(
      company_code &&
      plant_id &&
      delivery_date &&
      po_document_type &&
      vendor_no &&
      po_number
    )
  )
    return res.status(400).send({ message: "Missing parameter" });

  const vendorNo = vendor_no == plant_id ? "" : vendor_no;

  await purchaseOrder
    .find(
      {
        company_code: company_code,
        supplying_plant: plant_id,
        delivery_date: delivery_date,
        po_document_type: po_document_type,
        vendor_no: vendorNo,
        po_number: po_number,
      },
      { _id: 0, item: 1, po_number: 1 }
    )
    .then(async (item_list) => {
      const asn_no = async (po_number) => {
        let asn_number = await asn_details.aggregate([
          {
            $match: {
              po_number: po_number,
            },
          },
          {
            $project: {
              _id: 0,
              "item.inbound_delivery_number": 1,
            },
          },
        ]);

        return asn_number.length > 0 ? true : false;
      };

      let itemList = [];
      for (let i = 0; i < item_list.length; i++) {
        let data = item_list[i];
        for (let j = 0; j < data.item.length; j++) {
          let ele = data.item[j];
          const is_asn = await asn_no(data.po_number);

          itemList.push({
            item_no: ele.item_no,
            item_code: ele.material_no,
            item_name: ele.material_description,
            is_asn: is_asn,
          });
        }
      }

      const uniqueObjects = [
        ...new Map(itemList.map((code) => [code.item_code, code])).values(),
      ];

      let mssge = "Item list is available";
      if (uniqueObjects.length == 0) mssge = "Item list is not available!";

      return res.send({ message: mssge, data: uniqueObjects });
    })
    .catch((err) => {
      return res.status(500).send({
        message: "Some error occurred while extracting item list",
      });
    });
};
exports.itemDetails_v2 = async (req, res) => {
  console.log("calling get item details api");
  const {
    company_code,
    plant_id,
    document_date,
    po_no,
    po_type,
    supplier_no,
    item_code,
    item_no,
    asn_no,
  } = req.query;
  try {
    if (
      !(
        company_code &&
        document_date &&
        plant_id &&
        po_no &&
        po_type &&
        supplier_no &&
        item_code &&
        item_no &&
        asn_no
      )
    )
      return res.status(400).send({
        status_code: 400,
        message: "Provide all required parameters!",
      });

    let mssge = "PO based inward details available";
    let status = 200;
    let data = {};
    let material_details = await db.product_weight_model.findOne({
      company_code: company_code,
      plant_id: plant_id,
      material_code: item_code,
      pallet_capacity: { $exists: true },
      layer_count: { $exists: true },
    });
    if (!material_details) {
      return res
        .status(400)
        .send({ message: "item code does not exist in weight tolerance" });
    }

    let condition = {
      company_code: company_code,
      plant_id: plant_id,
      po_no: po_no,
      po_type: po_type,
      supplier_no: supplier_no,
      item_code: item_code,
      item_no: item_no,
    };

    if (asn_no) {
      condition.inbound_delivery_number = asn_no;
    }

    const inwardDetails = await inwardProcess.findOne(condition, {
      _id: 0,
      item_code: 1,
      item_name: 1,
      item_no: 1,
      uom: 1,
      ordered_qty: 1,
      total_inwarded_qty: 1,
      total_net_qty: 1,
      total_pending_qty: 1,
      total_crates: 1,
      invoice_no: 1,
      delivery_date: 1,
      po_qty: 1,
      purchase_group: 1,
      asn_item_no: 1,
    });
    //console.log("inwardDetails",inwardDetails);
    if (inwardDetails != null)
      data = {
        invoice_no: inwardDetails.invoice_no,
        uom: inwardDetails.uom,
        asn_ordered_qty: inwardDetails.ordered_qty,
        inwarded_qty: inwardDetails.total_inwarded_qty,
        pending_qty: inwardDetails.total_pending_qty,
        net_qty: inwardDetails.total_net_qty,
        crate_count: inwardDetails.total_crates,
        delivery_date: inwardDetails.delivery_date,
        po_order_qty: inwardDetails.po_qty,
        purchase_group: inwardDetails.purchase_group,
        asn_item_no: inwardDetails.asn_item_no ? inwardDetails.asn_item_no : "",
        act_qty: material_details.qty_in_kg || 0,
      };
    else {
      console.log("else");
      const itemDetails = await db.purchaseOrder.aggregate([
        {
          $match: {
            company_code: company_code,
            supplying_plant: plant_id,
            document_date: document_date,
            po_document_type: po_type,
            vendor_no: supplier_no,
            po_number: po_no,
          },
        },
        { $unwind: "$item" },
        {
          $match: {
            "item.item_no": item_no,
            "item.material_no": item_code,
          },
        },
        {
          $project: {
            _id: 0,
            "item.item_no": 1,
            "item.material_no": 1,
            "item.material_description": 1,
            "item.quantity": 1,
            "item.net_price": 1,
            "item.uom": 1,
            delivery_date: 1,
            purchase_group: 1,
          },
        },
      ]);
      console.log(itemDetails);
      if (itemDetails.length > 0) {
        let asn_data = await asn_table.aggregate([
          {
            $match: {
              company_code: company_code,
              po_type: po_type,
              po_number: po_no,
            },
          },
          { $unwind: "$item" },
          {
            $match: {
              "item.inbound_delivery_number": asn_no,
              "item.plant": plant_id,
              "item.material": item_code,
            },
          },
          {
            $limit: 1,
          },
          {
            $project: {
              _id: 0,
              item_no: "$item.po_item",
              item_code: "$item.material",
              item_name: "$item.material_description",
              asn_qty: "$item.inbound_delivery_qty",
              asn_item_no: "$item.inbound_delivery_item_no",
            },
          },
        ]);

        var asn_qty = 0,
          asn_item_no = "";
        if (asn_data.length) {
          asn_qty = asn_data[0].asn_qty;
          asn_item_no = asn_data[0].asn_item_no;
        }

        data = {
          invoice_no: "",
          uom: itemDetails[0].item["uom"],
          asn_ordered_qty: asn_qty ? +asn_qty : 0,
          inwarded_qty: 0,
          net_qty: 0,
          pending_qty:
            asn_qty != undefined ? +asn_qty : itemDetails[0].item["quantity"],
          crate_count: 0,
          delivery_date: itemDetails[0].delivery_date,
          po_order_qty: itemDetails[0].item["quantity"],
          purchase_group: itemDetails[0].purchase_group,
          asn_item_no: asn_item_no ? asn_item_no : "",
          act_qty: material_details.qty_in_kg || 0,
        };
      } else {
        status = 404;
        mssge = "PO based inward details not found!";
      }
    }

    return res.send({
      status_code: status,
      message: mssge,
      data: data,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status_code: 500,
      message: "Some error occurred while extracting item inward details!",
    });
  }
};

exports.findPoDocType = async (req, res) => {
  console.log("calling get vendor list");

  const { delivery_date, po_document_type, plant_id } = req.query;

  if (!(delivery_date && po_document_type && plant_id))
    return res.status(400).send({ message: "Missing parameter." });

  // await purchaseOrder
  // .find({delivery_date:delivery_date,po_document_type:po_document_type},{_id:0,vendor_name:1,vendor_no:1})
  await purchaseOrder
    .aggregate([
      {
        $match: {
          delivery_date: delivery_date,
          po_document_type: po_document_type,
          supplying_plant: plant_id,
        },
      },
      {
        $project: {
          po_number: 1,
          po_document_type: 1,
          company_code: 1,
          vendor_no: 1,
          vendor_name: 1,
          purchase_organisation: 1,
          purchase_group: 1,
          document_date: 1,
          "item.plant": 1,
          // plant: {$first:'$item.plant'},
          start_of_validity_period: 1,
          end_of_validity_period: 1,
          referance_no: 1,
          delivery_date: 1,
          shiping_plant: 1,
        },
      },
    ])
    .then((result) => {
      res.send({ vendor_list: result });
    })

    .catch((err) => {
      return res.status(500).send({
        message: "Some error occurred while extracting vendor list.",
      });
    });
};

// get specific po details according to provided po number
exports.specificPoDetails = async (req, res) => {
  try {
    const { poNo, plantId } = req.query;
    if (!(poNo && plantId))
      return res
        .status(422)
        .json({ message: "Provide po number and plant Id" });

    const poDetails = await purchaseOrder.findOne({
      po_number: poNo,
      supplying_plant: plantId,
    });

    const plantDetails = await db.plants.findOne({ plant_id: plantId });

    const ans_detail = await db.asnDetails.aggregate([
      {$match:{po_number:poNo}},
      {$unwind:"$item"},
      {
        $project:{
          po_number:"$po_number",
          material:"$item.material",
          po_qty:"$item.po_qty",
          inbound_delivery_qty:"$item.inbound_delivery_qty",
          asn_number :"$item.inbound_delivery_number",
          plant:"$item.plant"
        }
      }
    ])

    // return res.send({data:ans_detail})

    // console.log("ans_detail",ans_detail);

    let parse_poDetail = JSON.parse(JSON.stringify(poDetails))

    parse_poDetail && parse_poDetail.item.map((item,idx)=>{
      item.asn_number = "-";
      item.asn_qty = "-";
      item.po_qty = "-";
      for(let x of ans_detail){
        if(item.material_no == x.material && item.plant == x.plant){
          item.asn_number = x.asn_number;
          item.asn_qty = x.inbound_delivery_qty;
          item.po_qty = x.po_qty;
        }
      
      }
    })
  



    let mssge = "PO details is available";
    let data = {
      poDetails: parse_poDetail,
      plantDetails: plantDetails,
    };
    let status_code = 200;
    if (poDetails == null) {
      mssge = "PO details is not available!";
      status_code = 400
      data = {
        poDetails: {},
        plantDetails: {},
      };
    }

    return res.json({
      message: mssge,
      status_code,
      data: data,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Some error occurred while fetching specific po details.",
    });
  }
};

// // Retrieve all by company code
// exports.get_all_order_details_by_company_code = (req, res) => {
//   if(!req.query.company_code ) {

//       return res.status(400).send({ status_code : "400",
//           message: "Company code parameter is missing !"
//       });
//   }

//   const company_code = req.query.company_code;

//   purchaseOrder.find({ company_code: company_code })
//     .then(data => {
//       console.log("d", data.length)
//       if (data.length == 0 ){
//         return res.status(404).send({status:"400", message: "company code not found !"});
//       }

//       else res.status(200).send({ status_code : "200",
//       message: "Rack master data is available",data
//   });
//     })
//     .catch(err => {
//       res
//         .status(500)
//         .send({ message: "Error retrieving rack"});
//     });
// };

// get all purchase order
exports.get_all_order_details_by_company_code = async (req, res) => {
  console.log("calling get purchase order..");

  let { page, po_document_type, delivery_date, plant_id, company_code } =
    req.query;

  if (!(page && po_document_type && delivery_date && plant_id && company_code))
    return res
      .status(400)
      .send({ message: "Please provide all required parameters" });

  let skipCount = page == 1 ? 0 : +page * 25 - 25;
  let dataCount = page * 25;

  let filter = {};

  if (po_document_type == "ZWST" || po_document_type == "ZWSI")
    return res
      .status(422)
      .send({ message: "Wrong purchase order document type" });
  else if (po_document_type == "ALL") {
    filter = {
      po_document_type: { $in: ["ZFPO", "ZNFV"] },
      delivery_date: delivery_date,
      supplying_plant: plant_id,
      company_code: company_code,
    };
  } else {
    filter = {
      po_document_type: po_document_type,
      delivery_date: delivery_date,
      supplying_plant: plant_id,
      company_code: company_code,
    };
  }

  const totalDataCount = await purchaseOrder.find(filter).countDocuments();

  await purchaseOrder
    .find(filter)
    .sort({ id: -1 })
    .skip(skipCount)
    .limit(dataCount)
    .then((purchaseOrderDetails) => {
      let data = [];
      let serialNo = page == 1 ? 0 : page * 25 - 25;

      const addingSerialNo = (ele) => {
        data.push({
          serial_no: ++serialNo,
          id: ele.id,
          po_number: ele.po_number,
          po_document_type: ele.po_document_type,
          company_code: ele.company_code,
          vendor_no: ele.vendor_no,
          purchase_organisation: ele.purchase_organisation,
          purchase_group: ele.purchase_group,
          document_date: ele.document_date,
          delivery_date: ele.delivery_date,
          start_of_validity_period: ele.start_of_validity_period,
          end_of_validity_period: ele.end_of_validity_period,
          referance_no: ele.referance_no,
          updated_at: ele.updated_at,
          created_at: ele.created_at,
          api_response: ele.api_response,
          plant_id: ele.supplying_plant,
          shiping_plant: ele.shiping_plant,
          vendor_name: ele.vendor_name,
          isDeleted: ele.isDeleted,
          status: ele.status,
          createdAt: ele.createdAt,
          updatedAt: ele.updatedAt,
          item: ele.item,
        });
      };
      purchaseOrderDetails.map(addingSerialNo);

      return res.send({
        message: "Purchase order details",
        totalDataCount: totalDataCount,
        data: data,
      });
    })
    .catch((err) => {
      return res.status(500).send({
        message: "Some error occurred while retrieving purchase orders.",
      });
    });
};




const get_autoInward_po_type = async (filter) =>{


  const {company_code,plant_id,delivery_date}  = filter

          return await inwardProcess.aggregate([
            {
            $match:{
              company_code,plant_id,delivery_date,
              "inward_crate_details.mode":"autoinward"
            }
          },
          {
              $group:{
                _id:"$po_type",
                po_type:{$first:"$po_type"}

              }
          },
          {
            $project:{
              _id:0,
              po_document_type:"$po_type"
            }
          },
          {
            $sort:{
              po_document_type:1
            }
          }
          ]) 
}

//get po type
exports.findPoType_wdc = async (req, res) => {
  console.log("calling get po type api");

  const { company_code, plant_id, delivery_date } = req.query;

  if (!(company_code && plant_id && delivery_date))
    return res
      .status(400)
      .send({ status_code: 400, message: "Missing parameter" });

      try {

        let po_type_vendor = await purchaseOrder.aggregate([
          {
          $match :{
            company_code: company_code,
            supplying_plant: plant_id,
            delivery_date: delivery_date,
            vendor_no:{$ne:""}
          }
        },
        {
          $group:{
            _id:"$po_document_type",
            po_document_type:{$first:"$po_document_type"}

          }
      },
      {
        $project:{
          _id:0,
          po_document_type:1
        }
      },
      {
        $sort:{
          po_document_type:1
        }
      }

      ])

      let po_type_auto = await get_autoInward_po_type({ company_code, plant_id, delivery_date })

      let result_array = [...po_type_vendor,...po_type_auto]

      if(result_array.length){
        return res.send({status_code:200,message:"Po type list!",data:result_array})
     }
     else{
        return res.send({status_code:404,message:"Po type not available!"})
     }

             
      }
    catch(err){
      return res.status(500).send({
        status_code: 500,
        message: "Some error occurred while extracting po document type list",
      });
    };
};

// auto supplier list function 
const get_autoInward_vendor_name = async (filter_obj) =>{

  console.log("filter_obj",filter_obj);
  

  return  await inwardProcess.aggregate([
    {
    $match : filter_obj
   },
   {
    $group:{
      _id:"$supplier_no",
      supplier_no:{$first:"$supplier_no"},
      supplier_name:{$first:"$supplier_name"}
    }
   },
   {
      $project :{
        _id:0,
        vendor_no:"$supplier_no",
        vendor_name:"$supplier_name"
      }
   },
   {
    $sort:{
     vendor_no:1
    }
   }
  ]) 

}

//get supplier list
exports.findVendorList_wdc = async (req, res) => {
 console.log("calling get vendor list api");

 const { company_code, plant_id, delivery_date, po_document_type } = req.query;

 if (!(company_code && plant_id && delivery_date && po_document_type))
   return res
     .status(400)
     .send({ status_code: 400, message: "Missing parameter" });



 if (po_document_type == "all") {
   var filter = {
     company_code: company_code,
     supplying_plant: plant_id,
     delivery_date: delivery_date,
     vendor_no:{$ne:""}
   };

   var filter_obj = {
     company_code,plant_id,delivery_date,
     "inward_crate_details.mode":"autoinward"
   }

 } else {
   var filter = {
     company_code: company_code,
     supplying_plant: plant_id,
     delivery_date: delivery_date,
     po_document_type: po_document_type,
   }

   var filter_obj = {
     company_code,plant_id,delivery_date,
     po_type:po_document_type,
     "inward_crate_details.mode":"autoinward"
   }

 }
   try{

     let vendor_list = await purchaseOrder.aggregate([
       {$match:filter},
       {
         $group:{
           _id:"$vendor_no",
           vendor_no:{$first:"$vendor_no"},
           vendor_name:{$first:"$vendor_name"}
         }
        },
        {
           $project :{
             _id:0,
             vendor_no:"$vendor_no",
             vendor_name:"$vendor_name"
           }
        },
        {
         $sort:{
           vendor_no:1
         }
        }

     ])

     let auto_vendor_list = await get_autoInward_vendor_name(filter_obj)


    // console.log("1234567",vendor_list,auto_vendor_list);


     let result_array = [...vendor_list,...auto_vendor_list]

     if(result_array.length){
       return res.send({status_code:200,message:"Vendor list!",data:result_array})
    }
    else{
       return res.send({status_code:404,message:"Vendor list is not available!"})
    }
     
   }

   catch(error) {
     return res.status(500).send({
       status_code: 500,
       message: "Some error occurred while extracting supplier list",
     });
   };
};
