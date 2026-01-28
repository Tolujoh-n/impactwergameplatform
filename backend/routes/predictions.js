const express = require('express');
const Prediction = require('../models/Prediction');
const Match = require('../models/Match');
const Poll = require('../models/Poll');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all predictions for authenticated user
router.get('/user', auth, async (req, res) => {
  try {
    const predictions = await Prediction.find({ user: req.user._id })
      .populate('match', 'teamA teamB date status result')
      .populate('poll', 'question type')
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json(predictions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create free prediction
router.post('/free', auth, async (req, res) => {
  try {
    const { matchId, pollId, outcome } = req.body;
    const user = await User.findById(req.user._id);

    if (!matchId && !pollId) {
      return res.status(400).json({ message: 'Either matchId or pollId is required' });
    }

    // Get daily free play limit from settings
    const settings = await Settings.findOne();
    const dailyFreePlayLimit = settings?.freePlayLimit || 1;

    // Check if user has a ticket
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastTicketDate = user.lastTicketDate ? new Date(user.lastTicketDate) : null;

    if (!lastTicketDate || lastTicketDate < today) {
      // Give new tickets based on daily limit
      user.tickets = dailyFreePlayLimit;
      user.lastTicketDate = today;
    }

    if (user.tickets < 1) {
      return res.status(400).json({ message: `No tickets available. You can make ${dailyFreePlayLimit} free prediction(s) per day. Come back tomorrow!` });
    }

    // Check if user already predicted
    const query = {
      user: user._id,
      type: 'free',
    };
    if (matchId) query.match = matchId;
    if (pollId) query.poll = pollId;

    const existingPrediction = await Prediction.findOne(query);

    if (existingPrediction) {
      return res.status(400).json({ message: 'You already predicted this item' });
    }

    const prediction = new Prediction({
      user: user._id,
      match: matchId,
      poll: pollId,
      type: 'free',
      outcome,
    });

    await prediction.save();

    // Deduct ticket
    user.tickets -= 1;
    user.totalPredictions += 1;
    await user.save();

    res.status(201).json(prediction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create boost prediction
router.post('/boost', auth, async (req, res) => {
  try {
    const { matchId, pollId, outcome, amount } = req.body;

    if (!matchId && !pollId) {
      return res.status(400).json({ message: 'Either matchId or pollId is required' });
    }

    let item = null;
    if (matchId) {
      item = await Match.findById(matchId);
      if (!item) {
        return res.status(404).json({ message: 'Match not found' });
      }
    } else {
      item = await Poll.findById(pollId);
      if (!item) {
        return res.status(404).json({ message: 'Poll not found' });
      }
    }

    if (item.status === 'locked' || item.status === 'completed' || item.status === 'settled') {
      return res.status(400).json({ message: 'Item is locked or completed' });
    }

    // Check if user already has a boost prediction
    const query = {
      user: req.user._id,
      type: 'boost',
    };
    if (matchId) query.match = matchId;
    if (pollId) query.poll = pollId;

    const existingBoostPrediction = await Prediction.findOne(query);

    if (existingBoostPrediction) {
      return res.status(400).json({ message: 'You already have a boost prediction for this item' });
    }

    const prediction = new Prediction({
      user: req.user._id,
      match: matchId,
      poll: pollId,
      type: 'boost',
      outcome,
      amount,
    });

    await prediction.save();

    // Update boost pool
    if (matchId) {
      item.boostPool += amount;
      await item.save();
    } else {
      item.boostPool = (item.boostPool || 0) + amount;
      await item.save();
    }

    // Update user stats
    const user = await User.findById(req.user._id);
    user.totalPredictions += 1;
    await user.save();

    res.status(201).json(prediction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user prediction for a match (by type)
router.get('/match/:matchId/user', auth, async (req, res) => {
  try {
    const { type } = req.query;
    const query = {
      user: req.user._id,
      match: req.params.matchId,
    };
    
    // Filter by type if provided
    if (type) {
      query.type = type;
    }
    
    const prediction = await Prediction.findOne(query)
      .populate('match', 'teamA teamB date status result isResolved');
    
    if (!prediction) {
      return res.status(404).json({ message: 'Prediction not found' });
    }
    res.json(prediction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user prediction for a poll (by type)
router.get('/poll/:pollId/user', auth, async (req, res) => {
  try {
    const { type } = req.query;
    const query = {
      user: req.user._id,
      poll: req.params.pollId,
    };
    
    // Filter by type if provided
    if (type) {
      query.type = type;
    }
    
    const prediction = await Prediction.findOne(query)
      .populate('poll', 'question type status result isResolved');
    
    if (!prediction) {
      return res.status(404).json({ message: 'Prediction not found' });
    }
    res.json(prediction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
