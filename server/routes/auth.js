const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const router = express.Router();

const tokenBlacklist = new Set();

const googleClient = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
});

//Register a new user
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    user = new User({
      username,
      email,
      password: await bcrypt.hash(password, 10),
    });
    await user.save();

    const accessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ accessToken, refreshToken });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

//Login a user
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;
  try {
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    if (!user.password) return res.status(400).json({ message: 'Account uses Google login' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const accessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ accessToken, refreshToken });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

//Google OAuth login
router.post('/google', async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;

    let user = await User.findOne({ googleId });
    if (!user) {
      user = new User({
        email,
        googleId,
        username: payload.email.split('@')[0],
      });
      await user.save();
    }

    const accessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ accessToken, refreshToken });
  } catch (error) {
    console.error('Error with Google OAuth:', error);
    res.status(401).json({ message: 'Invalid Google token' });
  }
});

//Refresh access token
router.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: 'No refresh token' });

  if (tokenBlacklist.has(refreshToken)) {
    return res.status(401).json({ message: 'Refresh token invalidated' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const accessToken = jwt.sign({ userId: decoded.userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
    res.json({ accessToken });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

//Logout user
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  try {
    if (refreshToken) {
      tokenBlacklist.add(refreshToken);
    }
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;