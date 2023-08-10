const getList = (model) => {
  return async (req, res) => {
    try {
      const list = await model.find();
      res.status(200).send({ status_code: 200, message: "lists", data: list });
    } catch (error) {
      res.status(500).send({ status_code: 500, message: error.message });
    }
  };
};

const getById = (model) => {
  return async (req, res) => {
    try {
      const item = await model.findById(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json(item);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };
};
const createMaster = (Model) => {
  return async (req, res) => {
    try {
      const result = await Model.create(req.body);
      res
        .status(201)
        .send({ status_code: 201, message: "Created", data: result });
    } catch (error) {
      res.status(500).send({ status_code: 500, message: error.message });
    }
  };
};
module.exports = { getList, getById, createMaster };
