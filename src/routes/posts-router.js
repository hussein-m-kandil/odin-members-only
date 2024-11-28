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

router
  .route('/update/:id')
  .all(authMiddlewares.preventUnauthenticatedOps)
  .get(postsController.getUpdate)
  .post(postsController.postUpdate);

router
  .route('/delete/:id')
  .all(authMiddlewares.preventUnauthenticatedOps)
  .post(postsController.postDelete);

router.get('/:id', postsController.getPost);

module.exports = router;
