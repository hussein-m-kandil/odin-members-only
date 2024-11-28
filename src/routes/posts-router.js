const { Router } = require('express');
const authMiddlewares = require('../auth/authentication-middlewares.js');
const postsController = require('../controllers/posts-controller.js');

const router = Router();

router.get('', postsController.getAllPosts);

router
  .route('/add')
  .all(authMiddlewares.preventUnauthenticatedOps)
  .get(postsController.getCreatePost)
  .post(postsController.postCreatePost);

router.get('/:id', postsController.getPost);

module.exports = router;
