const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String },
  phone: { type: String },
  bio: { type: String },
  social: {
    instagram: String,
    facebook: String,
    linkedin: String,
    twitter: String,
    spotify: String,
    youtube: String,
    tiktok: String,
    whatsapp: String
  },
  password: { type: String }, // Solo si usas auth
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
