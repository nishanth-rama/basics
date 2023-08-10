const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const db = require("../../models");
const axios = require("axios").default;
const User_table = db.loginUser;
const employee_table = db.employeeDetail;
const Tutorial = db.loginUser;

const User_module_mapping_table = db.userModuleMapping;

const { validateAddUser } = require("../../validation/user/userValidation");
const { respondError } = require("../../helpers/response");
const { getMessageFromValidationError } = require("../../helpers/utils");
const { pipeline } = require("nodemailer/lib/xoauth2");
const { mongoose } = require("../../models");

// db.userModuleMapping
// Create and Save a new Tutorial
exports.register = async (req, res, next) => {
  // Validate request

  const { error } = validateAddUser(req.body);
  if (error) {
    return next(respondError(res, 422, getMessageFromValidationError(error)));
  }

  const user_data = { ...req.body, password: "Welcome@123" };

  console.log("user_data", user_data);

  // if (!password .match(/^(?=.{8,24})(?=.[a-z])(?=.[A-Z])(?=.[@#$%^&+=]).$/))
  // {
  //     return res.status(422).json({error:"password should contain min 8 characters,less than 25 characters and atleast one uppercase, one lowercase, one number and one special character'"});
  // }

  try {
    const userExist = await User_table.findOne({ email: req.body.email });
    if (userExist) {
      return res.status(422).json({ error: "Email Already Register" });
    }
    //  else if (password != cpassword) {
    //   return res.status(422).json({ error: "password is not matching" });
    // }
    else {
      const user = new User_table(user_data);

      console.log("user", user);

      await user.save();

      res.status(201).json({ message: "user registered successfully" });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err.message });
    // if( err._message === 'userlogin validation failed'){
    //     return res.status(422).json({error:"userlogin validation failed"});
    // }
  }
};

exports.get_all_user = async (req, res) => {
  // const title = req.query.title;
  // var condition = title ? { title: { $regex: new RegExp(title), $options: "i" } } : {};

  const final_result = [];

  await User_table.aggregate([
    { $project: { password: 0, cpassword: 0 } },
    {
      $lookup: {
        from: "rapid_plantmasters",
        localField: "plant_id",
        foreignField: "plant_id",
        as: "plant_module",
      },
    },
    {
      $lookup: {
        from: "rapid_country_details",
        localField: "country_id",
        foreignField: "country_id",
        as: "country_module",
      },
    },
    {
      $lookup: {
        from: "rapid_state_details",
        localField: "state_id",
        foreignField: "state_id",
        as: "state_module",
      },
    },
    {
      $lookup: {
        from: "rapid_city_details",
        localField: "city_id",
        foreignField: "city_id",
        as: "city_module",
      },
    },

    // {$project:{"plant_module.plant_name":1,"country_module.country_name":1,"country_module.state_name":1,"country_module.city_name":1}}
  ])
    .then((data) => {
      data.map((item, idx) => {
        final_result.push({
          _id: item._id,
          user_name: item.user_name,
          full_name: item.full_name,
          company_name: item.company_name,
          country_id: item.country_id,
          state_id: item.state_id,
          city_id: item.city_id,
          email: item.email,
          phoneno: item.phoneno,
          company_code: item.company_code,
          employee_id: item.employee_id,
          role: item.role,
          pin_code: item.pin_code,
          active_status: item.active_status,
          plant_id: item.plant_id,
          address: item.address,
          plant_name: item.plant_module[0] && item.plant_module[0].plant_name,
          country_name:
            item.country_module[0] && item.country_module[0].country_name,
          state_name: item.state_module[0] && item.state_module[0].state_name,
          city_name: item.city_module[0] && item.city_module[0].city_name,
        });
      });

      return res.status(200).send({
        status_code: 200,
        message: "User Detail list is available!",
        // totalDataCount: check.length,
        data: final_result,
      });
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while retrieving user",
      });
    });
};

