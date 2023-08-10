const db = require("../../models");
const inwardProcess = db.inwardProcess;
const purchase_order_table = db.purchaseOrder;
const sales_order_table = db.soAllocation;
const moment_tz = require("moment-timezone");
const plant_table = db.plants;

const sac_so_table = db.sacSoDetail;
const sac_po_table = db.sacPoDetail;

// exports.purchase_order_report = async (req, res) => {
//   if (!req.query.company_code) {
//     return res.send({
//       status_code: 400,
//       message: "Please provide company code",
//     });
//   }

//   try {
//     // let plant_detail = await plant_table
//     //   .find({ company_code: req.query.company_code, active_status: 1 })
//     //   .select({ plant_id: 1 });

//     // let plant_id_array = plant_detail.map((item, idx) => {
//     //   return item.plant_id;
//     // });

//     const creation_date = moment_tz(new Date())
//       .tz("Asia/Kolkata")
//       .format("DD-MM-YYYY");

//     const today_date = moment_tz(new Date()).tz("Asia/Kolkata");

//     let yesterday = moment_tz(today_date)
//       .subtract(1, "days")
//       .format("YYYY-MM-DD");

//     // createdAt: {
//     //   $gt: new Date(new Date(new Date()).setHours(00, 00, 00)),
//     //   $lte: new Date(new Date(new Date()).setHours(23, 59, 59)),
//     // },

//     // console.log( "createdAt: {",
//     //    new Date(new Date(new Date()).setHours(00, 00, 00)),
//     //   new Date(new Date(new Date()).setHours(23, 59, 59)),
//     // )

//     // return res.send({data:"send"});

//     console.log("yesterday", yesterday);

//     let purchase_order_detail = await purchase_order_table.aggregate([
//       {
//         $match: {
//           delivery_date: "2023-01-10",
//           supplying_plant: { $in: ["1000", "1023"] },
//           company_code: req.query.company_code,
//         },
//       },
//       {
//         $lookup: {
//           from: "rapid_purchase_order_inward_details",
//           localField: "po_number",
//           foreignField: "po_no",
//           pipeline: [
//             {
//               $addFields: {
//                 oakk: {
//                   $filter: {
//                     input: "$inward_crate_details",
//                     as: "chunks",
//                     cond: {
//                       $eq: ["$$chunks.grn_status", "success"],
//                     },
//                   },
//                 },
//               },
//             },
//             {
//               $project: {
//                 inward_crate_details: 1,
//                 oakk: 1,
//                 grn_number: { $arrayElemAt: ["$oakk.grn_no", -1] },
//                 grn_date: { $arrayElemAt: ["$oakk.inwarded_time", -1] },
//                 grn_date: {
//                   $dateToString: {
//                     date: {
//                       $dateFromString: {
//                         dateString: {
//                           $arrayElemAt: ["$oakk.inwarded_time", -1],
//                         },
//                       },
//                     },
//                     // date: {$arrayElemAt:["$oakk.inwarded_time",-1]},
//                     format: "%d-%m-%Y",
//                     timezone: "Asia/Kolkata",
//                     onNull: "",
//                   },
//                 },
//                 total_grn_post_qty: 1,
//                 total_grn_qty: {
//                   $sum: "$oakk.net_qty",
//                 },
//                 company_code: 1,
//                 delivery_date: 1,
//                 invoice_no: 1,
//                 item_code: 1,
//                 item_name: 1,
//                 item_no: 1,
//                 ordered_qty: 1,
//                 plant_id: 1,
//                 po_no: 1,
//                 po_type: 1,
//                 supplier_name: 1,
//                 supplier_no: 1,
//                 uom: 1,
//                 total_inwarded_qty: 1,
//                 total_net_qty: 1,

//                 inward_qty_use :{
//                   $cond :{
//                     if:{
//                       $eq :["$uom","KG"]},
//                       then : "$total_net_qty",
//                       else :"$total_inwarded_qty"
                    
