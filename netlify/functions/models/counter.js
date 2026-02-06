const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  value: { type: Number, default: 0 }
});

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

// Function to get next sequence value
const getNextSequence = async (name) => {
  const counter = await Counter.findOneAndUpdate(
    { name: name },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  return counter.value;
};

module.exports = { Counter, getNextSequence };