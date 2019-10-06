const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
require('dotenv').config();
// Express and Passport Session
const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2').Strategy;
const session = require('express-session');

const userController = require('./controllers/userController');

const PORT = 3000;

const app = express();
app.use(session({ secret: 'on8er6t[q0wy0t]yqa]0yea0' }));
app.use(passport.initialize());
app.use(passport.session());

const mongoURI = 'mongodb://localhost/pongping';
mongoose.connect(mongoURI);

/**
 * Set our Express view engine as ejs.
 * This means whenever we call res.render, ejs will be used to compile the template.
 * ejs templates are located in the client/ directory
 */
app.set('view engine', 'ejs');

/**
 * Automatically parse urlencoded body content from incoming requests and place it
 * in req.body
 */
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

/**
 * --- Express Routes ---
 * Express will attempt to match these routes in the order they are declared here.
 * If a route handler / middleware handles a request and sends a response without
 * calling `next()`, then none of the route handlers after that route will run!
 * This can be very useful for adding authorization to certain routes...
 */

/**
 * root
 */
app.get('/', (req, res) => {
  /**
   * Since we set `ejs` to be the view engine above, `res.render` will parse the
   * template page we pass it (in this case 'client/secret.ejs') as ejs and produce
   * a string of proper HTML which will be sent to the client!
   */
  res.render('./../client/index');
});

/**
 * signup
 */
app.get('/signup', (req, res) => {
  res.render('./../client/signup', { error: null });
});

app.post('/signup', userController.createUser, (req, res) => {
  // what should happen here on successful sign up?
  console.log('post request successful - signup redirect');
  res.redirect('/next');
});

/**
 * login
 */
app.post('/login', userController.verifyUser, (req, res, next) => {
  // what should happen here on successful log in?
  console.log('post request successful - login');
  res.redirect('/next');
});

/**
 * passport oauth
 */

passport.use(
  new OAuth2Strategy(
    {
      authorizationURL: 'https://github.com/login/oauth/authorize',
      tokenURL: 'https://github.com/login/oauth/access_token',
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/oauth/github/callback'
    },
    function(accessToken, refreshToken, profile, cb) {
      // User.findOrCreate({ exampleId: profile.id }, function(err, user) {
      //   return cb(err, user);
      // });
      return cb(null, profile);
    }
  )
);

passport.serializeUser(function(user, done) {
  // placeholder for custom user serialization
  // null is for errors
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  // placeholder for custom user deserialization.
  // maybe you are going to get the user from mongo by id?
  // null is for errors
  done(null, user);
});

// we will call this to start the GitHub Login process
app.get('/oauth/github', passport.authenticate('oauth2'));

// GitHub will call this URL
app.get(
  '/oauth/github/callback',
  passport.authenticate('oauth2', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/next');
  }
);

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

/**
 * Authorized routes
 */
app.get('/next', (req, res) => {
  /**
   * The previous middleware has populated `res.locals` with users
   * which we will pass this in to the res.render so it can generate
   * the proper html from the `secret.ejs` template
   */
  if (req.isAuthenticated())
    res.render('./../client/next', { users: res.locals.users });
  else res.redirect('/');
});

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
