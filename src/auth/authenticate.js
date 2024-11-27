const expressSession = require('express-session');
const PostgresSessionStore = require('connect-pg-simple')(expressSession);
const PassportLocalStrategy = require('passport-local').Strategy;
const db = require('../db/queries.js');
const pool = require('../db/pool.js');
const passport = require('passport');
const bcrypt = require('bcryptjs');

function authenticate(app) {
  passport.serializeUser((user, done) => done(null, user.user_id));

  passport.deserializeUser((userId, done) => {
    db.readRowByWhereClause('users', 'user_id', userId)
      .then((user) => {
        if (!user) {
          return done(null, false, { message: 'Invalid member!' });
        }
        done(null, user);
      })
      .catch(done);
  });

  passport.use(
    new PassportLocalStrategy(
      {
        usernameField: 'username',
        passwordField: 'password',
      },
      (username, password, done) => {
        db.readRowByWhereClause('users', 'username', username)
          .then((user) => {
            if (!user) {
              return done(null, false, { message: 'Incorrect username' });
            }
            bcrypt.compare(password, user.password, (err, match) => {
              if (err) return done(err);
              if (!match) {
                return done(null, false, {
                  message: 'Incorrect username or password.',
                });
              }
              return done(null, user);
            });
          })
          .catch(done);
      }
    )
  );

  app.use(
    expressSession({
      store: new PostgresSessionStore({
        tableName: 'users_sessions',
        pool,
      }),
      secret: process.env.SESSION_SECRET,
      saveUninitialized: Boolean(process.env.SESSION_SAVE_NOT_INIT),
      resave: Boolean(process.env.SESSION_RESAVE),
      cookie: {
        sameSite: process.env.SESSION_COOKIE_SAME_SITE,
        httpOnly: Boolean(process.env.SESSION_COOKIE_HTTP_ONLY),
        secure: Boolean(process.env.SESSION_COOKIE_SECURE),
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  app.use(passport.session());
}

module.exports = authenticate;
