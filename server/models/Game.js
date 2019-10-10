const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const gameSchema = new Schema(
  {
    player1: {
      type: Schema.ObjectId,
      ref: 'User'
    },
    player2: {
      type: Schema.ObjectId,
      ref: 'User'
    },
    scoreP1: { type: Number },
    scoreP2: { type: Number },
    winner: { type: String },
    result: { type: String }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Game', gameSchema);
