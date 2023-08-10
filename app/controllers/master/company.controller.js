"use strict";
const { find } = require("lodash");

// const db = require("../models");
// const Tutorial = db.tutorials;
const fs = require("fs");
const path = require("path");

const db = require("../../models");

const company_details = db.company;

const deleteDir = async (dirName) => {
  const filePath = path.join(__dirname, "../../company_logo");

  const { execSync } = require("child_process");
  //deleting directory
  execSync(`rm -rf ${filePath}/${dirName}`, {
    encoding: "utf-8",
  });
};

// delete previous logo while updating
const delPreviousLogo = (req, res, image_name) => {
  const dirName = req.headers.companycode;

  if (!dirName)
    return res.send({ message: "Missing company code in headers!" });

  try {
    const filePath = path.join(__dirname, "../../company_logo");

    const { execSync } = require("child_process");
    //creating directory
    execSync(`rm -rf ${filePath}/${dirName}/${image_name}`, {
      encoding: "utf-8",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message:
        "Some error occurred while deleting previous logo new directory!",
    });
  }
};

// Create and Save
exports.create = async (req, res) => {
  const {
    company_code,
    company_name,
    address,
    country_id,
    state_id,
    city_id,
    postcode,
    contact_number1,
    contact_number2,
    email,
    website_url,
    integrated_appl,
    // pallet_prefix,
    // pallet_suffix,
    gst_number,
    cin_number,
    fssai_number,
  } = req.body;

  try {
    if (!req.file) {
      deleteDir(req.headers.companycode);
      return res.send({ message: "Company logo is required!" });
    }

    if (
      !(
        company_code &&
        company_name &&
        address &&
        country_id &&
        state_id &&
        city_id &&
        postcode != undefined &&
        contact_number1 &&
        contact_number2 &&
        email &&
        website_url &&
        integrated_appl != undefined &&
        // pallet_prefix &&
        // pallet_suffix &&
        gst_number &&
        cin_number &&
        fssai_number
      )
    )
      return res.status(400).send({ message: "Missing parameter" });

    let companyInfo = {
      company_code: company_code,
      company_name: company_name,
      address: address,
      country_id: country_id,
      state_id: state_id,
      city_id: city_id,
      postcode: postcode,
      contact_number1: contact_number1,
      contact_number2: contact_number2,
      email: email,
      website_url: website_url,
      logo_url: `/${company_code}/${req.file.originalname}`,
      integrated_appl: integrated_appl,
      // pallet_prefix: pallet_prefix,
      // pallet_suffix: pallet_suffix,
      gst_number: gst_number,
      cin_number: cin_number,
      fssai_number: fssai_number,
    };

    await company_details.create(companyInfo);

    return res.json({ message: "Company details added successfully" });
  } catch (err) {
    console.log(err.message);
    deleteDir(req.headers.companycode);

    if (
      err.message ==
      `E11000 duplicate key error collection: dmsHybrid.rapid_companymasters index: email_1 dup key: { email: "${email}" }`
    )
      return res.send({ message: "Provided email already exits!" });

    return res.status(500).send({
      message: "Some error occurred while saving the company",
    });
  }
};

