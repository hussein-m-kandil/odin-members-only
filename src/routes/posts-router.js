const { Router } = require('express');
const postsController = require('../controllers/posts-controller.js');

const router = Router();

router.get('', postsController.getAllPosts);

router
  .route('/add')
  .get(postsController.getCreatePost)
  .post(postsController.postCreatePost);

router.get('/:id', postsController.getPost);

module.exports = router;
