const { body, param, validationResult } = require('express-validator');
const {
  genMinLenErrMsg,
  genMaxLenErrMsg,
} = require('../utils/messages-generators.js');
const db = require('../db/queries.js');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const AppGenericError = require('../errors/app-generic-error.js');
const { idValidators } = require('../middlewares/validators.js');

const SALT = 10;
const MIN_LEN = 3;
const MAX_LEN = 50;
const PASS_MIN_LEN = 8;
const FULLNAME_MAX_LEN = 100;
const SIGNUP_TITLE = 'Sign Up';
const UPDATE_TITLE = 'Edit Account';
const LOGIN_TITLE = 'Log In';
const USER_FORM_VIEW = 'user-form';

const getUserFormValidators = (signup) => {
  const isEqualPasswords = (_, { req }) => {
    const { password, password_confirm } = req.body;
    if (password !== password_confirm) {
      throw Error('Password confirmation does not match');
    }
    return true;
  };
  const optionalOpts = signup ? false : { values: 'falsy' };
  return [
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
      .optional(optionalOpts)
      .isLength({ min: PASS_MIN_LEN })
      .withMessage(genMinLenErrMsg('A password', PASS_MIN_LEN))
      .isLength({ max: MAX_LEN })
      .withMessage(genMaxLenErrMsg('A password', MAX_LEN)),
    body(['password', 'password_confirm'])
      .optional(optionalOpts)
      .custom(isEqualPasswords),
    body('fullname')
      .isLength({ min: MIN_LEN })
      .withMessage(genMinLenErrMsg('A full name', MIN_LEN, 'letters'))
      .isLength({ max: FULLNAME_MAX_LEN })
      .withMessage(genMaxLenErrMsg('A full name', FULLNAME_MAX_LEN, 'letters'))
      .isAlpha(undefined, { ignore: '._ -/()[]~' })
      .withMessage('Not all special characters are allowed'),
    (req, res, next) => {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return res.status(400).render(USER_FORM_VIEW, {
          validationErrors: validationErrors.mapped(),
        });
      }
      next();
    },
  ];
};

const handleLogoutError = (error, next) => {
  console.log('This error has occurred in "req.logout"!\n', error);
  const appError = new AppGenericError(
    'Could not log you out! Try again later.',
    500
  );
  return next(appError);
};

module.exports = {
  getLogin: (req, res) => {
    res.render(USER_FORM_VIEW, { title: LOGIN_TITLE });
  },

  postLogin: (req, res, next) => {
    passport.authenticate('local', (error, user, info) => {
      // 4th arg 'status' represent errors occurred before executing the verifier
      // e.g. (..., info.message='Missing Credentials', status=400) => Empty username/password
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
        return handleLogoutError(error, next);
      }
      res.redirect('/');
    });
  },

  getSignup: (req, res) => {
    res.render(USER_FORM_VIEW, { title: SIGNUP_TITLE, fullForm: true });
  },

  postSignup: [
    (req, res, next) => {
      res.locals.title = SIGNUP_TITLE;
      res.locals.formData = req.body;
      res.locals.fullForm = true;
      next();
    },
    ...getUserFormValidators(true),
    (req, res, next) => {
      bcrypt.hash(req.body.password, SALT, async (err, hashedPassword) => {
        res.locals.error = 'Sorry, we cannot sign you up! Try again later.';
        if (err) {
          return res.status(500).render(USER_FORM_VIEW);
        }
        const queryColumns = ['fullname', 'username', 'password'];
        const queryValues = [
          req.body.fullname,
          req.body.username,
          hashedPassword,
        ];
        const signedUpAsAdmin = req.body.secret === process.env.ADMIN_SECRET;
        if (signedUpAsAdmin) {
          queryColumns.push('is_admin');
          queryValues.push('TRUE');
        }
        try {
          await db.createRow('users', queryColumns, queryValues);
          try {
            await db.keepDBTableShort('users', 'user_id', 50);
          } catch (e) {
            console.log(e);
          } finally {
            try {
              const user = await db.readRowByWhereClause(
                'users',
                ['username'],
                [req.body.username]
              );
              req.login(user, () => res.redirect('/'));
            } catch (e) {
              console.log('Error occurred in automatic login after sign up');
              console.log(e);
              next(
                new AppGenericError('Please log in to test your account!', 500)
              );
            }
          }
        } catch (e) {
          if (e instanceof AppGenericError) {
            res.locals.error = 'This username is already exists!';
            return res.status(e.statusCode).render(USER_FORM_VIEW);
          }
          return res.status(500).render(USER_FORM_VIEW);
        }
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
          user.password = undefined;
          res.locals.posts = [];
          res.locals.userInfo = user;
          res.locals.title = user.username.toUpperCase();
        } else {
          res.locals.posts = posts;
          const { user_id, username, fullname, is_admin } = posts[0];
          res.locals.title = posts[0].username.toUpperCase();
          res.locals.userInfo = { user_id, username, fullname, is_admin };
        }
        res.render('index');
      } catch (error) {
        if (error instanceof AppGenericError) return next(error);
        next(new AppGenericError('Could not get the requested data!', 500));
      }
    },
  ],

  getUpdate: [
    ...idValidators,
    (req, res, next) => {
      if (!req.user || req.user.user_id !== Number(req.params.id)) {
        return next('route');
      }
      db.readRowByWhereClause('users', ['user_id'], [req.params.id])
        .then((user) => {
          res.locals.formData = {
            username: user.username,
            fullname: user.fullname,
          };
          res.render(USER_FORM_VIEW, { title: UPDATE_TITLE, fullForm: true });
        })
        .catch(next);
    },
  ],

  postUpdate: [
    ...idValidators,
    (req, res, next) => {
      res.locals.title = UPDATE_TITLE;
      res.locals.formData = req.body;
      res.locals.fullForm = true;
      next();
    },
    ...getUserFormValidators(false),
    (req, res, next) => {
      res.locals.error =
        'Sorry, we cannot commit your updates! Try again later.';
      if (!req.body.password) return next();
      bcrypt.hash(req.body.password, SALT, async (err, passwordHash) => {
        if (err) res.status(500).render(USER_FORM_VIEW);
        res.locals.passwordHash = passwordHash;
        next();
      });
    },
    (req, res, next) => {
      if (!req.user || req.user.user_id !== Number(req.params.id)) {
        return next('route');
      }
      const queryArgs = ['users', ['user_id'], [req.params.id]];
      const queryColumns = ['fullname', 'username'];
      const queryValues = [req.body.fullname, req.body.username];
      if (res.locals.passwordHash) {
        queryColumns.push('password');
        queryValues.push(res.locals.passwordHash);
      }
      if (req.body.secret === process.env.ADMIN_SECRET) {
        queryColumns.push('is_admin');
        queryValues.push('TRUE');
      }
      queryArgs.push(queryColumns, queryValues);
      db.updateRowsByWhereClause(...queryArgs)
        .then(() => res.redirect(`${req.baseUrl}/${req.params.id}`))
        .catch(() => res.status(500).render(USER_FORM_VIEW));
    },
  ],

  postDelete: [
    ...idValidators,
    (req, res, next) => {
      if (
        !req.user ||
        (!req.user.is_admin && req.user.user_id !== Number(req.params.id))
      ) {
        return next('route');
      }
      if (req.user.is_admin) {
        return next();
      }
      req.logout((error) => {
        if (error) {
          return handleLogoutError(error, next);
        }
        next();
      });
    },
    (req, res, next) => {
      db.deleteRowsByWhereClause('users', ['user_id'], [req.params.id])
        .then(() => res.redirect('/'))
        .catch(next);
    },
  ],
};
