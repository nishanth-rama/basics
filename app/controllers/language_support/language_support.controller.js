const db = require("../../models");

// const translate = require('google-translate-api');
const language_support_table = db.language_support;
const { Builder } = require('xml2js');


exports.add_field_in_require_language = async (req, res) => {
  const { label_name,value } = req.body;


  if (!(label_name && value))
    return res
      .status(400)
      .send({ status_code: 400, message: "Missing parameter!" });

  // try {

       

  //     // Function to translate English text to French
  //     async function translateToFrench(text) {
  //       try {
  //         const result = await translate(text, { from: 'en', to: 'fr' });
  //         return result.text;
  //       } catch (error) {
  //         console.error('Translation error:', error);
  //         return null;
  //       }
  //     }


  //     console.log("value",value);

  //     // Example usage
  //     const textToTranslate = value;
  //     translateToFrench(textToTranslate)
  //       .then((translatedText) => {

  //         return res.send({data:translatedText})
  //         console.log("English:", textToTranslate);
  //         console.log("French:", translatedText);
  //       })
  //       .catch((error) => {
  //         console.error("Error:", error);
  //       });


  //   // let field_data : {

  //   // }
 
  //   // const new_field_entry = new language_support_table(field_data);
  //   // let save_field = await new_field_entry.save();

 

  //   // if (company_plant_config_detail) {
  //   //   return res.status(200).send({
  //   //     status_code: 200,
  //   //     message: "Company plant configuration detail!",
  //   //     data:company_plant_config_detail
  //   //   });
  //   // } else {
  //   //   return res.status(400).send({
  //   //     status_code: 400,
  //   //     message: "Company plant configuration detail not available!",
  //   //   });
  //   // }
  // } catch (error) {
  //   return res.status(500).send({
  //     status_code: 500,
  //     message:
  //       error.message ||
  //       "Some error occurred while retrieving company plant config detail",
  //   });
  // }
};




//  to enocde

function encodeObjectValuesToUTF8(obj) {
  const utf8Encoder = new TextEncoder();
  const encodedObject = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      
      const encodedValue = Buffer.from(value, 'utf8').toString('base64');
      encodedObject[key] = encodedValue;
    }
  }
  return encodedObject;
  }


// json respnse
exports.get_fields_in_require_language = async (req,res)=>{

  const { application,language } = req.query;


  if (!(application && language))
    return res
      .status(400)
      .send({ status_code: 400, message: "Missing parameter!" });

  try{

    let language_detail = await language_support_table.aggregate([
      {
        $match:{
          application
        }
      },
      {
        $project:{
          label_name:"$label_name",
          label_value: "$" + language  
        }
      },
      {
        $group: {
          _id: null,
          labels: { $push: { k: "$label_name", v: "$label_value" } }
        }
      },
      {
        $replaceRoot: {
          newRoot: { $arrayToObject: "$labels" }
        }
      }
    ])



    let result_obj = encodeObjectValuesToUTF8(language_detail[0])
    return res.send({status_code:200,data:result_obj})

    

  }
  catch(error){
    return res.status(500).send({
      status_code: 500,
      message:
        error.message ||
        "Some error occurred while retrieving language detail",
    });
  }
}


// xml response
exports.get_xml = async (req,res)=>{

  const { application,language } = req.query;


  if (!(application && language))
    return res
      .status(400)
      .send({ status_code: 400, message: "Missing parameter!" });

  try{

    let language_detail = await language_support_table.aggregate([
      {
        $match:{
          application
        }
      },
      {
        $project:{
          label_name:"$label_name",
          label_value: "$" + language  
        }
      },
      {
        $group: {
          _id: null,
          labels: { $push: { k: "$label_name", v: "$label_value" } }
        }
      },
      {
        $replaceRoot: {
          newRoot: { $arrayToObject: "$labels" }
        }
      }
    ])

    const xmlObject = {
      resources: {
        string: Object.entries(language_detail[0]).map(([key, value]) => ({
          $: { name: key },
          _: value
        }))
      }
    };

    
    const builder = new Builder({ headless: true });
    const xml = builder.buildObject(xmlObject);

    res.set('Content-Type', 'application/xml');

    let result = JSON.stringify(xml)

    // let res1 = JSON.parse(result)
    return res.send(result);
    

    // res.attachment('data.xml'); // Set the filename for the downloaded XML file
    //  res.setHeader('Content-Type', 'application/xml');

    // return res.send({status_code:200,data:xml})

  }
  catch(error){
    return res.status(500).send({
      status_code: 500,
      message:
        error.message ||
        "Some error occurred while retrieving language detail",
    });
  }
}
