const mongoose = require('mongoose');

const stageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  cup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cup',
    required: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Stage', stageSchema);
