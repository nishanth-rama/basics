const jwt = require("jsonwebtoken");

const db = require("../../models");

const User_table = db.loginUser;
const Company_config = db.system_config;
const Company = db.company;

const {
  validateAddUser,
  validatePasswordConfig,
  validateUserUnblock,
  validateUpdateStatus,
  validateGetComapanyCode,
} = require("../../validation/user/userValidation");
const {
  respondSuccess,
  respondError,
  respondFailure,
} = require("../../helpers/response");
const { getMessageFromValidationError } = require("../../helpers/utils");

// generating token
function tokenForUser(user) {
  return jwt.sign(
    {
      userId: user._id,
    },
    "QupWI8MjPYIR38jDC9y2JtWsEb7TwRZ9QejtzuabK93udRsztPuTQYRkrMdz9BHlJ31isgK3ba4petvTixItdR8Z63sC6LT6DNdBRVKZd1twgso24d28c58cXab8GZ93",
    { expiresIn: 86400 }
  );
}

// Create and Save a new Tutorial
exports.register = async (req, res) => {
  const { body } = req;

  const { error } = validateAddUser(body);
  if (error) {
    return next(respondError(422, getMessageFromValidationError(error)));
  }

  const user_data = { ...req.body, password: "Welcome@123" };

  // if (!password .match(/^(?=.{8,24})(?=.[a-z])(?=.[A-Z])(?=.[@#$%^&+=]).$/))
  // {
  //     return res.status(422).json({error:"password should contain min 8 characters,less than 25 characters and atleast one uppercase, one lowercase, one number and one special character'"});
  // }

  try {
    const userExist = await User_table.findOne({ email: email });
    if (userExist) {
      return res.status(422).json({ error: "Email Already Register" });
    }
    //  else if (password != cpassword) {
    //   return res.status(422).json({ error: "password is not matching" });
    // }
    else {
      const user = new User_table(user_data);

      await user.save();

      res.status(201).json({ message: "user registered successfully" });
    }
  } catch (err) {

    return res.status(422).json({ error: err._message });
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
    const { email, password, company_code, language } = req.body;

    if (!email || !password || !company_code) {
      return res.status(400).json({ error: "please filled the data" });
    }

    const company_data = await Company.findOne({ company_code: company_code });
    if (!company_data) {
      return respondFailure(res, "company not found");
    }

    const userLogins = await User_table.findOne({
      email: email.toLowerCase(),
      company_code: company_code,
    });
    // console.log('-------------', userLogins, '=============')
    if (!userLogins) {
      // return respondSuccess(res, convertLocaleMessage('de', 'USER_LOGGEDIN_SUCCESSFULLY'))
      return respondFailure(res, "user not found");
    }

    if (userLogins.active_status === 0) {
      return respondFailure(
        res,
        "Please contact to admin, your account is inactive."
      );
    }

    const userLogin_array = await User_table.aggregate([
      {
        $match: {
          email: email.toLowerCase(),
          company_code: company_code,
        },
      },
      {
        $lookup: {
          from: "rapid_user_module_mappings",
          localField: "email",
          foreignField: "email",
          as: "user_module",
        },
      },
      {
        $lookup: {
          from: "rapid_companymasters",
          localField: "company_code",
          foreignField: "company_code",
          as: "company_module",
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

    // console.log("check", userLogin_array);

    let userLogin = userLogin_array[0];

    // console.log("adsads",userLogin.user_plant_detail[0])

    // const date = new Date().getFullYear() + '-' + new Date().getMonth() + '-' + new Date().getDate() + ' ' +
    // new Date().getHours() + ':' + new Date().getMinutes();
    var Difference_In_Time =
      new Date().getTime() -
      new Date(userLogin.last_password_modified).getTime();
    // To calculate the no. of days between two dates
    var Difference_In_Days = Difference_In_Time / (1000 * 3600 * 24);
    // console.log(Difference_In_Days);

    let is_password_to_modify = false;
    if (Difference_In_Days >= 30) {
      is_password_to_modify = true;
    }

    await User_table.updateOne(
      {
        _id: userLogin._id,
      },
      {
        $set: {
          last_loggedin_date: new Date(),
          no_of_invalid_action: 0,
          is_user_locked: 0,
        },
      }
    );

    // userLogin.language = language;
    // console.log(userLogin.company_module[0]);
    const accessToken = tokenForUser(userLogin);
    // return respondSuccess(res, convertLocaleMessage(de, 'USER_LOGGEDIN_SUCCESSFULLY'), {

    // return respondSuccess(res, req.__(localesKeys.auth.SIGNSUC, 'de'), constValues.StatusCode.OK, {
    return respondSuccess(res, "user signin successful", {
      token: accessToken,
      user: {
        user_name: userLogin.user_name,
        full_name: userLogin.full_name,
        email: userLogin.email,
        plant_id: userLogin.plant_id,
        employee_id: userLogin.employee_id,
        role: userLogin.role,
        company_code: userLogin.company_code,
        company_name: userLogin.company_name,
        active_status: userLogin.active_status,
        is_user_locked: userLogin.is_user_locked,
        force_login: userLogin.force_login,
        no_of_invalid_action: userLogin.no_of_invalid_action,
        last_loggedin_date: userLogin.last_loggedin_date,
        is_password_to_modify: is_password_to_modify,
        company_logo: userLogin.company_module[0].logo_url,
        plant_name:
          userLogin.user_plant_detail[0] &&
            userLogin.user_plant_detail[0].plant_name
            ? userLogin.user_plant_detail[0].plant_name
            : "NA",
        plant_type: userLogin.user_plant_detail[0] &&
          userLogin.user_plant_detail[0].plant_type,
        dc_type: userLogin.user_plant_detail[0] &&
          userLogin.user_plant_detail[0].dc_type,
        module_name:
          userLogin.user_module[0] && userLogin.user_module[0].module_name,
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
      },
    });
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
    // console.log(user);
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

exports.direct_password_change = async (req, res) => {
  const { body } = req;
  const { email, company_code } = body;
  const { newPassword, password } = body;


  // console.log('--------', req.user.company_code);
  if (!email || !password || !newPassword) {
    return res.status(400).json({ error: "please filled the data" });
  }

  // await check_password_validation(req.user.company_code, newPassword);

  // console.log(typeof req.user.company_code);
  const config_data = await Company_config.findOne({
    company_code: req.user.company_code,
  });
  if (!config_data) {
    return respondFailure(res, "company not found");
  }
  const userLogin = await User_table.findOne({ email: email });
  if (!userLogin) {
    return respondFailure(res, "user not found");
    // return respondFailure(res, req.__(localesKeys.auth.USER_NOT_FOUND, language));
  }
  userLogin.comparePassword(password, async (err, isMatch) => {
    if (err) {
      return respondError(res, "try again");
      // return respondError(res, req.__(localesKeys.global.TRY_AGAIN, language), constValues.StatusCode.INTERNAL_SERVER_ERROR);
    }
    if (!isMatch) {
      return respondFailure(res, "old password not matched");
      // return respondFailure(res, req.__(localesKeys.auth.OLD_PASSWORD_NOT_MATCHED, language), constValues.StatusCode.CONFLICT);
    }
    // console.log(config_data);
    if (config_data.atleast_one_number) {
      if (!/(?=.*?[0-9])/.test(newPassword)) {
        return res.status(422).json({
          message: "Please add atleast_one_number ",
        });
      }
    }
    if (config_data.atleast_one_special_character) {
      if (!/(?=.*?[#?!@$%^&*-])/.test(newPassword)) {
        return res.status(422).json({
          message: "Please add atleast_one_special_character ",
        });
      }
    }
    if (config_data.atleast_one_capital_letter) {
      if (!/(?=.*?[A-Z])/.test(newPassword)) {
        return res.status(422).json({
          message: "Please add atleast_one_capital_letter ",
        });
      }
    }
    if (config_data.atleast_one_small_letter) {
      if (!/(?=.*?[a-z])/.test(newPassword)) {
        return res.status(422).json({
          message: "Please add atleast_one_small_letter ",
        });
      }
    }
    // .{8,}
    if (/.{config_data.minimum_password_length,}/.test(newPassword)) {
      return res.status(422).json({
        message:
          "Please add length of " + `${config_data.minimum_password_length}`,
      });
    }
    if (userLogin.force_login === 1) {
      userLogin.force_login = 0;
    }
    userLogin.password = newPassword;
    userLogin.last_password_modified = new Date();
    await userLogin.save();
    // await User_table.updateOne({_id:userLogin._id},{$set:userLogin})
    return respondSuccess(res, "password changes successfully");
    // return respondSuccess(res, req.__(localesKeys.global.UPDATED_SUCCESSFULLY));
  });
};

exports.password_config = async (req, res, next) => {
  const { body, user } = req;
  const { company_code } = user;

  const { error } = validatePasswordConfig(body);
  if (error) {
    // console.log("errrrr", error);
    return next(respondError(422, getMessageFromValidationError(error)));
    // return next(getMessageFromValidationError(respondError(error)));
  }

  const config_data = await Company_config.findOne({
    company_code: company_code,
  });

  if (!config_data) {
    return respondFailure(res, "Company not found");
  }

  await Company_config.updateOne(
    {
      _id: config_data._id,
    },
    {
      $set: body,
    }
  );

  return respondSuccess(res, "password config updated successfully");
};

exports.get_company_code = async (req, res, next) => {
  const { body } = req;
  const { email } = body;

  const { error } = validateGetComapanyCode(body);
  if (error) {
    return next(respondError(422, getMessageFromValidationError(error)));
  }

  const userLogins = await User_table.findOne({ email: email });
  if (!userLogins) {
    // return respondSuccess(res, convertLocaleMessage('de', 'USER_LOGGEDIN_SUCCESSFULLY'))
    return respondFailure(res, "user not found");
  }

  return respondSuccess(res, "company_code fetched successfully", {
    company_code: userLogins.company_code,
    company_name: userLogins.company_name,
  });
};

exports.unblock_user = async (req, res) => {
  const { body } = req;
  const { user_id } = body;

  const { error } = validateUserUnblock(body);
  if (error) {
    return next(respondError(422, getMessageFromValidationError(error)));
  }

  const user_data = await User_table.findOne({ _id: user_id });
  if (!user_data) {
    return respondFailure(res, "user not found");
  } else if (user_data.is_user_locked === 0) {
    return respondFailure(res, "You can't block the user");
  }

  await User_table.updateOne(
    {
      _id: user_id,
    },
    {
      $set: {
        is_user_locked: 0,
        no_of_invalid_action: 0,
      },
    }
  );

  return respondSuccess(res, "user unblocked successfully");
};

exports.change_status = async (req, res) => {
  const { body } = req;
  const { user_id, status } = body;

  const { error } = validateUpdateStatus(body);
  if (error) {
    return next(respondError(422, getMessageFromValidationError(error)));
  }

  const user_data = await User_table.findOne({ _id: user_id });
  if (!user_data) {
    return respondFailure(res, "user not found");
  }

  await User_table.updateOne(
    {
      _id: user_id,
    },
    {
      $set: {
        active_status: status,
      },
    }
  );

  return respondSuccess(res, "user status changed successfully");
};
