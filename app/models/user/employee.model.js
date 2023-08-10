const mongoose = require("mongoose");
const Schema = mongoose.Schema;

module.exports = (mongoose) => {
  var schema = mongoose.Schema({
    employeecode: {
      type: String,
    },
    employeeid: {
      type: String,
    },
    salutation: {
      type: String,
    },
    employeename: {
        type: String,
      },
      email: {
        type: String,
      },
      mobile: {
        type: String,
      },
      documentDetails: {
        type: Object,
      },
      officeDetails: {
        type: Object,
      },
  });

  const employee_table = mongoose.model("employees", schema);
  return employee_table;
};
