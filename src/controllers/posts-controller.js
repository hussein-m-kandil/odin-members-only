const { body, param, validationResult } = require('express-validator');
const {
  genMinLenErrMsg,
  genMaxLenErrMsg,
} = require('../utils/messages-generators.js');
const db = require('../db/queries.js');
const AppGenericError = require('../errors/app-generic-error.js');

const MIN_LEN = 3;
const MAX_LEN = 255;
const ADD_POST_TITLE = 'Add Post';
const POST_FORM_VIEW = 'post-form';
const COULD_NOT_READ = 'Could not get the requested data! Try again later.';
const COULD_NOT_CREATE = 'Could not save the given data! Try again later.';

module.exports = {
  getPost: [
    param('id').isInt({ min: 0 }),
    (req, res, next) => {
      return validationResult(req).isEmpty() ? next() : next('route');
    },
    (req, res, next) => {
      const postId = Number(req.params.id);
      db.readPosts('post_id', postId, 1)
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

  getCreatePost: (req, res) => {
    res.render(POST_FORM_VIEW, { title: ADD_POST_TITLE });
  },

  postCreatePost: [
    body('title')
      .isLength({ min: MIN_LEN })
      .withMessage(genMinLenErrMsg('A title', MIN_LEN))
      .isLength({ max: MAX_LEN })
      .withMessage(genMaxLenErrMsg('A title', MAX_LEN))
      .isAlphanumeric(undefined, { ignore: '._ -' })
      .withMessage(
        'A title can contain spaces, dots, hyphens, underscores, letters, and numbers'
      ),
    body('body')
      .isLength({ min: MIN_LEN })
      .withMessage(genMinLenErrMsg('A body', MIN_LEN)),
    (req, res, next) => {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return res.status(400).render(POST_FORM_VIEW, {
          title: ADD_POST_TITLE,
          validationErrors: validationErrors.mapped(),
          formData: req.body,
        });
      }
      next();
    },
    (req, res, next) => {
      db.createRow(
        'posts',
        ['user_id', 'post_title', 'post_body'],
        [req.user.user_id, req.body.title, req.body.body]
      )
        .then(() => res.redirect('/'))
        .catch(() => next(new AppGenericError(COULD_NOT_CREATE, 500)));
    },
  ],
};
