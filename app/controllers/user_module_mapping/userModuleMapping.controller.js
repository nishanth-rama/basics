"user strict";
const db = require("../../models");

const moduleNameTable = db.moduleNames;
const moduleMapping = db.userModuleMapping;
const smtpDetails = db.smtpDetails;
const send_user_module_detail = require("../../utils/send_user_detail");


exports.getModuleNames = async (req, res) => {
  const { company_code, plant_id } = req.query;

  try {
    if (!(company_code && plant_id))
      return res
        .status(400)
        .send({ message: "Please provide company code and plant id" });

    const getModuleNames = await moduleNameTable.find(
      {
        company_code: company_code,
        plant_id: plant_id,
      },
      { _id: 1, module_name: 1 }
    );

    let mssge = "Module names are available";
    if (getModuleNames.length == 0) mssge = "Module names are not available!";

    return res.send({ message: mssge, data: getModuleNames });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message: "Some error occurred while fetching user module names!",
    });
  }
};

exports.addModuleNames = async (req,res) =>{
    try {
      const { company_code, plant_id, module_name } = req.body;


      if (!(company_code && plant_id && module_name)){
        return res
        .status(400)
        .send({ message: "Missing Paramter!" });
      }

      const check_module_name = await moduleNameTable.findOne({ company_code,plant_id,module_name });

      if (check_module_name) {
        return res.send({
          message: "module name already exists",
        });
      }
  
      const saveModuleName = await moduleNameTable.create(req.body);

      if(saveModuleName) {
        return res.send({ message: "Module name saved successfully!" });
      }
      else {
        return res.send({ message: "Adding module name failed!" });
      }
   

    }
    catch(error){
      return res.status(500).send({
        message: error.message || "Some error occurred while creating user module names!",
      });
    }
}

exports.removeModuleName = async (req,res) =>{
      try {
        const id = req.params.id;

        let remove_module_name = await moduleNameTable.deleteOne({_id:id})
       

        if(remove_module_name){
            return res.send({message:"Module name removed successfully!"})
        }
        else {
            return res.send({message:"Module name deletion failed!"})
        }
      }
      catch(error){
        return res.status(500).send({
          message: error.message || "Some error occurred while removing user module name!",
        });
      }
}


exports.updateModuleName = async (req, res) => {
  
  const id = req.params.id;
  try {


    if (Object.keys(req.body).length === 0)
      return res
        .status(400)
        .send({ message: "Provide any parameter to update!" });

    let moduleNameData = req.body;

    const updateModuleName = await moduleNameTable.findByIdAndUpdate(
      id,
      moduleNameData,
      { useFindAndModify: false }
    );

    let mssge = "Module name updated successfully";
    if (updateModuleName == null)
      mssge = "Module name updation failed!";

    res.send({ message: mssge });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message: "Some error occurred while updating module names!",
    });
  }
};


exports.saveModuleMapping = async (req, res) => {
  console.log("calling save module mapping details api");
  const {
    company_code,
    plant_id,
    email,
    module_name,
    device_id,
    device_location,
    device_name,
    ip_address,
    mac_address,
    mode_of_access,
    printer_port_address,
    connection_type,
    printer_ip_address,
    port_address,
  } = req.body;

  try {
    if (
      !(
        company_code &&
        plant_id &&
        email &&
        module_name &&
        device_location &&
        device_id &&
        device_name &&
        mode_of_access &&
        port_address &&
        connection_type
      ) ||
      (connection_type == "tcp" && ip_address == undefined)
    )
      return res
        .status(400)
        .send({ message: "Please provide all required parameters" });

    const check_user = await moduleMapping.findOne({ email: email });

    if (check_user) {
      return res.send({
        message: "user module with given email already exists.",
      });
    }

    const saveModuleMapping = await moduleMapping.create(req.body);

    // let mssge = "User module mapping saved successfully";
    if (saveModuleMapping == null) {
      return res.send({ message: "User module mapping saving failed!" });
    }

    else if (saveModuleMapping) {
      return res.send({ message: "User module mapping saved successfully" });
    }

    // let smtp_detail = await smtpDetails.findOne({
    //   company_code: "1000",
    // });

    // if (!smtp_detail) {
    //   return res.status(400).send({ message: "smtp detail not available" });
    // }

    // if (saveModuleMapping) {
    //   // console.log("entered7");
    //   var sent_val = await send_user_module_detail(
    //     email,
    //     `RAPID | Mother Dc | User Detail`,
    //     saveModuleMapping,
    //     smtp_detail
    //   );
    // }

    // if (sent_val == "success") {
    //   // console.log("sent_val", sent_val);
    //   return res.send({ message: "User module mapping saved successfully" });
    // } else {
    //   let del_user = await moduleMapping.deleteOne({ email: email });
    //   // console.log("delete", del_user);
    //   return res.status(400).send({ message: sent_val });
    // }
  } catch (err) {
    // console.log(err);
    return res.status(500).send({
      message:
        err.message || "Some error occurred while fetching user module names!",
    });
  }
};

exports.updateModuleMappingDetails = async (req, res) => {
  console.log("calling udapte module mapping details api");
  const id = req.params.id;
  try {
    if (!req.body)
      return res
        .status(400)
        .send({ message: "Provide any parameter to update!" });

    let moduleMappingData = req.body;

    delete moduleMappingData.company_code;
    delete moduleMappingData.plant_id;
    delete moduleMappingData.email;
    delete moduleMappingData.module_name;

    const updateModuleMapping = await moduleMapping.findByIdAndUpdate(
      id,
      moduleMappingData,
      { useFindAndModify: false }
    );

    let mssge = "User module mapping updated successfully";
    if (updateModuleMapping == null)
      mssge = "User module mapping updation failed!";

    res.send({ message: mssge });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message: "Some error occurred while fetching user module names!",
    });
  }
};

exports.getAllModuleMappingDetails = async (req, res) => {
  console.log("calling get all module mapping details api");
  const { company_code, plant_id } = req.query;
  try {
    if (!(company_code && plant_id))
      return res
        .status(400)
        .send({ message: "Please provide company code and plant id" });

    const moduleMappingDetails = await moduleMapping.find({
      company_code: company_code,
      plant_id: plant_id,
    });

    let mssge = "User module mapping details are available";
    if (moduleMappingDetails.length == 0)
      mssge = "User module mapping details are not available!";

    return res.send({ message: mssge, data: moduleMappingDetails });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message: "Some error occurred while extracting user module mapping data!",
    });
  }
};

exports.deleteModuleMappingDetails = async (req, res) => {
  console.log("calling delete module mapping details api");
  const id = req.params.id;
  try {
    const deleteModuleMappingDetails = await moduleMapping.findByIdAndRemove(
      id,
      {
        useFindAndModify: false,
      }
    );

    let mssge = "User module mapping data deleted successfully";

    if (deleteModuleMappingDetails == null)
      mssge = "User module mapping data deletion failed!";

    return res.send({ message: mssge });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message: "Some error occurred while deleting user module mapping data!",
    });
  }
};


exports.get_transaction_company_code = async (req, res) => {
  console.log("get_transaction_company_code");
  const { company_code } = req.query;
  try {
    if (!(company_code))
      return res
        .status(400)
        .send({ message: "Please provide company code" });

    let data = await db.transaction_company_code.find({
      company_code: company_code
    });

    let message = "Transaction company code Available";
    if (!(data.length)) {
      message = "Transaction company code Unavailable";
    }
    return res.send({ message: message, data: data.length ? data[0].transaction_company_code : [] });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message: "Some error occurred while extracting user module mapping data!",
    });
  }
}