//                   }
//                 },
//                 total_pending_qty: 1,
//                 total_crates: 1,
//                 created_at: {
//                   $dateToString: {
//                     date: "$created_at",
//                     format: "%d-%m-%Y",
//                     timezone: "Asia/Kolkata",
//                     onNull: "",
//                   },
//                 },
//                 // inward_crate_details: 1,
//               },
//             },
//           ],
//           as: "inward_detail",
//         },
//       },
//       {
//         $unwind: {
//           path: "$inward_detail",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $unwind: {
//           path: "$item",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $match: {
//           $expr: {
//             $or: [
//               {
//                 $and: [
//                   { $eq: ["$item.material_no", "$inward_detail.item_code"] },
//                   { $eq: ["$item.item_no", "$inward_detail.item_no"] },
//                 ],
//               },
//               { $ifNull: ["$inward_detail", true] },
//             ],
//           },
//         },
//       },
//       {
//         $group: {
//           _id: "$po_number",
//           po_number: { $first: "$po_number" },
//           company_code: { $first: "$company_code" },
//           plant_id: { $first: "$supplying_plant" },
//           vendor_code: { $first: "$vendor_no" },
//           vendor_name: { $first: "$vendor_name" },
//           po_delivery_date: { $first: "$delivery_date" },
//           po_document_type: { $first: "$po_document_type" },
//           created_at: { $first: creation_date },
//           item_detail: {
//             $push: {
//               item_no: "$item.item_no",
//               item_code: "$item.material_no",
//               item_name: "$item.material_description",
//               order_qty: "$item.quantity",
//               order_qty_uom: "$item.uom",
//               grn_number: "$inward_detail.grn_number",
//               grn_qty: "$inward_detail.total_grn_qty",
//               grn_qty_uom: "$inward_detail.uom",
//               grn_date: "$inward_detail.grn_date",
//               inward_qty: "$inward_detail.inward_qty_use",
//               inward_qty_uom: "$inward_detail.uom",
//               inward_date: "$inward_detail.created_at",
//             },
//           },
//         },
//       },
//       {
//         $project:{
//           _id:0,
//           po_number:"$po_number",
//           company_code:"$company_code",
//           plant_id:"$plant_id",
//           // vendor_code:"$vendor_code",
//           vendor_name:"$vendor_name",
//           vendor_code :{
//             $cond: { if: { $eq: [ "$vendor_code", "" ] }, then: "$plant_id", else: "$vendor_code" }
//           },
//           vendor_name :{
//             $cond: { if: { $eq: [ "$vendor_name", "" ] }, then: "Own Brand", else: "$vendor_name" }
//           },
//           // po_delivery_date:"$po_delivery_date",
//           po_delivery_date :{
//             $dateToString: {
//               // date: "$po_delivery_date",
//               date: {
//                 $dateFromString: {
//                   dateString: 
//                     "$po_delivery_date",
//                 },
//               },
//               format: "%d-%m-%Y",
//               timezone: "Asia/Kolkata",
//               onNull: "",
//             },
//           },
//           po_document_type:"$po_document_type",
//           created_at:"$created_at",
//           item_detail:"$item_detail"
          
//         }
//       }
//     ]);
    

//     return res.send({ data: purchase_order_detail });

//     // console.log("purchase_order_detail.length", purchase_order_detail.length);

//     // var final_array = [];

//     if (purchase_order_detail.length) {
//       let result_array = await Promise.all(
//         purchase_order_detail.map(async (main_item, idx) => {
//           let res_obj = {};

//           // console.log(main_item);

//           if (main_item.po_number) {
//             res_obj["company_code"] = main_item.company_code;
//             res_obj["plant_id"] = main_item.supplying_plant;
//             res_obj["po_delivery_date"] = moment_tz(
//               main_item.delivery_date
//             ).format("DD-MM-YYYY");
//             res_obj["po_number"] = main_item.po_number;
//             res_obj["po_document_type"] = main_item.po_document_type;
//             res_obj["vendor_code"] = main_item.vendor_no
//               ? main_item.vendor_no
//               : main_item.supplying_plant;
//             res_obj["vendor_name"] = main_item.vendor_name
//               ? main_item.vendor_name
//               : `${main_item.supplying_plant}-Own Brand`;
//             res_obj["created_at"] = creation_date;

//             var item_detail_array = [];

//             main_item.item.map((item, idx) => {
//               let second_obj = {};

//               // console.log("grn_detail", main_item.grn_detail.length);
//               second_obj["item_no"] = item.item_no;
//               second_obj["item_code"] = item.material_no;
//               second_obj["item_name"] = item.material_description;
//               second_obj["order_qty"] = item.quantity;
//               second_obj["order_qty_uom"] = item.uom;

//               // console.log(
//               //   "main_item.grn_detail.length",
//               //   main_item.grn_detail.length
//               // );
//               for (let j = 0; j < main_item.grn_detail.length; j++) {
//                 if (
//                   item.material_no == main_item.grn_detail[j].material_no &&
//                   item.item_no == main_item.grn_detail[j].po_item
//                 ) {
//                   second_obj["grn_material_no"] =
//                     main_item.grn_detail[j].material_no;
//                   second_obj["grn_number"] = main_item.grn_detail[j].grn_id;
//                   second_obj["grn_qty"] = second_obj["grn_qty"]
//                     ? Number(second_obj["grn_qty"]) +
//                       Number(main_item.grn_detail[j].quantity)
//                     : Number(main_item.grn_detail[j].quantity);

//                   second_obj["grn_qty_uom"] =
//                     main_item.grn_detail[j].base_unit_of_measure;
//                   second_obj["grn_date"] = main_item.grn_detail[j].created_at;
//                 }
//               }

//               // console.log("inward_detail", main_item.inward_detail.length);

//               for (let k = 0; k < main_item.inward_detail.length; k++) {
//                 // console.log(
//                 //   "main_item.inward_detail[k]",
//                 //   main_item.inward_detail[k]
//                 // );
//                 if (
//                   item.material_no == main_item.inward_detail[k].item_code &&
//                   item.item_no == main_item.inward_detail[k].item_no
//                 ) {
//                   second_obj["inward_material_no"] =
//                     main_item.inward_detail[k].item_code;
//                   second_obj["inward_qty"] =
//                     main_item.inward_detail[k].total_inwarded_qty;
//                   second_obj["inward_qty_uom"] = main_item.inward_detail[k].uom;
//                   second_obj["inward_date"] =
//                     main_item.inward_detail[k].created_at;
//                 }
//               }

