const express = require("express");
const router = express.Router();
const District = require("../Models/District");

// ADD
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;

    let existing = await District.findOne({ name });
    if (existing) return res.json({ message: "Already exists" });

    const district = new District({ name });
    await district.save();

    res.json({ message: "District added" });
  } catch (err) {
    res.status(500).json(err);
  }
});

// GET
router.get("/", async (req, res) => {
  const data = await District.find();
  res.json(data);
});

// DELETE
router.delete("/:id", async (req, res) => {
  await District.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

module.exports = router;