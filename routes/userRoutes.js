import express from 'express';
import {
  getAllUsers,
  getUser,
  deleteUser,
  updateMe,
  deleteMe,
  updateUser,
  createUser,
  getMe,
  uploadUserPhoto,
  resizeUserPhoto,
} from '../controllers/usersController.js';
import {
  login,
  signUp,
  logout,
  forgotPassword,
  resetPassword,
  updatePassword,
  protect,
  restrictTo,
} from '../controllers/authController.js';

const router = express.Router();

router.post('/signup', signUp);
router.post('/login', login);
router.post('/forgotPassword', forgotPassword);
router.patch('/resetPassword/:token', resetPassword);
router.delete('/logout', logout);

router.use(protect);

router.get('/me', getMe, getUser);
router.patch('/updateMyPassword', updatePassword);
router.delete('/deleteMe', deleteMe);
router.patch('/updateMe', uploadUserPhoto, resizeUserPhoto, updateMe);

router.use(restrictTo('admin'));

router.route('/').get(getAllUsers).post(createUser);
router
  .route('/:id')
  .get(getUser)
  .patch(uploadUserPhoto, resizeUserPhoto, updateUser)
  .delete(deleteUser);

export default router;
