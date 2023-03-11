import Tour from '../models/tourModel.js';
import catchAsync from '../utils/catchAsync.js';
import factory from './handlerFactory.js';
import AppError from '../utils/appError.js';
import Stripe from 'stripe';
import Booking from '../models/bookingModel.js';
import User from '../models/userModel.js';

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

export const getCheckoutSession = catchAsync(
  async (req, res, next) => {
    // 1) Get the currently booked tour
    const tour = await Tour.findById(req.params.tourId);

    if (!tour) {
      return next(new AppError('There is no tour with that ID', 404));
    }

    // 2) Create checkout session

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: `${req.get('origin')}/profile/my-bookings`,
      // success_url: `${req.origin}//:${req.get('host')}/tours/profile/my-bookings`,

      cancel_url: `${req.get('origin')}/tours/${req.params.tourId}`,
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
                `https://abyssinia-tour.onrender.com/img/tours/${tour.imageCover}`,
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

// export const createBookingCheckout = catchAsync(
//   async (req, res, next) => {
//     const { tour, user, price } = req.params;

//     if (!tour && !user && !price) return next();

//     const updatedPrice = parseFloat(price);

//     await Booking.create({ tour, user, price: updatedPrice });

//     res.status(201).json({
//       status: 'success',
//       data: null,
//     });
//   }
// );

export const getUserBookings = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find({ user: req.user._id });

  res.status(200).json({
    status: 'success',
    results: bookings.length,
    data: {
      bookings,
    },
  });
});

const createBookingCheckout = async (session) => {
  const tour = session.client_reference_id;
  const user = await User.findOne({ email: session.customer_email });
  const price = session.amount_total / 100;

  await Booking.create({ tour, user, price });
};

export const webhookCheckout = catchAsync(async (req, res, next) => {
  const signature = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    await createBookingCheckout(session);
  }

  res.status(200).json({ received: true });
});

export const getAllBookings = factory.getAll(Booking);
export const deleteBooking = factory.deleteOne(Booking);
export const getBooking = factory.getOne(Booking);
export const updateBooking = factory.updateOne(Booking);

// server.js
//
// Use this sample code to handle webhook events in your integration.
//
// 1) Paste this code into a new file (server.js)
//
// 2) Install dependencies
//   npm install stripe
//   npm install express
//
// 3) Run the server on http://localhost:4242
//   node server.js

// The library needs to be configured with your account's secret key.
// Ensure the key is kept out of any version control system you might be using.
// const stripe = require('stripe')('sk_test_...');
// const express = require('express');
// const app = express();

// // This is your Stripe CLI webhook secret for testing your endpoint locally.
// const endpointSecret = "whsec_bd2fcb0542d72e1d82c3288c0eb790e510c67c7651136a1620ebc293e006ad50";

// app.post('/webhook', express.raw({type: 'application/json'}), (request, response) => {
//   const sig = request.headers['stripe-signature'];

//   let event;

//   try {
//     event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
//   } catch (err) {
//     response.status(400).send(`Webhook Error: ${err.message}`);
//     return;
//   }

//   // Handle the event
//   switch (event.type) {
//     case 'checkout.session.completed':
//       const checkoutSessionCompleted = event.data.object;
//       // Then define and call a function to handle the event checkout.session.completed
//       break;
//     // ... handle other event types
//     default:
//       console.log(`Unhandled event type ${event.type}`);
//   }

//   // Return a 200 response to acknowledge receipt of the event
//   response.send();
// });

// app.listen(4242, () => console.log('Running on port 4242'));
