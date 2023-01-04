import Tour from '../models/tourModel.js';
import catchAsync from '../utils/catchAsync.js';
import factory from './handlerFactory.js';
import AppError from '../utils/appError.js';
import Stripe from 'stripe';

export const getCheckoutSession = catchAsync(
  async (req, res, next) => {
    console.log(req.params.tourId);
    // 1) Get the currently booked tour
    const tour = await Tour.findById(req.params.tourId);

    console.log(tour);
    if (!tour) {
      return next(new AppError('There is no tour with that ID', 404));
    }

    // 2) Create checkout session
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: `http://localhost:3000/tours?success=true`,
      cancel_url: `http://localhost:3000/tours?canceled=true`,
      customer_email: req.user.email,
      client_reference_id: req.params.tourId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${tour.name} Tour`,
              description: tour.summary,
              images: [
                `https://www.natours.dev/img/tours/${tour.imageCover}`,
              ],
            },
            unit_amount: tour.price * 100,
          },
          quantity: 1,
        },
      ],
    });
    // 3) Create session as response
    res.status(200).json({
      status: 'success',
      session,
    });
  }
);