//               // for(let i=0;i<main_item.item.lenght;i++){
//               //   for(let j=0;j<grn_detail.lenght;j++){
//               //     if(item == )
//               //   }

//               //   for(let k=0;k<grn_detail.lenght;k++){

//               //   }
//               // }

//               item_detail_array.push(second_obj);
//             });

//             res_obj["item_detail"] = item_detail_array;

//             // final_array.push(res_obj);

//             // console.log("res_obj", res_obj);

//             // console.log("res_obj", res_obj);

//             let filter = {
//               po_number: main_item.po_number,
//             };

//             return await sac_po_table.updateOne(
//               filter,
//               {
//                 $set: res_obj,
//               },
//               {
//                 upsert: true,
//               }
//             );
//           }
//         })
//       );

//       return res.status(200).send({
//         status_code: 200,
//         message: "sac purchase order detail synched successfully",
//       });
//     } else {
//       return res.status(400).send({
//         status_code: 400,
//         status_message: "purchase order not available",
//       });
//     }
//   } catch (error) {
//     return res.status(500).send({
//       status_code: 500,
//       status_message:
//         error.message || "Some error occurred while retrieving purchase order",
//     });
//   }
// };

exports.purchase_order_report = async (req, res) => {
  if (!req.query.company_code) {
    return res.send({
      status_code: 400,
      message: "Please provide company code",
    });
  }

  try {
    // let plant_detail = await plant_table
    //   .find({ company_code: req.query.company_code, active_status: 1 })
    //   .select({ plant_id: 1 });

    // let plant_id_array = plant_detail.map((item, idx) => {
    //   return item.plant_id;
    // });

    const creation_date = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("DD-MM-YYYY");

    const today_date = moment_tz(new Date()).tz("Asia/Kolkata");

    let yesterday = moment_tz(today_date)
      .subtract(1, "days")
      .format("YYYY-MM-DD");

    // createdAt: {
    //   $gt: new Date(new Date(new Date()).setHours(00, 00, 00)),
    //   $lte: new Date(new Date(new Date()).setHours(23, 59, 59)),
    // },

    // console.log( "createdAt: {",
    //    new Date(new Date(new Date()).setHours(00, 00, 00)),
    //   new Date(new Date(new Date()).setHours(23, 59, 59)),
    // )

    // return res.send({data:"send"});

    console.log("yesterday", yesterday);



    let purchase_order_detail = await purchase_order_table.aggregate([
      {
        $match: {
          delivery_date: yesterday,
          supplying_plant: {$in:["1000","1023"]},
          company_code: req.query.company_code,
         
        },
      },
    
      {
        $lookup: {
          from: "rapid_purchase_order_inward_details",
          localField: "po_number",
          foreignField: "po_no",
          pipeline: [
            {
              $addFields: {
                oakk: {
                  $filter: {
                    input: "$inward_crate_details",
                    as: "chunks",
                    cond: {
                      $eq: ["$$chunks.grn_status", "success"],
                    },
                  },
                },
              },
            },
            {
              $project: {
                // inward_crate_details: 1,
                // oakk: 1,
                grn_number: { $arrayElemAt: ["$oakk.grn_no", -1] },
                grn_date: { $arrayElemAt: ["$oakk.inwarded_time", -1] },
                // grn_date: {
                //   $dateToString: {
                //     date: {
                //       $dateFromString: {
                //         dateString: {
                //           $arrayElemAt: ["$oakk.inwarded_time", -1],
                //         },
                //       },
                //     },
                //     // date: {$arrayElemAt:["$oakk.inwarded_time",-1]},
                //     format: "%d-%m-%Y",
                //     timezone: "Asia/Kolkata"
                //   },
                // },
                total_grn_post_qty: 1,
                total_grn_qty: {
                  $sum: "$oakk.net_qty",
                },
                company_code: 1,
                delivery_date: 1,
                invoice_no: 1,
                item_code: 1,
                item_name: 1,
                item_no: 1,
                ordered_qty: 1,
                plant_id: 1,
                po_no: 1,
                po_type: 1,
                supplier_name: 1,
                supplier_no: 1,
                uom: 1,
                total_inwarded_qty: 1,
                total_net_qty: 1,
                inward_qty_use :{
                  $cond :{
                    if :{
                      $eq :["$uom","KG"]
                    },
                    then :"$total_net_qty",
                    else :"$total_inwarded_qty"
                  }
                },
                total_pending_qty: 1,
                total_crates: 1,
                created_at: {
                  $dateToString: {
                    date: "$created_at",
                    format: "%d-%m-%Y",
                    timezone: "Asia/Kolkata",
                    onNull: "",
                  },
                },
                // inward_crate_details: 1,
              },
            },
          ],
          as: "inward_detail",
        },
      },
    
    ]);

    // return res.send({ data: purchase_order_detail });


    // var final_array = [];

    if (purchase_order_detail.length) {
      let result_array = await Promise.all(
        purchase_order_detail.map(async (main_item, idx) => {
          let res_obj = {};

          // console.log(main_item);

          if (main_item.po_number) {
            res_obj["company_code"] = main_item.company_code;
            res_obj["plant_id"] = main_item.supplying_plant;
            res_obj["po_delivery_date"] = moment_tz(
              main_item.delivery_date
            ).format("DD-MM-YYYY");
            res_obj["po_number"] = main_item.po_number;
            res_obj["po_document_type"] = main_item.po_document_type;
            res_obj["vendor_code"] = main_item.vendor_no
              ? main_item.vendor_no
              : main_item.supplying_plant;
            res_obj["vendor_name"] = main_item.vendor_name
              ? main_item.vendor_name
              : `${main_item.supplying_plant}-Own Brand`;
            res_obj["created_at"] = creation_date;

            var item_detail_array = [];

            main_item.item.map((item, idx) => {
              let second_obj = {};

              second_obj["item_no"] = item.item_no;
              second_obj["item_code"] = item.material_no;
              second_obj["item_name"] = item.material_description;
              second_obj["order_qty"] = item.quantity;
              second_obj["order_qty_uom"] = item.uom;

        
              for (let k = 0; k < main_item.inward_detail.length; k++) {
  
                if (
                  item.material_no == main_item.inward_detail[k].item_code &&
                  item.item_no == main_item.inward_detail[k].item_no
                ) {
                  second_obj["inward_material_no"] =
                    main_item.inward_detail[k].item_code;
                  second_obj["inward_qty"] =
                    main_item.inward_detail[k].inward_qty_use;
                  second_obj["inward_qty_uom"] = main_item.inward_detail[k].uom;
                  second_obj["inward_date"] =
                    main_item.inward_detail[k].created_at;
                    second_obj["grn_material_no"] =
                    main_item.inward_detail[k].material_no;
                  second_obj["grn_number"] = main_item.inward_detail[k].grn_number;
                  second_obj["grn_qty"] = second_obj["grn_qty"]
                    ? Number(second_obj["grn_qty"]) +
                      Number(main_item.inward_detail[k].total_grn_qty)
                    : Number(main_item.inward_detail[k].total_grn_qty);

                  second_obj["grn_qty_uom"] =
                    main_item.inward_detail[k].uom;
                  second_obj["grn_date"] = main_item.inward_detail[k].grn_date;  
                }
              }


              item_detail_array.push(second_obj);
            });

            res_obj["item_detail"] = item_detail_array;

            // final_array.push(res_obj);


            let filter = {
              po_number: main_item.po_number,
            };

            return await sac_po_table.updateOne(
              filter,
              {
                $set: res_obj,
              },
              {
                upsert: true,
              }
            );
          }
        })
      );

      return res.status(200).send({
        status_code: 200,
        // data :final_array,
        message: "sac purchase order detail synched successfully",
      });
    } else {
      return res.status(400).send({
        status_code: 400,
        status_message: "purchase order not available",
      });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      status_message:
        error.message || "Some error occurred while retrieving purchase order",
    });
  }
};


