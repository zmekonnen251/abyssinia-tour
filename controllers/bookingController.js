import Tour from '../models/tourModel.js';
import catchAsync from '../utils/catchAsync.js';
import factory from './handlerFactory.js';
import AppError from '../utils/appError.js';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import Booking from '../models/bookingModel.js';
import User from '../models/userModel.js';
import axios from 'axios';
dotenv.config();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const CHAPA_URL = 'https://api.chapa.co/v1/transaction/initialize';
const CHAPA_AUTH = process.env.CHAPA_SECRET_KEY;

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

export const chapaCheckout = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.tourId);

  if (!tour) {
    return next(new AppError('There is no tour with that ID', 404));
  }

  const config = {
    headers: {
      Authorization: `Bearer ${CHAPA_AUTH}`,
    },
  };

  // chapa redirect you to this url when payment is successful
  const RETURN_URL = `${req.get(
    'origin'
  )}/profile/my-bookings?success=true`;

  // a unique reference given to every transaction
  const TEXT_REF = 'tx-abyssiniatour12345-' + Date.now();

  // form data
  const data = {
    amount: `${tour.price}`,
    currency: 'ETB',
    email: `${req.user.email}`,
    first_name: `${req.user.name.split(' ')[0]}`,
    last_name: `${req.user.name.split(' ')[1]}`,
    tx_ref: TEXT_REF,
    // callback_url: CALLBACK_URL,
    return_url: RETURN_URL,
  };

  const chapaResponse = await axios.post(CHAPA_URL, data, config);
  // .then((response) => {
  //   console.log(response);

  //   res.status(200).json({
  //     status: 'success',
  //     checkout_url: response.data.data.checkout_url,
  //   });
  //   console.log(response);
  // })
  // .catch((err) => console.log(err));

  if (chapaResponse.status !== 200) {
    return next(new AppError('Payment failed', 404));
  }

  res.status(200).json({
    status: 'success',
    checkout_url: chapaResponse.data.data.checkout_url,
  });

  // res.send(chapaResponse.data.data.checkout_url);
});

export const chapaCheckoutHook = catchAsync(
  async (req, res, next) => {
    console.log(req.body);
    // const { tx_ref, status } = req.body;
  }
);

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
