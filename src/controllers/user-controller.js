const { body, validationResult } = require('express-validator');
const {
  genMinLenErrMsg,
  genMaxLenErrMsg,
} = require('../utils/messages-generators.js');
const db = require('../db/queries.js');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const AppGenericError = require('../errors/app-generic-error.js');

const MIN_LEN = 3;
const MAX_LEN = 50;
const PASS_MIN_LEN = 8;
const FULLNAME_MAX_LEN = 100;
const SIGNUP_TITLE = 'Sign Up';
const LOGIN_TITLE = 'Log In';
const USER_FORM_VIEW = 'user-form';

const isEqualPasswords = (_, { req }) => {
  const { password, password_confirm } = req.body;
  if (password !== password_confirm) {
    throw Error('Password confirmation does not match');
  }
  return true;
};

const signupValidators = [
  body('username')
    .isLength({ min: MIN_LEN })
    .withMessage(genMinLenErrMsg('A username', MIN_LEN))
    .isLength({ max: MAX_LEN })
    .withMessage(genMaxLenErrMsg('A username', MAX_LEN))
    .isAlphanumeric(undefined, { ignore: '._-' })
    .withMessage(
      'A username can contain dots, hyphens, underscores, letters, and numbers'
    ),
  body(['password', 'password_confirm'])
    .isLength({ min: PASS_MIN_LEN })
    .withMessage(genMinLenErrMsg('A password', PASS_MIN_LEN))
    .isLength({ max: MAX_LEN })
    .withMessage(genMaxLenErrMsg('A password', MAX_LEN)),
  body(['password', 'password_confirm']).custom(isEqualPasswords),
  body('fullname')
    .isLength({ min: MIN_LEN })
    .withMessage(genMinLenErrMsg('A full name', MIN_LEN, 'letters'))
    .isLength({ max: FULLNAME_MAX_LEN })
    .withMessage(genMaxLenErrMsg('A full name', FULLNAME_MAX_LEN, 'letters'))
    .isAlpha(undefined, { ignore: '._ -' })
    .withMessage(
      'A full name can contain spaces, dots, hyphens, underscores, and letters'
    ),
];

module.exports = {
  getLogin: (req, res) => {
    res.render(USER_FORM_VIEW, { title: LOGIN_TITLE });
  },

  postLogin: (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res
          .status(404)
          .render(USER_FORM_VIEW, { title: LOGIN_TITLE, error: info.message });
      }
      // Pass the user to req.login(user, next), otherwise, the session won't gen updated
      // https://github.com/jwalton/passport-api-docs?tab=readme-ov-file
      req.login(user, () => res.redirect('/'));
    })(req, res, next);
  },

  getSignup: (req, res) => {
    res.render(USER_FORM_VIEW, { title: SIGNUP_TITLE });
  },

  postSignup: [
    (req, res, next) => {
      res.locals.title = SIGNUP_TITLE;
      res.locals.formData = req.body;
      next();
    },
    ...signupValidators,
    (req, res, next) => {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return res.status(400).render(USER_FORM_VIEW, {
          validationErrors: validationErrors.mapped(),
        });
      }
      next();
    },
    (req, res) => {
      bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
        res.locals.error = 'Sorry, we cannot sign you up! Try again later.';
        if (err) {
          return res.status(500).render(USER_FORM_VIEW);
        }
        db.createRow(
          'users',
          ['fullname', 'username', 'password'],
          [req.body.fullname, req.body.username, hashedPassword]
        )
          .then(() => res.redirect('/'))
          .catch((e) => {
            if (e instanceof AppGenericError) {
              res.locals.error = 'This username is already exists!';
              return res.status(e.statusCode).render(USER_FORM_VIEW);
            }
            return res.status(500).render(USER_FORM_VIEW);
          });
      });
    },
  ],

  getUser: (req, res, next) => {
    if (!req.user) {
      return res.redirect('/');
    }
    res.locals.title = req.user.username;
    db.readPosts(['users.user_id'], [req.user.user_id])
      .then((posts) => {
        res.locals.posts = posts;
        res.render('index');
      })
      .catch(() => next(new AppGenericError('Cannot get member page!', 500)));
  },
};
