const { body, validationResult } = require('express-validator');
const {
  genMinLenErrMsg,
  genMaxLenErrMsg,
} = require('../utils/messages-generators.js');
const db = require('../db/queries.js');
const AppGenericError = require('../errors/app-generic-error.js');
const { idValidators } = require('../middlewares/validators.js');

const MIN_LEN = 3;
const MAX_LEN = 255;
const ADD_POST_TITLE = 'Add Post';
const POST_FORM_VIEW = 'post-form';
const UPDATE_POST_TITLE = 'Update Post';
const COULD_NOT_READ = 'Could not get the requested data! Try again later.';
const COULD_NOT_CREATE = 'Could not save the given data! Try again later.';

const genNotFoundMsg = (req) => `Could not ${req.method} ${req.originalUrl}`;

const postFieldsValidators = [
  body('post_title')
    .isLength({ min: MIN_LEN })
    .withMessage(genMinLenErrMsg('A title', MIN_LEN))
    .isLength({ max: MAX_LEN })
    .withMessage(genMaxLenErrMsg('A title', MAX_LEN))
    .isAlphanumeric(undefined, { ignore: '._ -' })
    .withMessage(
      'A title can contain spaces, dots, hyphens, underscores, letters, and numbers'
    ),
  body('post_body')
    .isLength({ min: MIN_LEN })
    .withMessage(genMinLenErrMsg('A body', MIN_LEN)),
  (req, res, next) => {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return res.status(400).render(POST_FORM_VIEW, {
        validationErrors: validationErrors.mapped(),
        formData: req.body,
      });
    }
    next();
  },
];

const injectTitleIntoResLocals = (title) => {
  return (req, res, next) => {
    res.locals.title = title;
    next();
  };
};

const validatePostOwner = async (req, res, next) => {
  if (!req.isAuthenticated()) return next('route');
  try {
    res.locals.post = await db.readRowByWhereClause(
      'posts',
      ['post_id'],
      [req.params.id]
    );
    if (!req.user.is_admin && res.locals.post.user_id !== req.user.user_id) {
      return next(new AppGenericError(genNotFoundMsg(req), 404));
    }
    next();
  } catch {
    next(new AppGenericError(COULD_NOT_CREATE, 500));
  }
};

module.exports = {
  getPost: [
    ...idValidators,
    (req, res, next) => {
      if (!req.isAuthenticated()) return next('route');
      db.readPosts('post_id', req.params.id, 1)
        .then(([post]) => {
          if (!post) return next('route');
          res.render('index', {
            title: post.title,
            posts: [post],
            fullPost: true,
          });
        })
        .catch(() => next(new AppGenericError(COULD_NOT_READ, 500)));
    },
  ],

  getAllPosts: (req, res, next) => {
    db.readPosts()
      .then((posts) => {
        if (!posts) return next('route');
        res.render('index', { title: 'Odin Members Only', posts });
      })
      .catch(() => next(new AppGenericError(COULD_NOT_READ, 500)));
  },

  getCreatePost: (req, res, next) => {
    if (!req.isAuthenticated()) return next('route');
    res.render(POST_FORM_VIEW, { title: ADD_POST_TITLE });
  },

  postCreatePost: [
    injectTitleIntoResLocals(ADD_POST_TITLE),
    ...postFieldsValidators,
    (req, res, next) => {
      if (!req.isAuthenticated()) return next('route');
      db.createRow(
        'posts',
        ['user_id', 'post_title', 'post_body'],
        [req.user.user_id, req.body.post_title, req.body.post_body]
      )
        .then(() => {
          db.keepDBTableShort('posts', 'post_id', 200)
            .catch((e) => console.log(e))
            .finally(() => res.redirect(`/user/${req.user.user_id}`));
        })
        .catch(() => next(new AppGenericError(COULD_NOT_CREATE, 500)));
    },
  ],

  getUpdate: [
    ...idValidators,
    validatePostOwner,
    (req, res) => {
      res.render(POST_FORM_VIEW, {
        title: UPDATE_POST_TITLE,
        formData: res.locals.post,
      });
    },
  ],

  postUpdate: [
    ...idValidators,
    injectTitleIntoResLocals(ADD_POST_TITLE),
    ...postFieldsValidators,
    validatePostOwner,
    async (req, res, next) => {
      try {
        const { post } = res.locals;
        const { post_title, post_body } = req.body;
        if (post.post_title !== post_title || post.post_body !== post_body) {
          await db.updateRowsByWhereClause(
            'posts',
            ['post_id'],
            [post.post_id],
            ['post_title', 'post_body', 'updated_at'],
            [post_title, post_body, new Date()]
          );
        }
        next();
      } catch {
        next(new AppGenericError(COULD_NOT_CREATE, 500));
      }
    },
    (req, res) => {
      return res.redirect(`/posts/${res.locals.post.post_id}`);
    },
  ],

  postDelete: [
    ...idValidators,
    validatePostOwner,
    async (req, res, next) => {
      try {
        const { post_id } = res.locals.post;
        await db.deleteRowsByWhereClause('posts', ['post_id'], [post_id]);
        next();
      } catch {
        next(new AppGenericError(COULD_NOT_CREATE, 500));
      }
    },
    (req, res) => {
      return res.redirect(`/user/${res.locals.post.user_id}`);
    },
  ],
};
