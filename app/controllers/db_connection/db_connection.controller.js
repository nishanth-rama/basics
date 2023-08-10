const db = require("../../models");
const palletization = db.palletization;
const primary_storage_table = db.primary_storage;
const racks = db.racks;

exports.update_palletization = async (req, res) => {
  try {
    const itemId = req.body.id;

    const is_deleted = req.body.is_deleted;
    if (!(itemId && is_deleted)) {
      return res.status(404).json({
        status_code: 404,
        message: "Missing Parameter!",
      });
    }
    // Find the item by ID and update its status
    const updatedItem = await palletization.findByIdAndUpdate(
      itemId,
      { $set: { is_deleted: is_deleted } },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({
        status_code: 404,
        message: "Item not found",
      });
    }

    return res.status(200).json({
      status_code: 200,
      message: "Item status updated successfully",
      data: updatedItem,
    });
  } catch (error) {
    console.error("An error occurred while updating item status:", error);
    return res.status(500).json({
      status_code: 500,
      message: "Internal server error",
    });
  }
};

exports.update_rack_master = async (req, res) => {
  try {
    const { id, status, locked, locked_by } = req.body;

    // const is_deleted = req.body.is_deleted;
    if (!(id && status)) {
      return res.status(404).json({
        status_code: 404,
        message: "Missing Parameter!",
      });
    }

    const updatedItem = await racks.findByIdAndUpdate(
      id,
      { $set: { status: status, locked: locked, locked_by: locked_by } },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({
        status_code: 404,
        message: "Item not found",
      });
    }

    return res.status(200).json({
      status_code: 200,
      message: "Item status updated successfully",
      data: updatedItem,
    });
  } catch (error) {
    console.error("An error occurred while updating item status:", error);
    return res.status(500).json({
      status_code: 500,
      message: "Internal server error",
    });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const itemId = req.body.id;
    if (!itemId) {
      return res.status(404).json({
        status_code: 404,
        message: "Missing Parameter!",
      });
    }
    // Find the item by ID and delete it
    const deletedItem = await primary_storage_table.findByIdAndDelete(itemId);

    if (!deletedItem) {
      return res.status(404).json({
        status_code: 404,
        message: "Item not found",
      });
    }

    return res.status(200).json({
      status_code: 200,
      message: "Item deleted successfully",
      data: deletedItem,
    });
  } catch (error) {
    console.error("An error occurred while deleting item:", error);
    return res.status(500).json({
      status_code: 500,
      message: "Internal server error",
    });
  }
};
