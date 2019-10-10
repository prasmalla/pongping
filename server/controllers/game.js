const Game = require('../models/Game');
const gameController = {};

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
  Game.findOne({ winner: 'game in progress' }, {}, { sort: { createdAt: -1 } })
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
    { player1: req.user._id, result: { $not: new RegExp('waiting') } },
    {},
    { sort: { createdAt: -1 } },
    (err, games) => {
      if (err)
        return next('Error in gameController.getStats: ' + JSON.stringify(err));
      lastPlayed = games[0].updatedAt;
      Object.values(games).forEach(game => {
        if (game.scoreP1 > game.scoreP2) {
          won += 1;
        } else {
          lost += 1;
        }
      });
    }
  );
  Game.find(
    { player2: req.user._id, result: { $not: new RegExp('waiting') } },
    {},
    { sort: { createdAt: -1 } },
    (err, games) => {
      if (err)
        return next('Error in gameController.getStats: ' + JSON.stringify(err));
      // set lastPlayed date
      lastPlayed =
        lastPlayed > games[0].updatedAt ? lastPlayed : games[0].updatedAt;

      Object.values(games).forEach(game => {
        if (game.scoreP2 > game.scoreP1) {
          won += 1;
        } else {
          lost += 1;
        }
      });
      console.log('won', won, 'lost', lost);
      res.locals.stats = { won: won, lost: lost, lastPlayed: lastPlayed };
      next();
    }
  );
};

gameController.createGame = (req, res, next) => {
  Game.findOne(
    { result: new RegExp('waiting for opponent..', 'i') },
    (err, game) => {
      if (err) {
        console.log('cannot create game', err);
      } else if (game) {
        game.player2 = req.user;
        game.result = `${game.winner} [vs] ${req.user.displayName}`;
        game.winner = 'game in progress';
        game.save();
      } else {
        Game.create({
          player1: req.user,
          winner: req.user.displayName, // temporarily stash player1 name - no need to populate user
          result: `${req.user.displayName} is waiting for opponent..`
        });
      }
      next();
    }
  );
};

gameController.endGame = (req, res) => {
  const score = req.body.score.split('-');
  Game.findOne({ _id: req.body.game })
    .populate('player1')
    .populate('player2')
    .then(game => {
      // set self and opponent scores
      if (game.player1._id == req.user._id) {
        game.scoreP1 = score[0];
        game.scoreP2 = score[1];
      } else {
        game.scoreP1 = score[1];
        game.scoreP2 = score[0];
      }
      // update game stats
      let points;
      if (game.scoreP1 > game.scoreP2) {
        points = game.scoreP1 - game.scoreP2;
        game.result = `<strong>${game.player1.displayName}</strong> [vs] ${game.player2.displayName}`;
      } else {
        points = game.scoreP2 - game.scoreP1;
        game.result = `${game.player1.displayName} [vs] <strong>${game.player2.displayName}</strong>`;
      }
      game.winner = `<strong>Won by ${points} ${
        points > 1 ? 'points' : 'point'
      }</strong>`;

      game.save();
    });
};

module.exports = gameController;
