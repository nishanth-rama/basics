
const db = require("../../models");

const  sub_brand_table= db.subBrand;

// Create and Save
exports.create = (req, res) => {

    // Validate request
    if (!(req.body.company_code && req.body.plant_id && req.body.brand_name && req.body.sub_brand)) {

                return res.status(400).send({
                    status_code: "400",
                    message: "Please fill all required fields !"
                });
            }

    // Create 
    const tutorial = new sub_brand_table({
        company_code: req.body.company_code,
        plant_id: req.body.plant_id,
        brand_name: req.body.brand_name,
        sub_brand: req.body.sub_brand
    });

    // Save 
    tutorial
        .save()
        .then(data => {

            return res.status(200).send({
                status_code: "200",
                status_message: "Data Added Successfully",
                data: data,
            });
        })
        .catch(err => {
            res.status(500).send({
                message:
                    err.message || "Some error occurred while creating the Brand."
            });
        });
};

// const sub_brand_table = db.subBrand;

// // Create and Save
// exports.create = (req, res) => {

//     // Validate request
//     if (!(req.body.company_code && req.body.plant_id && req.body.brand_id && req.body.sub_brand)) {

//         return res.status(400).send({
//             status_code: "400",
//             message: "Please fill all required fields !"
//         });
//     }

//     // Create 
//     const tutorial = new sub_brand_tables({

//         company_code: req.body.company_code,
//         plant_id: req.body.plant_id,
//         brand_id: req.body.brand_id,
//         sub_brand: req.body.sub_brand,

//     });
//     console.log(tutorial, "ssssssssssss");


//     // Save 
//     tutorial
//         .save()
//         .then(data => {

//             return res.status(200).send({
//                 status_code: "200",
//                 status_message: "Data Added Successfully",
//                 data: data,
//             });


//         })
//         .catch(err => {
//             res.status(500).send({
//                 message:
//                     err.message || "Some error occurred while creating the Subbrand."
//             });
//         });
// };

// Retrieve all 
exports.findAll = async (req, res) => {   
    console.log("calling get all subbrand details");
   
    try{
    const { company_code, plant_id } = req.query;


    const data = await sub_brand_table.find({ company_code: company_code, plant_id: plant_id })


            const mssge = data.length == 0 ? "Subbrand detsils are not available!" : "Subbrand detsils are available";
            const status = data.length == 0 ? 404 : 200;


            return res.status(200).send({
                status_code: status,
                message: mssge,
                data: data
            });

        }
catch(err)  {

            console.log(err)
           return res.status(500).send({
                message:
                     "Some error occurred while retrieving subbrand."
            });
        }
};


// Retrieve all 
exports.get_all_subbrands_by_company_code = async (req, res) => {
    console.log('get_all_subbrands_by_company_code');
    if (!req.query.company_code) {
        return res.status(400).send({
            status_code: "400",
            message: "Company code parameter is missing !"
        });
    }
    const company_code = req.query.company_code;

    sub_brand_table.find({ company_code: company_code })
        .then(data => {
            console.log("d", data)
            if (data.length == 0) {
                return res.status(404).send({ status: "400", message: "company code not found !" });
            }
            else {
                res.status(200).send({
                    status_code: "200",
                    message: "Subbrands data is available", data: data
                });
            }
        })
        .catch(err => {
            res.status(500).send({
                message:
                    err.message || "Some error occurred while retrieving subbrand."
            });
        });


};

// Find a single
exports.findOne = (req, res) => {
    const id = req.params.id;

    sub_brand_table.findById(id)
        .then(data => {
            if (!data)
                res.status(404).send({ message: "Not found subbrand with id " + id });
            else {
                return res.status(200).send({
                    status_code: 200,
                    message: "Subbrand data Available.",
                    data: data
                });
            }
        })
        .catch(err => {
            res
                .status(500)
                .send({ message: "Error retrieving subbrand with id=" + id });
        });
};

// Update 
exports.update = (req, res) => {
    if (!req.body) {
        return res.status(400).send({
            message: "Data to update can not be empty!"
        });
    }

    const id = req.params.id;

    sub_brand_table.findByIdAndUpdate(id, req.body, { useFindAndModify: false })
        .then(data => {
            if (!data) {
                res.status(404).send({
                    message: `Cannot update subbrand with id=${id}. Maybe subbrand was not found!`
                });
            } else res.send({ status_code: "200", message: "Subbrand updated successfully." });
        })
        .catch(err => {
            res.status(500).send({
                message: "Error updating subbrand with id=" + id
            });
        });
};

// Delete 
exports.delete = (req, res) => {
    const id = req.params.id;

    sub_brand_table.findByIdAndRemove(id, { useFindAndModify: false })
        .then(data => {
            if (!data) {
                res.status(404).send({
                    message: `Cannot delete subbrand with id=${id}. Maybe article was not found!`
                });
            } else {
                res.send({
                    status_code: "200",
                    message: "Subbrand  deleted successfully!"
                });
            }
        })
        .catch(err => {
            res.status(500).send({
                message: "Could not delete subbrand with id=" + id
            });
        });
};