// Retrieve all
exports.findAll = async (req, res) => {
  // company_details
  //   .find({})
  //   .sort({ _id: -1 })
  //   .then((data) => {
  //     return res.send({ message: "", data: data });
  //   })
  //   .catch((err) => {
  //     return res.status(500).send({
  //       message: err.message || "Some error occurred while retrieving company.",
  //     });
  //   });

  await company_details
    .aggregate([
      {
        $lookup: {
          from: "rapid_city_details",
          localField: "city_id",
          foreignField: "city_id",
          as: "city",
        },
      },
      { $unwind: "$city" },
      {
        $lookup: {
          from: "rapid_state_details",
          localField: "state_id",
          foreignField: "state_id",
          as: "state",
        },
      },
      { $unwind: "$state" },
      {
        $lookup: {
          from: "rapid_country_details",
          localField: "country_id",
          foreignField: "country_id",
          as: "country",
        },
      },
      { $unwind: "$country" },
      {
        $project: {
          company_code: 1,
          company_name: 1,
          country_name: "$country.country_name",
          state_name: "$state.state_name",
          city_name: "$city.city_name",
          country_id: 1,
          state_id: 1,
          city_id: 1,
          address: 1,
          postcode: 1,
          contact_number1: 1,
          contact_number2: 1,
          email: 1,
          website_url: 1,
          logo_url: 1,
          integrated_appl: 1,
          // pallet_prefix: 1,
          // pallet_suffix: 1,
          gst_number: 1,
          fssai_number: 1,
          cin_number: 1,
          active_status: 1,
          created_by: 1,
          updated_by: 1,
        },
      },
    ])
    .then((data) => {
      let result = [];
      data.map((each) => {
        let resObj = {
          _id: each._id,
          company_code: each.company_code,
          company_name: each.company_name,
          country_name: each.country_name,
          state_name: each.state_name,
          city_name: each.city_name,
          country_id: each.country_id,
          state_id: each.state_id,
          city_id: each.city_id,
          address: each.address,
          postcode: each.postcode,
          contact_number1: each.contact_number1,
          contact_number2: each.contact_number2,
          email: each.email,
          website_url: each.website_url,
          logo_url: each.logo_url,
          integrated_appl: each.integrated_appl,
          // pallet_prefix: each.pallet_prefix,
          // pallet_suffix: each.pallet_suffix,
          gst_number: each.gst_number,
          fssai_number: each.fssai_number,
          cin_number: each.cin_number,
          active_status: each.active_status,
          created_by: each.created_by,
          updated_by: each.updated_by,
        };
        result.push(resObj);
        console.log(result);
      });
      res.status(200).send({
        status_code: "200",
        message: "Data is available",
        data: result,
      });
    });
};

// Find a single
exports.findOne = (req, res) => {
  const id = req.params.id;

  company_details
    .findById(id)
    .then((data) => {
      if (!data)
        return res
          .status(404)
          .send({ message: "Not found company with id " + id });
      else return res.send({ message: "", data: data });
    })
    .catch((err) => {
      res
        .status(500)
        .send({ message: "Error retrieving company with id=" + id });
    });
};

exports.get_all_by_company_code = async (req, res) => {
  if (!req.query.company_code) {
    return res.status(400).send({
      status_code: "400",
      message: "Company code parameter is missing !",
    });
  }
  const company_code = req.query.company_code;

  await company_details
    .aggregate([
      {
        $match: { company_code },
      },
      {
        $lookup: {
          from: "rapid_city_details",
          localField: "city_id",
          foreignField: "city_id",
          as: "city",
        },
      },
      { $unwind: "$city" },
      {
        $lookup: {
          from: "rapid_state_details",
          localField: "state_id",
          foreignField: "state_id",
          as: "state",
        },
      },
      { $unwind: "$state" },
      {
        $lookup: {
          from: "rapid_country_details",
          localField: "country_id",
          foreignField: "country_id",
          as: "country",
        },
      },
      { $unwind: "$country" },
      {
        $project: {
          company_code: 1,
          company_name: 1,
          country_name: "$country.country_name",
          state_name: "$state.state_name",
          city_name: "$city.city_name",
          country_id: 1,
          state_id: 1,
          city_id: 1,
          address: 1,
          postcode: 1,
          contact_number1: 1,
          contact_number2: 1,
          email: 1,
          website_url: 1,
          logo_url: 1,
          integrated_appl: 1,
          // pallet_prefix: 1,
          // pallet_suffix: 1,
          gst_number: 1,
          fssai_number: 1,
          cin_number: 1,
          active_status: 1,
          created_by: 1,
          updated_by: 1,
        },
      },
    ])
    .then((data) => {
      
      let result = [];
      data.map((each) => {
        let resObj = {
          _id: each._id,
          company_code: each.company_code,
          company_name: each.company_name,
          country_name: each.country_name,
          state_name: each.state_name,
          city_name: each.city_name,
          country_id: each.country_id,
          state_id: each.state_id,
          city_id: each.city_id,
          address: each.address,
          postcode: each.postcode,
          contact_number1: each.contact_number1,
          contact_number2: each.contact_number2,
          email: each.email,
          website_url: each.website_url,
          logo_url: each.logo_url,
          integrated_appl: each.integrated_appl,
          // pallet_prefix: each.pallet_prefix,
          // pallet_suffix: each.pallet_suffix,
          gst_number: each.gst_number,
          fssai_number: each.fssai_number,
          cin_number: each.cin_number,
          active_status: each.active_status,
          created_by: each.created_by,
          updated_by: each.updated_by,
        };

        result.push(resObj);
      });
      res.status(200).send({
        status_code: "200",
        message: "Data is available",
        data: result,
      });
    });
};

