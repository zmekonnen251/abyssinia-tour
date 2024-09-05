import express from 'express';

import {
  protect,
  restrictTo,
} from '../controllers/authController.js';
import {
  getCheckoutSession,
  getAllBookings,
  getUserBookings,
  deleteBooking,
  getBooking,
  updateBooking,
  chapaCheckout,
  verifyChapaPayment,
  chapaCheckoutHook,
} from '../controllers/bookingController.js';

const router = express.Router();

router.post('/checkout-session/:tourId', protect, getCheckoutSession);

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

router.post(
  '/chapa-checkout-session/:tourId',
  protect,
  chapaCheckout
);

router.get('/verify-chapa-payment/:id', verifyChapaPayment);
router.post('/chapa-checkout-webhook', chapaCheckoutHook);

export default router;
