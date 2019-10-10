const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true },
    displayName: { type: String, required: true, unique: true },
    gravatar: { type: String },
    phoneNumber: { type: String, unique: true }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('User', userSchema);
