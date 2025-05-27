const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  whatsapp: { type: String },
  email: { type: String },
  social: {
    instagram: String,
    facebook: String,
    linkedin: String,
    twitter: String
  },
  password: { type: String }, // Solo si usas auth
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
