'use strict';

const generalLogger = require('../config/winston');
const { StatusCode } = require('../helpers/constant');
module.exports = {

  // const statusCode = ;
  // respondSuccess: (res, message, statusCode = StatusCode.OK, data) => {
  //   console.log('respondSuccess', message, statusCode, data);
  //   if (!data) {
  //     return res.status(statusCode).json({
  //       success: true,
  //       message: !message ? 'query was successfull' : message,
  //     });
  //   }
  //   // generalLogger.log('info', `${message}`);
  //   return res.status(200).json({
  //     success: true,
  //     message: !message ? 'custom msg not avail' : message,
  //     data,
  //   });
  // },

  respondError_new :(res,message,data) =>{

    const error = new Error(message);

    return res.status(400).send({status_code:400,message:error.message})
 
  },

  respondSuccess: (res, message, data) => {
    if (!data) {
      return res.status(200).json({
        success: true,
        message: !message ? 'query was successfull' : message,
      });
    }
    // console.log(data);
    // generalLogger.log('info', `${message}`);
    return res.status(200).json({
      success: true,
      message: !message ? 'custom msg not avail' : message,
      data,
    });
  },

  respondError: (res,status, message) => {
    const error = new Error(`message ${message}`);
    console.log(error);
    error.status = status;
    // generalLogger.log('error', message);
    return error;
  },

  respondFailure: (res, message, data) => {
    if (!data) {
      return res.status(404).json({
        success: false,
        message: !message ? 'query was successfull' : message,
      });
    }
    // generalLogger.log('info', `${message}`);
    res.status(404).json({
      success: false,
      message: !message ? 'something went wrong' : message,
      data,
    });
  },
};