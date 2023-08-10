'use strict';

const Joi = require('joi');

module.exports = {

  validateAddUser: (input) => {
    const schema = Joi.object().keys({
      user_name: Joi.string().required(),
      full_name: Joi.string().required(),
      email: Joi.string().email().required(),
      employee_id: Joi.string().required(),
      phoneno: Joi.number().required(),
      address: Joi.string().required(),
      role: Joi.string().required(),
      plant_id: Joi.string().required(),
      company_code: Joi.string().required(),
      company_name: Joi.string().required(),
      country_id: Joi.number().required(),
      state_id: Joi.number().required(),
      city_id: Joi.number().required(),
      pin_code: Joi.number().required(),
      active_status: Joi.number().required(),
    });
    return schema.validate(input);
  },

  validatePasswordConfig: (input) => {
    const schema = Joi.object().keys({
        company_code: Joi.string().required(),
        minimum_password_length: Joi.number().required(),
        atleast_one_number: Joi.number().required(),
        atleast_one_special_character: Joi.number().required(),
        atleast_one_capital_letter: Joi.number().required(),
        atleast_small_capital_letter: Joi.number().required(),
        password_expiry_time : Joi.number().required(),
        user_session_expiry_time: Joi.number().required(),
        max_invalid_attempt: Joi.number().required(),
    });
    return schema.validate(input);
  },

  validateGetComapanyCode: (input) => {
    const schema = Joi.object().keys({
      email: Joi.string().required(),
    });
    return schema.validate(input);
  },

  validateUserUnblock: (input) => {
    const schema = Joi.object().keys({
      user_id: Joi.string().required(),
    });
    return schema.validate(input);
  },

  validateUpdateStatus: (input) => {
    const schema = Joi.object().keys({
      user_id: Joi.string().required(),
      status: Joi.number().required(),
    });
    return schema.validate(input);
  },
};

