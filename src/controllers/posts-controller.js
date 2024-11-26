const { body, param, validationResult } = require('express-validator');
const {
  genMinLenErrMsg,
  genMaxLenErrMsg,
} = require('../utils/messages-generators.js');

const MIN_LEN = 3;
const MAX_LEN = 255;
const ADD_POST_TITLE = 'Add Post';
const POST_FORM_VIEW = 'post-form';

module.exports = {
  getPost: [
    param('id').isInt({ min: 0 }),
    (req, res, next) => {
      return validationResult(req).isEmpty() ? next() : next('route');
    },
    (req, res, next) => {
      // TODO: Get a post form DB
      const postId = Number(req.params.id);
      const post = res.locals.posts.find((p) => p.id === postId);
      if (!post) {
        next('route');
      }
      res.locals.posts = [post];
      res.render('index', { title: post.title, fullPost: true });
    },
  ],

  getAllPosts: (req, res) => {
    // TODO: Get all posts from DB
    res.render('index', { title: 'Odin Members Only' });
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
    (req, res) => {
      // TODO: Save the new post to the DB
      res.redirect('/');
    },
  ],
};
