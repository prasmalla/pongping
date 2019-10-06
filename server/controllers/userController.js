const User = require('../models/userModel');
const bcyrpt = require('bcryptjs');
const userController = {};

/**
 * getAllUsers - retrieve all users from the database and stores it into res.locals
 * before moving on to next middleware.
 */
userController.getAllUsers = (req, res, next) => {
  User.find({}, (err, users) => {
    if (err)
      return next(
        'Error in userController.getAllUsers: ' + JSON.stringify(err)
      );
    res.locals.users = users;
    return next();
  });
};

/**
 * createUser - create and save a new User into the database.
 */
userController.createUser = (req, res, next) => {
  let { username, password } = req.body;

  User.findOrCreate(
    { username: username, password: password },
    (err, result) => {
      if (err) {
        res.render('./../client/signup', { error: err });
      } else {
        res.locals.userIdWillWork = result.id;
        return next();
      }
    }
  );
};

/**
 * verifyUser - Obtain username and password from the request body, locate
 * the appropriate user in the database, and then authenticate the submitted password
 * against the password stored in the database.
 */
userController.verifyUser = function(req, res, next) {
  User.findOne({ username: req.body.username }, function(err, user) {
    if (err) console.log(err);
    else {
      bcyrpt.compare(req.body.password, user.password, function(err, result) {
        if (result) {
          res.locals.userIdWillWork = user.id;
          return next();
        } else {
          res.redirect('/signup');
        }
      });
    }
  });
};

module.exports = userController;
