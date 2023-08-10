"use strict";

const multer = require("multer");
const path = require("path");

const db = require("../../models");

// creating new directory using company code
exports.createDir = async (req, res, next) => {
  const dirName = req.headers.companycode;

  if (!dirName)
    return res.send({ message: "Missing company code in headers!" });

  try {
    const count = await db.company.countDocuments({ company_code: dirName });

    if (count != 0) return res.send({ message: "Duplicate company code!" });

    const filePath = path.join(__dirname, "../../company_logo");

    const { execSync } = require("child_process");
    //creating directory
    execSync(`mkdir ${filePath}/${dirName}`, {
      encoding: "utf-8",
    });

    return next();
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .send({ message: "Some error occurred while creating new directory!" });
  }
};

// function to store files in created directory
exports.storingLogoFile = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(
      null,
      path.join(__dirname, `../../company_logo/${req.headers.companycode}`)
    );
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