exports.get_all_user_by_company_code = async (req, res) => {
  const { company_code } = req.query;
  try {
    const final_result = await User_table.aggregate([
      {
        $match: {
          company_code: company_code,
        },
      },
      {
        $lookup: {
          from: "rapid_plantmasters",
          localField: "plant_id",
          foreignField: "plant_id",
          as: "plant_module",
        },
      },
      {
        $unwind: {
          path: "$plant_module",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "rapid_country_details",
          localField: "country_id",
          foreignField: "country_id",
          as: "country_module",
        },
      },
      {
        $unwind: {
          path: "$country_module",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "rapid_state_details",
          localField: "state_id",
          foreignField: "state_id",
          as: "state_module",
        },
      },
      {
        $unwind: {
          path: "$state_module",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "rapid_city_details",
          localField: "city_id",
          foreignField: "city_id",
          as: "city_module",
        },
      },
      {
        $unwind: {
          path: "$city_module",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          user_name: 1,
          full_name: 1,
          company_name: 1,
          country_id: 1,
          state_id: 1,
          city_id: 1,
          email: 1,
          phoneno: 1,
          company_code: 1,
          employee_id: 1,
          role: 1,
          pin_code: 1,
          active_status: 1,
          is_user_locked: 1,
          last_loggedin_date: 1,
          is_logged_in: 1,
          plant_id: 1,
          address: 1,
          plant_name: "$plant_module.plant_name",
          country_name: "$country_module.country_name",
          state_name: "$state_module.state_name",
          city_name: "$city_module.city_name",
        },
      },
    ]);

    return res.status(200).send({
      status_code: 200,
      message: "User Detail list is available!",
      // totalDataCount: check.length,
      data: final_result,
    });
  } catch (err) {
    res.status(500).send({
      status_code: "500",
      message:
        err.message || "Some error occurred while retrieving user details.",
    });
  }
};

//   User_table.find({}, { password: 0, cpassword: 0 })
//     .then((data) => {
//       res.send(data);
//     })
//     .catch((err) => {
//       res.status(500).send({
//         message: err.message || "Some error occurred while retrieving user",
//       });
//     });
// };

exports.signin = async (req, res) => {
  // Validate request
  try {
    let token;
    const { email, password, company_code, module_name } = req.body;

    if (!email || !password || !company_code || !module_name) {
      return res.status(400).json({ error: "please provide all field" });
    }

    // const userLogin = await User_table.findOne({email: email,company_code:company_code});

    const userLogin_array = await User_table.aggregate([
      {
        $match: {
          email: email,
          company_code: company_code,
        },
      },
      {
        $lookup: {
          from: "rapid_user_module_mappings",
          // let : {
          //   email: "$email", module_name: "$module_name"
          // }
          pipeline: [{ $match: { email: email, module_name: module_name } }],
          // localField: "email",
          // foreignField: "email",
          as: "user_module",
        },
      },
      {
        $lookup: {
          from: "rapid_plantmasters",
          localField: "plant_id",
          foreignField: "plant_id",
          as: "user_plant_detail",
        },
      },
    ]);

    let userLogin = userLogin_array[0];

    if (userLogin) {
      const isMatch = await bcrypt.compare(password, userLogin.password);

      function tokenForUser(user) {
        return jwt.sign(
          {
            userId: user._id,
          },
          "QupWI8MjPYIR38jDC9y2JtWsEb7TwRZ9QejtzuabK93udRsztPuTQYRkrMdz9BHlJ31isgK3ba4petvTixItdR8Z63sC6LT6DNdBRVKZd1twgso24d28c58cXab8GZ93",
          // { expiresIn: "24h" }
        );
      }

      // token = await userLogin.generateAuthToken();
      // const accessToken = tokenForUser(userLogin);

      if (!isMatch) {
        return res
          .status(400)
          .json({ status_code: "404", message: "Invalid Credential" });
      } else if (userLogin_array[0].user_module.length == 0) {
        return res.status(400).json({
          status_code: "400",
          message: `User do not exists for ${module_name} module`,
        });
      } else {
        return res.status(200).json({
          message: "user signin successful",
          token: tokenForUser(userLogin),
          user_name: userLogin.user_name,
          full_name: userLogin.full_name,
          // user_info: userLogin.email,
          email: userLogin.email,
          plant_id: userLogin.plant_id,
          palnt_name:
            userLogin.user_plant_detail[0] &&
            userLogin.user_plant_detail[0].plant_name,
          plant_type: userLogin.user_plant_detail[0] &&
            userLogin.user_plant_detail[0].plant_type,
          dc_type: userLogin.user_plant_detail[0] &&
            userLogin.user_plant_detail[0].dc_type,
          employee_id: userLogin.employee_id,
          role: userLogin.role,
          company_code: userLogin.company_code,
          company_name: userLogin.company_name,
          module_name:
            userLogin.user_module[0] && userLogin.user_module[0].module_name,
          device_id:
            userLogin.user_module[0] && userLogin.user_module[0].device_id,
          device_name:
            userLogin.user_module[0] && userLogin.user_module[0].device_name,
          ip_address:
            userLogin.user_module[0] && userLogin.user_module[0].ip_address,
          mac_address:
            userLogin.user_module[0] && userLogin.user_module[0].mac_address,
          mode_of_access:
            userLogin.user_module[0] && userLogin.user_module[0].mode_of_access,
          port_address:
            userLogin.user_module[0] && userLogin.user_module[0].port_address,
          printer_ip_address:
            userLogin.user_module[0] && userLogin.user_module[0].printer_ip_address,
          printer_port_address:
            userLogin.user_module[0] && userLogin.user_module[0].printer_port_address,
        });
      }
    } else {
      return res
        .status(400)
        .json({ status_code: "400", message: "Invalid Credential" });
    }
  } catch (error) {
    res.status(500).send({
      message: error.message || "Some error occurred login",
    });
  }
};

