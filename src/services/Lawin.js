import express from "express";
import mongoose from "mongoose";
import log from "../core/logger.js";

const router = express.Router();

const userSchema = new mongoose.Schema({ username: { type: String, required: true, unique: true } });
const LawinUser = mongoose.models.LawinUser || mongoose.model("LawinUser", userSchema);

router.get("/api/v1/checkUser/:username", async (req, res) => {
  try {
    const user = await LawinUser.findOne({ username: req.params.username });
    if (user) res.status(200).send("Valid");
    else res.status(404).send("Invalid");
  } catch (error) {
    log.error(`Error checking user: ${error}`);
    res.status(500).send("Server Error");
  }
});

export default router;
