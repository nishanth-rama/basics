module.exports = (app) => {  
    var router = require("express").Router();

    const apiNotFound = (req,res)=>{ res.status(404).json({message:"Api not found..!"})}
  
    app.use("/*", apiNotFound);
    app.use((err, req, res, next) => {
      const error = err;
      const status = err.status || 500;
      // return res.send({ data: 'Hello' })
      res.status(status).json({
        success: false,
        message: error.message ? error.message : err,
      })
    });
  };