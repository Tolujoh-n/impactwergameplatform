const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  type: {
    type: String,
    enum: ['match', 'team', 'stage', 'award'],
    required: true,
  },
  optionType: {
    type: String,
    enum: ['normal', 'options'],
    default: 'normal',
  },
  options: [{
    text: {
      type: String,
      required: true,
    },
    image: {
      type: String,
    },
    liquidity: {
      type: Number,
      default: 0,
    },
    shares: {
      type: Number,
      default: 0,
    },
  }],
  cup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cup',
    required: true,
  },
  stage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stage',
  },
  status: {
    type: String,
    enum: ['upcoming', 'active', 'settled', 'locked'],
    default: 'active',
  },
  result: {
    type: String,
  },
  marketInitialized: {
    type: Boolean,
    default: false,
  },
  marketYesShares: {
    type: Number,
    default: 0,
  },
  marketNoShares: {
    type: Number,
    default: 0,
  },
  marketYesLiquidity: {
    type: Number,
    default: 0,
  },
  marketNoLiquidity: {
    type: Number,
    default: 0,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  isSponsored: {
    type: Boolean,
    default: false,
  },
  sponsoredImages: [{
    type: String,
  }],
  lockedTime: {
    type: Date,
  },
  isResolved: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Poll', pollSchema);
