const express = require('express');
const Prediction = require('../models/Prediction');
const Match = require('../models/Match');
const Poll = require('../models/Poll');
const User = require('../models/User');
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
    const { matchId, outcome } = req.body;
    const user = await User.findById(req.user._id);

    // Check if user has a ticket
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastTicketDate = user.lastTicketDate ? new Date(user.lastTicketDate) : null;

    if (!lastTicketDate || lastTicketDate < today) {
      // Give new ticket
      user.tickets = 1;
      user.lastTicketDate = today;
    }

    if (user.tickets < 1) {
      return res.status(400).json({ message: 'No tickets available. Come back tomorrow!' });
    }

    // Check if user already predicted this match
    const existingPrediction = await Prediction.findOne({
      user: user._id,
      match: matchId,
      type: 'free',
    });

    if (existingPrediction) {
      return res.status(400).json({ message: 'You already predicted this match' });
    }

    const prediction = new Prediction({
      user: user._id,
      match: matchId,
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
    const { matchId, outcome, amount } = req.body;
    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (match.status === 'locked' || match.status === 'completed') {
      return res.status(400).json({ message: 'Match is locked or completed' });
    }

    const prediction = new Prediction({
      user: req.user._id,
      match: matchId,
      type: 'boost',
      outcome,
      amount,
    });

    await prediction.save();

    // Update match boost pool
    match.boostPool += amount;
    await match.save();

    // Update user stats
    const user = await User.findById(req.user._id);
    user.totalPredictions += 1;
    await user.save();

    res.status(201).json(prediction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user prediction for a match
router.get('/match/:matchId/user', auth, async (req, res) => {
  try {
    const prediction = await Prediction.findOne({
      user: req.user._id,
      match: req.params.matchId,
    })
      .populate('match', 'teamA teamB date status result');
    
    if (!prediction) {
      return res.status(404).json({ message: 'Prediction not found' });
    }
    res.json(prediction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
