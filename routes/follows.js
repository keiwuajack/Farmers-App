const express = require('express');
const router = express.Router();
const Follow = require('../models/Follow');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Follow a user
router.post('/:userId', auth, async (req, res) => {
  try {
    const followingId = req.params.userId;
    const followerId = req.userId;

    if (followingId === followerId) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    // Check if already following
    const existingFollow = await Follow.findOne({
      follower: followerId,
      following: followingId
    });

    if (existingFollow) {
      return res.status(400).json({ message: 'Already following this user' });
    }

    const follow = new Follow({
      follower: followerId,
      following: followingId
    });

    await follow.save();
    res.status(201).json({ message: 'Successfully followed user' });
  } catch (error) {
    res.status(500).json({ message: 'Error following user' });
  }
});

// Unfollow a user
router.delete('/:userId', auth, async (req, res) => {
  try {
    const followingId = req.params.userId;
    const followerId = req.userId;

    await Follow.findOneAndDelete({
      follower: followerId,
      following: followingId
    });

    res.json({ message: 'Successfully unfollowed user' });
  } catch (error) {
    res.status(500).json({ message: 'Error unfollowing user' });
  }
});

// Get user's followers
router.get('/:userId/followers', auth, async (req, res) => {
  try {
    const followers = await Follow.find({ following: req.params.userId })
      .populate('follower', 'name role location profileImage')
      .sort({ createdAt: -1 });
    
    res.json(followers.map(f => f.follower));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching followers' });
  }
});

// Get users that a user is following
router.get('/:userId/following', auth, async (req, res) => {
  try {
    const following = await Follow.find({ follower: req.params.userId })
      .populate('following', 'name role location profileImage')
      .sort({ createdAt: -1 });
    
    res.json(following.map(f => f.following));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching following' });
  }
});

// Check if current user follows a specific user
router.get('/check/:userId', auth, async (req, res) => {
  try {
    const follow = await Follow.findOne({
      follower: req.userId,
      following: req.params.userId
    });

    res.json({ isFollowing: !!follow });
  } catch (error) {
    res.status(500).json({ message: 'Error checking follow status' });
  }
});

module.exports = router;
