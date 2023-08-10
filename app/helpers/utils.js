'use strict';

const db = require("../models");
const Company_config = db.system_config;

module.exports = {

  getMessageFromValidationError: (error) => {
    
    const message = error.details[0].message.replace(/\"/g, '');
    const path = error.details[0].path.join().replace(/0,/g, '').replace(/,/g, '.');
    return message + ', PATH: ' + path;
  },
  
  generateVerificationCode: () => Math.floor(100000 + Math.random() * 900000),

  generatePassword: (len) => {
    const length = (len) || (8);
    const string = 'abcdefghijklmnopqrstuvwxyz';
    const numeric = '0123456789';
    const punctuation = '!@#$%^&*';
    let password = '';
    let character = '';
    while (password.length < length) {
      const entity1 = Math.ceil(string.length * Math.random() * Math.random());
      const entity2 = Math.ceil(numeric.length * Math.random() * Math.random());
      const entity3 = Math.ceil(punctuation.length * Math.random() * Math.random());
      let hold = string.charAt(entity1);
      hold = (password.length % 2 === 0) ? (hold.toUpperCase()) : (hold);
      character += hold;
      character += numeric.charAt(entity2);
      character += punctuation.charAt(entity3);
      password = character;
    }
    password = password.split('').sort(() => {
      return 0.5 - Math.random();
    }).join('');
    return password.substr(0, len);
  },

  check_password_validation: async(company_code, password) => {
      console.log('=====', company_code);
    const config_data = await Company_config.findOne({ company_code });
    console.log('=====', config_data);

    // const string = 'abcdefghijklmnopqrstuvwxyz';
    const capital_letter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numeric = '0123456789';
    const punctuation = '!@#$%^&*';
    if (config_data.atleast_one_number) {
        if (!password.includes(numeric)) {
            res.status(422).json({ message: "Please add atleast_one_number " });
        }
    }
    if (config_data.atleast_one_special_character) {
        if (!password.includes(punctuation)) {
            res.status(422).json({ message: "Please add atleast_one_special_character " });
        }
    }
    if (config_data.atleast_one_capital_letter) {
        if (!password.includes(capital_letter)) {
            res.status(422).json({ message: "Please add atleast_one_capital_letter " });
        }
    }
    if (password.length < config_data.minimum_password_length) {
        res.status(422).json({ message: "Please add length of " `${config_data.minimum_password_length}` });
    }
  },
};