exports.sales_order_report = async (req, res) => {
  if (!req.query.company_code) {
    return res.send({
      status_code: 400,
      message: "Please provide company code",
    });
  }

  try {
    // let plant_detail = await plant_table.aggregate([
    //   {
    //     $match: { company_code: req.query.company_code, active_status: 1 },
    //   },
    //   {
    //     $group: {
    //       _id: null,
    //       p_id: { $push: "$plant_id" },
    //     },
    //   },
    //   { $project: { p_id: true, _id: false } },
    // ]);

    // var plant_array = [];

    // if (plant_detail.length) {
    //   plant_array = plant_detail[0].p_id;
    // }

    // console.log("plant_array", plant_array);

    // const today_date = moment_tz(new Date())
    //   .tz("Asia/Kolkata")
    //   .format("YYYY-MM-DD");

    // let yesterday = moment_tz().subtract(1, "days").format("YYYY-MM-DD");

    // console.log("today_date", today_date, yesterday);

    // console.log("yesterday", yesterday);

    const creation_date = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("DD-MM-YYYY");

    const today_date = moment_tz(new Date()).tz("Asia/Kolkata");

    // // console.log("aaaaaa", moment_tz("2022-12-27").format("DD-MM-YYYY"));

    let yesterday = moment_tz(today_date)
      .subtract(1, "days")
      .format("YYYY-MM-DD");

    let sales_order_detail = await sales_order_table.aggregate([
      {
        $match: {
          delivery_date: yesterday,
          plant_id: "1000",
          company_code: req.query.company_code,
        },
      },
      {
        $project: {
          company_code: 1,
          plant_id: 1,
          delivery_date: 1,
          sales_order_no: 1,
          sales_document_type: 1,
          customer_code: 1,
          customer_name: 1,
          material_no: 1,
          item_no: 1,
          material_name: 1,
          order_qty: 1,
          allocated_qty: 1,
          uom: 1,
          route_id: 1,
          allocated_date: {
            $dateToString: {
              date: { $arrayElemAt: ["$allocation_detail.entry_time", 0] },
              format: "%d-%m-%Y",
              timezone: "Asia/Kolkata",
              onNull: "",
            },
          },
          allocated_mode: {
            $arrayElemAt: ["$allocation_detail.mode", 0],
          },
        },
      },
      {
        $group: {
          _id: "$sales_order_no",
          company_code: { $first: "$company_code" },
          plant_id: { $first: "$plant_id" },
          sales_delivery_date: { $first: "$delivery_date" },
          sales_order_no: { $first: "$sales_order_no" },
          sales_document_type: { $first: "$sales_document_type" },
          customer_code: { $first: "$customer_code" },
          customer_name: { $first: "$customer_name" },
          // material_no: { $first: "$material_no" },
          item_detail: {
            $push: {
              item_no: "$item_no",
              material_no: "$material_no",
              material_name: "$material_name",
              order_qty: "$order_qty",
              allocated_qty: "$allocated_qty",
              uom: "$uom",
              route_id: "$route_id",
              allocated_date: "$allocated_date",
              allocated_mode: "$allocated_mode",
              //  material_description: "$i tem.material_description",
              //  quantity: "$item.quantity",
              //  uom: "$item.uom",
              //  grn_detail: "$grn_detail.grn_id",
              //  grn_detail: "$grn_detail",
            },
          },
        },
      },
      // {
      //   $addFields: {
      //     sales_order_int: { $toInt: "$sales_order_no" },
      //   },
      // },
      {
        $lookup: {
          from: "invoicemasters",
          // localField: "sales_order_no",
          // foreignField: "invoiceDetails.sales_order_no",
          let: { sales_order_idd: "$sales_order_no" },
          pipeline: [
      
          ],

          as: "invoice_detail",
        },
      },
      {
        $project: {
          "invoice_detail.invoice_detail": 0,
          "invoice_detail.companyDetails": 0,
          "invoice_detail.payerDetails": 0,
          "invoice_detail.shippingDetails": 0,
          "invoice_detail.signed_GpnQrCode": 0,
        },
      },
    ]);

    // return res.send({ data: sales_order_detail });

    // var result_array1 = [];

    if (sales_order_detail.length) {
      let resulr_array = await Promise.all(
        sales_order_detail.map(async (item, idx) => {
          if (item.sales_order_no) {
            var item_detail_array = [];
            for (let i = 0; i < item.item_detail.length; i++) {
              let detail_obj = {};
              // console.log(
              //   "item",
              //   item.item_detail[i].material_no,
              //   item.sales_order_no
              // );
              detail_obj["item_no"] = item.item_detail[i].item_no;
              detail_obj["item_code"] = item.item_detail[i].material_no;
              detail_obj["item_name"] = item.item_detail[i].material_name;
              detail_obj["order_qty"] = item.item_detail[i].order_qty;
              detail_obj["order_qty_uom"] = item.item_detail[i].uom;
              detail_obj["allocated_qty"] = item.item_detail[i].allocated_qty;
              detail_obj["allocated_qty_uom"] = item.item_detail[i].uom;
              detail_obj["allocated_date"] = item.item_detail[i].allocated_date;
              detail_obj["allocated_mode"] = item.item_detail[i].allocated_mode;
              detail_obj["route_id"] = item.item_detail[i].route_id;
              if (item.invoice_detail.length) {
                // add invoice detail in this loop next loop is to match  material from sales order and invoice master
                for (let k = 0; k < item.invoice_detail.length; k++) {
                  if (item.invoice_detail[k].itemSupplied.length) {
                    for (
                      let j = 0;
                      j < item.invoice_detail[k].itemSupplied.length;
                      j++
                    ) {
                      if (
                        item.item_detail[i].material_no ==
                        item.invoice_detail[k].itemSupplied[j].itemId
                      ) {
                        detail_obj["invoice_number"] =
                          item.invoice_detail[k].invoiceDetails.invoiceNo;
                        detail_obj["delivery_number"] =
                          item.invoice_detail[k].invoiceDetails.deliveryNo;
                        detail_obj["invoice_currency"] =
                          item.invoice_detail[
                            k
                          ].invoiceDetails.document_currency;
                        detail_obj["suppliedQty"] =
                          item.invoice_detail[k].itemSupplied[j].suppliedQty;
                        detail_obj["invoice_value"] = (
                          Number(
                            item.invoice_detail[k].itemSupplied[j]
                              .freight_amount
                              ? item.invoice_detail[k].itemSupplied[j]
                                  .freight_amount
                              : 0
                          ) +
                          Number(
                            item.invoice_detail[k].itemSupplied[j].itemAmount
                              ? item.invoice_detail[k].itemSupplied[j]
                                  .itemAmount
                              : 0
                          ) +
                          Number(
                            item.invoice_detail[k].itemSupplied[j].freight_tax
                              ? item.invoice_detail[k].itemSupplied[j]
                                  .freight_tax
                              : 0
                          )
                        ).toFixed(2);
                      }
                    }
                  }
                }
              }

              item_detail_array.push(detail_obj);
            }

            item.sales_delivery_date = moment_tz(
              item.sales_delivery_date
            ).format("DD-MM-YYYY");
            item.created_at = creation_date;
            item.items_detail = item_detail_array;
            delete item.invoice_detail;
            delete item.item_detail;
            delete item._id;

            // console.log("item", item);

            // result_array1.push(item);

            let filter = {
              sales_order_no: item.sales_order_no,
            };

            return await sac_so_table.updateOne(
              filter,
              {
                $set: item,
              },
              {
                upsert: true,
              }
            );
          }
        })
      );

      // console.log("asas7", resulr_array.length);

      return res.status(200).send({
        status_code: 200,
        message: "sac sales order detail synched successfully",
      });
    } else {
      return res.status(400).send({
        status_code: 400,
        status_message: "sales order not available",
      });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      status_message:
        error.message || "Some error occurred while retrieving purchase order",
    });
  }
};

