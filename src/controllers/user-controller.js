const { body, param, validationResult } = require('express-validator');
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
    .isAlpha(undefined, { ignore: '._ -/()[]~' })
    .withMessage('Not all special characters are allowed'),
];

module.exports = {
  getLogin: (req, res) => {
    res.render(USER_FORM_VIEW, { title: LOGIN_TITLE });
  },

  postLogin: (req, res, next) => {
    passport.authenticate('local', (error, user, info) => {
      if (error) return next(error);
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

  getLogout: (req, res, next) => {
    req.logout((error) => {
      if (error) {
        console.log('This error has occurred in "req.logout"!\n', error);
        const appError = new AppGenericError(
          'Could not log you out! Try again later.',
          500
        );
        return next(appError);
      }
      res.redirect('/');
    });
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

  getUser: [
    param('id').isInt({ min: 0 }),
    (req, res, next) => {
      return validationResult(req).isEmpty() ? next() : next('route');
    },
    async (req, res, next) => {
      try {
        const posts = await db.readPosts(['users.user_id'], [req.params.id]);
        if (!posts || posts.length === 0) {
          const user = await db.readRowByWhereClause(
            'users',
            ['user_id'],
            [req.params.id]
          );
          if (!user) {
            throw new AppGenericError('No such a member!', 404);
          }
          res.locals.posts = [];
          res.locals.title = user.username.toUpperCase();
        } else {
          res.locals.posts = posts;
          res.locals.title = posts[0].username.toUpperCase();
        }
        res.render('index');
      } catch (error) {
        if (error instanceof AppGenericError) return next(error);
        next(new AppGenericError('Could not get the requested data!', 500));
      }
    },
  ],
};
