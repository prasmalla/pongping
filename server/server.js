const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const mongoURI = 'mongodb://localhost/pongping';
const passport = require('passport');
const GitHubStrategy = require('passport-github').Strategy;
const session = require('express-session');

const User = require('./models/User');
const gameController = require('./controllers/game');

mongoose.connect(mongoURI);
require('dotenv').config();

const PORT = 3000;
const app = express();

app.use(session({ secret: process.env.SESSION_SECRET }));
app.use(passport.initialize());
app.use(passport.session());

app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// twilio number +12134447561
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const ping = require('twilio')(accountSid, authToken);
const MessagingResponse = require('twilio').twiml.MessagingResponse;

// serve static files in views folder
app.use(express.static(path.join(__dirname, './../views')));

app.get(
  '/',
  gameController.getAllGames,
  gameController.playedGames,
  (req, res) => {
    res.render('index', {
      games: res.locals.games,
      playedGames: res.locals.playedGames
    });
  }
);

/**
 * passport oauth
 */
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: `${process.env.NGROK_URL}/oauth/github/callback`
    },
    function(accessToken, refreshToken, profile, cb) {
      User.findOne({ username: profile.username }, function(err, user) {
        if (err) return cb(err);

        // no user found... create new user
        if (!user) {
          const user = new User({
            username: profile.username,
            displayName: profile.displayName,
            gravatar: profile.photos[0].value,
            phoneNumber: null
          });
          user.save(function(err) {
            if (err) console.log(err);
            return cb(err, user);
          });
        } else {
          // return exiting user
          return cb(err, user);
        }
      });
    }
  )
);

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(async (user, done) => {
  done(null, user);
});

app.get('/oauth/github', passport.authenticate('github'));

app.get(
  '/oauth/github/callback',
  passport.authenticate('github', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/dash');
  }
);

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

// send text with twilio ngrok callback url - http://3e63778e.ngrok.io/ping
app.get('/ping', (req, res) => {
  ping.messages
    .create({
      body: 'pong time! ur up)',
      from: '+12134447561',
      to: req.user.phoneNumber
    })
    .then(message => {
      console.log(message.sid);
      res.status(200).send({ done: 'sent' });
    });
});

app.post('/pong', (req, res, next) => {
  const phoneNumber = req.body.From.substr(2);
  const twiml = new MessagingResponse();

  User.findOne({ phoneNumber: phoneNumber }, function(err, user) {
    if (err) return cb(err);
    if (!user) {
      twiml.message(
        'phone not registered( login with github to add your number'
      );
    } else {
      req.user = user;
      gameController.createGame(req, res, next);
      twiml.message('sweet! will ping you when you go next)');
    }
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
  });
});

/**
 * Authorized routes
 */

app.get(
  '/dash',
  gameController.findCurrentGame,
  gameController.getStats,
  (req, res) => {
    if (req.isAuthenticated())
      res.render('dash', {
        user: req.user,
        game: res.locals.game,
        stats: res.locals.stats
      });
    else res.redirect('/');
  }
);

app.post('/dash', (req, res) => {
  User.findOne({ username: req.user.username }, function(err, user) {
    if (err) console.log(err);

    if (user) {
      user.phoneNumber = req.body.phoneNumber;
      user.save(function(err) {
        if (err) console.log(err);
        res.status(200).send({ user: user });
      });
    }
  });
});

// create new game
app.post('/nextup', gameController.createGame, (req, res, next) => {
  res.status(200).send({ data: 'set' });
});

// end current game
app.post(
  '/end',
  gameController.endGame,
  gameController.createGame,
  (req, res, next) => {}
);

/**
 * 404 handler
 */
app.use('*', (req, res) => {
  res.status(404).send('Not Found');
});

/**
 * Global error handler
 */
app.use((err, req, res, next) => {
  console.log(err);
  res.status(500).send('Internal Server Error');
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}...`);
});

module.exports = app;