exports.cron_purchase_order_report = async (parameter) => {
  // return await parameter

  try {
    const creation_date = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("DD-MM-YYYY");

    const today_date = moment_tz(new Date()).tz("Asia/Kolkata");

    let yesterday = moment_tz(today_date)
      .subtract(1, "days")
      .format("YYYY-MM-DD");

    // createdAt: {
    //   $gt: new Date(new Date(new Date()).setHours(00, 00, 00)),
    //   $lte: new Date(new Date(new Date()).setHours(23, 59, 59)),
    // },

    // console.log( "createdAt: {",
    //    new Date(new Date(new Date()).setHours(00, 00, 00)),
    //   new Date(new Date(new Date()).setHours(23, 59, 59)),
    // )

    // return res.send({data:"send"});

    console.log("yesterday", yesterday);

    let purchase_order_detail = await purchase_order_table.aggregate([
      {
        $match: {
          delivery_date: yesterday,
          supplying_plant: {$in:["1000","1023"]},
          company_code: req.query.company_code,
         
        },
      },
    
      {
        $lookup: {
          from: "rapid_purchase_order_inward_details",
          localField: "po_number",
          foreignField: "po_no",
          pipeline: [
            {
              $addFields: {
                oakk: {
                  $filter: {
                    input: "$inward_crate_details",
                    as: "chunks",
                    cond: {
                      $eq: ["$$chunks.grn_status", "success"],
                    },
                  },
                },
              },
            },
            {
              $project: {
                // inward_crate_details: 1,
                // oakk: 1,
                grn_number: { $arrayElemAt: ["$oakk.grn_no", -1] },
                grn_date: { $arrayElemAt: ["$oakk.inwarded_time", -1] },
                // grn_date: {
                //   $dateToString: {
                //     date: {
                //       $dateFromString: {
                //         dateString: {
                //           $arrayElemAt: ["$oakk.inwarded_time", -1],
                //         },
                //       },
                //     },
                //     // date: {$arrayElemAt:["$oakk.inwarded_time",-1]},
                //     format: "%d-%m-%Y",
                //     timezone: "Asia/Kolkata"
                //   },
                // },
                total_grn_post_qty: 1,
                total_grn_qty: {
                  $sum: "$oakk.net_qty",
                },
                company_code: 1,
                delivery_date: 1,
                invoice_no: 1,
                item_code: 1,
                item_name: 1,
                item_no: 1,
                ordered_qty: 1,
                plant_id: 1,
                po_no: 1,
                po_type: 1,
                supplier_name: 1,
                supplier_no: 1,
                uom: 1,
                total_inwarded_qty: 1,
                total_net_qty: 1,
                inward_qty_use :{
                  $cond :{
                    if :{
                      $eq :["$uom","KG"]
                    },
                    then :"$total_net_qty",
                    else :"$total_inwarded_qty"
                  }
                },
                total_pending_qty: 1,
                total_crates: 1,
                created_at: {
                  $dateToString: {
                    date: "$created_at",
                    format: "%d-%m-%Y",
                    timezone: "Asia/Kolkata",
                    onNull: "",
                  },
                },
                // inward_crate_details: 1,
              },
            },
          ],
          as: "inward_detail",
        },
      },
    
    ]);

    // return res.send({ data: purchase_order_detail });

    // console.log("purchase_order_detail.length", purchase_order_detail.length);

    // var final_array = [];

    if (purchase_order_detail.length) {
      let result_array = await Promise.all(
        purchase_order_detail.map(async (main_item, idx) => {
          let res_obj = {};

          // console.log(main_item);

          if (main_item.po_number) {
            res_obj["company_code"] = main_item.company_code;
            res_obj["plant_id"] = main_item.supplying_plant;
            res_obj["po_delivery_date"] = moment_tz(
              main_item.delivery_date
            ).format("DD-MM-YYYY");
            res_obj["po_number"] = main_item.po_number;
            res_obj["po_document_type"] = main_item.po_document_type;
            res_obj["vendor_code"] = main_item.vendor_no
              ? main_item.vendor_no
              : main_item.supplying_plant;
            res_obj["vendor_name"] = main_item.vendor_name
              ? main_item.vendor_name
              : `${main_item.supplying_plant}-Own Brand`;
            res_obj["created_at"] = creation_date;

            var item_detail_array = [];

            main_item.item.map((item, idx) => {
              let second_obj = {};

              second_obj["item_no"] = item.item_no;
              second_obj["item_code"] = item.material_no;
              second_obj["item_name"] = item.material_description;
              second_obj["order_qty"] = item.quantity;
              second_obj["order_qty_uom"] = item.uom;

        
              for (let k = 0; k < main_item.inward_detail.length; k++) {
  
                if (
                  item.material_no == main_item.inward_detail[k].item_code &&
                  item.item_no == main_item.inward_detail[k].item_no
                ) {
                  second_obj["inward_material_no"] =
                    main_item.inward_detail[k].item_code;
                  second_obj["inward_qty"] =
                    main_item.inward_detail[k].inward_qty_use;
                  second_obj["inward_qty_uom"] = main_item.inward_detail[k].uom;
                  second_obj["inward_date"] =
                    main_item.inward_detail[k].created_at;
                    second_obj["grn_material_no"] =
                    main_item.inward_detail[k].material_no;
                  second_obj["grn_number"] = main_item.inward_detail[k].grn_number;
                  second_obj["grn_qty"] = second_obj["grn_qty"]
                    ? Number(second_obj["grn_qty"]) +
                      Number(main_item.inward_detail[k].total_grn_qty)
                    : Number(main_item.inward_detail[k].total_grn_qty);

                  second_obj["grn_qty_uom"] =
                    main_item.inward_detail[k].uom;
                  second_obj["grn_date"] = main_item.inward_detail[k].grn_date;  
                }
              }


              item_detail_array.push(second_obj);
            });

            res_obj["item_detail"] = item_detail_array;

            // final_array.push(res_obj);


            let filter = {
              po_number: main_item.po_number,
            };

            return await sac_po_table.updateOne(
              filter,
              {
                $set: res_obj,
              },
              {
                upsert: true,
              }
            );
          }
        })
      );

      return "sac purchase order detail synched successfully";

      // return res.status(200).send({
      //   status_code: 200,
      //   message: "sac purchase order detail synched successfully",
      // });
    } else {
      return "purchase order not available";
      // return res.status(400).send({
      //   status_code: 400,
      //   status_message: "purchase order not available",
      // });
    }
  } catch (error) {
    return error.message;
    // return res.status(500).send({
    //   status_code: 500,
    //   status_message:
    //     error.message || "Some error occurred while retrieving purchase order",
    // });
  }
};

