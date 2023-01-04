import express from 'express';

import { protect } from '../controllers/authController.js';
import { getCheckoutSession } from '../controllers/bookingController.js';

const router = express.Router();

router.post('/checkout-session/:tourId', protect, getCheckoutSession);

router.use(protect);

export default router;
