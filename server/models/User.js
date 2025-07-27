const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, sparse: true },
  email: { type: String, unique: true, sparse: true },
  password: { type: String },
  googleId: { type: String, unique: true, sparse: true },
}, {
  timestamps: true,
});

UserSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', UserSchema);