exports.cron_sales_order_report = async (parameter) => {
  try {
    // let plant_detail = await plant_table.aggregate([
    //   {
    //     $match: { company_code: req.query.company_code, active_status: 1 },
    //   },
    //   {
    //     $group: {
    //       _id: null,
    //       p_id: { $push: "$plant_id" },
    //     },
    //   },
    //   { $project: { p_id: true, _id: false } },
    // ]);

    // var plant_array = [];

    // if (plant_detail.length) {
    //   plant_array = plant_detail[0].p_id;
    // }

    // console.log("plant_array", plant_array);

    // const today_date = moment_tz(new Date())
    //   .tz("Asia/Kolkata")
    //   .format("YYYY-MM-DD");

    // let yesterday = moment_tz().subtract(1, "days").format("YYYY-MM-DD");

    // console.log("today_date", today_date, yesterday);

    // console.log("yesterday", yesterday);

    const creation_date = moment_tz(new Date())
      .tz("Asia/Kolkata")
      .format("DD-MM-YYYY");

    const today_date = moment_tz(new Date()).tz("Asia/Kolkata");

    // // console.log("aaaaaa", moment_tz("2022-12-27").format("DD-MM-YYYY"));

    let yesterday = moment_tz(today_date)
      .subtract(1, "days")
      .format("YYYY-MM-DD");

    let sales_order_detail = await sales_order_table.aggregate([
      {
        $match: {
          delivery_date: yesterday,
          // plant_id: "1000",
          plant_id: { $in: ["1000", "1023"] },
          company_code: parameter.company_code,
        },
      },
      {
        $project: {
          company_code: 1,
          plant_id: 1,
          delivery_date: 1,
          sales_order_no: 1,
          sales_document_type: 1,
          customer_code: 1,
          customer_name: 1,
          material_no: 1,
          item_no: 1,
          material_name: 1,
          order_qty: 1,
          allocated_qty: 1,
          uom: 1,
          route_id: 1,
          allocated_date: {
            $dateToString: {
              date: { $arrayElemAt: ["$allocation_detail.entry_time", 0] },
              format: "%d-%m-%Y",
              timezone: "Asia/Kolkata",
              onNull: "",
            },
          },
          allocated_mode: {
            $arrayElemAt: ["$allocation_detail.mode", 0],
          },
        },
      },
      {
        $group: {
          _id: "$sales_order_no",
          company_code: { $first: "$company_code" },
          plant_id: { $first: "$plant_id" },
          sales_delivery_date: { $first: "$delivery_date" },
          sales_order_no: { $first: "$sales_order_no" },
          sales_document_type: { $first: "$sales_document_type" },
          customer_code: { $first: "$customer_code" },
          customer_name: { $first: "$customer_name" },
          // material_no: { $first: "$material_no" },
          item_detail: {
            $push: {
              item_no: "$item_no",
              material_no: "$material_no",
              material_name: "$material_name",
              order_qty: "$order_qty",
              allocated_qty: "$allocated_qty",
              uom: "$uom",
              route_id: "$route_id",
              allocated_date: "$allocated_date",
              allocated_mode: "$allocated_mode",
              //  material_description: "$i tem.material_description",
              //  quantity: "$item.quantity",
              //  uom: "$item.uom",
              //  grn_detail: "$grn_detail.grn_id",
              //  grn_detail: "$grn_detail",
            },
          },
        },
      },
      // {
      //   $addFields: {
      //     sales_order_int: { $toInt: "$sales_order_no" },
      //   },
      // },
      {
        $lookup: {
          from: "invoicemasters",
          let: { sales_order_idd: "$sales_order_no" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$invoiceDetails.sales_order_no", "$$sales_order_idd"],
                },
              },
            },
          ],

          as: "invoice_detail",
        },
      },
      {
        $project: {
          "invoice_detail.invoice_detail": 0,
          "invoice_detail.companyDetails": 0,
          "invoice_detail.payerDetails": 0,
          "invoice_detail.shippingDetails": 0,
          "invoice_detail.signed_GpnQrCode": 0,
        },
      },
    ]);

    // return res.send({ data: sales_order_detail });

    // var result_array1 = [];

    if (sales_order_detail.length) {
      let resulr_array = await Promise.all(
        sales_order_detail.map(async (item, idx) => {
          if (item.sales_order_no) {
            var item_detail_array = [];
            for (let i = 0; i < item.item_detail.length; i++) {
              let detail_obj = {};
              // console.log(
              //   "item",
              //   item.item_detail[i].material_no,
              //   item.sales_order_no
              // );
              detail_obj["item_no"] = item.item_detail[i].item_no;
              detail_obj["item_code"] = item.item_detail[i].material_no;
              detail_obj["item_name"] = item.item_detail[i].material_name;
              detail_obj["order_qty"] = item.item_detail[i].order_qty;
              detail_obj["order_qty_uom"] = item.item_detail[i].uom;
              detail_obj["allocated_qty"] = item.item_detail[i].allocated_qty;
              detail_obj["allocated_qty_uom"] = item.item_detail[i].uom;
              detail_obj["allocated_date"] = item.item_detail[i].allocated_date;
              detail_obj["allocated_mode"] = item.item_detail[i].allocated_mode;
              detail_obj["route_id"] = item.item_detail[i].route_id;
              if (item.invoice_detail.length) {
                // add invoice detail in this loop next loop is to match  material from sales order and invoice master
                for (let k = 0; k < item.invoice_detail.length; k++) {
                  if (item.invoice_detail[k].itemSupplied.length) {
                    for (
                      let j = 0;
                      j < item.invoice_detail[k].itemSupplied.length;
                      j++
                    ) {
                      if (
                        item.item_detail[i].material_no ==
                        item.invoice_detail[k].itemSupplied[j].itemId
                      ) {
                        detail_obj["invoice_number"] =
                          item.invoice_detail[k].invoiceDetails.invoiceNo;
                        detail_obj["delivery_number"] =
                          item.invoice_detail[k].invoiceDetails.deliveryNo;
                        detail_obj["invoice_currency"] =
                          item.invoice_detail[
                            k
                          ].invoiceDetails.document_currency;
                        detail_obj["suppliedQty"] =
                          item.invoice_detail[k].itemSupplied[j].suppliedQty;
                        detail_obj["invoice_value"] = (
                          Number(
                            item.invoice_detail[k].itemSupplied[j]
                              .freight_amount
                              ? item.invoice_detail[k].itemSupplied[j]
                                  .freight_amount
                              : 0
                          ) +
                          Number(
                            item.invoice_detail[k].itemSupplied[j].itemAmount
                              ? item.invoice_detail[k].itemSupplied[j]
                                  .itemAmount
                              : 0
                          ) +
                          Number(
                            item.invoice_detail[k].itemSupplied[j].freight_tax
                              ? item.invoice_detail[k].itemSupplied[j]
                                  .freight_tax
                              : 0
                          )
                        ).toFixed(2);
                      }
                    }
                  }
                }
              }

              item_detail_array.push(detail_obj);
            }

            item.sales_delivery_date = moment_tz(
              item.sales_delivery_date
            ).format("DD-MM-YYYY");
            item.created_at = creation_date;
            item.items_detail = item_detail_array;
            delete item.invoice_detail;
            delete item.item_detail;
            delete item._id;

            // console.log("item", item);

            // result_array1.push(item);

            let filter = {
              sales_order_no: item.sales_order_no,
            };

            return await sac_so_table.updateOne(
              filter,
              {
                $set: item,
              },
              {
                upsert: true,
              }
            );
          }
        })
      );

      // console.log("asas7", resulr_array.length);

      return "sac sales order detail synched successfully";

      // return res.status(200).send({
      //   status_code: 200,
      //   message: "sac sales order detail synched successfully",
      // });
    } else {
      return "sales order not available";
      // return res.status(400).send({
      //   status_code: 400,
      //   status_message: "sales order not available",
      // });
    }
  } catch (error) {
    return error.message;
    // return res.status(500).send({
    //   status_code: 500,
    //   status_message:
    //     error.message || "Some error occurred while retrieving purchase order",
    // });
  }
};
