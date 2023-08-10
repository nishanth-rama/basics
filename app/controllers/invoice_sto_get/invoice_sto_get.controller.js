
const db = require("../../models");

const Tutorial = db.invoiceSto;


// Create and Save a new Tutorial
exports.create = (req, res) => {
  // Validate request
  if (!req.body) {
    res.status(400).send({ message: "Content can not be empty!" });
    return;
  }

  // Create a Tutorial
  const tutorial = new Tutorial(req.body);

  // Save Tutorial in the database
  tutorial
    .save(tutorial)
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while creating the invoiceSto."
      });
    });
};

// Retrieve all Tutorials from the database.
exports.findAll = async (req, res) => {

  // const title = req.query.title;
  // var condition = title ? { title: { $regex: new RegExp(title), $options: "i" } } : {};

  let { page } = req.query;

  console.log("page",page)

  if (page === undefined )
    return res
      .status(400)
      .send({ message: "Please provide page number" });

  let totalDataCount = await Tutorial.countDocuments();
   let startDataCount = page == 1 ? 0: page*10-10;
   let endDataCount = page*10

  // let startDataCount = 2;
  // let endDataCount = 3

//    console.log("adsad",startDataCount,endDataCount)

  Tutorial.find()
  .skip(+startDataCount)
  .limit(+endDataCount)
    .then(data => {
      res.send({  totalDataCount: totalDataCount,skip:startDataCount,pageSize:10,data});
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving invoiceSto."
      });
    });
};


exports.findOne = (req, res) => {
    const invoice_no = req.params.invoice_no;
  
    console.log(invoice_no)
  
    Tutorial.find({invoice_no})
      .then(data => {
        if (!data || !data.length>0)
          res.status(404).send({ message: "Not found invoice detail with invoice_no " + invoice_no });
        else res.status(200).send({ "message":"invoiceSto Is Available!",data:data});
      })
      .catch(err => {
        res
          .status(500)
          .send({ message: "Error retrieving invoice with invoice_no=" + invoice_no });
      });
  };
  