// delete

exports.delete = async (req, res) => {
  let id = req.params.id;
  try {
    let user = await User_table.findOne({ _id: id });
    console.log(user);
    if (!user) {
      res.send("User Not Found");
    } else {
      await User_table.deleteOne({ _id: id });
      return res.status(200).json({
        status: 200,
        success: true,
        message: "User deleted successfully",
      });
    }
  } catch (error) {
    res.status(500).send({
      message:
        error.message || "Some error occurred while delete the user details",
    });
  }
};

exports.get_user_by_id = async (req, res) => {
  const id = req.params.id;

  try {
    const user = await User_table.findOne({ _id: id });

    if (!user) {
      res.send({
        status: 404,
        success: false,
        message: "User Not Found",
      });
    }

    return res.status(200).json({
      status: 200,
      success: true,
      message: "User data fetched successfully",
      user,
    });
  } catch (error) {
    res.status(500).send({
      message:
        error.message || "Some error occurred while getting user details",
    });
  }
};

exports.edit_user_by_id = async (req, res) => {
  // const {
  //   user_name,
  //   full_name,
  //   email,
  //   employee_id,
  //   // phoneno,
  //   address,
  //   role,
  //   // plant_id,
  //   // company_code,
  //   // company_name,
  //   country_id,
  //   state_id,
  //   city_id,
  //   pin_code,
  //   active_status,
  // } = req.body;

  // if (
  //   !(
  //     user_name &&
  //     full_name &&
  //     email &&
  //     employee_id &&
  //     // phoneno &&
  //     address &&
  //     role &&
  //     // plant_id &&
  //     // company_code &&
  //     // company_name &&
  //     country_id &&
  //     state_id &&
  //     city_id &&
  //     pin_code &&
  //     active_status
  //   )
  // ) {
  //   return res
  //     .status(422)
  //     .json({
  //       message:
  //         "provide all field includes User Name , Full Name , Email , Employee Id,Address,Role , CountryId ,  StateId , CityId ,Active status",
  //     });
  // }

  let id = req.params.id;
  const { body } = req;
  // const { name, address, plant_name, plant_id } = body;

  try {
    const user = await User_table.findOne({ _id: id });

    if (!user) {
      res.send({
        status: 404,
        success: false,
        message: "User Not Found",
      });
    }

    const userUpdate = await User_table.updateOne(
      {
        _id: id,
      },
      {
        $set: body,
      }
    );

    if (!userUpdate) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Updated not successfull",
      });
    }

    return res.status(200).json({
      status: 200,
      success: true,
      message: "Updated successfully",
    });
  } catch (error) {
    res.status(500).send({
      message:
        error.message || "Some error occurred while updating user details",
    });
  }
};

