const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

// Get all posts
router.get('/', auth, async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'name role location profileImage')
      .populate('comments.user', 'name role profileImage')
      .sort({ createdAt: -1 });
    
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single post
router.get('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'name role location profileImage bio')
      .populate('comments.user', 'name role profileImage');
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create post
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, category, tags, images } = req.body;
    
    const post = new Post({
      author: req.userId,
      title,
      content,
      category,
      tags,
      images
    });
    
    await post.save();
    await post.populate('author', 'name role location profileImage');
    
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add comment
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const { text } = req.body;
    
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    post.comments.push({
      user: req.userId,
      text
    });
    
    await post.save();
    await post.populate('comments.user', 'name role profileImage');
    
    // Create notification for post author
    await Notification.createNotification({
      user: post.author,
      from: req.userId,
      type: 'comment',
      message: 'commented on your post',
      relatedPost: post._id
    });
    
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Like/Unlike post
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    const likeIndex = post.likes.indexOf(req.userId);
    
    if (likeIndex > -1) {
      // Unlike
      post.likes.splice(likeIndex, 1);
    } else {
      // Like
      post.likes.push(req.userId);
      
      // Create notification for post author
      await Notification.createNotification({
        user: post.author,
        from: req.userId,
        type: 'like',
        message: 'liked your post',
        relatedPost: post._id
      });
    }
    
    await post.save();
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
