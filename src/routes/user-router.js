const { Router } = require('express');
const userController = require('../controllers/user-controller.js');

const router = Router();

router
  .route('/login')
  .get(userController.getLogin)
  .post(userController.postLogin);

router
  .route('/signup')
  .get(userController.getSignup)
  .post(userController.postSignup);

router.get('/logout', userController.getLogout);

router.get('/:id', userController.getUser);

module.exports = router;
