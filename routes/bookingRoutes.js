import express from 'express';

import {
  protect,
  restrictTo,
} from '../controllers/authController.js';
import {
  getCheckoutSession,
  createBookingCheckout,
  getAllBookings,
  getUserBookings,
  deleteBooking,
  getBooking,
  updateBooking,
} from '../controllers/bookingController.js';

const router = express.Router();

router.post('/checkout-session/:tourId', protect, getCheckoutSession);
// router.get(
//   '/create-booking/user/:user/tour/:tour/price/:price',
//   protect,
//   createBookingCheckout
// );

router.get(
  '/',
  protect,
  restrictTo('admin', 'lead-guide'),
  getAllBookings
);
router.get('/my-bookings', protect, getUserBookings);
router.delete('/:id', protect, restrictTo('admin'), deleteBooking);
router.patch('/:id', protect, restrictTo('admin'), updateBooking);
router.get('/:id', protect, restrictTo('admin'), getBooking);
router.post('/', protect, restrictTo('admin'), createBooking);

export default router;