exports.getEmailAddress = async (req, res) => {
  const { company_code, plant_id } = req.query;

  try {
    if (!(company_code && plant_id))
      return res
        .status(400)
        .send({ message: "Please provide company code and plant id" });

    const getMailId = await User_table.find(
      {
        company_code: company_code,
        plant_id: plant_id,
        active_status: 1,
      },
      { _id: 0, email: 1 }
    );

    let mssge = "User email ids are available";
    if (getMailId.length == 0) mssge = "User email ids are not available!";

    return res.send({ message: mssge, data: getMailId });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message: "Some error occurred while fetching user email address!",
    });
  }
};

exports.signOut = async (req, res) => {
  let id = req.params.id;

  try {
    const user = await User_table.findOne({ _id: id });

    if (!user) {
      res.send({
        status: 404,
        success: false,
        message: "User Not Found",
      });
    }

    const userUpdate = await User_table.updateOne(
      {
        _id: id,
      },
      {
        $set: {
          is_logged_in: 0,
        },
      }
    );

    if (!userUpdate) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Signout not successfull",
      });
    }

    return res.status(200).json({
      status: 200,
      success: true,
      message: "Signout successfully",
    });
  } catch (error) {
    res.status(500).send({
      message:
        error.message || "Some error occurred while updating user details",
    });
  }
};

exports.update_user_info = async (req, res) => {
  const { company_code } = req.query;

  if (!company_code) {
    return res.send({
      status_code: 400,
      message: "Please provide company code",
    });
  }

  try {
    let user_data = await User_table.aggregate([
      {
        $match: {
          company_code: company_code,
        },
      },
      {
        $project: {
          _id: 0,
          email: 1,
          employee_id: 1,
        },
      },
    ]);

    // console.log(user_data)

    if (user_data.length) {
      let censa_user_info = await Promise.all(
        user_data.map(async (item) => {
          let employee_detail = await employee_table
            .findOne({ employeecode: item.employee_id })
            .select(
              "employeename employeecode email officeDetails.employmentstatus"
            );

          // let employee_detail = await employee_table.aggregate([{$match:{employeecode:item.employee_id}}])

          return employee_detail;
        })
      );

      let update_query = await Promise.all(
        censa_user_info.map(async (result) => {
          // console.log("result",result)

          if (result) {
            // console.log("result",result.officeDetails)

            let filter = {
              employee_id: result.employeecode,
            };

            // console.log("filter",filter)

            let emp_status =
              result.officeDetails && result.officeDetails.employmentstatus
                ? result.officeDetails.employmentstatus
                : "Inactive";

            if (emp_status == "Active") {
              var entry_obj = {
                active_status: 1,
              };
            } else {
              var entry_obj = {
                active_status: 0,
              };
            }

            return (update_report = await User_table.updateOne(filter, {
              $set: entry_obj,
            }));
          }
        })
      );

      return res.send({
        status_code: 200,
        message: "User status updated successfully",
      });
    } else {
      return res.send({ status_code: 400, message: "User not found" });
    }
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message || "Some error occurred while retrieving user info",
    });
  }
};

exports.get_employee_email_list = async (req, res) => {
  try {
    let employeeDb = mongoose.connection.db.collection("employees");
    let data = await employeeDb.find({}, { limit: 2 }).toArray();
    // console.log(data);
    return res.send({ data: data });
  } catch (error) {
    return res.status(500).send({
      status_code: 500,
      message:
        error.message ||
        "Some error occurred while retrieving employees detail",
    });
  }
};
