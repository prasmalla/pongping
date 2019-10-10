const Game = require('../models/Game');
const gameController = {};
require('dotenv').config();
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const ping = require('twilio')(accountSid, authToken);

gameController.getAllGames = (req, res, next) => {
  Game.find({ winner: { $not: new RegExp('Won by') } }, (err, games) => {
    if (err)
      return next(
        'Error in gameController.getAllGames: ' + JSON.stringify(err)
      );
    res.locals.games = games;
    return next();
  });
};

gameController.playedGames = (req, res, next) => {
  Game.find(
    { winner: new RegExp('Won by') },
    {},
    { sort: { createdAt: -1 } },
    (err, games) => {
      if (err)
        return next(
          'Error in gameController.playedGames: ' + JSON.stringify(err)
        );
      res.locals.playedGames = games;
      return next();
    }
  );
};

gameController.findCurrentGame = (req, res, next) => {
  if (!req.user) return next();
  Game.findOne({ winner: 'game on' }, {}, { sort: { createdAt: -1 } })
    .populate('player1')
    .populate('player2')
    .exec((err, game) => {
      if (
        (game && game.player1 && game.player1._id == req.user._id) ||
        (game && game.player2 && game.player2._id == req.user._id)
      ) {
        res.locals.game = game;
        next();
      } else {
        console.log('not playing yet');
        next();
      }
    });
};

gameController.getStats = (req, res, next) => {
  if (!req.user) return next();
  // find user in player1 AND player2 #TODO: lookup mongoose
  // keep track of total games won and lost
  let won = 0;
  let lost = 0;
  let lastPlayed;
  Game.find(
    {
      player1: req.user._id,
      result: { $not: new RegExp('waiting') },
      winner: { $not: new RegExp('game on') }
    },
    {},
    { sort: { createdAt: -1 } },
    (err, games) => {
      if (err)
        return next('Error in gameController.getStats: ' + JSON.stringify(err));
      if (games.length > 0) {
        lastPlayed = games[0].updatedAt;
        Object.values(games).forEach(game => {
          if (game.scoreP1 > game.scoreP2) {
            won += 1;
          } else {
            lost += 1;
          }
        });
      }
    }
  );
  Game.find(
    {
      player2: req.user._id,
      result: { $not: new RegExp('waiting') },
      winner: { $not: new RegExp('game on') }
    },
    {},
    { sort: { createdAt: -1 } },
    (err, games) => {
      if (err)
        return next('Error in gameController.getStats: ' + JSON.stringify(err));
      // set lastPlayed date
      if (games.length > 0) {
        lastPlayed =
          lastPlayed > games[0].updatedAt ? lastPlayed : games[0].updatedAt;

        Object.values(games).forEach(game => {
          if (game.scoreP2 > game.scoreP1) {
            won += 1;
          } else {
            lost += 1;
          }
        });
      }
      console.log('won', won, 'lost', lost);
      res.locals.stats = { won: won, lost: lost, lastPlayed: lastPlayed };
      next();
    }
  );
};

gameController.createGame = (req, res, next) => {
  // if active game, create new game
  Game.findOne({ winner: new RegExp('game on', 'i') }, (err, game) => {
    if (err) console.log('cannot create game', err);
    if (game) {
      Game.create({
        player1: req.user,
        winner: req.user.displayName, // temporarily stash player1 name - no need to populate user
        result: `${req.user.displayName} is waiting for opponent..`
      });
      return next();
    } else {
      Game.findOne({ result: new RegExp('waiting for opponent..', 'i') })
        .populate('player1')
        .then(game => {
          if (game) {
            game.player2 = req.user;
            game.result = `${game.winner} [vs] ${req.user.displayName}`;
            game.winner = 'game on';
            //send next
            console.log('send text');
            ping.messages
              .create({
                body: 'pong',
                from: '+12134447561',
                to: game.player1.phoneNumber
              })
              .then(message => {
                console.log(message.sid);
              });
            game.save();
          } else {
            Game.create({
              player1: req.user,
              winner: req.user.displayName, // temporarily stash player1 name - no need to populate user
              result: `${req.user.displayName} is waiting for opponent..`
            });
          }
          return next();
        });
    }
  });
};

gameController.endGame = (req, res, next) => {
  const score = req.body.score;
  Game.findOne({ _id: req.body.game })
    .populate('player1')
    .populate('player2')
    .then(game => {
      // set self and opponent scores
      if (game.player1._id == req.user._id) {
        game.scoreP1 = score == 21 ? 21 : score;
        game.scoreP2 = score == 21 ? score : 21;
      } else {
        game.scoreP1 = score == 21 ? score : 21;
        game.scoreP2 = score == 21 ? 21 : score;
      }
      // update game stats
      let points;
      if (game.scoreP1 > game.scoreP2) {
        points = game.scoreP1 - game.scoreP2;
        game.result = `<strong>${game.player1.displayName}</strong> [vs] ${game.player2.displayName}`;
        req.user = game.player1;
      } else {
        points = game.scoreP2 - game.scoreP1;
        game.result = `${game.player1.displayName} [vs] <strong>${game.player2.displayName}</strong>`;
        req.user = game.player2;
      }
      game.winner = `<strong>Won by ${points} ${
        points > 1 ? 'points' : 'point'
      }</strong>`;

      game.save();

      next();
    });
};

module.exports = gameController;