// get logo link
exports.getLogo = async (req, res) => {
  const company_code = req.query.company_code;

  if (!company_code)
    return res.status(400).send({ message: "Please provide company code" });

  try {
    const getLogoUrl = await company_details.findOne(
      { company_code: company_code },
      { _id: 0, logo_url: 1 }
    );

    let url = {};
    let mssge = "Company logo is available";
    if (getLogoUrl == null) mssge = "Company logo is not available!";
    else {
      const logo = getLogoUrl.logo_url.split("/");

      const filePath = path.join(
        __dirname,
        `../../company_logo/${logo[1]}/${logo[2]}`
      );

      // check if directory exists
      if (fs.existsSync(filePath)) {
        url = getLogoUrl;
      } else mssge = "Company logo is not available!";
    }

    return res.send({ message: mssge, data: url });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .send({ message: "Some error occurred while fetching company logo url" });
  }
};

// Update
exports.update = async (req, res) => {
  console.log("calling company details update api");
  const id = req.params.id;
  const {
    company_code,
    company_name,
    address,
    country_id,
    state_id,
    city_id,
    postcode,
    contact_number1,
    contact_number2,
    email,
    website_url,
    integrated_appl,
    gst_number,
    cin_number,
    fssai_number,
  } = req.body;

  try {
    if (
      !(
        company_code &&
        company_name &&
        address &&
        country_id &&
        state_id &&
        city_id &&
        postcode != undefined &&
        contact_number1 &&
        contact_number2 &&
        email &&
        website_url &&
        integrated_appl != undefined &&
        gst_number &&
        cin_number &&
        fssai_number
      )
    )
      return res.status(400).send({ message: "Missing parameter" });

    let companyInfo = {
      company_name: company_name,
      address: address,
      country_id: country_id,
      state_id: state_id,
      city_id: city_id,
      postcode: postcode,
      contact_number1: contact_number1,
      contact_number2: contact_number2,
      email: email,
      website_url: website_url,
      integrated_appl: integrated_appl,
      gst_number: gst_number,
      cin_number: cin_number,
      fssai_number: fssai_number,
    };

    if (req.file) {
      const getPreviousLogoName = await company_details.findById(id, {
        _id: 0,
        logo_url: 1,
      });
      let image_name = getPreviousLogoName["logo_url"].split("/")[2];

      if (req.file.originalname != image_name)
        delPreviousLogo(req, res, image_name);

      companyInfo.logo_url = `/${company_code}/${req.file.originalname}`;
    }

    const updateCompanyInfo = await company_details.findByIdAndUpdate(
      id,
      companyInfo,
      { useFindAndModify: false }
    );

    if (updateCompanyInfo != null)
      return res.send({ message: "Company details updated successfully" });
    else return res.send({ message: "Company details Updation failed" });
  } catch (err) {
    console.log(err);
    res.status(500).send({
      message: "Some error occurred while updating company details",
    });
  }
};

// Delete
exports.delete = async (req, res) => {
  console.log("calling company details delete api");
  const id = req.params.id;

  await company_details
    .findByIdAndRemove(id, { useFindAndModify: false })
    .then((data) => {
      if (!data) {
        res.status.send({
          message: "Unable to delete company details!",
        });
      } else {
        deleteDir(data.company_code); // deleting logo along wth directory
        res.send({
          message: "Company deleted successfully",
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Could not delete company with id=" + id,
      });
    });
};
