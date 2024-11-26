const { body, validationResult } = require('express-validator');
const {
  genMinLenErrMsg,
  genMaxLenErrMsg,
} = require('../utils/messages-generators.js');

const MIN_LEN = 3;
const MAX_LEN = 127;
const PASS_MIN_LEN = 8;
const FULLNAME_MAX_LEN = 255;
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

  postLogin: [
    (req, res) => {
      const { username, password } = req.body;
      // TODO: Check whether the given user data are belong to an already signed-up user
      if (username !== 'hussein' || password !== '12312312') {
        return res.status(400).render(USER_FORM_VIEW, {
          title: LOGIN_TITLE,
          error: 'Invalid Username or Password!',
        });
      }
      res.redirect('/');
    },
  ],

  getSignup: (req, res) => {
    res.render(USER_FORM_VIEW, { title: SIGNUP_TITLE });
  },

  postSignup: [
    ...signupValidators,
    (req, res, next) => {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return res.status(400).render(USER_FORM_VIEW, {
          title: SIGNUP_TITLE,
          validationErrors: validationErrors.mapped(),
          formData: req.body,
        });
      }
      next();
    },
    (req, res) => {
      // TODO: Save the new user to the DB
      res.redirect('/');
    },
  ],

  getUser: (req, res) => {
    // TODO: Get user posts from DB
    const { user, posts } = res.locals;
    res.locals.posts = posts.filter((p) => p.user.id === user.id);
    res.render('index', { title: user.username });
  },
};
